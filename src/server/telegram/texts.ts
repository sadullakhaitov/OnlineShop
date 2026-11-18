import { mapLinks } from "@/lib/maps";
import type { Order, OrderItem, TelegramEvent } from "@/db/schema";
import { getDeliveryZone } from "@/data/delivery";
import { formatDateTime, formatPrice } from "@/lib/format";
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
    placed: "🛒 <b>YANGI BUYURTMA</b>  №{n}",
    paid: "✅ <b>TO'LOV KELDI</b>  №{n}",
    refunded: "↩️ <b>TO'LOV QAYTARILDI</b>  №{n}",
    refundedNote: "Buyurtma bekor qilingan, pul xaridorga qaytarildi.",
    customer: "Xaridor",
    pickup: "Do'kondan olib ketadi",
    delivery: "Yetkazib berish",
    payment: "To'lov",
    unpaid: "⏳ hali to'lanmagan",
    paidMark: "✅ to'langan",
    cashNote: "tovarni olganda",
    comment: "Izoh",
    items: "Tovarlar",
    pieces: "dona",
    subtotal: "Tovarlar",
    fee: "Yetkazib berish",
    discount: "Promokod",
    installment: "🗓 Muddatli to'lov: {months} oy, oyiga {sum}",
    map: "Xaritada ochish",
    free: "bepul",
    total: "JAMI",
    amount: "Summa",
    open: "📋 Buyurtmani ochish",
  },
  ru: {
    placed: "🛒 <b>НОВЫЙ ЗАКАЗ</b>  №{n}",
    paid: "✅ <b>ОПЛАТА ПОЛУЧЕНА</b>  №{n}",
    refunded: "↩️ <b>ОПЛАТА ВОЗВРАЩЕНА</b>  №{n}",
    refundedNote: "Заказ отменён, деньги возвращены покупателю.",
    customer: "Покупатель",
    pickup: "Самовывоз из магазина",
    delivery: "Доставка",
    payment: "Оплата",
    unpaid: "⏳ ещё не оплачен",
    paidMark: "✅ оплачен",
    cashNote: "при получении",
    comment: "Комментарий",
    items: "Товары",
    pieces: "шт.",
    subtotal: "Товары",
    fee: "Доставка",
    discount: "Промокод",
    installment: "🗓 Рассрочка: {months} мес., {sum} в месяц",
    map: "Открыть на карте",
    free: "бесплатно",
    total: "ИТОГО",
    amount: "Сумма",
    open: "📋 Открыть заказ",
  },
};

const LINE = "────────────────";

/**
 * What the shop's chat is told: the whole order when it arrives, laid out in
 * labelled blocks so staff can read it at a glance; a short note about money later.
 */
export function shopMessage(order: OrderForMessage, event: TelegramEvent, locale: BotLocale): { text: string; button: string } {
  const t = shopTexts[locale];
  const n = String(order.number);
  const method = methodName[locale][order.paymentMethod];
  const who = `👤 ${h(order.name)}\n📞 ${formatPhone(order.phone)}`;

  if (event === "paid" || event === "refunded") {
    const lines = [
      (event === "paid" ? t.paid : t.refunded).replace("{n}", n),
      LINE,
      `💰 ${t.amount}: <b>${money(order.total, locale)}</b>`,
      `💳 ${t.payment}: ${method}`,
      who,
    ];
    if (event === "refunded") lines.push("", t.refundedNote);
    return { text: lines.join("\n"), button: t.open };
  }

  const zone = getDeliveryZone(order.zone);
  const count = order.items.reduce((total, item) => total + item.quantity, 0);
  const lines = [t.placed.replace("{n}", n), `🕐 ${formatDateTime(order.createdAt, locale)}`, LINE, `<b>${t.customer}</b>`, who, ""];

  if (order.deliveryType === "pickup") {
    lines.push(`<b>🏬 ${t.pickup}</b>`, "");
  } else {
    lines.push(`<b>🚚 ${t.delivery}</b>`);
    if (zone) lines.push(`📍 ${h(zone.name[locale])}`);
    if (order.address) lines.push(`🏠 ${h(order.address)}`);
    if (order.lat !== null && order.lng !== null) {
      const links = mapLinks(order.lat, order.lng);
      lines.push(`🗺 <a href="${links.yandex}">${t.map}</a> · <a href="${links.google}">Google</a>`);
    }
    lines.push("");
  }

  const state = order.paymentMethod === "cash" ? t.cashNote : order.paymentStatus === "paid" ? t.paidMark : t.unpaid;
  lines.push(`<b>💳 ${t.payment}</b>`, `${method} · ${state}`);
  if (order.installmentMonths && order.installmentMonthly) {
    lines.push(t.installment.replace("{months}", String(order.installmentMonths)).replace("{sum}", money(order.installmentMonthly, locale)));
  }
  lines.push("");

  if (order.comment) lines.push(`<b>💬 ${t.comment}</b>`, `<i>${h(order.comment)}</i>`, "");

  lines.push(`<b>📦 ${t.items} (${count} ${t.pieces})</b>`);
  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${h(item.title)}`);
    lines.push(`     ${item.quantity} × ${formatPrice(item.price)} = <b>${money(item.price * item.quantity, locale)}</b>`);
  });

  lines.push(LINE);
  if (order.deliveryType === "delivery" || order.discount > 0) lines.push(`${t.subtotal}: ${money(order.subtotal, locale)}`);
  if (order.discount > 0) lines.push(`🎟 ${t.discount} ${h(order.promoCode ?? "")}: −${money(order.discount, locale)}`);
  if (order.deliveryType === "delivery") {
    lines.push(`${t.fee}: ${order.deliveryFee > 0 ? money(order.deliveryFee, locale) : t.free}`);
  }
  lines.push(`💰 <b>${t.total}: ${money(order.total, locale)}</b>`);
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
