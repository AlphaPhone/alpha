// spec/app/assistant/reply.md, "Prose is shown as the model wrote it, line for line; only a bare https address is a link, and HTML reads as text"; spec/app/assistant/reply.md, "Copy, quote, read aloud, use in email and Talk take the reply's plain words, without its marks"

/** A run of words in a reply, as the model's Markdown marks it. */
export type ReplyInline =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "strong" | "emphasis"; readonly children: readonly ReplyInline[] }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "link"; readonly href: string; readonly children: readonly ReplyInline[] };

/** A block of a reply, as the model's Markdown lays it out. */
export type ReplyBlock =
  | { readonly kind: "paragraph"; readonly lines: readonly (readonly ReplyInline[])[] }
  | { readonly kind: "heading"; readonly words: readonly ReplyInline[] }
  | { readonly kind: "list"; readonly start: number | undefined; readonly items: readonly (readonly ReplyBlock[])[] }
  | { readonly kind: "quote"; readonly blocks: readonly ReplyBlock[] }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "rule" };

const fenceLine = /^ {0,3}(`{3,}|~{3,})/;
const headingLine = /^ {0,3}#{1,6}(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const quoteLine = /^ {0,3}>[ \t]?(.*)$/;
const itemLine = /^( {0,3})(?:[-*+]|(\d{1,9})[.)])(?:[ \t]+(.*))?$/;
const ruleLine = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const blankLine = /^\s*$/;
const escapable = /[!-/:-@[-`{-~]/;
const bareLink = /https:\/\/[^\s<>()[\]]+(?:\([^\s<>()]*\)[^\s<>()[\]]*)*/y;

const nestingLimit = 8;

const indentOf = (line: string) => line.length - line.trimStart().length;
const startsBlock = (line: string) => fenceLine.test(line) || headingLine.test(line) || quoteLine.test(line) || itemLine.test(line) || ruleLine.test(line);

function closesFence(line: string, open: string): boolean {
  const close = fenceLine.exec(line)?.[1];
  return close !== undefined && close[0] === open[0] && close.length >= open.length && line.trim() === close;
}

function httpsHref(raw: string): string | undefined {
  const parsed = URL.parse(raw);
  return parsed?.protocol === "https:" && parsed.hostname !== "" && !parsed.username && !parsed.password ? parsed.href : undefined;
}

function delimiterClose(text: string, from: number, mark: string): number {
  const char = mark[0] ?? "";
  for (let at = from; at < text.length; at++) {
    if (text[at] === "`") {
      const run = /^`+/.exec(text.slice(at))?.[0] ?? "`";
      const end = text.indexOf(run, at + run.length);
      if (end > at) at = end + run.length - 1;
      continue;
    }
    if (text[at] === "\\") { at++; continue; }
    if (text[at] !== char) continue;
    let run = 1;
    while (text[at + run] === char) run++;
    const before = text[at - 1] ?? " ";
    const after = text[at + run] ?? " ";
    if (run === mark.length && !/\s/.test(before) && (char !== "_" || !/[\p{L}\p{N}]/u.test(after))) return at;
    at += run - 1;
  }
  return -1;
}

function linkAt(text: string, at: number): { readonly label: string; readonly href: string; readonly end: number } | undefined {
  let depth = 0;
  let close = -1;
  for (let i = at; i < text.length; i++) {
    if (text[i] === "\\") { i++; continue; }
    if (text[i] === "[") depth++;
    if (text[i] === "]" && --depth === 0) { close = i; break; }
  }
  if (close < 0 || text[close + 1] !== "(") return undefined;
  const target = /^\(\s*(?:<([^<>\n]*)>|([^\s()]*(?:\([^\s()]*\)[^\s()]*)*))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/.exec(text.slice(close + 1));
  if (target === null) return undefined;
  return { label: text.slice(at + 1, close), href: target[1] ?? target[2] ?? "", end: close + 1 + target[0].length };
}

/**
 * A line's words with their marks read: code spans, links, bold and italics, nested at most eight deep; a mark left open
 * reads as written, except on a line still being `written`, where it is held back until it closes. @throws {never}
 */
export function replyInlines(text: string, written = false, depth = 0): ReplyInline[] {
  if (depth >= nestingLimit) return text === "" ? [] : [{ kind: "text", text }];
  const runs: ReplyInline[] = [];
  let plain = "";
  const push = (run: ReplyInline) => {
    if (plain !== "") runs.push({ kind: "text", text: plain });
    plain = "";
    runs.push(run);
  };
  for (let at = 0; at < text.length;) {
    const char = text[at] ?? "";
    if (char === "\\" && escapable.test(text[at + 1] ?? "")) {
      plain += text[at + 1];
      at += 2;
      continue;
    }
    if (char === "`") {
      const run = /^`+/.exec(text.slice(at))?.[0] ?? "`";
      const end = text.indexOf(run, at + run.length);
      if (end > at && text[end + run.length] !== "`") {
        const inside = text.slice(at + run.length, end);
        push({ kind: "code", text: /^ .*[^ ].* $/.test(inside) ? inside.slice(1, -1) : inside });
        at = end + run.length;
      } else {
        if (!written) plain += run;
        at += run.length;
      }
      continue;
    }
    if (char === "[") {
      const link = linkAt(text, at);
      if (link !== undefined) {
        const href = httpsHref(link.href);
        const label = replyInlines(link.label, false, depth + 1);
        if (href === undefined) for (const run of label) push(run);
        else push({ kind: "link", href, children: label });
        at = link.end;
        continue;
      }
    }
    if (char === "<") {
      const auto = /^<(https:\/\/[^\s<>]+)>/.exec(text.slice(at));
      const href = auto?.[1] === undefined ? undefined : httpsHref(auto[1]);
      if (auto !== null && href !== undefined) {
        push({ kind: "link", href, children: [{ kind: "text", text: auto[1] ?? "" }] });
        at += auto[0].length;
        continue;
      }
    }
    if (char === "h" && !/[\p{L}\p{N}]/u.test(text[at - 1] ?? " ")) {
      bareLink.lastIndex = at;
      const found = bareLink.exec(text)?.[0].replace(/[.,!?;:'"’”*_]+$/u, "");
      const href = found === undefined ? undefined : httpsHref(found);
      if (found !== undefined && href !== undefined) {
        push({ kind: "link", href, children: [{ kind: "text", text: found }] });
        at += found.length;
        continue;
      }
    }
    if (char === "*" || char === "_") {
      let width = 1;
      while (text[at + width] === char) width++;
      const mark = char.repeat(Math.min(width, 3));
      const after = text[at + mark.length] ?? " ";
      const opens = width <= 3 && !/\s/.test(after) && (char === "*" || !/[\p{L}\p{N}]/u.test(text[at - 1] ?? " "));
      const close = opens ? delimiterClose(text, at + mark.length, mark) : -1;
      if (close > at + mark.length) {
        const inside = replyInlines(text.slice(at + mark.length, close), false, depth + 1);
        push(mark.length === 3
          ? { kind: "strong", children: [{ kind: "emphasis", children: inside }] }
          : { kind: mark.length === 2 ? "strong" : "emphasis", children: inside });
        at = close + mark.length;
        continue;
      }
      if (!(written && (opens || at + width === text.length))) plain += text.slice(at, at + width);
      at += width;
      continue;
    }
    plain += char;
    at++;
  }
  if (plain !== "") runs.push({ kind: "text", text: plain });
  return runs;
}

function listFrom(lines: readonly string[], start: number, written: boolean, depth: number): { readonly list: ReplyBlock; readonly next: number } {
  const ordered = itemLine.exec(lines[start] ?? "")?.[2];
  const items: ReplyBlock[][] = [];
  let at = start;
  while (at < lines.length) {
    const item = itemLine.exec(lines[at] ?? "");
    if (item === null || (item[2] === undefined) !== (ordered === undefined)) break;
    const indent = item[1]?.length ?? 0;
    const content = (lines[at] ?? "").length - (item[3] ?? "").length;
    const body = [item[3] ?? ""];
    at++;
    while (at < lines.length) {
      const next = lines[at] ?? "";
      if (blankLine.test(next)) {
        const following = lines[at + 1];
        if (following === undefined || blankLine.test(following) || indentOf(following) <= indent) break;
        body.push("");
      } else if (indentOf(next) > indent) body.push(next.slice(Math.min(indentOf(next), content)));
      else if (startsBlock(next)) break;
      else body.push(next);
      at++;
    }
    items.push(replyMarkdown(body.join("\n"), written && at === lines.length, depth + 1));
    let skip = at;
    while (skip < lines.length && blankLine.test(lines[skip] ?? "")) skip++;
    if (skip === at) continue;
    const again = itemLine.exec(lines[skip] ?? "");
    if (again === null || (again[1]?.length ?? 0) !== indent || (again[2] === undefined) !== (ordered === undefined)) break;
    at = skip;
  }
  return { list: { kind: "list", start: ordered === undefined ? undefined : Number(ordered), items }, next: at };
}

/** A run of a reply as it is shown: its words as the model wrote them, or a bare https address that is a link. */
export type ReplyRun = { readonly kind: "text"; readonly text: string } | { readonly kind: "link"; readonly href: string; readonly text: string };

/**
 * A reply as it is shown, as Sunday's v119 printed it: the model's words exactly as written, every mark, rule and
 * list number included, with each bare https address that starts a word made a link. Nothing else is read. @throws {never}
 */
export function replyRuns(text: string): ReplyRun[] {
  const runs: ReplyRun[] = [];
  let plain = 0;
  for (let at = text.indexOf("https://"); at >= 0; at = text.indexOf("https://", at + 1)) {
    if (at < plain || /[\p{L}\p{N}]/u.test(text[at - 1] ?? " ")) continue;
    bareLink.lastIndex = at;
    const found = bareLink.exec(text)?.[0].replace(/[.,!?;:'"’”*_]+$/u, "");
    const href = found === undefined ? undefined : httpsHref(found);
    if (found === undefined || href === undefined) continue;
    if (at > plain) runs.push({ kind: "text", text: text.slice(plain, at) });
    runs.push({ kind: "link", href, text: found });
    plain = at + found.length;
  }
  if (plain < text.length) runs.push({ kind: "text", text: text.slice(plain) });
  return runs;
}

/**
 * A reply laid out as the model's Markdown writes it: fenced code, headings, quotes, lists, rules and paragraphs whose
 * lines keep their breaks, nested at most eight deep. HTML is never read: it stays text. While the reply is still being
 * `written`, a mark its last line has not closed is held back. @throws {never}
 */
export function replyMarkdown(text: string, written = false, depth = 0): ReplyBlock[] {
  const lines = text.split(/\r?\n/);
  if (depth >= nestingLimit) return [{ kind: "paragraph", lines: lines.map((line) => replyInlines(line, false, depth)) }];
  const last = (line: number) => written && line === lines.length - 1;
  const blocks: ReplyBlock[] = [];
  for (let at = 0; at < lines.length;) {
    const line = lines[at] ?? "";
    const fence = fenceLine.exec(line)?.[1];
    if (blankLine.test(line)) at++;
    else if (fence !== undefined) {
      let end = at + 1;
      while (end < lines.length && !closesFence(lines[end] ?? "", fence)) end++;
      blocks.push({ kind: "code", text: lines.slice(at + 1, end).join("\n") });
      at = end + 1;
    } else if (ruleLine.test(line)) {
      blocks.push({ kind: "rule" });
      at++;
    } else if (headingLine.test(line)) {
      blocks.push({ kind: "heading", words: replyInlines(headingLine.exec(line)?.[1] ?? "", last(at), depth) });
      at++;
    } else if (quoteLine.test(line)) {
      const inner: string[] = [];
      for (; at < lines.length && quoteLine.test(lines[at] ?? ""); at++) inner.push(quoteLine.exec(lines[at] ?? "")?.[1] ?? "");
      blocks.push({ kind: "quote", blocks: replyMarkdown(inner.join("\n"), written && at === lines.length, depth + 1) });
    } else if (itemLine.test(line)) {
      const { list, next } = listFrom(lines, at, written, depth);
      blocks.push(list);
      at = next;
    } else {
      const first = at;
      const paragraph: string[] = [];
      for (; at < lines.length && !blankLine.test(lines[at] ?? "") && (paragraph.length === 0 || !startsBlock(lines[at] ?? "")); at++) paragraph.push((lines[at] ?? "").trim());
      blocks.push({ kind: "paragraph", lines: paragraph.map((words, index) => replyInlines(words, last(first + index), depth)) });
    }
  }
  return blocks;
}

function inlineWords(runs: readonly ReplyInline[], spoken: boolean): string {
  return runs.map((run) => {
    switch (run.kind) {
      case "text":
      case "code": return run.text;
      case "strong":
      case "emphasis": return inlineWords(run.children, spoken);
      case "link": {
        const label = inlineWords(run.children, spoken);
        return spoken || label === run.href || httpsHref(label) === run.href ? label : `${label} (${run.href})`;
      }
    }
  }).join("");
}

function blockWords(blocks: readonly ReplyBlock[], spoken: boolean, between = "\n\n"): string {
  return blocks.map((block) => {
    switch (block.kind) {
      case "paragraph": return block.lines.map((line) => inlineWords(line, spoken)).join("\n");
      case "heading": return inlineWords(block.words, spoken);
      case "quote": return blockWords(block.blocks, spoken);
      case "code": return block.text;
      case "rule": return "";
      case "list": return block.items.map((item, index) => {
        const marker = block.start !== undefined ? `${block.start + index}. ` : spoken ? "- " : "• ";
        return marker + blockWords(item, spoken, "\n").replaceAll("\n", `\n${" ".repeat(marker.length)}`);
      }).join("\n");
    }
  }).filter((words) => words !== "").join(between);
}

/**
 * A reply's plain words, without its Markdown marks: what is copied, quoted and emailed keeps a list item's number or
 * bullet and a link's address after its words; what is `spoken` keeps a list item's number and only a link's words.
 * @throws {never}
 */
export function replyWords(text: string, spoken = false): string {
  return blockWords(replyMarkdown(text), spoken);
}
