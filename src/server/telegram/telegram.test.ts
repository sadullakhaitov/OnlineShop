import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, orders, telegramAccounts, telegramMessages } from "@/db/schema";
import { getTelegramConfig } from "@/server/config";
import { changeOrderStatus } from "@/server/admin/orders";
import { getCustomerByToken } from "@/server/auth";
import { markOrderPaid } from "@/server/orders";
import { placeOrder, testDb } from "@/server/testing";
import { TelegramBot } from "./bot";
import { linkTelegramPhone, saveTelegramUser, signInTelegramUser } from "./accounts";
import { parseInitData, parseSharedContact, verifySignedData } from "./init-data";
import { sendQueuedMessages } from "./notify";

const TOKEN = "123456789:AAEhBOweik6ad6PsVAtFQlFgYbYw6xn3ZbW";
const SITE = "https://multimedia.uz";
const now = Date.UTC(2026, 10, 17, 9, 0, 0);
const seconds = String(Math.floor(now / 1000));

/** Signs fields the way Telegram does. */
function sign(fields: Record<string, string>, token = TOKEN): string {
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const check = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
}

const userJson = (id = 5001, extra: object = {}) =>
  JSON.stringify({ id, first_name: "Aziz", last_name: "Karimov", username: "aziz", language_code: "ru", ...extra });

describe("signed Telegram data", () => {
  it("accepts launch data signed with the bot token", () => {
    const raw = sign({ auth_date: seconds, query_id: "AAH", user: userJson() });
    expect(parseInitData(raw, TOKEN, now)).toMatchObject({ id: 5001, firstName: "Aziz", username: "aziz", languageCode: "ru" });
  });

  it("refuses changed, foreign, old and unsigned data", () => {
    const raw = sign({ auth_date: seconds, user: userJson() });
    expect(parseInitData(raw.replace("5001", "5002"), TOKEN, now)).toBeNull();
    expect(parseInitData(sign({ auth_date: seconds, user: userJson() }, "999:other-token-aaaaaaaaaaaaaaaaaaaaaaaaa"), TOKEN, now)).toBeNull();
    expect(parseInitData(raw, TOKEN, now + 25 * 60 * 60_000)).toBeNull();
    expect(parseInitData(`auth_date=${seconds}&user=${encodeURIComponent(userJson())}`, TOKEN, now)).toBeNull();
    expect(parseInitData("", TOKEN, now)).toBeNull();
  });

  it("checks the signature field with and without it in the signed string", () => {
    const fields = { auth_date: seconds, user: userJson(), signature: "abc" };
    expect(verifySignedData(sign(fields), TOKEN, now)).not.toBeNull();
    const { signature, ...rest } = fields;
    const withoutSignature = new URLSearchParams(sign(rest));
    withoutSignature.set("signature", signature);
    expect(verifySignedData(withoutSignature.toString(), TOKEN, now)).not.toBeNull();
  });

  it("reads a phone number shared from the Mini App", () => {
    const contact = JSON.stringify({ user_id: 5001, phone_number: "998901234567", first_name: "Aziz" });
    expect(parseSharedContact(sign({ auth_date: seconds, contact }), TOKEN, now)).toEqual({
      userId: 5001,
      phone: "998901234567",
      firstName: "Aziz",
      lastName: undefined,
    });
    // Ten minutes at most.
    expect(parseSharedContact(sign({ auth_date: seconds, contact }), TOKEN, now + 11 * 60_000)).toBeNull();
  });
});

type Call = { method: string; params: Record<string, unknown> };

