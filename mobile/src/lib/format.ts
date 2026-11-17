import type { Locale } from "./i18n";

/** 6490000 -> "6 490 000" */
export function formatPrice(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function sum(value: number, locale: Locale): string {
  return `${formatPrice(value)} ${locale === "ru" ? "сум" : "so'm"}`;
}

export function discountPercent(price: number, oldPrice: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}

const months = {
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
};

/** "17-noyabr, 14:05" in Bukhara time, whatever the phone's time zone. */
export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(new Date(iso).getTime() + 5 * 3600_000);
  const day = date.getUTCDate();
  const month = months[locale][date.getUTCMonth()];
  const time = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return locale === "ru" ? `${day} ${month}, ${time}` : `${day}-${month}, ${time}`;
}

/** "+998901234567" -> "+998 90 123-45-67" */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 12) return phone;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`;
}

/** What the customer types after +998, at most 9 digits, as "90 123 45 67". */
export function formatLocalPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}
