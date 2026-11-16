/** Uzbek mobile numbers: +998 followed by nine digits. */

const COUNTRY = "998";

/** Any way of typing a number -> "+998901234567", or null when it is not a valid one. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 9) digits = COUNTRY + digits;
  if (digits.length !== 12 || !digits.startsWith(COUNTRY)) return null;
  return `+${digits}`;
}

/** "+998901234567" -> "+998 90 123 45 67" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 12) return phone;
  return `+${digits.slice(0, 3)} ${formatLocalPhone(digits.slice(3))}`;
}

/** The nine digits after +998, as typed so far: "901234567" -> "90 123 45 67" */
export function formatLocalPhone(digits: string): string {
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean)
    .join(" ");
}

/** Keeps the nine local digits of whatever was typed or pasted. */
export function localPhoneDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  // A pasted full number brings its country code along.
  const local = digits.length > 9 && digits.startsWith(COUNTRY) ? digits.slice(3) : digits;
  return local.slice(0, 9);
}
