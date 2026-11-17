import { after } from "next/server";
import { gt, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { telegramMessages } from "@/db/schema";
import { getSiteUrl, getTelegramConfig, type TelegramConfig } from "@/server/config";
import { callTelegram, isPublicUrl } from "./api";
import { sendQueuedMessages } from "./notify";
import { bot } from "./texts";

/** Connecting the bot to the shop, and sending messages after a response. */

const webhookPath = "/api/telegram/webhook";

/** Sends the waiting order messages once the current response has gone out. */
export function sendTelegramLater(headers: Headers): void {
  if (!getTelegramConfig()) return;
  const siteUrl = getSiteUrl(headers);
  after(async () => {
    try {
      await sendQueuedMessages(await getDb(), siteUrl);
    } catch (error) {
      console.error("Telegram messages were not sent", error);
    }
  });
}

/**
 * Tells Telegram where the shop is: the webhook for updates, the menu button
 * that opens the Mini App, the commands and the bot's descriptions.
 */
export async function connectBot(config: TelegramConfig, siteUrl: string): Promise<void> {
  if (!isPublicUrl(siteUrl)) throw new Error("The site address must be public and start with https");
  const call = (method: string, params: object) => callTelegram(config.token, method, params);

  await call("setWebhook", {
    url: `${siteUrl}${webhookPath}`,
    secret_token: config.webhookSecret,
    allowed_updates: ["message", "callback_query", "my_chat_member"],
  });
  await call("setChatMenuButton", {
    menu_button: { type: "web_app", text: bot.uz.menuButton, web_app: { url: `${siteUrl}/uz` } },
  });
  // Uzbek for everyone, Russian for people whose Telegram is in Russian.
  for (const [locale, languageCode] of [
    ["uz", undefined],
    ["ru", "ru"],
  ] as const) {
    const t = bot[locale];
    const language = languageCode ? { language_code: languageCode } : {};
    await call("setMyCommands", {
      commands: [
        { command: "start", description: t.commands.start },
        { command: "lang", description: t.commands.lang },
        { command: "id", description: t.commands.id },
      ],
      ...language,
    });
    await call("setMyDescription", { description: t.description, ...language });
    await call("setMyShortDescription", { short_description: t.shortDescription, ...language });
  }
}

export type BotStatus = {
  username: string | null;
  name: string | null;
  /** Where Telegram sends updates now, and where it should */
  webhook: { url: string; expected: string; pending: number; lastError: string | null; lastErrorAt: Date | null } | null;
  /** Telegram did not accept the token or could not be reached */
  error: string | null;
};

export async function getBotStatus(config: TelegramConfig, siteUrl: string): Promise<BotStatus> {
  try {
    const me = await callTelegram<{ username?: string; first_name?: string }>(config.token, "getMe");
    const info = await callTelegram<{
      url: string;
      pending_update_count: number;
      last_error_message?: string;
      last_error_date?: number;
    }>(config.token, "getWebhookInfo");
    return {
      username: me.username ?? null,
      name: me.first_name ?? null,
      webhook: {
        url: info.url,
        expected: `${siteUrl}${webhookPath}`,
        pending: info.pending_update_count,
        lastError: info.last_error_message ?? null,
        lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000) : null,
      },
      error: null,
    };
  } catch (error) {
    return { username: null, name: null, webhook: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendTestMessage(config: TelegramConfig): Promise<void> {
  if (!config.adminChatId) throw new Error("TELEGRAM_ADMIN_CHAT_ID is not set");
  await callTelegram(config.token, "sendMessage", { chat_id: config.adminChatId, text: bot[config.adminLocale].test });
}

/** How the order messages of the last day went, for the admin page. */
export async function messageCounts(db: Db, now = new Date()) {
  const [row] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${telegramMessages.sentAt} is not null)`.mapWith(Number),
      waiting: sql<number>`count(*) filter (where ${telegramMessages.sentAt} is null and ${telegramMessages.failedAt} is null)`.mapWith(Number),
      failed: sql<number>`count(*) filter (where ${telegramMessages.failedAt} is not null)`.mapWith(Number),
      lastError: sql<string | null>`(array_agg(${telegramMessages.error} order by ${telegramMessages.createdAt} desc) filter (where ${telegramMessages.failedAt} is not null))[1]`,
    })
    .from(telegramMessages)
    .where(gt(telegramMessages.createdAt, new Date(now.getTime() - 24 * 60 * 60_000)));
  return row;
}
