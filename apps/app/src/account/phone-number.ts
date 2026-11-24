/** Normalize a typed number for the native sign-in host's E.164 input. */
export function normalizeSignInPhone(typed: string): string {
  const text = typed.trim();
  const hasCountryCode = text.startsWith("+");
  const phone = text.slice(hasCountryCode ? 1 : 0).replace(/[\s().-]/g, "");
  if (hasCountryCode) return "+" + phone;
  if (phone.startsWith("00")) return "+" + phone.slice(2);
  if (/^[0-9]{10}$/.test(phone)) return "+1" + phone;
  if (/^1[0-9]{10}$/.test(phone)) return "+" + phone;
  return phone;
}

export function validSignInPhone(phone: string): boolean {
  return /^\+[1-9][0-9]{6,14}$/.test(phone);
}
