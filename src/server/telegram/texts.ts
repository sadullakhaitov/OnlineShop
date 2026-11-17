import type { Order, OrderItem, TelegramEvent } from "@/db/schema";
import { getDeliveryZone } from "@/data/delivery";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { escapeHtml as h } from "./api";

/**
 * Everything the bot writes, in Uzbek and Russian. Messages use Telegram's
 * HTML formatting, so every value that comes from people is escaped.
 */

export type BotLocale = "uz" | "ru";

const sum = { uz: "so'm", ru: "сум" };
const money = (value: number, locale: BotLocale) => `${formatPrice(value)} ${sum[locale]}`;

const methodName = {
  uz: { payme: "Payme", click: "Click", cash: "Qabul qilganda to'lash" },
  ru: { payme: "Payme", click: "Click", cash: "Оплата при получении" },
};

export const bot = {
  uz: {
    welcome: (name: string) =>
      `Assalomu alaykum${name ? `, ${h(name)}` : ""}! 👋\n\n<b>Multimedia</b> — Buxoro shahri va tumanlariga maishiy texnika yetkazib beradigan internet-do'kon. Katalog, savat va buyurtmalar pastdagi tugmada.`,
    welcomeNoShop: "Do'kon hali ulanmagan: sayt manzili https bilan boshlanishi kerak.",
    askContact:
      "Buyurtmalaringiz holatini shu yerga yuboramiz, do'konga esa SMS kodsiz kirasiz. Buning uchun raqamingizni ulashing 👇",
    shareContact: "📱 Raqamni yuborish",
    linked: (phone: string) =>
      `Rahmat! ${formatPhone(phone)} raqami saqlandi. Endi buyurtmalaringiz haqida shu yerda xabar beramiz, do'konga esa avtomatik kirasiz.`,
    notOwnContact: "Iltimos, o'zingizning raqamingizni pastdagi tugma orqali yuboring.",
    foreignPhone: "Kechirasiz, hozircha faqat O'zbekiston raqamlari (+998) bilan kirish mumkin.",
    help: "Do'konni ochish uchun pastdagi tugmani bosing.",
    chatId: (id: string) =>
      `Bu chatning ID raqami: <code>${h(id)}</code>\n\nBuyurtmalar haqidagi xabarlar shu yerga kelishi uchun hostingda <code>TELEGRAM_ADMIN_CHAT_ID</code> sozlamasiga shu raqamni yozing.`,
    chooseLanguage: "Tilni tanlang:",
    languageSet: "Til: O'zbekcha ✓",
    openShop: "🛍 Do'konni ochish",
    myOrders: "📦 Buyurtmalarim",
    otherLanguage: "🇷🇺 Русский",
    menuButton: "Do'kon",
    commands: { start: "Do'konni ochish", lang: "Tilni o'zgartirish", id: "Chat ID raqami" },
    description:
      "Multimedia — Buxoro shahri va tumanlariga maishiy texnika yetkazib beradigan internet-do'kon: televizorlar, muzlatgichlar, kir yuvish mashinalari, smartfonlar va boshqalar. Click, Payme yoki naqd to'lov.",
    shortDescription: "Maishiy texnika internet-do'koni. Buxoro bo'ylab yetkazib berish.",
    test: "✅ Sinov xabari: Multimedia buyurtmalari haqidagi xabarlar shu chatga keladi.",
  },
  ru: {
    welcome: (name: string) =>
      `Здравствуйте${name ? `, ${h(name)}` : ""}! 👋\n\n<b>Multimedia</b> — интернет-магазин бытовой техники с доставкой по Бухаре и районам. Каталог, корзина и заказы — по кнопке ниже.`,
    welcomeNoShop: "Магазин ещё не подключён: адрес сайта должен начинаться с https.",
    askContact:
      "Мы будем присылать сюда статус ваших заказов, а входить в магазин можно будет без SMS-кода. Для этого поделитесь номером 👇",
    shareContact: "📱 Отправить номер",
    linked: (phone: string) =>
      `Спасибо! Номер ${formatPhone(phone)} сохранён. Теперь уведомления о заказах будут приходить сюда, а в магазин вы будете входить автоматически.`,
    notOwnContact: "Пожалуйста, отправьте свой номер кнопкой ниже.",
    foreignPhone: "К сожалению, пока можно войти только с номером Узбекистана (+998).",
    help: "Чтобы открыть магазин, нажмите кнопку ниже.",
    chatId: (id: string) =>
      `ID этого чата: <code>${h(id)}</code>\n\nЧтобы уведомления о заказах приходили сюда, впишите это число в настройку <code>TELEGRAM_ADMIN_CHAT_ID</code> на хостинге.`,
    chooseLanguage: "Выберите язык:",
    languageSet: "Язык: Русский ✓",
    openShop: "🛍 Открыть магазин",
    myOrders: "📦 Мои заказы",
    otherLanguage: "🇺🇿 O'zbekcha",
    menuButton: "Магазин",
    commands: { start: "Открыть магазин", lang: "Сменить язык", id: "ID чата" },
    description:
      "Multimedia — интернет-магазин бытовой техники с доставкой по Бухаре и районам: телевизоры, холодильники, стиральные машины, смартфоны и многое другое. Оплата через Click, Payme или наличными.",
    shortDescription: "Интернет-магазин бытовой техники. Доставка по Бухаре и районам.",
    test: "✅ Тестовое сообщение: уведомления о заказах Multimedia будут приходить в этот чат.",
  },
} satisfies Record<BotLocale, unknown>;

