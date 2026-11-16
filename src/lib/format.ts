/** 6490000 -> "6 490 000" */
export function formatPrice(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function discountPercent(price: number, oldPrice?: number): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

const dateLocales: Record<string, string> = { uz: "uz-Latn-UZ", ru: "ru-RU" };

/** A moment as people in Bukhara read it: "17-noyabr, 2026, 00:07" */
export function formatDateTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(dateLocales[locale] ?? locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  }).format(date);
}
