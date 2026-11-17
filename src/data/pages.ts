import type { Localized } from "./products";

/**
 * The shop's information pages. The texts describe how the site works; terms
 * the shop decides itself (prices, deadlines, address) are kept general or
 * come from `delivery.ts` and `contacts.ts`, so they change in one place.
 */

export type InfoSlug = "delivery" | "warranty" | "faq" | "about" | "contacts" | "offer" | "privacy";

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
  offer: {
    title: l("Ommaviy oferta", "Публичная оферта"),
    lead: l(
      "Internet-do'kon orqali tovar sotish shartlari. Buyurtma berish bilan xaridor ushbu shartlarni to'liq qabul qilgan hisoblanadi.",
      "Условия продажи товаров через интернет-магазин. Оформляя заказ, покупатель полностью принимает эти условия.",
    ),
    sections: [
      {
        heading: l("1. Umumiy qoidalar", "1. Общие положения"),
        paragraphs: [
          l(
            "Ushbu hujjat O'zbekiston Respublikasi Fuqarolik kodeksiga muvofiq ommaviy oferta hisoblanadi: sotuvchi uni qabul qilgan har qanday shaxs bilan quyidagi shartlarda oldi-sotdi shartnomasini tuzishni taklif qiladi.",
            "Настоящий документ является публичной офертой в соответствии с Гражданским кодексом Республики Узбекистан: продавец предлагает заключить договор купли-продажи на указанных условиях с любым лицом, принявшим оферту.",
          ),
          l(
            "Saytda buyurtmani rasmiylashtirish (\"Buyurtma berish\" tugmasini bosish) ofertaning to'liq va so'zsiz qabul qilinishi (akspeti) hisoblanadi.",
            "Оформление заказа на сайте (нажатие кнопки «Оформить заказ») является полным и безоговорочным принятием (акцептом) оферты.",
          ),
          l(
            "Munosabatlar shuningdek \"Iste'molchilarning huquqlarini himoya qilish to'g'risida\"gi va \"Elektron tijorat to'g'risida\"gi qonunlar bilan tartibga solinadi.",
            "Отношения также регулируются законами «О защите прав потребителей» и «Об электронной коммерции».",
          ),
        ],
      },
      {
        heading: l("2. Buyurtma", "2. Заказ"),
        list: [
          l("Xaridor tovarni savatga qo'shadi, ism, telefon raqami, yetkazish usuli va to'lov usulini ko'rsatadi.", "Покупатель добавляет товар в корзину, указывает имя, номер телефона, способ доставки и оплаты."),
          l("Buyurtmadan so'ng sotuvchi operatori telefon orqali tafsilotlarni tasdiqlaydi.", "После заказа оператор продавца подтверждает детали по телефону."),
          l("Tovar qolmagan bo'lsa, sotuvchi xaridorga xabar beradi va to'langan summani qaytaradi yoki o'xshash tovar taklif qiladi.", "Если товара нет в наличии, продавец сообщает покупателю и возвращает оплату или предлагает аналог."),
        ],
      },
      {
        heading: l("3. Narx va to'lov", "3. Цена и оплата"),
        list: [
          l("Narxlar saytda so'mda ko'rsatilgan. Buyurtma narxi rasmiylashtirish paytidagi narx bo'yicha belgilanadi.", "Цены указаны на сайте в сумах. Цена заказа фиксируется на момент оформления."),
          l("To'lov Click, Payme orqali onlayn yoki tovarni qabul qilishda naqd yoki karta bilan amalga oshiriladi.", "Оплата производится онлайн через Click, Payme или при получении наличными или картой."),
          l("Onlayn to'lovda karta ma'lumotlari to'lov tizimi tomonida kiritiladi; sotuvchi ularni ko'rmaydi va saqlamaydi.", "При онлайн-оплате данные карты вводятся на стороне платёжной системы; продавец их не видит и не хранит."),
        ],
      },
      {
        heading: l("4. Yetkazib berish", "4. Доставка"),
        paragraphs: [
          l(
            "Yetkazish hududlari, narxi va muddatlari \"Yetkazib berish va to'lov\" sahifasida ko'rsatilgan. Tovarni qabul qilishda xaridor uning tashqi ko'rinishi va to'liqligini tekshiradi.",
            "Районы, стоимость и сроки доставки указаны на странице «Доставка и оплата». При получении покупатель проверяет внешний вид и комплектность товара.",
          ),
        ],
      },
      {
        heading: l("5. Kafolat, almashtirish va qaytarish", "5. Гарантия, обмен и возврат"),
        paragraphs: [
          l(
            "Tovarlarga ishlab chiqaruvchining rasmiy kafolati beriladi; muddati tovar sahifasida ko'rsatilgan. Nuqsonli tovarni almashtirish, ta'mirlash yoki pulni qaytarish iste'molchilar huquqlarini himoya qilish to'g'risidagi qonunda belgilangan tartib va muddatlarda amalga oshiriladi. Batafsil: \"Kafolat va qaytarish\" sahifasi.",
            "На товары действует официальная гарантия производителя; срок указан на странице товара. Обмен, ремонт или возврат денег за товар с недостатками производятся в порядке и сроки, установленные законом о защите прав потребителей. Подробнее: страница «Гарантия и возврат».",
          ),
        ],
      },
      {
        heading: l("6. Javobgarlik va nizolar", "6. Ответственность и споры"),
        paragraphs: [
          l(
            "Tomonlar majburiyatlarni bajarmaganlik uchun qonunchilikka muvofiq javob beradi. Nizolar avval muzokara yo'li bilan, kelishilmasa O'zbekiston Respublikasi sudlarida hal qilinadi.",
            "Стороны несут ответственность за неисполнение обязательств в соответствии с законодательством. Споры решаются переговорами, а при недостижении согласия — в судах Республики Узбекистан.",
          ),
          l(
            "Sotuvchi ofertani o'zgartirishi mumkin; yangi tahrir saytga joylangan paytdan kuchga kiradi va avval berilgan buyurtmalarga ta'sir qilmaydi.",
            "Продавец вправе изменять оферту; новая редакция действует с момента публикации на сайте и не влияет на ранее оформленные заказы.",
          ),
        ],
      },
    ],
  },
  privacy: {
    title: l("Maxfiylik siyosati", "Политика конфиденциальности"),
    lead: l(
      "Qaysi ma'lumotlaringizni nima uchun yig'amiz va qanday himoya qilamiz. Siyosat \"Shaxsga doir ma'lumotlar to'g'risida\"gi qonunga muvofiq tuzilgan.",
      "Какие данные мы собираем, зачем и как защищаем. Политика составлена в соответствии с законом «О персональных данных».",
    ),
    sections: [
      {
        heading: l("Qanday ma'lumotlar yig'iladi", "Какие данные собираются"),
        list: [
          l("Ism va telefon raqami: buyurtma va kabinetga kirish uchun.", "Имя и номер телефона: для заказа и входа в кабинет."),
          l("Yetkazish manzili va izoh: tovarni yetkazish uchun.", "Адрес доставки и комментарий: для доставки товара."),
          l("Buyurtmalar tarixi va to'lov holati (karta ma'lumotlarisiz).", "История заказов и статус оплаты (без данных карты)."),
          l("Telegram orqali kirsangiz: Telegram ID, ism va siz ulashgan telefon raqami.", "При входе через Telegram: Telegram ID, имя и номер телефона, которым вы поделились."),
          l("Saytni ishlatish uchun zarur cookie fayllar: kirish, savat, til va mavzu.", "Необходимые cookie: вход, корзина, язык и тема оформления."),
        ],
      },
      {
        heading: l("Nima uchun ishlatiladi", "Для чего используются"),
        list: [
          l("Buyurtmani qabul qilish, tasdiqlash va yetkazish.", "Приём, подтверждение и доставка заказа."),
          l("Buyurtma holati haqida xabar berish (SMS, Telegram).", "Уведомления о статусе заказа (SMS, Telegram)."),
          l("Kafolat va qaytarish bo'yicha murojaatlarni ko'rib chiqish.", "Рассмотрение обращений по гарантии и возврату."),
        ],
        paragraphs: [
          l("Reklama xabarlari faqat roziligingiz bilan yuboriladi. Ma'lumotlar sotilmaydi.", "Рекламные сообщения отправляются только с вашего согласия. Данные не продаются."),
        ],
      },
      {
        heading: l("Kimga beriladi", "Кому передаются"),
        list: [
          l("To'lov tizimlari (Click, Payme): faqat to'lov uchun zarur summa va buyurtma raqami.", "Платёжные системы (Click, Payme): только сумма и номер заказа, нужные для оплаты."),
          l("SMS xizmati: kirish kodi yuboriladigan telefon raqami.", "SMS-сервис: номер телефона для отправки кода."),
          l("Kuryer: yetkazish uchun ism, telefon va manzil.", "Курьер: имя, телефон и адрес для доставки."),
          l("Davlat organlari: faqat qonunda nazarda tutilgan hollarda.", "Государственные органы: только в случаях, предусмотренных законом."),
        ],
      },
      {
        heading: l("Saqlash va himoya", "Хранение и защита"),
        paragraphs: [
          l(
            "Ma'lumotlar himoyalangan serverlarda saqlanadi, kirish faqat vakolatli xodimlarga ochiq. Kirish kodlari va seans kalitlari shifrlangan holda saqlanadi. Ma'lumotlar maqsadga erishilguncha yoki qonunda belgilangan muddat davomida saqlanadi.",
            "Данные хранятся на защищённых серверах, доступ есть только у уполномоченных сотрудников. Коды входа и ключи сеансов хранятся в зашифрованном виде. Данные хранятся до достижения цели или в течение срока, установленного законом.",
          ),
        ],
      },
      {
        heading: l("Sizning huquqlaringiz", "Ваши права"),
        paragraphs: [
          l(
            "Siz o'z ma'lumotlaringiz haqida bilish, ularni tuzatish yoki o'chirishni so'rash, roziligingizni qaytarib olish huquqiga egasiz. Buning uchun \"Kontaktlar\" sahifasidagi telefon yoki Telegram orqali murojaat qiling.",
            "Вы вправе узнать о своих данных, потребовать их исправления или удаления, отозвать согласие. Для этого обратитесь по телефону или в Telegram со страницы «Контакты».",
          ),
        ],
      },
    ],
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
  seller: l("Sotuvchi rekvizitlari", "Реквизиты продавца"),
  sellerName: l("Sotuvchi", "Продавец"),
  tin: l("STIR", "ИНН"),
  bank: l("Bank", "Банк"),
  account: l("Hisob raqami", "Расчётный счёт"),
  updated: l("Oxirgi tahrir: {date}", "Последняя редакция: {date}"),
};
