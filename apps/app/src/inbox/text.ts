// spec/inbox/drafts.md, "A reply goes to the reply address and, for reply all, the other recipients, without my own address"; spec/inbox/reader.md, "A sender image is a bundled brand icon, decorative and never a proof of identity"; spec/inbox/drafts.md, "A draft the previous version kept comes into its account's Drafts once, and the previous slots clear only after every draft is kept"

const ADDRESS = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const REFERENCE = /&(?:#[0-9]{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi;
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
const INVISIBLE_RUN = /[ \u00a0\u00ad\u034f\u200b-\u200f\u2060\u2800\ufeff]{3,}/g;
const SHARED_PROVIDERS = /(?:^|\.)(?:gmail\.com|googlemail\.com|outlook\.com|hotmail\.com|live\.com|yahoo\.com|icloud\.com|proton\.me|protonmail\.com|aol\.com)$/;
const BRANDS = ["turbotax.intuit.com", "linkedin.com", "cash.app", "paypal.com", "postman.com", "indiegala.com", "canva.com", "robinhood.com", "google.com", "coinbase.com", "github.com", "zillow.com", "mozilla.org", "openai.com"];

/** Whether `value` is one literal email address, as the composer and Cloud accept it. @throws {never} */
export function literalMailAddress(value: string): boolean {
  return value.length <= 254 && ADDRESS.test(value);
}

/** The address an account or message shows, lower-cased for comparison. @throws {never} */
export function addressKey(value: string): string {
  return value.trim().toLowerCase();
}

/** A Gmail snippet as text: each character reference decoded once, long runs of invisible characters collapsed. @throws {never} */
export function decodeMailPreview(text: string): string {
  const decoded = text.includes("&") ? text.replace(REFERENCE, (reference) => {
    const body = reference.slice(1, -1);
    if (body.startsWith("#")) {
      const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return code >= 1 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff) ? String.fromCodePoint(code) : "\ufffd";
    }
    return NAMED[body.toLowerCase()] ?? reference;
  }) : text;
  return decoded.replace(INVISIBLE_RUN, " ").trim();
}


/** An address's scheme, credentials and host, or undefined when it is not an address. @throws {never} */
export function parseLink(href: string): { href: string; host: string; https: boolean; credentials: boolean } | undefined {
  try {
    const url = new URL(href);
    return { href: url.href, host: url.hostname, https: url.protocol === "https:", credentials: url.username !== "" || url.password !== "" };
  } catch {
    return undefined;
  }
}



/** What a sender image may show for an address: a bundled brand icon path, or nothing. @throws {never} */
export function senderImageFacts(email: string): { sharedProvider: boolean; validDomain: boolean; brand: string } {
  const match = email.length <= 320 ? /^[^\s<>@]+@([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)$/i.exec(email) : null;
  const domain = match?.[1]?.toLowerCase() ?? "";
  const validDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain) && !/\.(?:local|localhost|internal|invalid|test|example|onion)$/.test(domain);
  const brand = BRANDS.find((known) => domain === known || domain.endsWith(`.${known}`)) ?? "";
  return { sharedProvider: SHARED_PROVIDERS.test(domain), validDomain, brand };
}

/** The bundled icon of a brand. @throws {never} */
export function senderImagePath(brand: string): string {
  return `/icons/senders/${brand}.png`;
}

/** A reply's subject: one `Re:` in front, one line, at most 998 characters. @throws {never} */
export function replySubject(subject: string): string {
  const line = subject.replace(/[\r\n]+/g, " ");
  return (/^re:/i.test(line) ? line : `Re: ${line}`).slice(0, 998);
}

/** A forward's subject. @throws {never} */
export function forwardSubject(subject: string): string {
  return `Fwd: ${subject.replace(/[\r\n]+/g, " ")}`.slice(0, 998);
}

/** A forward's body: the owner's text, then the forwarded message's header and text. @throws {never} */
export function forwardBody(initial: string, sender: string, subject: string, text: string): string {
  return `${initial}\n\nForwarded message from ${sender}\nSubject: ${subject}\n\n${text}`.slice(0, 64000);
}

/** A shared subject as the composer keeps it. @throws {never} */
export function oneLineSubject(subject: string): string {
  return subject.replace(/[\r\n]+/g, " ").slice(0, 998);
}

/** UTF-8 size of a value as JSON; unbounded for a value JSON cannot hold, so every limit refuses it. @throws {never} */
export function jsonBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/** The request id of one content version of an agent email: the same version always gets the same id. */
export async function versionRequestId(parts: readonly unknown[]): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`alphacompute.ai/id/gmail-send\u0000${JSON.stringify(parts)}`)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}



/** The canonical JSON of a draft's content, which a review binds and a confirmation compares. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

/** The lowercase hex SHA-256 of `text` as UTF-8. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The parts of an account key (environment, user, organization, grant); undefined for anything else. @throws {never} */
export function ownerParts(owner: string): { environment: string; userId: string; organizationId: string; grant: string } | undefined {
  let parts: unknown;
  try {
    parts = JSON.parse(owner);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parts) || parts.length !== 4 || !parts.every((part) => typeof part === "string")) return undefined;
  const [environment, userId, organizationId, grant] = parts as string[];
  return environment === "" || userId === "" || grant === "" ? undefined : { environment, userId, organizationId, grant };
}
