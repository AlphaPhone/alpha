// spec/app/account/signIn.md, "The phone writes a typed number in international form, and leaves a number already in that form as it is"
import { opaque } from "../../gen/app__account__signIn.effect.vibe";

const formatting = /[\s().-]/g;
const allDigits = /^\d+$/;

/**
 * Normalizes a typed phone number into E.164 international form when unambiguous:
 * strips spaces, dashes, dots and parentheses; turns leading `00` into `+`; adds `+1`
 * to a bare 10-digit North American number or `+` to an 11-digit number starting with `1`;
 * preserves letters, other symbols, and other digit lengths without guessing a country.
 * @throws {never}
 */
export function normalizePhoneNumber(raw: string): string {
  const stripped = raw.replace(formatting, "");
  if (stripped === "") return "";
  if (stripped.startsWith("+")) {
    return stripped;
  }
  if (!allDigits.test(stripped)) {
    return stripped;
  }
  if (stripped.startsWith("00") && stripped.length > 2) {
    return `+${stripped.slice(2)}`;
  }
  if (stripped.length === 10) {
    return `+1${stripped}`;
  }
  if (stripped.length === 11 && stripped.startsWith("1")) {
    return `+${stripped}`;
  }
  return stripped;
}

opaque.international = normalizePhoneNumber;

/** Formats integer cents in USD for plan offers, quotes, and invoices. */
export function formatUsdCents(cents: number): string {
  const negative = cents < 0;
  const whole = Math.abs(Math.round(cents));
  const dollars = Math.floor(whole / 100);
  const remainder = String(whole % 100).padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${remainder}`;
}

/** Formats USD micros from Cloud's billing snapshot into a readable currency string. */
export function formatUsdMicros(micros: number): string {
  return formatUsdCents(Math.round(micros / 10_000));
}

/** Formats a Unix timestamp in seconds or milliseconds as a short locale date. */
export function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const millis = timestamp >= 1e11 ? timestamp : timestamp * 1000;
  return new Date(millis).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
