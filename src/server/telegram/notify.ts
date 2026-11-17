import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { Db, Tx } from "@/db";
import {
  customers,
  orderItems,
  orders,
  telegramAccounts,
  telegramMessages,
  type Order,
  type TelegramAudience,
  type TelegramEvent,
  type TelegramMessage,
} from "@/db/schema";
import { getTelegramConfig, type TelegramConfig } from "@/server/config";
import { TelegramError, callTelegram, isPublicUrl } from "./api";
import { customerMessage, shopMessage, type BotLocale, type OrderForMessage } from "./texts";

/**
 * Telegram messages about orders: to the shop's chat (new orders, money) and
 * to the customer (every step of their order).
 *
 * A message is first written down, in the same transaction as the change it
 * reports, and sent once the response has gone out. A message that could not
 * be sent is tried again with the next one, for a day at most.
 */

/** The shop's chat hears about new orders and money; what the admin does is not repeated to them. */
const SHOP_EVENTS: TelegramEvent[] = ["placed", "paid", "refunded"];
const MAX_ATTEMPTS = 5;
const KEEP_TRYING = 24 * 60 * 60_000;

type Executor = Db | Tx;
type OrderRef = Pick<Order, "id" | "customerId" | "phone" | "telegramId">;

/** The Telegram chat of the person who ordered, if the bot may write to them. */
async function customerChat(db: Executor, order: OrderRef): Promise<number | null> {
  const ways: SQL[] = [eq(customers.phone, order.phone)];
  if (order.telegramId) ways.push(eq(telegramAccounts.id, order.telegramId));
  if (order.customerId) ways.push(eq(telegramAccounts.customerId, order.customerId));

  const [row] = await db
    .select({ id: telegramAccounts.id })
    .from(telegramAccounts)
    .leftJoin(customers, eq(customers.id, telegramAccounts.customerId))
    .where(and(eq(telegramAccounts.reachable, true), or(...ways)))
    // The account the order was placed from comes first.
    .orderBy(desc(sql`${telegramAccounts.id} = ${order.telegramId ?? 0}`), desc(telegramAccounts.updatedAt))
    .limit(1);
  return row?.id ?? null;
}

/** Writes down the messages about this event; call it inside the change's transaction. */
export async function queueOrderMessages(
  db: Executor,
  order: OrderRef,
  event: TelegramEvent,
  audiences: TelegramAudience[] = ["shop", "customer"],
): Promise<void> {
  const config = getTelegramConfig();
  if (!config) return;

  const rows: { orderId: string; audience: TelegramAudience; event: TelegramEvent; chatId: string }[] = [];
  if (audiences.includes("shop") && config.adminChatId && SHOP_EVENTS.includes(event)) {
    rows.push({ orderId: order.id, audience: "shop", event, chatId: config.adminChatId });
  }
  if (audiences.includes("customer")) {
    const chat = await customerChat(db, order);
    if (chat) rows.push({ orderId: order.id, audience: "customer", event, chatId: String(chat) });
  }
  if (rows.length > 0) await db.insert(telegramMessages).values(rows).onConflictDoNothing();
}

/** Takes up to `limit` waiting messages, so that no other sender takes them meanwhile. */
async function claim(db: Db, now: Date, limit: number): Promise<TelegramMessage[]> {
  return db.transaction(async (tx) => {
    const waiting = await tx
      .select({ id: telegramMessages.id })
      .from(telegramMessages)
      .where(
        and(
          isNull(telegramMessages.sentAt),
          isNull(telegramMessages.failedAt),
          or(isNull(telegramMessages.lockedUntil), lt(telegramMessages.lockedUntil, now)),
          gt(telegramMessages.createdAt, new Date(now.getTime() - KEEP_TRYING)),
        ),
      )
      .orderBy(asc(telegramMessages.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (waiting.length === 0) return [];
    return tx
      .update(telegramMessages)
      .set({ lockedUntil: new Date(now.getTime() + 60_000), attempts: sql`${telegramMessages.attempts} + 1` })
      .where(
        inArray(
          telegramMessages.id,
          waiting.map((row) => row.id),
        ),
      )
      .returning();
  });
}

async function loadOrder(db: Db, id: string): Promise<OrderForMessage | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...order, items };
}

function buildMessage(config: TelegramConfig, message: TelegramMessage, order: OrderForMessage, siteUrl: string | null) {
  const shop = message.audience === "shop";
  const locale: BotLocale = shop ? config.adminLocale : order.locale === "ru" ? "ru" : "uz";
  const { text, button } = shop ? shopMessage(order, message.event, locale) : customerMessage(order, message.event, locale);

  let replyMarkup: object | undefined;
  if (isPublicUrl(siteUrl)) {
    // The shop opens the admin panel in a browser; the customer gets the order inside the Mini App.
    replyMarkup = shop
      ? { inline_keyboard: [[{ text: button, url: `${siteUrl}/${locale}/admin/orders/${order.id}` }]] }
      : { inline_keyboard: [[{ text: button, web_app: { url: `${siteUrl}/${locale}/order/${order.id}` } }]] };
  }
  return {
    chat_id: message.chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: replyMarkup,
  };
}

/**
 * Sends the messages that are waiting. `siteUrl` is the shop's public address
 * for the buttons under the messages.
 */
export async function sendQueuedMessages(
  db: Db,
  siteUrl: string | null,
  now = new Date(),
  limit = 20,
): Promise<{ sent: number; failed: number }> {
  const config = getTelegramConfig();
  if (!config) return { sent: 0, failed: 0 };

  const result = { sent: 0, failed: 0 };
  const loaded = new Map<string, OrderForMessage | null>();
  for (const message of await claim(db, now, limit)) {
    if (!loaded.has(message.orderId)) loaded.set(message.orderId, await loadOrder(db, message.orderId));
    const order = loaded.get(message.orderId);
    const done = (set: Partial<TelegramMessage>) =>
      db.update(telegramMessages).set(set).where(eq(telegramMessages.id, message.id));

    if (!order) {
      await done({ failedAt: now, lockedUntil: null, error: "order not found" });
      result.failed += 1;
      continue;
    }
    try {
      await callTelegram(config.token, "sendMessage", buildMessage(config, message, order, siteUrl));
      await done({ sentAt: new Date(), lockedUntil: null, error: null });
      result.sent += 1;
    } catch (error) {
      const permanent = error instanceof TelegramError && error.permanent;
      const giveUp = permanent || message.attempts >= MAX_ATTEMPTS;
      const text = error instanceof Error ? error.message.slice(0, 500) : String(error);
      // A later attempt waits a little longer each time.
      await done({
        error: text,
        failedAt: giveUp ? now : null,
        lockedUntil: giveUp ? null : new Date(now.getTime() + message.attempts * 30_000),
      });
      // The customer blocked the bot or never started it: stop writing to them.
      if (message.audience === "customer" && error instanceof TelegramError && error.code === 403) {
        await db
          .update(telegramAccounts)
          .set({ reachable: false, updatedAt: now })
          .where(eq(telegramAccounts.id, Number(message.chatId)));
      }
      if (giveUp) result.failed += 1;
      console.error("Telegram message was not sent", text);
    }
  }
  return result;
}
