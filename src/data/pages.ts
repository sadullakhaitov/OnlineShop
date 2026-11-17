import type { Localized } from "./products";

/**
 * The shop's information pages. The texts describe how the site works; terms
 * the shop decides itself (prices, deadlines, address) are kept general or
 * come from `delivery.ts` and `contacts.ts`, so they change in one place.
 */

export type InfoSlug = "delivery" | "warranty" | "faq" | "about" | "contacts";

export type InfoSection = {
  heading: Localized;
  paragraphs?: Localized[];
  list?: Localized[];
};

export type InfoPage = {
  title: Localized;
  lead: Localized;
  sections: InfoSection[];
};

const l = (uz: string, ru: string): Localized => ({ uz, ru });

export const infoPages: Record<InfoSlug, InfoPage> = {
  delivery: {
    title: l("Yetkazib berish va to'lov", "Доставка и оплата"),
    lead: l(
      "Buxoro shahri va viloyatning barcha tumanlariga yetkazib beramiz. Buyurtmani do'kondan o'zingiz olib ketishingiz ham mumkin.",
      "Доставляем по Бухаре и всем районам области. Заказ можно забрать и самостоятельно в магазине.",
    ),
    sections: [
      {
        heading: l("Qanday yetkaziladi", "Как проходит доставка"),
        list: [
          l("Buyurtmadan so'ng operator qo'ng'iroq qilib, vaqtni kelishib oladi.", "После заказа оператор позвонит и согласует время."),
          l("Kuryer tovarni manzilingizgacha olib keladi; qabul qilishda tovarni tekshirib ko'ring.", "Курьер привезёт товар по адресу; проверьте товар при получении."),
          l("Buyurtma holati sayt kabinetida va Telegram botda ko'rinib turadi.", "Статус заказа виден в личном кабинете и в Telegram-боте."),
        ],
      },
      {
        heading: l("To'lov usullari", "Способы оплаты"),
        list: [
          l("Click: ilova yoki karta orqali onlayn.", "Click: онлайн через приложение или картой."),
          l("Payme: ilova yoki karta orqali onlayn.", "Payme: онлайн через приложение или картой."),
          l("Qabul qilganda: naqd yoki karta bilan.", "При получении: наличными или картой."),
        ],
        paragraphs: [
          l(
            "Onlayn to'lov o'tishi bilan buyurtma avtomatik tasdiqlanadi. Bekor qilingan buyurtma uchun to'langan summa qaytariladi.",
            "После онлайн-оплаты заказ подтверждается автоматически. За отменённый заказ оплаченная сумма возвращается.",
          ),
        ],
      },
    ],
  },
  warranty: {
    title: l("Kafolat va qaytarish", "Гарантия и возврат"),
    lead: l(
      "Barcha tovarlar rasmiy kafolat bilan sotiladi. Kafolat muddati har bir mahsulot sahifasida ko'rsatilgan.",
      "Все товары продаются с официальной гарантией. Срок гарантии указан на странице каждого товара.",
    ),
    sections: [
      {
        heading: l("Tovarda nosozlik chiqsa", "Если товар неисправен"),
        list: [
          l("Biz bilan telefon yoki Telegram orqali bog'laning, buyurtma raqamini ayting.", "Свяжитесь с нами по телефону или в Telegram и назовите номер заказа."),
          l("Kafolat muddatida tovar servis markazida tekshiriladi va ta'mirlanadi yoki almashtiriladi.", "В течение гарантии товар проверят в сервисном центре и отремонтируют или заменят."),
          l("Chek yoki buyurtma raqami va kafolat taloni saqlansin.", "Сохраните чек или номер заказа и гарантийный талон."),
        ],
      },
      {
        heading: l("Qaytarish va almashtirish", "Возврат и обмен"),
        paragraphs: [
          l(
            "Tovarni qaytarish va almashtirish O'zbekiston Respublikasining iste'molchilar huquqlarini himoya qilish to'g'risidagi qonunchiligiga muvofiq amalga oshiriladi. Qaytarishdan oldin biz bilan bog'laning: sizga qadamma-qadam yordam beramiz.",
            "Возврат и обмен проводятся в соответствии с законодательством Республики Узбекистан о защите прав потребителей. Перед возвратом свяжитесь с нами: поможем на каждом шаге.",
          ),
        ],
      },
    ],
  },
  faq: {
    title: l("Savol-javoblar", "Вопросы и ответы"),
    lead: l("Xaridorlar ko'p beradigan savollar.", "Частые вопросы покупателей."),
    sections: [
      {
        heading: l("Buyurtma berish uchun ro'yxatdan o'tish kerakmi?", "Нужно ли регистрироваться для заказа?"),
        paragraphs: [l("Yo'q. Ism va telefon raqami yetarli. Keyin shu raqam bilan kirsangiz, buyurtmalaringiz kabinetda ko'rinadi.", "Нет. Достаточно имени и телефона. Если потом войти с этим номером, заказы появятся в кабинете.")],
      },
      {
        heading: l("Yetkazib berish qancha turadi?", "Сколько стоит доставка?"),
        paragraphs: [l("Narx hududga bog'liq va buyurtma berishda avtomatik hisoblanadi. Ma'lum summadan boshlab yetkazib berish bepul.", "Цена зависит от района и считается автоматически при оформлении. От определённой суммы доставка бесплатна.")],
      },
      {
        heading: l("Buyurtmam qayerda ekanini qanday bilaman?", "Как узнать, где мой заказ?"),
        paragraphs: [l("Buyurtma sahifasida va kabinetda holati ko'rinadi. Telegram botimizga raqamingizni yuborsangiz, har bir bosqich haqida xabar keladi.", "Статус виден на странице заказа и в кабинете. Если отправить номер нашему Telegram-боту, он сообщит о каждом этапе.")],
      },
      {
        heading: l("Onlayn to'lov xavfsizmi?", "Безопасна ли онлайн-оплата?"),
        paragraphs: [l("To'lov Click yoki Payme sahifasida amalga oshiriladi; karta ma'lumotlari bizning saytimizga kelmaydi.", "Оплата проходит на странице Click или Payme; данные карты не попадают на наш сайт.")],
      },
      {
        heading: l("Buyurtmani bekor qilsam bo'ladimi?", "Можно ли отменить заказ?"),
        paragraphs: [l("Ha, tovar yo'lga chiqmaguncha biz bilan bog'laning. To'langan summa qaytariladi.", "Да, свяжитесь с нами, пока заказ не отправлен. Оплаченная сумма вернётся.")],
      },
    ],
  },
  about: {
    title: l("Biz haqimizda", "О нас"),
    lead: l(
      "Multimedia — Buxoro shahri va tumanlari uchun maishiy texnika internet-do'koni.",
      "Multimedia — интернет-магазин бытовой техники для Бухары и районов.",
    ),
    sections: [
      {
        heading: l("Nima qilamiz", "Что мы делаем"),
        paragraphs: [
          l(
            "Televizorlar, muzlatgichlar, kir yuvish mashinalari, konditsionerlar, smartfonlar va uy uchun kichik texnikani rasmiy kafolat bilan sotamiz va uyingizgacha yetkazib beramiz.",
            "Продаём телевизоры, холодильники, стиральные машины, кондиционеры, смартфоны и мелкую технику для дома с официальной гарантией и доставляем до двери.",
          ),
        ],
      },
      {
        heading: l("Nega bizdan", "Почему мы"),
        list: [
          l("Buxoro bo'ylab tez yetkazib berish", "Быстрая доставка по Бухаре"),
          l("Click, Payme yoki qabul qilganda to'lash", "Оплата через Click, Payme или при получении"),
          l("Rasmiy kafolat va servis", "Официальная гарантия и сервис"),
          l("Sayt, Telegram va tez orada mobil ilova orqali xarid", "Покупки на сайте, в Telegram и скоро в мобильном приложении"),
        ],
      },
    ],
  },
  contacts: {
    title: l("Kontaktlar", "Контакты"),
    lead: l("Savol, taklif yoki buyurtma bo'yicha biz bilan bog'laning.", "Свяжитесь с нами по вопросам, предложениям или заказам."),
    sections: [],
  },
};

/** Small labels used by the information pages. */
export const infoLabels = {
  home: l("Bosh sahifa", "Главная"),
  zone: l("Hudud", "Район"),
  fee: l("Yetkazish narxi", "Стоимость доставки"),
  days: l("Muddat", "Срок"),
  free: l("Bepul", "Бесплатно"),
  sum: l("so'm", "сум"),
  dayUnit: l("kungacha", "дн."),
  zonesTitle: l("Hududlar va narxlar", "Районы и цены"),
  freeFrom: l("{sum} so'mdan ortiq buyurtmalar har qanday hududga bepul yetkaziladi.", "Заказы от {sum} сум доставляются бесплатно в любой район."),
  pickup: l("Do'kondan olib ketish bepul.", "Самовывоз из магазина бесплатный."),
  phone: l("Telefon", "Телефон"),
  email: l("Elektron pochta", "Эл. почта"),
  telegram: l("Telegram", "Telegram"),
  address: l("Manzil", "Адрес"),
  hours: l("Ish vaqti", "Время работы"),
  writeTelegram: l("Telegramda yozish", "Написать в Telegram"),
  seeAlso: l("Foydali sahifalar", "Полезные страницы"),
};
