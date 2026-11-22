import type {Plugin} from 'vite';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

/** Development server only: a public copy of the page open in the web build's Browser, for the
 * page text agent turns carry (apps/app/src/browser/browser-surface.ts pageText). The sandboxed
 * page frame cannot be read, so this fetches the address again: HTTPS public hosts only, no
 * cookies or credentials, 5 s, at most 3 redirects and 2 MB of HTML or plain text. Only the dev
 * page itself may ask (a loopback peer whose Origin is this server), so a server started with
 * --host is not an open proxy for the network. Android reads the live page itself and never uses
 * this. Not covered: DNS rebinding between the address check and the fetch's own lookup. */
const ROUTE = '/__alpha/page-html', TIMEOUT_MS = 5000, MAX_REDIRECTS = 3, MAX_BYTES = 2 * 1024 * 1024;
const TYPES = new Set(['text/html', 'application/xhtml+xml', 'text/plain']);

/** Loopback, private, link-local, shared, multicast and unspecified addresses. */
export function privateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (version === 6) {
    const value = address.toLowerCase();
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
    if (mapped) return privateAddress(mapped[1]);
    return value === '::' || value === '::1' || /^f[cd]/.test(value) || /^fe[89ab]/.test(value) || value.startsWith('ff');
  }
  return true;
}

/** A request from the dev page in a browser on this machine: a loopback peer, with an Origin
 * header naming this server's own host. */
export function ownPageRequest(remoteAddress: string | undefined, origin: string | undefined, host: string | undefined): boolean {
  const peer = (remoteAddress ?? '').replace(/^::ffff:/, '');
  if (!host || !origin || !(peer === '::1' || /^127\./.test(peer))) return false;
  try { const from = new URL(origin); return (from.protocol === 'http:' || from.protocol === 'https:') && from.host === host; } catch { return false; }
}

/** A public HTTPS address this proxy may fetch, or undefined. */
export async function publicPageAddress(raw: unknown): Promise<URL | undefined> {
  let url: URL;
  try { url = new URL(String(raw)); } catch { return; }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || !host || host === 'localhost' ||
    host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return;
  if (isIP(host)) return privateAddress(host) ? undefined : url;
  try {
    const addresses = await lookup(host, {all: true, verbatim: true});
    return addresses.length && addresses.every(entry => !privateAddress(entry.address)) ? url : undefined;
  } catch { return; }
}

/** The page's bytes and type, or undefined when it is not a public HTML or text page. */
export async function fetchPublicPage(address: unknown, fetchImpl: typeof fetch = fetch): Promise<{type: string; body: string} | undefined> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = await publicPageAddress(address);
  for (let hop = 0; url && hop <= MAX_REDIRECTS; hop++) {
    const response = await fetchImpl(url, {redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer', signal,
      headers: {accept: 'text/html,application/xhtml+xml,text/plain;q=0.9', 'user-agent': 'Mozilla/5.0 (compatible; AlphaDevPageReader)'}});
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      url = next ? await publicPageAddress(new URL(next, url).href) : undefined;
      continue;
    }
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    if (!response.ok || !TYPES.has(type) || !response.body) return;
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
    return {type: type === 'text/plain' ? 'text/plain' : 'text/html', body: new TextDecoder().decode(Buffer.concat(chunks))};
  }
}

export function browserPageDevProxy(): Plugin {
  return {name: 'alpha-browser-page-dev-proxy', apply: 'serve', configureServer(server) {
    server.middlewares.use(ROUTE, (request, response) => {
      if (request.method !== 'POST') { response.statusCode = 405; response.end(); return; }
      if (!ownPageRequest(request.socket.remoteAddress, request.headers.origin, request.headers.host)) { response.statusCode = 403; response.end(); return; }
      let body = '';
      request.setEncoding('utf8');
      request.on('data', chunk => { body += chunk; if (body.length > 8192) request.destroy(); });
      request.on('end', () => {
        void (async () => {
          let page: Awaited<ReturnType<typeof fetchPublicPage>>;
          try { page = await fetchPublicPage((JSON.parse(body) as {url?: unknown}).url); } catch { page = undefined; }
          if (!page) { response.statusCode = 422; response.end(); return; }
          response.setHeader('content-type', `${page.type}; charset=utf-8`);
          response.setHeader('cache-control', 'no-store');
          response.end(page.body);
        })();
      });
    });
  }};
}
