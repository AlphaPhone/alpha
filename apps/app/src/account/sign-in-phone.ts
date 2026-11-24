// spec/account/signIn.md, "A code is sent before it is asked for, and a resend the host did not take keeps the earlier code"

/**
 * The number as the host accepts it (E.164), from what the owner typed: spaces, dashes, dots and
 * parentheses are dropped and a leading + is kept. An international 00 prefix becomes +. A bare
 * ten-digit number, or eleven digits starting with 1, is read as +1. Anything else is returned
 * without separators and the host refuses it; no country is guessed for it.
 */
export function normalizeSignInPhone(typed: string): string {
  const text = typed.trim();
  const plus = text.startsWith("+");
  // Only separators are dropped: letters or other symbols stay, so the number is refused, not rewritten.
  const digits = text.slice(plus ? 1 : 0).replace(/[\s().-]/g, "");
  if (plus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (/^[0-9]{10}$/.test(digits)) return `+1${digits}`;
  if (/^1[0-9]{10}$/.test(digits)) return `+${digits}`;
  return digits;
}