export type OrderForMessage = Order & { items: OrderItem[] };

const shopTexts = {
  uz: {
    placed: "🛒 <b>Yangi buyurtma №{n}</b>",
    paid: "💳 <b>To'lov qabul qilindi</b> · №{n}",
    refunded: "↩️ <b>To'lov qaytarildi</b> · №{n}\nBuyurtma bekor qilindi.",
    pickup: "Do'kondan olib ketish",
    delivery: "Yetkazib berish",
    unpaid: "to'lanmagan",
    paidMark: "to'langan",
    comment: "Izoh",
    total: "Jami",
    fee: "Yetkazib berish",
    free: "bepul",
    open: "Buyurtmani ochish",
  },
  ru: {
    placed: "🛒 <b>Новый заказ №{n}</b>",
    paid: "💳 <b>Оплата получена</b> · №{n}",
    refunded: "↩️ <b>Оплата возвращена</b> · №{n}\nЗаказ отменён.",
    pickup: "Самовывоз",
    delivery: "Доставка",
    unpaid: "не оплачен",
    paidMark: "оплачен",
    comment: "Комментарий",
    total: "Итого",
    fee: "Доставка",
    free: "бесплатно",
    open: "Открыть заказ",
  },
};

/** What the shop's chat is told: the whole order when it arrives, a line about money later. */
export function shopMessage(order: OrderForMessage, event: TelegramEvent, locale: BotLocale): { text: string; button: string } {
  const t = shopTexts[locale];
  const n = String(order.number);
  const method = methodName[locale][order.paymentMethod];
  if (event === "paid") return { text: `${t.paid.replace("{n}", n)}\n${money(order.total, locale)} · ${method}`, button: t.open };
  if (event === "refunded") return { text: `${t.refunded.replace("{n}", n)}\n${money(order.total, locale)} · ${method}`, button: t.open };

  const zone = getDeliveryZone(order.zone);
  const lines = [
    t.placed.replace("{n}", n),
    "",
    `👤 ${h(order.name)} · ${formatPhone(order.phone)}`,
    order.deliveryType === "pickup"
      ? `🏬 ${t.pickup}`
      : `🚚 ${t.delivery}: ${h([zone?.name[locale], order.address].filter(Boolean).join(", "))}`,
    `💳 ${method}${order.paymentMethod === "cash" ? "" : ` · ${order.paymentStatus === "paid" ? t.paidMark : t.unpaid}`}`,
  ];
  if (order.comment) lines.push(`💬 ${t.comment}: ${h(order.comment)}`);
  lines.push("");
  for (const item of order.items) {
    lines.push(`• ${h(item.title)} × ${item.quantity} — ${money(item.price * item.quantity, locale)}`);
  }
  if (order.deliveryType === "delivery") {
    lines.push(`${t.fee}: ${order.deliveryFee > 0 ? money(order.deliveryFee, locale) : t.free}`);
  }
  lines.push(`<b>${t.total}: ${money(order.total, locale)}</b>`);
  return { text: lines.join("\n"), button: t.open };
}

