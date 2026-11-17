import { bigint, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Database tables. Products are not here yet: they stay in `src/data` until
 * the admin panel step. Money is stored in whole so'm; Payme amounts in tiyin.
 *
 * After changing this file run `npm run db:generate` to create a migration.
 */

export type DeliveryType = "delivery" | "pickup";
export type PaymentMethod = "payme" | "click" | "cash";
export type OrderStatus = "new" | "confirmed" | "delivering" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

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
    comment: text("comment"),
    paymentMethod: text("payment_method").$type<PaymentMethod>().notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("new"),
    paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("unpaid"),
    subtotal: bigint("subtotal", { mode: "number" }).notNull(),
    deliveryFee: bigint("delivery_fee", { mode: "number" }).notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
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

export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type PaymeTransaction = typeof paymeTransactions.$inferSelect;
export type ClickTransaction = typeof clickTransactions.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
