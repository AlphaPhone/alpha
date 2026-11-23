import {sensitiveReadingText} from '../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts';
import {fetchKeylessWeb} from '../../../../.eliza/client-features/plugins/plugin-web-search/src/keyless-web-search.ts';

/** Only an explicit request about the visible page uses its public page context. */
export function asksAboutOpenBrowserPage(text:string):boolean{
 const question=text.replace(/"[^"\n]*"|“[^”\n]*”/g,'').trim().replace(/^(?:(?:hey alpha|alpha|please)[,\s]+)+/iu,'');
 const asks=/^(?:(?:can|could|would) you (?:please )?)?(?:summari[sz]e|explain|read|translate|tell me (?:about|what)|use|what|which|who|where|when|why|how|is|does|are)\b/iu;
 const page=/\b(?:this (?:web ?page|website|site|page)|the (?:open|current|active|visible) (?:web ?page|website|site|page)|the (?:web ?page|website|site|page) (?:you (?:just )?opened|I (?:have open|opened)|we(?:['’]re| are) (?:on|viewing)))\b/iu;
 const browserOperation=/^how (?:do|can|could|should) I (?:open|reload|refresh|bookmark|close|share|copy)\b/iu;
 return asks.test(question)&&page.test(question)&&!browserOperation.test(question);
}

const excerptLength = 1_000;
const questionWords = new Set([
  'about', 'active', 'could', 'current', 'does', 'explain', 'opened', 'page', 'please',
  'read', 'site', 'summarise', 'summarize', 'tell', 'this', 'translate', 'using',
  'visible', 'website', 'what', 'when', 'where', 'which', 'would',
]);

/** A fresh public fetch never carries the owner's browsing credentials or a query token. */
export function usableQuestionUrl(url: URL): boolean {
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    !url.search && !url.hash && url.href.length <= 320 &&
    /\.[a-z]{2,}$/i.test(url.hostname) &&
    !/\.(?:localhost|local|internal|lan|home|arpa)$/i.test(url.hostname);
}

/** Use the shared public reader when a site does not expose its text to the renderer. */
export async function readPublicPageFallback(address: string, signal: AbortSignal): Promise<string | undefined> {
  try {
    const result = await fetchKeylessWeb([address], {
      signal,
      timeoutMs: 5_000,
      maxResponseBytes: 32_768,
      fullContent: false,
      objective: 'Return a few short excerpts from the main public page content. Omit navigation and forms.',
      fetchImpl: (input, init) => fetch(input, {...init, credentials: 'omit', referrerPolicy: 'no-referrer'}),
    });
    if (!result) return;
    const {results, errors} = JSON.parse(result.text);
    if (!Array.isArray(results) || results.length !== 1 || !Array.isArray(errors) || errors.length) return;
    const page = results[0];
    if (page?.url !== address || !Array.isArray(page.excerpts) ||
        !page.excerpts.every((excerpt: unknown) => typeof excerpt === 'string')) return;
    const text = page.excerpts.join('\n').trim();
    if (text && !sensitiveReadingText(text)) return text;
  } catch {
    signal.throwIfAborted();
  }
}

/** Select one short passage, preferring lines that contain words from the question. */
export function relevantPageExcerpt(question: string, text: string): string {
  const terms = new Set((question.slice(0, 1000).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])
    .filter(term => !questionWords.has(term)));
  // Extractor output can be Markdown. Link destinations are not words on the page.
  const lines = text.replace(/^\s*(?:[-*]\s+)?!?\[[^\]\n]+\]\([^)\n]+\)[ \t]*$/gm, '')
    .replace(/!?\[([^\]\n]+)\]\([^)\n]+\)/g, '$1')
    .split(/\n+|(?<=[.!?])\s+/u)
    .map(line => line.trim()).filter(Boolean);
  let bestIndex = 0, bestScore = 0;
  for (const [index, line] of lines.entries()) {
    const words = new Set(line.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
    let score = 0;
    for (const term of terms) if (words.has(term)) score++;
    if (score > bestScore) { bestIndex = index; bestScore = score; }
  }
  const lead = bestIndex > 0 ? lines[bestIndex - 1].slice(-160) + '\n' : '';
  return (lead + lines.slice(bestIndex, bestIndex + 3).join('\n')).slice(0, excerptLength);
}