const customerTexts = {
  uz: {
    placed: "✅ <b>Buyurtmangiz qabul qilindi</b>\n№{n} · {total}",
    placedOnline: "To'lov: {method}. To'lov o'tgach, buyurtma tasdiqlanadi.",
    placedCash: "To'lov: {method}.",
    later: "Buyurtma holati o'zgarganda shu yerda xabar beramiz.",
    paid: "💳 <b>To'lov qabul qilindi</b>\nBuyurtma №{n} tasdiqlandi. Rahmat!",
    confirmed: "👍 <b>Buyurtma №{n} tasdiqlandi</b>\nBuyurtmangizni tayyorlayapmiz.",
    delivering: "🚚 <b>Buyurtma №{n} yo'lda</b>\nKuryer buyurtmangizni olib ketdi.",
    readyForPickup: "📦 <b>Buyurtma №{n} tayyor</b>\nDo'kondan olib ketishingiz mumkin.",
    delivered: "🎉 <b>Buyurtma №{n} topshirildi</b>\nXaridingiz uchun rahmat!",
    cancelled: "❌ <b>Buyurtma №{n} bekor qilindi</b>\nSavollar bo'lsa, biz bilan bog'laning.",
    cancelledPaid: "To'langan summa qaytariladi.",
    refunded: "↩️ <b>Buyurtma №{n} uchun to'lov qaytarildi</b>",
    open: "Buyurtmani ko'rish",
  },
  ru: {
    placed: "✅ <b>Ваш заказ принят</b>\n№{n} · {total}",
    placedOnline: "Оплата: {method}. После оплаты заказ будет подтверждён.",
    placedCash: "Оплата: {method}.",
    later: "Мы напишем сюда, когда статус заказа изменится.",
    paid: "💳 <b>Оплата получена</b>\nЗаказ №{n} подтверждён. Спасибо!",
    confirmed: "👍 <b>Заказ №{n} подтверждён</b>\nМы готовим ваш заказ.",
    delivering: "🚚 <b>Заказ №{n} в пути</b>\nКурьер забрал ваш заказ.",
    readyForPickup: "📦 <b>Заказ №{n} готов</b>\nЕго можно забрать в магазине.",
    delivered: "🎉 <b>Заказ №{n} вручён</b>\nСпасибо за покупку!",
    cancelled: "❌ <b>Заказ №{n} отменён</b>\nЕсли есть вопросы, свяжитесь с нами.",
    cancelledPaid: "Оплаченная сумма будет возвращена.",
    refunded: "↩️ <b>Оплата по заказу №{n} возвращена</b>",
    open: "Посмотреть заказ",
  },
};

/** What the customer is told about their order. */
export function customerMessage(order: OrderForMessage, event: TelegramEvent, locale: BotLocale): { text: string; button: string } {
  const t = customerTexts[locale];
  const fill = (text: string) =>
    text
      .replace("{n}", String(order.number))
      .replace("{total}", money(order.total, locale))
      .replace("{method}", methodName[locale][order.paymentMethod]);

  let text: string;
  if (event === "placed") {
    text = [fill(t.placed), fill(order.paymentMethod === "cash" ? t.placedCash : t.placedOnline), t.later].join("\n\n");
  } else if (event === "delivering" && order.deliveryType === "pickup") {
    text = fill(t.readyForPickup);
  } else if (event === "cancelled" && order.paymentStatus === "paid") {
    text = `${fill(t.cancelled)}\n${t.cancelledPaid}`;
  } else {
    text = fill(t[event]);
  }
  return { text, button: t.open };
}
