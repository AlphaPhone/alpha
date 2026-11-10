/** What the address bar does with typed text. Pure: it opens nothing and sends nothing.
 * Every input maps to exactly one of an address to open, a search, or a refusal. */
export type AddressInput =
  | { kind: 'url'; href: string }
  | { kind: 'search'; href: string; query: string }
  | { kind: 'reject' };

export const MAX_ADDRESS_LENGTH = 4096;
const SEARCH_ADDRESS = 'https://www.google.com/search';
const REJECT: AddressInput = { kind: 'reject' };
// localhost, a bracketed IPv6 literal, or a dotted name, with an optional port, then a path or the end.
const HOST_LIKE = /^(?:localhost|\[[0-9a-f:]+\]|[^/?#]+\.[^/?#]+)(?::\d+)?(?:[/?#]|$)/i;

function search(query: string): AddressInput {
  const url = new URL(SEARCH_ADDRESS);
  url.searchParams.set('q', query);
  return { kind: 'search', href: url.href, query };
}

/** The canonical address when `text` is an HTTP or HTTPS address with a host and no credentials. */
function webAddress(text: string): string | null {
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** Digits and dots that are not a four-part IPv4 address ("3.14", "1.2") are words, not a host. */
function numericWords(input: string): boolean {
  const host = input.split(/[/?#]/, 1)[0].replace(/:\d+$/, '');
  return /^[\d.]+$/.test(host) && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

/**
 * - Empty, over-long or control-character input is refused.
 * - Anything containing whitespace is a search, never an address.
 * - Text starting with `http://` or `https://` is an address; an invalid one, or one carrying
 *   credentials, is refused rather than sent to the search engine as a query.
 * - Text that looks like a host (`example.com`, `localhost:3000`, `[::1]/x`) opens over HTTPS.
 * - Everything else is a search: `define:x`, `site:example.com`, `user@example.com`, `3.14`. No other
 *   scheme is ever opened, so `javascript:` and `file:` text can only become search words.
 */
export function classifyAddress(raw: unknown): AddressInput {
  if (typeof raw !== 'string') return REJECT;
  const input = raw.trim();
  if (!input || input.length > MAX_ADDRESS_LENGTH || /[\u0000-\u001f\u007f]/.test(input)) return REJECT;
  if (/\s/.test(input)) return search(input);
  if (/^https?:\/\//i.test(input)) {
    const href = webAddress(input);
    return href ? { kind: 'url', href } : REJECT;
  }
  if (HOST_LIKE.test(input) && !numericWords(input)) {
    const href = webAddress('https://' + input);
    if (href) return { kind: 'url', href };
  }
  return search(input);
}
