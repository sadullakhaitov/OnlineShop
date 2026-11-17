import type { Locale } from "@/i18n/routing";

export type ArtKind =
  | "coffee"
  | "vacuum"
  | "robot"
  | "blender"
  | "airfryer"
  | "fridge"
  | "washer"
  | "tv"
  | "ac"
  | "oven"
  | "purifier"
  | "microwave"
  | "kettle"
  | "iron"
  | "hairdryer"
  | "phone"
  | "headphones"
  | "speaker";

export type Localized = Record<Locale, string>;
export type ProductBadge = "hit" | "new";
export type ColorKey = "black" | "white" | "silver" | "beige" | "graphite" | "blue";

export type SpecKey =
  | "power"
  | "volume"
  | "capacity"
  | "screen"
  | "resolution"
  | "energy"
  | "noise"
  | "area"
  | "battery"
  | "spin"
  | "type"
  | "memory"
  | "camera"
  | "feature";

export type ProductSpecs = Partial<Record<SpecKey, Localized>>;

export type Product = {
  id: string;
  slug: string;
  category: string;
  art: ArtKind;
  brand: string;
  model: string;
  /** Brand and model, same in every language */
  title: string;
  /** Price in UZS */
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: ProductBadge;
  inStock: boolean;
  color: ColorKey;
  /** Warranty in years */
  warranty: number;
  specs: ProductSpecs;
  /** Link to the product photo; without one the product kind is drawn. */
  image?: string;
  /** Pieces left when the shop counts them */
  stock?: number;
};

export const artKinds = [
  "fridge",
  "washer",
  "oven",
  "microwave",
  "coffee",
  "kettle",
  "blender",
  "airfryer",
  "vacuum",
  "robot",
  "iron",
  "ac",
  "purifier",
  "tv",
  "speaker",
  "headphones",
  "hairdryer",
  "phone",
] as const satisfies readonly ArtKind[];

export const colorKeys = ["black", "white", "silver", "beige", "graphite", "blue"] as const satisfies readonly ColorKey[];

/** Specifications, in the order they are shown on a product page and in the admin panel. */
export const specKeys = [
  "type",
  "screen",
  "resolution",
  "area",
  "power",
  "volume",
  "capacity",
  "memory",
  "camera",
  "battery",
  "spin",
  "energy",
  "noise",
  "feature",
] as const satisfies readonly SpecKey[];

/** The same specifications in the shop's order, without anything the shop does not know. */
export function orderSpecs(specs: ProductSpecs): ProductSpecs {
  const ordered: ProductSpecs = {};
  for (const key of specKeys) {
    const value = specs[key];
    if (value) ordered[key] = value;
  }
  return ordered;
}

