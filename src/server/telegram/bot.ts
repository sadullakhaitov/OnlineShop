import type { Db } from "@/db";
import type { TelegramConfig } from "@/server/config";
import { callTelegram, isPublicUrl } from "./api";
import { getTelegramAccount, linkTelegramPhone, saveTelegramUser, setReachable, setTelegramLocale } from "./accounts";
import { localeOf, toTelegramUser } from "./init-data";
import { bot, type BotLocale } from "./texts";

/**
 * What the bot does with the updates Telegram sends to the webhook:
 * greets people with a button that opens the shop, saves the phone number
 * they share, tells a group its chat id, and switches the language.
 */

type Chat = { id: number; type: string };
type Message = {
  message_id: number;
  chat: Chat;
  from?: Record<string, unknown>;
  text?: string;
  contact?: { phone_number?: string; first_name?: string; last_name?: string; user_id?: number };
};
type Update = {
  update_id: number;
  message?: Message;
  callback_query?: { id: string; from: Record<string, unknown>; data?: string; message?: Message };
  my_chat_member?: { chat: Chat; from: Record<string, unknown>; new_chat_member?: { status?: string } };
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** The command in a message ("/start", "/id@MultimediaBot" -> "id"), without its arguments. */
function commandOf(text: string | undefined): string | null {
  const match = /^\/([a-z]+)(?:@\w+)?(?:\s|$)/i.exec(text ?? "");
  return match ? match[1].toLowerCase() : null;
}

export class TelegramBot {
  constructor(
    private readonly db: Db,
    private readonly config: TelegramConfig,
    /** The shop's public address; the buttons need https. */
    private readonly siteUrl: string | null,
  ) {}

  private send(chatId: number, text: string, replyMarkup?: object) {
    return callTelegram(this.config.token, "sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      reply_markup: replyMarkup,
    });
  }

  private shopUrl(locale: BotLocale, path = ""): string | null {
    return isPublicUrl(this.siteUrl) ? `${this.siteUrl}/${locale}${path}` : null;
  }

  /** Buttons under the greeting: the shop, the customer's orders, the other language. */
  private menu(locale: BotLocale, linked: boolean) {
    const t = bot[locale];
    const shop = this.shopUrl(locale);
    const orders = this.shopUrl(locale, "/account");
    const rows: object[][] = [];
    if (shop) rows.push([{ text: t.openShop, web_app: { url: shop } }]);
    if (linked && orders) rows.push([{ text: t.myOrders, web_app: { url: orders } }]);
    rows.push([{ text: t.otherLanguage, callback_data: `lang:${locale === "uz" ? "ru" : "uz"}` }]);
    return { inline_keyboard: rows };
  }

  private contactKeyboard(locale: BotLocale) {
    return {
      keyboard: [[{ text: bot[locale].shareContact, request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  /** Telegram's own "menu" button next to the message field opens the shop in the user's language. */
  private async setMenuButton(chatId: number, locale: BotLocale) {
    const url = this.shopUrl(locale);
    if (!url) return;
    await callTelegram(this.config.token, "setChatMenuButton", {
      chat_id: chatId,
      menu_button: { type: "web_app", text: bot[locale].menuButton, web_app: { url } },
    }).catch((error) => console.error("Menu button was not set", error));
  }

  private async greet(chatId: number, userId: number) {
    const account = await getTelegramAccount(this.db, userId);
    const locale = (account?.locale as BotLocale) ?? "uz";
    const t = bot[locale];
    const linked = Boolean(account?.phone);
    await this.send(chatId, `${t.welcome(account?.firstName ?? "")}${this.shopUrl(locale) ? "" : `\n\n${t.welcomeNoShop}`}`, this.menu(locale, linked));
    if (!linked) await this.send(chatId, t.askContact, this.contactKeyboard(locale));
  }

  async handle(raw: unknown): Promise<void> {
    if (!isObject(raw)) return;
    const update = raw as Update;
    if (update.message) return this.onMessage(update.message);
    if (update.callback_query) return this.onCallback(update.callback_query);
    if (update.my_chat_member) return this.onMembership(update.my_chat_member);
  }

  private async onMessage(message: Message) {
    const { chat } = message;
    const command = commandOf(message.text);

    if (chat.type !== "private") {
      // In groups the bot only answers /id: that is how the shop finds its chat id.
      if (command === "id") await this.send(chat.id, bot[this.config.adminLocale].chatId(String(chat.id)));
      return;
    }

    const user = toTelegramUser(isObject(message.from) ? message.from : null);
    if (!user) return;
    const account = await saveTelegramUser(this.db, user);
    // They wrote to the bot, so it may write to them again.
    if (!account.reachable) await setReachable(this.db, user.id, true);
    const locale = account.locale as BotLocale;
    const t = bot[locale];

    if (message.contact) {
      // Only the user's own number counts: Telegram then vouches that it is theirs.
      if (message.contact.user_id !== user.id || !message.contact.phone_number) {
        await this.send(chat.id, t.notOwnContact, this.contactKeyboard(locale));
        return;
      }
      const linked = await linkTelegramPhone(this.db, user, message.contact.phone_number);
      if (!linked.ok) {
        await this.send(chat.id, t.foreignPhone, { remove_keyboard: true });
        return;
      }
      await this.send(chat.id, t.linked(linked.customer.phone), { remove_keyboard: true });
      await this.send(chat.id, t.help, this.menu(locale, true));
      return;
    }

    if (command === "start") {
      await this.setMenuButton(chat.id, locale);
      await this.greet(chat.id, user.id);
    } else if (command === "id") {
      await this.send(chat.id, t.chatId(String(chat.id)));
    } else if (command === "lang") {
      await this.send(chat.id, t.chooseLanguage, {
        inline_keyboard: [
          [
            { text: "🇺🇿 O'zbekcha", callback_data: "lang:uz" },
            { text: "🇷🇺 Русский", callback_data: "lang:ru" },
          ],
        ],
      });
    } else {
      const linked = Boolean((await getTelegramAccount(this.db, user.id))?.phone);
      await this.send(chat.id, t.help, this.menu(locale, linked));
    }
  }

  private async onCallback(query: NonNullable<Update["callback_query"]>) {
    const user = toTelegramUser(query.from);
    const choice = /^lang:(uz|ru)$/.exec(query.data ?? "")?.[1] as BotLocale | undefined;
    if (!user || !choice) {
      await callTelegram(this.config.token, "answerCallbackQuery", { callback_query_id: query.id });
      return;
    }
    await saveTelegramUser(this.db, user);
    await setTelegramLocale(this.db, user.id, choice);
    await callTelegram(this.config.token, "answerCallbackQuery", { callback_query_id: query.id, text: bot[choice].languageSet });
    const chatId = query.message?.chat.id ?? user.id;
    await this.setMenuButton(chatId, choice);
    await this.greet(chatId, user.id);
  }

  private async onMembership(update: NonNullable<Update["my_chat_member"]>) {
    const status = update.new_chat_member?.status;
    if (update.chat.type === "private") {
      // "kicked" means the user blocked the bot.
      if (status === "kicked" || status === "member") await setReachable(this.db, update.chat.id, status === "member");
      return;
    }
    // Added to a group or a channel: say the chat id, which the shop needs for its settings.
    if ((status === "member" || status === "administrator") && update.chat.type !== "channel") {
      const user = toTelegramUser(update.from);
      const locale = user ? localeOf(user.languageCode) : this.config.adminLocale;
      await this.send(update.chat.id, bot[locale].chatId(String(update.chat.id)));
    }
  }
}
