import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ArtKind, ColorKey, ProductBadge, ProductSpecs } from "@/data/products";

/**
 * Database tables. Money is stored in whole so'm; Payme amounts in tiyin.
 *
 * After changing this file run `npm run db:generate` to create a migration.
 */

export type DeliveryType = "delivery" | "pickup";
export type PaymentMethod = "payme" | "click" | "cash";
export type OrderStatus = "new" | "confirmed" | "delivering" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/**
 * The catalogue. Categories and product kinds (with their pictures, names and
 * descriptions) are part of the site itself and live in `src/data`.
 */
export const products = pgTable(
  "products",
  {
    /** Short code shown to customers and kept in carts and orders: "p-001" */
    id: text("id").primaryKey(),
    /** The product's page address; never changes once the product exists. */
    slug: text("slug").notNull().unique(),
    /** Category slug from `src/data/categories.ts` */
    category: text("category").notNull(),
    /** Product kind: picks the picture, the type name and the description. */
    art: text("art").$type<ArtKind>().notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    /** Price before the discount, when there is one */
    oldPrice: bigint("old_price", { mode: "number" }),
    rating: doublePrecision("rating").notNull().default(0),
    reviews: integer("reviews").notNull().default(0),
    badge: text("badge").$type<ProductBadge>(),
    inStock: boolean("in_stock").notNull().default(true),
    /** A hidden product leaves the shop but stays in old orders. */
    active: boolean("active").notNull().default(true),
    color: text("color").$type<ColorKey>().notNull(),
    /** Warranty in years */
    warranty: integer("warranty").notNull().default(1),
    specs: jsonb("specs").$type<ProductSpecs>().notNull().default({}),
    /** Link to the product photo (https). Without one the shop draws the product kind. */
    image: text("image"),
    /**
     * Pieces in the warehouse, or null when the shop does not count them. A
     * counted product goes out of stock by itself when the last one is sold.
     */
    stock: integer("stock"),
    /**
     * Grows with every change. The server keeps the catalogue in memory and
     * compares these numbers to notice that its copy is outdated.
     */
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("products_category_idx").on(table.category)],
);

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** +998XXXXXXXXX */
  phone: text("phone").notNull().unique(),
  name: text("name"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SHA-256 of the cookie value; the value itself is never stored. */
    tokenHash: text("token_hash").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_customer_idx").on(table.customerId)],
);

/** One-time SMS codes for signing in. */
export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    /** Hash of the requester's address, only used to limit how often codes are sent. */
    ipHash: text("ip_hash"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (table) => [
    index("otp_codes_phone_idx").on(table.phone, table.createdAt),
    index("otp_codes_ip_idx").on(table.ipHash, table.createdAt),
  ],
);

export const orders = pgTable(
  "orders",
  {
    /** Unguessable id: it is the address of the order page. */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short number shown to the customer and sent to Payme and Click. */
    number: bigint("number", { mode: "number" })
      .notNull()
      .generatedAlwaysAsIdentity({ startWith: 100001 })
      .unique(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    locale: text("locale").notNull(),
    deliveryType: text("delivery_type").$type<DeliveryType>().notNull(),
    /** Delivery zone slug from `src/data/delivery.ts`; empty for pickup. */
    zone: text("zone"),
    address: text("address"),
    /** The spot the customer marked on the map for delivery, if they did */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    comment: text("comment"),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("new"),
    paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("unpaid"),
    subtotal: bigint("subtotal", { mode: "number" }).notNull(),
    deliveryFee: bigint("delivery_fee", { mode: "number" }).notNull(),
    /** The promo code used, as typed by the admin, and what it took off the goods. */
    promoCode: text("promo_code"),
    discount: bigint("discount", { mode: "number" }).notNull().default(0),
    /** Goods minus the discount, plus delivery. */
    total: bigint("total", { mode: "number" }).notNull(),
    /** Paid in parts: the months and the monthly sum agreed when the order was placed. */
    installmentMonths: integer("installment_months"),
    installmentMonthly: bigint("installment_monthly", { mode: "number" }),
    /** The Telegram user who placed the order in the Mini App; told about its progress there. */
    telegramId: bigint("telegram_id", { mode: "number" }),
    createdAt: createdAt(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_phone_idx").on(table.phone, table.createdAt),
    index("orders_customer_idx").on(table.customerId, table.createdAt),
  ],
);

/** A snapshot of each product at the moment of purchase. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    art: text("art").notNull(),
    price: bigint("price", { mode: "number" }).notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

/** Payme (Paycom) Merchant API transactions. Times are milliseconds, as in the protocol. */
export const paymeTransactions = pgTable(
  "payme_transactions",
  {
    /** Our id, returned to Payme as `transaction`. */
    id: uuid("id").primaryKey().defaultRandom(),
    /** Payme's own transaction id. */
    paycomId: text("paycom_id").notNull().unique(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    /** In tiyin. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    /** 1 created, 2 performed, -1 cancelled before perform, -2 cancelled after perform */
    state: integer("state").notNull(),
    reason: integer("reason"),
    /** Creation time on the Payme side. */
    paycomTime: bigint("paycom_time", { mode: "number" }).notNull(),
    createTime: bigint("create_time", { mode: "number" }).notNull(),
    performTime: bigint("perform_time", { mode: "number" }).notNull().default(0),
    cancelTime: bigint("cancel_time", { mode: "number" }).notNull().default(0),
  },
  (table) => [
    index("payme_transactions_order_idx").on(table.orderId),
    index("payme_transactions_time_idx").on(table.paycomTime),
  ],
);

export type ClickStatus = "prepared" | "completed" | "cancelled";

/** Click SHOP API payments. */
export const clickTransactions = pgTable(
  "click_transactions",
  {
    /** Returned to Click as `merchant_prepare_id` and `merchant_confirm_id`. */
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ startWith: 1001 }),
    /** Click's own payment id. */
    clickTransId: text("click_trans_id").notNull().unique(),
    clickPaydocId: text("click_paydoc_id"),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    /** In so'm. */
    amount: bigint("amount", { mode: "number" }).notNull(),
    status: text("status").$type<ClickStatus>().notNull().default("prepared"),
    createdAt: createdAt(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("click_transactions_order_idx").on(table.orderId)],
);

/** What happened to an order and who did it; shown as the order's history in the admin panel. */
export type OrderEventType = "status" | "paid" | "unpaid" | "refunded";
export type OrderActor = "admin" | "payme" | "click" | "system";

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").$type<OrderEventType>().notNull(),
    /** Set when the event also moved the order to another status. */
    fromStatus: text("from_status").$type<OrderStatus>(),
    toStatus: text("to_status").$type<OrderStatus>(),
    actor: text("actor").$type<OrderActor>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("order_events_order_idx").on(table.orderId, table.createdAt)],
);