/** Product type names and short descriptions, shared by every product of a kind. */
export const kinds: Record<ArtKind, { name: Localized; about: Localized }> = {
  coffee: {
    name: { uz: "Kofemashina", ru: "Кофемашина" },
    about: {
      uz: "Bir tugma bilan espresso, amerikano va kapuchino tayyorlaydi. O'rnatilgan kofe maydalagich donni har safar yangi maydalaydi, shuning uchun ta'm doim to'yingan bo'ladi.",
      ru: "Готовит эспрессо, американо и капучино одним нажатием. Встроенная кофемолка мелет зёрна перед каждой чашкой, поэтому вкус всегда насыщенный.",
    },
  },
  vacuum: {
    name: { uz: "Changyutgich", ru: "Пылесос" },
    about: {
      uz: "Simsiz, yengil va kuchli. Gilam, parket va mebelni bir xil yaxshi tozalaydi, bitta quvvatlash butun uyni yig'ishtirishga yetadi.",
      ru: "Беспроводной, лёгкий и мощный. Одинаково хорошо убирает ковры, паркет и мебель, одного заряда хватает на уборку всего дома.",
    },
  },
  robot: {
    name: { uz: "Robot-changyutgich", ru: "Робот-пылесос" },
    about: {
      uz: "Uyni o'zi tozalaydi: xaritani tuzadi, to'siqlarni aylanib o'tadi va quvvati tugasa bazaga qaytadi. Ilova orqali boshqariladi.",
      ru: "Убирает сам: строит карту, объезжает препятствия и возвращается на базу, когда садится батарея. Управляется из приложения.",
    },
  },
  blender: {
    name: { uz: "Blender", ru: "Блендер" },
    about: {
      uz: "Smuzi, sho'rva-pyure va muzni bir necha soniyada maydalaydi. Mustahkam idish va oson yuviladigan pichoqlar.",
      ru: "За секунды готовит смузи, супы-пюре и колет лёд. Прочная чаша и ножи, которые легко мыть.",
    },
  },
  airfryer: {
    name: { uz: "Aerogril", ru: "Аэрогриль" },
    about: {
      uz: "Issiq havo bilan deyarli yog'siz pishiradi: kartoshka, tovuq va sabzavotlar qarsildoq chiqadi. Tayyor dasturlar bilan.",
      ru: "Готовит горячим воздухом почти без масла: картофель, курица и овощи получаются хрустящими. С готовыми программами.",
    },
  },
  fridge: {
    name: { uz: "Muzlatgich", ru: "Холодильник" },
    about: {
      uz: "No Frost tizimi qirov hosil qilmaydi va muzdan tushirishni talab qilmaydi. Keng bo'limlar mahsulotlarni uzoq vaqt yangi saqlaydi.",
      ru: "Система No Frost не образует иней и не требует разморозки. Вместительные отделения долго сохраняют продукты свежими.",
    },
  },
  washer: {
    name: { uz: "Kir yuvish mashinasi", ru: "Стиральная машина" },
    about: {
      uz: "Invertor motor jim ishlaydi va elektrni tejaydi. Bug' bilan yuvish dasturi kiyimdagi allergenlarni yo'qotadi.",
      ru: "Инверторный мотор работает тихо и экономит электричество. Программа стирки с паром удаляет аллергены с одежды.",
    },
  },
  tv: {
    name: { uz: "Televizor", ru: "Телевизор" },
    about: {
      uz: "Aniq tasvir va boy ranglar. Smart TV orqali YouTube, onlayn kinoteatrlar va boshqa ilovalar bir pultda.",
      ru: "Чёткая картинка и насыщенные цвета. Smart TV открывает YouTube, онлайн-кинотеатры и другие приложения с одного пульта.",
    },
  },
  ac: {
    name: { uz: "Konditsioner", ru: "Кондиционер" },
    about: {
      uz: "Invertor kompressor xonani tez sovitadi va qishda isitadi, elektrni kam sarflaydi. Tungi rejimda deyarli eshitilmaydi.",
      ru: "Инверторный компрессор быстро охлаждает комнату и обогревает зимой, расходуя мало электричества. В ночном режиме почти не слышен.",
    },
  },
  oven: {
    name: { uz: "Duxovka shkafi", ru: "Духовой шкаф" },
    about: {
      uz: "Konveksiya issiqlikni bir tekis tarqatadi, taomlar har tomondan bir xil pishadi. Ichki qoplamasi oson tozalanadi.",
      ru: "Конвекция равномерно распределяет жар, блюда пропекаются со всех сторон. Внутреннее покрытие легко очищается.",
    },
  },
  purifier: {
    name: { uz: "Havo tozalagich", ru: "Очиститель воздуха" },
    about: {
      uz: "HEPA filtr chang, gul changi va hidlarni ushlab qoladi. Havo sifatini o'zi o'lchab, tezlikni avtomatik sozlaydi.",
      ru: "HEPA-фильтр задерживает пыль, пыльцу и запахи. Сам измеряет качество воздуха и подстраивает скорость.",
    },
  },
  microwave: {
    name: { uz: "Mikroto'lqinli pech", ru: "Микроволновая печь" },
    about: {
      uz: "Ovqatni tez isitadi va muzdan tushiradi. Ichki sopol qoplama tirnalmaydi va oson artiladi.",
      ru: "Быстро разогревает и размораживает. Керамическое покрытие внутри не царапается и легко протирается.",
    },
  },
  kettle: {
    name: { uz: "Elektr choynak", ru: "Электрочайник" },
    about: {
      uz: "Suvni bir necha daqiqada qaynatadi va o'zi o'chadi. Suvsiz yoqilishdan himoyasi bor.",
      ru: "Кипятит воду за пару минут и отключается сам. Есть защита от включения без воды.",
    },
  },
  iron: {
    name: { uz: "Dazmol", ru: "Утюг" },
    about: {
      uz: "Kuchli bug' zarbasi qalin matolardagi burmalarni ham tekislaydi. Tagligi matoda yengil sirpanadi.",
      ru: "Мощный паровой удар разглаживает складки даже на плотных тканях. Подошва легко скользит по ткани.",
    },
  },
  hairdryer: {
    name: { uz: "Fen", ru: "Фен" },
    about: {
      uz: "Sochni tez quritadi va haroratni nazorat qilib, uni qizib ketishdan asraydi. Ionizatsiya sochga yaltiroqlik beradi.",
      ru: "Быстро сушит волосы и контролирует температуру, защищая их от перегрева. Ионизация придаёт блеск.",
    },
  },
  phone: {
    name: { uz: "Smartfon", ru: "Смартфон" },
    about: {
      uz: "Yorqin ekran, kun bo'yi yetadigan batareya va istalgan yorug'likda aniq suratga oladigan kamera.",
      ru: "Яркий экран, батарея на весь день и камера, которая чётко снимает при любом освещении.",
    },
  },
  headphones: {
    name: { uz: "Quloqchinlar", ru: "Наушники" },
    about: {
      uz: "Faol shovqinni so'ndirish atrofdagi tovushlarni yo'qotadi. Simsiz ulanish va uzoq ishlaydigan batareya.",
      ru: "Активное шумоподавление убирает окружающие звуки. Беспроводное подключение и долгая работа от батареи.",
    },
  },
  speaker: {
    name: { uz: "Portativ kolonka", ru: "Портативная колонка" },
    about: {
      uz: "Kuchli bas va tiniq ovoz. Suvdan himoyalangan korpus, uni tabiatga ham olib chiqish mumkin.",
      ru: "Мощный бас и чистый звук. Корпус защищён от воды, можно брать с собой на природу.",
    },
  },
};

