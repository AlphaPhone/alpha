// spec/browser/pageContext.md, "The page is bounded and plain: HTTPS addresses without credentials or fragment, one-line title and link words, at most 6,000 characters of text and 16 KB in all"; spec/browser/pageContext.md, "A withheld page tells the agent only its address and title, and a sensitive page's address loses its query"
import { bytesMax, linksMax, linkTextMax, selectionMax, textMax, titleMax, urlMax } from "../../gen/browser__pageContext.ts";

/** Why the page text was left out; the address and title are still the page's. */
export type PageWithheld = "sensitive-page" | "unreadable";

/** One link the page shows: its words and its public HTTPS address. */
export interface BrowserPageLink {
  readonly text: string;
  readonly url: string;
}

/** The open Browser page a message carries as `clientDevice.browserPage`, bound to the observation's selected tab and revision. */
export interface BrowserPageObservation {
  readonly tabId: string;
  readonly revision: string;
  readonly url: string;
  readonly title: string;
  readonly capturedAt: number;
  readonly withheld?: PageWithheld;
  readonly text?: string;
  readonly truncated?: boolean;
  readonly selection?: string;
  readonly links?: readonly BrowserPageLink[];
}

/** What a read gave before it is bound: the page's text, or why it was withheld, with the address and title the host saw. */
export interface PageReadAnswer {
  readonly url?: string;
  readonly title?: string;
  readonly withheld?: PageWithheld;
  readonly text?: string;
  readonly truncated?: boolean;
  readonly selection?: string;
  readonly links?: readonly BrowserPageLink[];
}

const TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:@=+-]{0,255}$/;
const PAGE_CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029]/;
const LINE_CONTROL = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** The address the agent may see: HTTPS with a host, no credentials, no fragment, at most 2,048 units; undefined otherwise. */
export function pageAddress(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = URL.parse(value);
  if (url === null || url.protocol !== "https:" || !url.hostname || url.username || url.password) return undefined;
  url.hash = "";
  return url.href.length <= urlMax ? url.href : undefined;
}

/** A sensitive page's address: its origin and path, without the query that may hold its tokens. */
export function bareAddress(address: string): string {
  const url = new URL(address);
  url.search = "";
  return url.href;
}

/** A page title as one bounded line. */
export function agentPageTitle(value: unknown): string {
  const line = String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim().slice(0, titleMax);
  return line.replace(/[\uD800-\uDBFF]$/, "");
}

function plain(value: unknown, max: number, multiline: boolean): value is string {
  return typeof value === "string" && value.length <= max && !(multiline ? PAGE_CONTROL : LINE_CONTROL).test(value) && !LONE_SURROGATE.test(value);
}

function exactAddress(value: unknown): value is string {
  if (typeof value !== "string" || value.length > urlMax || value.includes("#")) return false;
  const url = URL.parse(value);
  return url !== null && url.protocol === "https:" && url.hostname !== "" && !url.username && !url.password && url.href === value;
}

function bytesOf(page: BrowserPageObservation): number {
  return new TextEncoder().encode(JSON.stringify(page)).byteLength;
}

/** The page as the contract admits it, or undefined when any part is out of bounds, malformed or unbound. */
export function admittedPage(page: BrowserPageObservation): BrowserPageObservation | undefined {
  if (!TOKEN.test(page.tabId) || !TOKEN.test(page.revision) || !exactAddress(page.url) || !plain(page.title, titleMax, false)) return undefined;
  if (!Number.isSafeInteger(page.capturedAt) || page.capturedAt < 0) return undefined;
  const base = { tabId: page.tabId, revision: page.revision, url: page.url, title: page.title, capturedAt: page.capturedAt };
  if (page.withheld !== undefined) {
    if (page.withheld !== "sensitive-page" && page.withheld !== "unreadable") return undefined;
    if (page.text !== undefined || page.truncated !== undefined || page.selection !== undefined || page.links !== undefined) return undefined;
    return Object.freeze({ ...base, withheld: page.withheld });
  }
  if (!plain(page.text, textMax, true) || typeof page.truncated !== "boolean") return undefined;
  if (page.selection !== undefined && !plain(page.selection, selectionMax, true)) return undefined;
  if (page.links !== undefined) {
    if (!Array.isArray(page.links) || page.links.length > linksMax) return undefined;
    if (page.links.some((link) => !plain(link.text, linkTextMax, false) || link.text.trim() === "" || !exactAddress(link.url))) return undefined;
  }
  const admitted: BrowserPageObservation = Object.freeze({
    ...base,
    text: page.text,
    truncated: page.truncated,
    ...(page.selection === undefined ? {} : { selection: page.selection }),
    ...(page.links === undefined ? {} : { links: Object.freeze(page.links.map((link) => Object.freeze({ text: link.text, url: link.url }))) }),
  });
  return bytesOf(admitted) <= bytesMax ? admitted : undefined;
}

/**
 * Binds a read to the observed tab and revision: a sensitive page keeps only its origin and path, a read the contract refuses is sent
 * as unreadable with the address it would have had, and undefined only when even that cannot be sent.
 */
export function boundPage(read: PageReadAnswer, base: { readonly tabId: string; readonly revision: string; readonly capturedAt: number; readonly address: string; readonly title: string }): BrowserPageObservation | undefined {
  const sensitive = read.withheld === "sensitive-page";
  const url = sensitive ? bareAddress(base.address) : typeof read.url === "string" && pageAddress(read.url) === read.url ? read.url : base.address;
  const head = { tabId: base.tabId, revision: base.revision, capturedAt: base.capturedAt, url, title: agentPageTitle(typeof read.title === "string" ? read.title : base.title) };
  const content = read.withheld !== undefined
    ? { withheld: read.withheld }
    : { text: read.text, truncated: read.truncated, ...(read.selection === undefined ? {} : { selection: read.selection }), ...(read.links === undefined ? {} : { links: read.links }) };
  return admittedPage({ ...head, ...content } as BrowserPageObservation) ?? admittedPage({ ...head, url: base.address, withheld: "unreadable" });
}