/** Browsers signed in to the admin panel. */
export const adminSessions = pgTable("admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** SHA-256 of the cookie value; the value itself is never stored. */
  tokenHash: text("token_hash").notNull().unique(),
  /** Fingerprint of the password used to sign in: changing the password signs everyone out. */
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Wrong admin passwords, kept for a day to slow down guessing. */
export const adminLoginAttempts = pgTable(
  "admin_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("admin_login_attempts_time_idx").on(table.createdAt)],
);

/**
 * People who wrote to the shop's Telegram bot or opened the Mini App.
 * Sharing a phone number links them to the customer with that number.
 */
export const telegramAccounts = pgTable("telegram_accounts", {
  /** Telegram's user id; in a private chat it is also the chat id. */
  id: bigint("id", { mode: "number" }).primaryKey(),
  customerId: uuid("customer_id")
    .unique()
    .references(() => customers.id, { onDelete: "set null" }),
  firstName: text("first_name"),
  username: text("username"),
  /** Language of the bot's messages */
  locale: text("locale").notNull().default("uz"),
  /** False after Telegram refused a message (the user blocked the bot or never started it). */
  reachable: boolean("reachable").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TelegramAudience = "shop" | "customer";
export type TelegramEvent = "placed" | "paid" | "confirmed" | "delivering" | "delivered" | "cancelled" | "refunded";

/**
 * Telegram messages about orders. A message is written down in the same
 * transaction as the change it reports and sent right after, so none is lost
 * when Telegram is briefly unreachable, and none is sent twice.
 */
export const telegramMessages = pgTable(
  "telegram_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    audience: text("audience").$type<TelegramAudience>().notNull(),
    event: text("event").$type<TelegramEvent>().notNull(),
    chatId: text("chat_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    /** A sender is busy with the message until this moment. */
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    /** Given up: Telegram refused the message for good, or it kept failing. */
    failedAt: timestamp("failed_at", { withTimezone: true }),
    error: text("error"),
    createdAt: createdAt(),
  },
  (table) => [
    // Each event is reported to each side once.
    uniqueIndex("telegram_messages_once_idx").on(table.orderId, table.audience, table.event),
    index("telegram_messages_pending_idx")
      .on(table.createdAt)
      .where(sql`${table.sentAt} is null and ${table.failedAt} is null`),
  ],
);

export type ProductRow = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type PaymeTransaction = typeof paymeTransactions.$inferSelect;
export type ClickTransaction = typeof clickTransactions.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type TelegramAccount = typeof telegramAccounts.$inferSelect;
export type TelegramMessage = typeof telegramMessages.$inferSelect;

export type PromoKind = "percent" | "amount";

/** Discount codes the admin hands out: a percentage or a fixed sum off the goods. */
export const promoCodes = pgTable("promo_codes", {
  /** Upper case, as customers type it in any case */
  code: text("code").primaryKey(),
  kind: text("kind").$type<PromoKind>().notNull(),
  /** Percent (1–90) or so'm */
  value: bigint("value", { mode: "number" }).notNull(),
  /** Goods worth at least this much (so'm) */
  minTotal: bigint("min_total", { mode: "number" }).notNull().default(0),
  /** How many orders may use it; null for no limit */
  maxUses: integer("max_uses"),
  uses: integer("uses").notNull().default(0),
  /** Works until the end of this moment; null for no end */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export type PromoCode = typeof promoCodes.$inferSelect;

export type ReviewStatus = "pending" | "approved" | "rejected";

/**
 * What customers say about products they bought. Only a customer whose order
 * with the product was delivered can write one, once per product, and it
 * shows in the shop after the admin approves it.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: text("product_id").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    /** The name shown under the review */
    name: text("name").notNull(),
    /** 1–5 stars */
    rating: integer("rating").notNull(),
    text: text("text").notNull(),
    status: text("status").$type<ReviewStatus>().notNull().default("pending"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("reviews_product_customer_idx").on(table.productId, table.customerId),
    index("reviews_status_idx").on(table.status, table.createdAt),
  ],
);

export type Review = typeof reviews.$inferSelect;

/**
 * The shop's terms for paying in parts: for so many months, the price grows
 * by so many percent. With no terms the shop does not offer it.
 */
export const installmentPlans = pgTable("installment_plans", {
  months: integer("months").primaryKey(),
  /** Added to the price, in percent (0 for none) */
  markup: integer("markup").notNull().default(0),
  createdAt: createdAt(),
});

export type InstallmentPlan = typeof installmentPlans.$inferSelect;