type Seed = Omit<Product, "id" | "slug" | "title" | "inStock" | "warranty"> & {
  inStock?: boolean;
  warranty?: number;
};

const l = (uz: string, ru: string = uz): Localized => ({ uz, ru });

// Sample catalogue. The catalogue functions in src/lib/catalog.ts are the only
// place that reads it, so it can be swapped for a database without touching pages.
const seeds: Seed[] = [
  // ── Large appliances
  { category: "large-appliances", art: "fridge", brand: "Samsung", model: "RB37 No Frost", price: 8990000, oldPrice: 9990000, rating: 4.9, reviews: 198, badge: "hit", color: "beige", warranty: 3,
    specs: { volume: l("367 L", "367 л"), energy: l("A+"), noise: l("37 dB", "37 дБ"), feature: l("No Frost, invertor", "No Frost, инвертор") } },
  { category: "large-appliances", art: "fridge", brand: "LG", model: "GC-B459 DoorCooling", price: 7690000, rating: 4.8, reviews: 143, color: "silver", warranty: 3,
    specs: { volume: l("341 L", "341 л"), energy: l("A+"), noise: l("36 dB", "36 дБ"), feature: l("Total No Frost") } },
  { category: "large-appliances", art: "fridge", brand: "Artel", model: "HD 345 FWEN", price: 4590000, oldPrice: 4990000, rating: 4.6, reviews: 211, color: "white", warranty: 2,
    specs: { volume: l("276 L", "276 л"), energy: l("A"), noise: l("40 dB", "40 дБ"), feature: l("No Frost") } },
  { category: "large-appliances", art: "washer", brand: "LG", model: "F2J3 Steam", price: 5490000, rating: 4.8, reviews: 231, color: "white", warranty: 2,
    specs: { capacity: l("7 kg", "7 кг"), spin: l("1200 ayl/daq", "1200 об/мин"), energy: l("A+++"), feature: l("Bug' bilan yuvish", "Стирка с паром") } },
  { category: "large-appliances", art: "washer", brand: "Samsung", model: "WW70 EcoBubble", price: 5890000, oldPrice: 6490000, rating: 4.8, reviews: 176, badge: "hit", color: "white", warranty: 2,
    specs: { capacity: l("7 kg", "7 кг"), spin: l("1200 ayl/daq", "1200 об/мин"), energy: l("A+++"), feature: l("EcoBubble, invertor", "EcoBubble, инвертор") } },
  { category: "large-appliances", art: "washer", brand: "Artel", model: "WF60 Smart", price: 3290000, rating: 4.5, reviews: 164, color: "white", warranty: 2,
    specs: { capacity: l("6 kg", "6 кг"), spin: l("1000 ayl/daq", "1000 об/мин"), energy: l("A++"), feature: l("15 ta dastur", "15 программ") } },

  // ── Kitchen
  { category: "kitchen", art: "coffee", brand: "DeLonghi", model: "Magnifica S", price: 6490000, oldPrice: 7290000, rating: 4.8, reviews: 286, badge: "hit", color: "black",
    specs: { power: l("1450 W", "1450 Вт"), volume: l("1.8 L", "1,8 л"), type: l("Avtomatik", "Автоматическая"), feature: l("Kapuchinator", "Капучинатор") } },
  { category: "kitchen", art: "coffee", brand: "Philips", model: "LatteGo 2200", price: 5790000, rating: 4.7, reviews: 132, badge: "new", color: "black",
    specs: { power: l("1500 W", "1500 Вт"), volume: l("1.8 L", "1,8 л"), type: l("Avtomatik", "Автоматическая"), feature: l("LatteGo sut tizimi", "Молочная система LatteGo") } },
  { category: "kitchen", art: "blender", brand: "Philips", model: "HR3752/00", price: 890000, oldPrice: 990000, rating: 4.8, reviews: 76, color: "black",
    specs: { power: l("1400 W", "1400 Вт"), volume: l("1.8 L", "1,8 л"), type: l("Vakuumli", "Вакуумный"), feature: l("Muz maydalash", "Колка льда") } },
  { category: "kitchen", art: "airfryer", brand: "Tefal", model: "Easy Fry & Grill", price: 1590000, rating: 4.7, reviews: 64, color: "black",
    specs: { power: l("1550 W", "1550 Вт"), volume: l("4.2 L", "4,2 л"), feature: l("8 ta dastur, gril", "8 программ, гриль") } },
  { category: "kitchen", art: "airfryer", brand: "Xiaomi", model: "Smart Air Fryer 6.5L", price: 1290000, oldPrice: 1490000, rating: 4.6, reviews: 97, color: "black",
    specs: { power: l("1800 W", "1800 Вт"), volume: l("6.5 L", "6,5 л"), feature: l("Ilova orqali boshqaruv", "Управление из приложения") } },
  { category: "kitchen", art: "oven", brand: "Bosch", model: "Serie 4 HBF", price: 4990000, oldPrice: 5890000, rating: 4.9, reviews: 88, color: "black", warranty: 2,
    specs: { volume: l("66 L", "66 л"), power: l("3300 W", "3300 Вт"), energy: l("A"), feature: l("3D konveksiya", "3D-конвекция") } },
  { category: "kitchen", art: "oven", brand: "Artel", model: "Apetito 01-E", price: 2190000, rating: 4.5, reviews: 59, color: "black",
    specs: { volume: l("60 L", "60 л"), power: l("2800 W", "2800 Вт"), energy: l("A"), feature: l("Konveksiya, gril", "Конвекция, гриль") } },
  { category: "kitchen", art: "microwave", brand: "Samsung", model: "ME88 Bio Ceramic", price: 1390000, rating: 4.7, reviews: 148, color: "silver",
    specs: { volume: l("23 L", "23 л"), power: l("800 W", "800 Вт"), feature: l("Sopol qoplama", "Керамическое покрытие") } },
  { category: "kitchen", art: "microwave", brand: "LG", model: "MS2042 NeoChef", price: 1190000, oldPrice: 1350000, rating: 4.6, reviews: 83, color: "silver", inStock: false,
    specs: { volume: l("20 L", "20 л"), power: l("700 W", "700 Вт"), feature: l("Smart Inverter") } },
  { category: "kitchen", art: "kettle", brand: "Bosch", model: "TWK 3P420", price: 490000, rating: 4.7, reviews: 121, color: "silver",
    specs: { power: l("2400 W", "2400 Вт"), volume: l("1.7 L", "1,7 л"), feature: l("Zanglamas po'lat", "Нержавеющая сталь") } },
  { category: "kitchen", art: "kettle", brand: "Xiaomi", model: "Electric Kettle 2", price: 290000, oldPrice: 350000, rating: 4.6, reviews: 205, color: "white",
    specs: { power: l("1800 W", "1800 Вт"), volume: l("1.7 L", "1,7 л"), feature: l("Ikki qavatli korpus", "Двойные стенки") } },

  // ── Small appliances
  { category: "small-appliances", art: "vacuum", brand: "Dyson", model: "V15 Detect", price: 9990000, oldPrice: 11750000, rating: 4.9, reviews: 412, badge: "hit", color: "graphite", warranty: 2,
    specs: { power: l("660 W", "660 Вт"), battery: l("60 daqiqagacha", "до 60 минут"), type: l("Simsiz", "Беспроводной"), feature: l("Lazer bilan changni ko'rsatish", "Лазерная подсветка пыли") } },
  { category: "small-appliances", art: "vacuum", brand: "Samsung", model: "Jet 75", price: 5490000, rating: 4.7, reviews: 138, color: "silver",
    specs: { power: l("550 W", "550 Вт"), battery: l("60 daqiqagacha", "до 60 минут"), type: l("Simsiz", "Беспроводной"), feature: l("Yuviladigan filtr", "Моющийся фильтр") } },
  { category: "small-appliances", art: "robot", brand: "Xiaomi", model: "Robot Vacuum S10", price: 3290000, rating: 4.7, reviews: 153, badge: "new", color: "white",
    specs: { battery: l("130 daqiqagacha", "до 130 минут"), type: l("Quruq va nam tozalash", "Сухая и влажная уборка"), feature: l("Lazer navigatsiya", "Лазерная навигация") } },
  { category: "small-appliances", art: "robot", brand: "Roborock", model: "Q7 Max", price: 4790000, oldPrice: 5490000, rating: 4.8, reviews: 109, color: "white",
    specs: { battery: l("180 daqiqagacha", "до 180 минут"), type: l("Quruq va nam tozalash", "Сухая и влажная уборка"), feature: l("3D xarita", "3D-карта") } },
  { category: "small-appliances", art: "iron", brand: "Philips", model: "Azur 8000", price: 1190000, rating: 4.8, reviews: 92, color: "blue",
    specs: { power: l("3000 W", "3000 Вт"), feature: l("Bug' zarbasi 260 g/daq", "Паровой удар 260 г/мин"), type: l("Bug'li", "Паровой") } },
  { category: "small-appliances", art: "iron", brand: "Tefal", model: "Easygliss Plus", price: 590000, oldPrice: 690000, rating: 4.6, reviews: 174, color: "blue",
    specs: { power: l("2400 W", "2400 Вт"), feature: l("Bug' zarbasi 180 g/daq", "Паровой удар 180 г/мин"), type: l("Bug'li", "Паровой") } },

  // ── Climate
  { category: "climate", art: "ac", brand: "Artel", model: "Inverter 12", price: 4390000, rating: 4.6, reviews: 119, badge: "new", color: "white", warranty: 3,
    specs: { area: l("35 m² gacha", "до 35 м²"), energy: l("A++"), noise: l("24 dB", "24 дБ"), feature: l("Invertor, isitish", "Инвертор, обогрев") } },
  { category: "climate", art: "ac", brand: "Samsung", model: "AR12 WindFree", price: 7290000, oldPrice: 7990000, rating: 4.9, reviews: 87, color: "white", warranty: 3,
    specs: { area: l("35 m² gacha", "до 35 м²"), energy: l("A++"), noise: l("19 dB", "19 дБ"), feature: l("WindFree, Wi-Fi") } },
  { category: "climate", art: "ac", brand: "Midea", model: "Xtreme Save 18", price: 6190000, rating: 4.7, reviews: 66, color: "white", warranty: 3,
    specs: { area: l("50 m² gacha", "до 50 м²"), energy: l("A++"), noise: l("26 dB", "26 дБ"), feature: l("Invertor, isitish", "Инвертор, обогрев") } },
  { category: "climate", art: "purifier", brand: "Xiaomi", model: "Smart Air Purifier 4", price: 1990000, oldPrice: 2290000, rating: 4.8, reviews: 184, color: "white",
    specs: { area: l("48 m² gacha", "до 48 м²"), noise: l("32 dB", "32 дБ"), feature: l("HEPA filtr, ilova", "HEPA-фильтр, приложение") } },
  { category: "climate", art: "purifier", brand: "Philips", model: "Series 2000i", price: 3490000, rating: 4.7, reviews: 51, color: "white", inStock: false,
    specs: { area: l("79 m² gacha", "до 79 м²"), noise: l("33 dB", "33 дБ"), feature: l("HEPA va ko'mir filtri", "HEPA и угольный фильтр") } },

  // ── TV and audio
  { category: "tv-audio", art: "tv", brand: "Samsung", model: 'Crystal UHD 55"', price: 6790000, oldPrice: 7990000, rating: 4.8, reviews: 342, badge: "hit", color: "black", warranty: 2,
    specs: { screen: l('55"'), resolution: l("4K UHD"), type: l("LED"), feature: l("Smart TV, HDR") } },
  { category: "tv-audio", art: "tv", brand: "LG", model: 'OLED C3 55"', price: 15990000, oldPrice: 17490000, rating: 4.9, reviews: 96, color: "black", warranty: 2,
    specs: { screen: l('55"'), resolution: l("4K UHD"), type: l("OLED"), feature: l("120 Hz, Dolby Vision", "120 Гц, Dolby Vision") } },
  { category: "tv-audio", art: "tv", brand: "Artel", model: 'A43 Smart 43"', price: 2990000, rating: 4.5, reviews: 267, color: "black", warranty: 2,
    specs: { screen: l('43"'), resolution: l("Full HD"), type: l("LED"), feature: l("Android TV") } },
  { category: "tv-audio", art: "speaker", brand: "JBL", model: "Charge 5", price: 1890000, rating: 4.9, reviews: 318, color: "black",
    specs: { power: l("40 W", "40 Вт"), battery: l("20 soatgacha", "до 20 часов"), feature: l("IP67, Bluetooth 5.1") } },
  { category: "tv-audio", art: "headphones", brand: "Sony", model: "WH-1000XM5", price: 4290000, oldPrice: 4790000, rating: 4.9, reviews: 227, badge: "hit", color: "black",
    specs: { battery: l("30 soatgacha", "до 30 часов"), type: l("Simsiz, to'liq o'lchamli", "Беспроводные, полноразмерные"), feature: l("Shovqinni so'ndirish", "Шумоподавление") } },

  // ── Beauty and health
  { category: "beauty-health", art: "hairdryer", brand: "Dyson", model: "Supersonic HD15", price: 6490000, rating: 4.9, reviews: 143, badge: "new", color: "graphite", warranty: 2,
    specs: { power: l("1600 W", "1600 Вт"), feature: l("5 ta nasadka, ionizatsiya", "5 насадок, ионизация"), type: l("Harorat nazorati", "Контроль температуры") } },
  { category: "beauty-health", art: "hairdryer", brand: "Philips", model: "BHD510 5000", price: 690000, oldPrice: 790000, rating: 4.7, reviews: 112, color: "black",
    specs: { power: l("2300 W", "2300 Вт"), feature: l("Ionizatsiya, ThermoShield", "Ионизация, ThermoShield"), type: l("3 ta harorat rejimi", "3 режима температуры") } },

  // ── Gadgets
  { category: "gadgets", art: "phone", brand: "Samsung", model: "Galaxy A55 5G", price: 5290000, oldPrice: 5790000, rating: 4.8, reviews: 356, badge: "hit", color: "blue",
    specs: { screen: l('6.6" AMOLED'), memory: l("8/256 GB", "8/256 ГБ"), camera: l("50 MP", "50 Мп"), battery: l("5000 mA·soat", "5000 мА·ч") } },
  { category: "gadgets", art: "phone", brand: "Xiaomi", model: "Redmi Note 13 Pro", price: 3890000, rating: 4.7, reviews: 289, color: "black",
    specs: { screen: l('6.67" AMOLED'), memory: l("8/256 GB", "8/256 ГБ"), camera: l("200 MP", "200 Мп"), battery: l("5100 mA·soat", "5100 мА·ч") } },
  { category: "gadgets", art: "headphones", brand: "JBL", model: "Tune 770NC", price: 1190000, oldPrice: 1390000, rating: 4.7, reviews: 131, color: "black",
    specs: { battery: l("70 soatgacha", "до 70 часов"), type: l("Simsiz, to'liq o'lchamli", "Беспроводные, полноразмерные"), feature: l("Shovqinni so'ndirish", "Шумоподавление") } },
];

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/["'&.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const products: Product[] = seeds.map((seed, index) => ({
  ...seed,
  id: `p-${String(index + 1).padStart(3, "0")}`,
  slug: slugify(`${seed.brand} ${seed.model}`),
  title: `${seed.brand} ${seed.model}`,
  inStock: seed.inStock ?? true,
  warranty: seed.warranty ?? 1,
  specs: orderSpecs(seed.specs),
}));
