// spec/browser/reading.md, "The review opens on a settled page, fetches its public text once, and a sensitive address or text refuses it for good"; spec/browser/reading.md, "Ask takes an excerpt of the shown settled HTTPS page, or opens an empty review where the page cannot be read in isolation"

/** The most text a reading or question carries. */
export const MAX_EXCERPT = 5000;
const MAX_SOURCE_BYTES = 262_144;
const SOURCE_TIMEOUT_MS = 5_000;

const SENSITIVE =
  /(?:api[\s_-]*key|access[\s_-]*token|refresh[\s_-]*token|password|passphrase|passcode|credential|(?<![a-z])vaults?(?![a-z])|one[\s-]*time[\s-]*(?:password|code)|verification[\s-]*code|security[\s-]*code|authentication[\s-]*code|recovery[\s-]*(?:code|key|phrase)|backup[\s-]*(?:code|key)|seed[\s-]*phrase|secret[\s-]*key|private[\s-]*key|authenticator|two[\s-]*factor|multi[\s-]*factor|(?<![a-z])sign[\s-]*in(?![a-z])|(?<![a-z])log[\s-]*in(?![a-z])|\botp\b|\bmfa\b|\b2fa\b)/i;
const SENSITIVE_ROUTE =
  /(?:^|[^a-z0-9])(?:api[\s_-]*key|vault|passwords?|passphrase|signin|sign-in|login|log-in|logout|auth|oauth|sso|account|accounts|security|mfa|2fa|otp|recovery|reset-password|credentials?|access_token|id_token|refresh_token|secret|token)(?:$|[^a-z0-9])/;
const PASSWORD_SERVICES = [
  "pass.proton.me", "account.proton.me", "accounts.google.com", "passwords.google.com", "bitwarden.com", "bitwarden.eu",
  "1password.com", "lastpass.com", "dashlane.com", "keepersecurity.com", "nordpass.com", "passbolt.com",
];
const CREDENTIAL_FIELD = /(?:^|[^a-z0-9])(?:otp|totp|mfa|2fa)(?:$|[^a-z0-9])|password|passcode|one[\s_-]*time|verification[\s_-]*code|security[\s_-]*code|auth(?:entication)?[\s_-]*code/i;
const REMOVED = "script,style,noscript,template,nav,header,footer,form,input,select,textarea,button,iframe,svg,[hidden],[aria-hidden=true]";
const BLOCK = /^(?:P|DIV|SECTION|ARTICLE|MAIN|H[1-6]|LI|UL|OL|BR|TR|TD|TH|BLOCKQUOTE|PRE)$/;

const words = (value: string) => value.replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
const normalize = (value: string) => value.normalize("NFKC").replace(/[​-‍﻿]/g, "");

/** Credential prose or an unlabelled six-to-eight digit code. */
export function sensitiveText(text: string): boolean {
  const value = normalize(text);
  return SENSITIVE.test(value) || SENSITIVE.test(words(value)) || /(?:^|\D)\d{6,8}(?:\D|$)/.test(value);
}

/** An address that must not be read: not HTTP(S), credentials, a password service, or a route naming sign-in, account or token material. */
export function sensitiveAddress(address: string): boolean {
  if (address.length > 8192) return true;
  const url = URL.parse(address);
  if (url === null || !["http:", "https:"].includes(url.protocol) || url.username || url.password) return true;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (PASSWORD_SERVICES.some((service) => host === service || host.endsWith(`.${service}`))) return true;
  let decoded = address;
  try {
    decoded = decodeURIComponent(address.replace(/\+/g, " "));
  } catch {
    return true;
  }
  return SENSITIVE_ROUTE.test(decoded.toLowerCase());
}

/** What a public page offers for review: its text, nothing, or a refusal because it looks like a sign-in page. */
export type PageSource = { readonly text: string; readonly truncated: boolean } | { readonly blocked: true } | undefined;

function documentText(html: string): PageSource {
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = template.content;
  if ([...root.querySelectorAll("input,label,[autocomplete]")].some((node) =>
    CREDENTIAL_FIELD.test(`${node.getAttribute("type") ?? ""} ${node.getAttribute("autocomplete") ?? ""} ${node.getAttribute("name") ?? ""} ${node.textContent ?? ""}`))) {
    return { blocked: true };
  }
  for (const node of root.querySelectorAll(REMOVED)) node.remove();
  const target = root.querySelector('article,main,[role="main"]') ?? root;
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? "");
      return;
    }
    const tag = node.nodeType === 1 ? (node as Element).tagName.toUpperCase() : "";
    if (BLOCK.test(tag)) parts.push("\n");
    for (const child of node.childNodes) walk(child);
    if (tag !== "BR" && BLOCK.test(tag)) parts.push("\n");
  };
  walk(target);
  return excerpt(parts.join(""));
}

/** Collapses whitespace and bounds the excerpt a review may prefill. */
export function excerpt(source: string): PageSource {
  const text = source.replace(/\r\n?/g, "\n").replace(/[\t \f\v]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return undefined;
  if (sensitiveText(text)) return { blocked: true };
  return { text: text.slice(0, MAX_EXCERPT), truncated: text.length > MAX_EXCERPT };
}

/** Fetches a public HTTP(S) page's text without credentials or referrer, for review; any failure offers nothing. */
export async function publicPageText(address: string, signal: AbortSignal): Promise<PageSource> {
  if (sensitiveAddress(address)) return { blocked: true };
  const request = AbortSignal.any([signal, AbortSignal.timeout(SOURCE_TIMEOUT_MS)]);
  try {
    const response = await fetch(address, {
      signal: request, mode: "cors", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", cache: "no-store",
      headers: { Accept: "text/html,text/plain" },
    });
    const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!response.ok || (type !== "text/html" && type !== "text/plain")) return undefined;
    if (Number(response.headers.get("content-length") || 0) > MAX_SOURCE_BYTES) return { blocked: true };
    const body = await response.text();
    if (body.length > MAX_SOURCE_BYTES) return { blocked: true };
    return type === "text/plain" ? excerpt(body) : documentText(body);
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}