describe("Telegram bot and order messages", () => {
  let db: Db;
  let calls: Call[];
  let answer: (method: string) => Response;

  beforeEach(async () => {
    db = await testDb();
    calls = [];
    answer = () => Response.json({ ok: true, result: { message_id: 1 } });
    vi.stubEnv("TELEGRAM_BOT_TOKEN", TOKEN);
    vi.stubEnv("TELEGRAM_ADMIN_CHAT_ID", "-1001234567890");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        const method = url.split("/").pop()!;
        calls.push({ method, params: JSON.parse(String(init.body)) });
        return answer(method);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const bot = () => new TelegramBot(db, getTelegramConfig()!, SITE);
  const from = { id: 5001, is_bot: false, first_name: "Aziz", language_code: "uz" };
  const message = (extra: object) => ({ update_id: 1, message: { message_id: 1, chat: { id: 5001, type: "private" }, from, ...extra } });
  const sent = () => calls.filter((call) => call.method === "sendMessage");

  it("greets a new user with the shop button and asks for the phone number", async () => {
    await bot().handle(message({ text: "/start" }));
    expect(calls.map((call) => call.method)).toEqual(["setChatMenuButton", "sendMessage", "sendMessage"]);
    expect(calls[0].params.menu_button).toEqual({ type: "web_app", text: "Do'kon", web_app: { url: `${SITE}/uz` } });
    const [greeting, ask] = sent();
    expect(greeting.params.text).toContain("Assalomu alaykum, Aziz!");
    expect(JSON.stringify(greeting.params.reply_markup)).toContain(`"web_app":{"url":"${SITE}/uz"}`);
    expect(ask.params.reply_markup).toMatchObject({ keyboard: [[{ request_contact: true }]] });
  });

  it("links the shared phone number to a customer and signs the user in", async () => {
    await bot().handle(message({ contact: { phone_number: "+998 90 123 45 67", first_name: "Aziz", user_id: 5001 } }));
    expect(sent()[0].params.text).toContain("+998 90 123 45 67");
    expect(sent()[0].params.reply_markup).toEqual({ remove_keyboard: true });

    const [customer] = await db.select().from(customers).where(eq(customers.phone, "+998901234567"));
    expect(customer.name).toBe("Aziz");
    const session = await signInTelegramUser(db, 5001);
    expect((await getCustomerByToken(db, session!.token))?.id).toBe(customer.id);
  });

  it("refuses someone else's number and foreign numbers", async () => {
    await bot().handle(message({ contact: { phone_number: "998901234567", first_name: "Boshqa", user_id: 7777 } }));
    await bot().handle(message({ contact: { phone_number: "79161234567", first_name: "Aziz", user_id: 5001 } }));
    expect(sent().map((call) => call.params.text)).toEqual([
      "Iltimos, o'zingizning raqamingizni pastdagi tugma orqali yuboring.",
      "Kechirasiz, hozircha faqat O'zbekiston raqamlari (+998) bilan kirish mumkin.",
    ]);
    expect(await db.select().from(customers)).toHaveLength(0);
  });

  it("moves a number to the Telegram account that shared it last", async () => {
    await linkTelegramPhone(db, { id: 1, firstName: "A" }, "998901234567");
    await linkTelegramPhone(db, { id: 2, firstName: "B" }, "998901234567");
    const accounts = await db.select().from(telegramAccounts);
    expect(accounts.find((row) => row.id === 1)?.customerId).toBeNull();
    expect(accounts.find((row) => row.id === 2)?.customerId).not.toBeNull();
  });

  it("tells a group its chat id and ignores other group messages", async () => {
    const group = { id: -1009876, type: "supergroup" };
    await bot().handle({ update_id: 2, message: { message_id: 1, chat: group, from, text: "salom" } });
    await bot().handle({ update_id: 3, message: { message_id: 2, chat: group, from, text: "/id@MultimediaBot" } });
    await bot().handle({ update_id: 4, my_chat_member: { chat: group, from, new_chat_member: { status: "member" } } });
    expect(sent()).toHaveLength(2);
    expect(sent()[0].params.text).toContain("<code>-1009876</code>");
  });

  it("switches the language and remembers who blocked the bot", async () => {
    await bot().handle({ update_id: 5, callback_query: { id: "q1", from, data: "lang:ru", message: { message_id: 1, chat: { id: 5001, type: "private" } } } });
    expect(calls.find((call) => call.method === "answerCallbackQuery")?.params.text).toBe("Язык: Русский ✓");
    expect(sent()[0].params.text).toContain("Здравствуйте, Aziz!");

    await bot().handle({ update_id: 6, my_chat_member: { chat: { id: 5001, type: "private" }, from, new_chat_member: { status: "kicked" } } });
    const [account] = await db.select().from(telegramAccounts);
    expect(account).toMatchObject({ locale: "ru", reachable: false });
  });

  it("tells the shop and the customer about a new order, once", async () => {
    await saveTelegramUser(db, { id: 5001, firstName: "Aziz", languageCode: "uz" });
    const order = await placeOrder(db, { paymentMethod: "payme", name: "Aziz <b>" });
    // Placed outside the Mini App and the phone is not linked: only the shop hears about it.
    expect(await sendQueuedMessages(db, SITE)).toEqual({ sent: 1, failed: 0 });
    const [shop] = sent();
    expect(shop.params.chat_id).toBe("-1001234567890");
    expect(shop.params.text).toContain(`YANGI BUYURTMA</b>  №${order.number}`);
    expect(shop.params.text).toContain("Aziz &lt;b&gt;");
    expect(JSON.stringify(shop.params.reply_markup)).toContain(`${SITE}/uz/admin/orders/${order.id}`);
    expect(await sendQueuedMessages(db, SITE)).toEqual({ sent: 0, failed: 0 });
  });

  it("follows an order placed in the Mini App through payment and delivery", async () => {
    await saveTelegramUser(db, { id: 5001, firstName: "Aziz" });
    const order = await placeOrder(db, { paymentMethod: "payme", locale: "ru" });
    // The order route passes the Telegram user; here it is set by hand.
    await db.update(orders).set({ telegramId: 5001 }).where(eq(orders.id, order.id));
    await db.delete(telegramMessages);

    await db.transaction((tx) => markOrderPaid(tx, order.id, "payme", new Date()));
    await changeOrderStatus(db, order.id, "confirmed", "delivering");
    await changeOrderStatus(db, order.id, "delivering", "confirmed"); // a mistake, fixed: not news
    await changeOrderStatus(db, order.id, "confirmed", "delivering"); // already told
    await sendQueuedMessages(db, SITE);

    const texts = sent().map((call) => `${call.params.chat_id}: ${String(call.params.text).split("\n")[0]}`);
    expect(texts).toEqual([
      `-1001234567890: ✅ <b>TO'LOV KELDI</b>  №${order.number}`,
      "5001: 💳 <b>Оплата получена</b>",
      `5001: 📦 <b>Заказ №${order.number} готов</b>`, // picked up in the shop
    ]);
    expect(JSON.stringify(sent()[1].params.reply_markup)).toContain(`"web_app":{"url":"${SITE}/ru/order/${order.id}"}`);
  });

  it("stops writing to a customer who blocked the bot, and retries when Telegram is down", async () => {
    await linkTelegramPhone(db, { id: 5001, firstName: "Aziz" }, "+998901234567");
    answer = (method) =>
      method === "sendMessage" && calls.at(-1)?.params.chat_id === "5001"
        ? Response.json({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" })
        : Response.json({ ok: false, error_code: 502, description: "Bad Gateway" });
    await placeOrder(db, { paymentMethod: "cash" });

    expect(await sendQueuedMessages(db, SITE)).toEqual({ sent: 0, failed: 1 });
    const [account] = await db.select().from(telegramAccounts);
    expect(account.reachable).toBe(false);

    // The shop's message waits and goes out once Telegram answers again.
    answer = () => Response.json({ ok: true, result: {} });
    expect(await sendQueuedMessages(db, SITE)).toEqual({ sent: 0, failed: 0 });
    expect(await sendQueuedMessages(db, SITE, new Date(Date.now() + 60_000))).toEqual({ sent: 1, failed: 0 });
  });

  it("does nothing without a bot token", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    await placeOrder(db);
    expect(await db.select().from(telegramMessages)).toHaveLength(0);
    expect(await sendQueuedMessages(db, SITE)).toEqual({ sent: 0, failed: 0 });
  });
});
