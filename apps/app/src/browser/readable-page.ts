import type {PageText} from './page-context';

/** The readable text of a page, by the rules Android's AlphaPageText script applies to the live
 * document (test/readable-page.test.mjs runs both on the same fixtures). The web build reads a
 * parsed copy, which has no layout, so only Android also skips elements that are not rendered.
 *
 * Main content (`main`, `[role=main]` or `article`) comes first, then the rest of the body.
 * Navigation, menus, form controls and hidden elements are skipped. A page with a password or
 * one-time-code field gives no text. No input value, cookie, storage or frame is read. */
const SKIPPED = 'script,style,noscript,template,svg,canvas,iframe,object,embed,nav,[role=navigation],[role=menu],[role=menubar],input,textarea,select,option,button,[hidden],[aria-hidden=true]';
const SIGN_IN = 'input[type=password i],[autocomplete*=one-time-code i],[autocomplete*=current-password i],[autocomplete*=new-password i]';
const BLOCK = /^(?:ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|BR|CAPTION|DD|DETAILS|DIALOG|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HGROUP|HR|LEGEND|LI|MAIN|MENU|OL|P|PRE|SECTION|SUMMARY|TABLE|TBODY|TD|TFOOT|TH|THEAD|TR|UL)$/;
const NODE_LIMIT = 20_000, TIME_LIMIT_MS = 300;

/** Lines of text, whitespace collapsed and consecutive duplicates dropped, up to `max` characters. */
function lineWriter(max: number) {
  const lines: string[] = [];
  let length = 0, full = false;
  return {
    get full() { return full; },
    add(raw: string) {
      const line = raw.replace(/\s+/g, ' ').trim();
      if (!line || full || line === lines[lines.length - 1]) return;
      lines.push(line);
      length += line.length + 1;
      if (length - 1 > max) full = true;
    },
    result(truncated: boolean) {
      let text = lines.join('\n');
      if (text.length > max) {
        const cut = text.slice(0, max), space = cut.search(/\s\S*$/);
        text = (space > max * 0.8 ? cut.slice(0, space) : cut).replace(/[\uD800-\uDBFF]$/, '').trimEnd();
        truncated = true;
      }
      return truncated ? {text, truncated: true} : {text};
    },
  };
}

/** A text/plain page. */
export function readablePlainText(text: string, max: number): PageText {
  const writer = lineWriter(max);
  for (const line of text.split(/\r?\n/)) { writer.add(line); if (writer.full) break; }
  return writer.result(false);
}

/** An HTML page parsed into `document` (for example by DOMParser). */
export function readablePage(document: Document, max: number): PageText {
  const description = (document.querySelector('meta[name=description i]') ?? document.querySelector('meta[property="og:description" i]'))?.getAttribute('content') ?? '';
  const page = {title: document.title, ...(description.trim() ? {description} : {})};
  if (document.querySelector(SIGN_IN)) return {...page, textUnavailable: 'sign-in form on this page'};
  const body = document.body;
  if (!body) return {...page, text: ''};
  const main = document.querySelector('main,[role=main],article');
  const writer = lineWriter(max), started = Date.now();
  let line = '', nodes = 0, truncated = false;
  const exit = {};
  for (const root of main && main !== body ? [main, body] : [body]) {
    const stack: (Node | typeof exit)[] = [root];
    while (stack.length && !writer.full) {
      if (++nodes > NODE_LIMIT || Date.now() - started > TIME_LIMIT_MS) { truncated = true; break; }
      const next = stack.pop()!;
      if (next === exit) { writer.add(line); line = ''; continue; }
      const node = next as Node;
      if (node.nodeType === 3) { line += node.nodeValue ?? ''; continue; }
      if (node.nodeType !== 1) continue;
      const element = node as Element;
      if ((root === body && element === main) || element.matches(SKIPPED)) continue;
      if (BLOCK.test(element.tagName.toUpperCase())) { writer.add(line); line = ''; stack.push(exit); }
      for (let index = element.childNodes.length - 1; index >= 0; index--) stack.push(element.childNodes[index]);
    }
    writer.add(line); line = '';
    if (truncated || writer.full) break;
  }
  return {...page, ...writer.result(truncated)};
}
