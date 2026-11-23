// spec/browser/page.md, "Typed text opens an address, opens the local development host, searches, or is refused"; spec/browser/session.md, "A link the owner taps outside Browser opens in a new tab and is never searched"; spec/browser/session.md, "The agent switches to or closes a private tab only for a request made from a private tab, never switches to the tab already showing, and closes the showing tab only when it is shown"
import { isSecureWebAddress, isWebAddress, parseBrowserAddressInput } from "@elizaos/os/browser/address";
import type { AddressFacts, AddressOutcome, RefusalReason, TabPage } from "../../gen/browser__page.ts";
import { newId } from "../platform/ids.ts";

const MAX_TYPED = 4096;
const TITLE_MAX = 120;
const SIMPLE_AT = /^[^/:@?#%]*@[^/:@?#%]*$/;
const UNSAFE_CHARACTERS = /[\p{C}\p{Zl}\p{Zp}\\]/u;
const LOOPBACK = /^(?:localhost|127(?:\.\d+){3}|\[::1\])$/i;
const CONTROL = /[\u0000-\u001f\u007f]/g;

const REASONS: Readonly<Record<string, RefusalReason>> = {
  empty: "RefusedEmpty",
  "invalid-input": "RefusedInput",
  "invalid-url": "RefusedUrl",
  credentials: "RefusedCredentials",
  "unsupported-protocol": "RefusedProtocol",
};

/** The facts `classifyAddress` reads from what the owner typed, with the href or query each outcome opens. */
export function typedAddress(raw: string): { facts: AddressFacts; href: string; query: string } {
  const typed = raw.trim();
  const at = typed.normalize("NFKC");
  const parsed = parseBrowserAddressInput(raw, { defaultProtocol: "https:" });
  const href = parsed.kind === "url" ? parsed.href : "";
  const host = href === "" ? "" : (URL.parse(href)?.hostname ?? "");
  const facts: AddressFacts = {
    kind: parsed.kind === "url" ? "ParsedUrl" : parsed.kind === "search" ? "ParsedSearch" : "ParsedRefusal",
    reason: parsed.kind === "rejected" ? (REASONS[parsed.reason] ?? "RefusedInput") : "NoRefusal",
    tooLong: typed.length > MAX_TYPED,
    digitPort: /^\d+:\d+(?:[/?#]|$)/.test(typed),
    typedScheme: /^https?:/i.test(typed),
    hasAt: at.includes("@"),
    simpleAt: SIMPLE_AT.test(at) && !UNSAFE_CHARACTERS.test(at),
    decimal: /^\d+(?:\.\d+){0,2}$/.test(typed),
    hasHost: host !== "",
    localhost: /^localhost(?:[/?#]\S*)?$/i.test(typed),
  };
  return { facts, href, query: typed };
}

/** The web search this phone opens for words typed in the address bar and for a reviewed chat search. */
export function searchAddress(query: string): string {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  return url.href;
}

/** The address an outcome loads: the parsed address, the local development host over HTTPS, or a search. */
export function addressFor(outcome: AddressOutcome, typed: { href: string; query: string }): string {
  switch (outcome) {
    case "OpenAddress":
      return typed.href;
    case "OpenLocalhost": {
      const url = URL.parse(`https://${typed.query}`);
      return url?.hostname === "localhost" ? url.href : "";
    }
    case "SearchWords":
      return searchAddress(typed.query);
    case "RefusedAddress":
      return "";
  }
}

/** Whether a host is this device's own development host, which keeps a typed `http:` address. */
export function loopbackHost(host: string): boolean {
  return LOOPBACK.test(host) || /\.localhost$/i.test(host);
}

/** Android refuses cleartext pages, so a typed `http://` address is tried over HTTPS, except a loopback host or an explicit port. */
export function secureTypedAddress(raw: string, onDevice: boolean): string {
  if (!onDevice) return raw;
  const typed = /^\s*http:\/\/([^/?#\s@]+)(?=[/?#]|\s*$)/i.exec(raw);
  if (!typed || /:\d*$/.test(typed[1] ?? "") || loopbackHost(typed[1] ?? "")) return raw;
  return raw.replace(/^(\s*)http:/i, "$1https:");
}

/** A link tapped outside Browser as the address it opens, or undefined when it is not a web address with a host and no credentials; a link is never searched. */
export function linkAddress(raw: string, onDevice: boolean): string | undefined {
  const typed = raw.trim();
  if (typed === "" || typed.length > MAX_TYPED) return undefined;
  const url = URL.parse(secureTypedAddress(typed, onDevice));
  if (url === null || url.hostname === "" || url.username !== "" || url.password !== "" || !isWebAddress(url.href)) return undefined;
  return url.href;
}

/** A page's name as one line of plain text, empty when it only repeats the address. */
export function cleanTitle(title: unknown, url: string): string {
  const text = String(title ?? "").replace(CONTROL, " ").trim().slice(0, TITLE_MAX);
  return text && text !== url ? text : "";
}

/** Whether a failed address is plain HTTP on a host other than the device's own, which Android refuses. */
export function insecureHttp(url: string): boolean {
  const parsed = URL.parse(url);
  return parsed !== null && parsed.protocol === "http:" && !loopbackHost(parsed.hostname);
}

/** The page fields the spec reads from a native report. */
export function pageFacts(url: string): Pick<TabPage, "web" | "secure"> {
  return { web: isWebAddress(url), secure: isSecureWebAddress(url) };
}

/** The open tabs a chat request names by a few words of a title or host; exact names win over tabs that merely contain them. */
export function matchingTabs<T extends { readonly id: string; readonly profile: string }>(
  tabs: readonly T[],
  target: string,
  page: (tab: T) => { readonly title: string; readonly url: string },
): T[] {
  const words = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  const wanted = words(target);
  if (!wanted) return [];
  const names = (tab: T) => {
    const known = page(tab);
    const host = URL.parse(known.url)?.hostname.replace(/^www\./, "") ?? "";
    const label = known.title ? words(known.title) : known.url ? "" : tab.profile === "Private" ? "new private tab" : "new tab";
    return [label, host].filter(Boolean);
  };
  const exact = tabs.filter((tab) => names(tab).includes(wanted));
  return exact.length ? exact : tabs.filter((tab) => names(tab).some((name) => name.includes(wanted)));
}

/** A new random tab identity, valid for the native host. */
export function newTabId(): string {
  return `b${newId().replace(/-/g, "")}`;
}

/** The current time in milliseconds, for visit times and the writer's clock. */
export function now(): number {
  return Date.now();
}
