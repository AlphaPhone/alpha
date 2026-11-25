// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import { withoutMapsCards } from "@elizaos/plugin-maps-client";
import { replyWords } from "@repo/ui";

/** A share question a Maps reply asks: the answers it offers, each sent as the owner's words. */
export interface ShareChoice {
  readonly id: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

const fence = /^[ \t]{0,3}(`{3,}|~{3,})/;
const shareOpen = /^\s*\[CHOICE:maps-share id=([A-Za-z0-9_-]{1,128})\]\s*$/;
const choiceClose = /^\s*\[\/CHOICE\]\s*$/;
const formOpen = /^\s*\[FORM\]/;
const formClose = /\[\/FORM\]\s*$/;
const cardOpen = /^\s*\[[ \t]*MAPSCARD[ \t]*\][ \t]*$/;
const cardClose = /^\s*\[[ \t]*\/[ \t]*MAPSCARD[ \t]*\][ \t]*$/;
const option = /^([^=\n]{1,500})=([^=\n]{1,80})$/;
const callOpen = /<tool_call>|<function=/;
const callClose = /<\/function>(?:\s*<\/tool_call>)?|<\/tool_call>/;
const strayClose = /^\s*(?:<\/function>|<\/tool_call>)\s*$/;
const partialCall = /<(?:t(?:o(?:o(?:l(?:_(?:c(?:a(?:l(?:l)?)?)?)?)?)?)?)?|f(?:u(?:n(?:c(?:t(?:i(?:o(?:n)?)?)?)?)?)?)?)?$/;
const partialOpener = /^\s*\[(?:M(?:A(?:P(?:S(?:C(?:A(?:R(?:D)?)?)?)?)?)?)?|C(?:H(?:O(?:I(?:C(?:E(?::[^\]\n]*)?)?)?)?)?)?|F(?:O(?:R(?:M)?)?)?)?$/;

interface Blocks {
  readonly words: string;
  readonly choices: readonly ShareChoice[];
}

/**
 * A reply read for the owner: its Maps cards (eliza's recognizer), its Maps share questions, its forms and any tool call the
 * model wrote out as text (`<tool_call>` or `<function=` to its closing tag) taken out of the words, outside a code fence
 * only and never across a fence, with each share question's answers kept; the prose left around a tool call is read again
 * as one line, which loses only its own trailing blanks. Any
 * other block reads as text. While the reply is still `streaming`, a block that has not closed, and a last line that may
 * still become one, are held back; in a finished reply an unclosed block stays as text. @throws {never}
 */
export function replyBlocks(text: string, streaming = false): Blocks {
  const lines = withoutMapsCards(text).split(/\r?\n/);
  const kept: string[] = [];
  const choices: ShareChoice[] = [];
  let fenced = false;
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at] ?? "";
    if (fence.test(line)) {
      fenced = !fenced;
      kept.push(line);
      continue;
    }
    if (fenced) {
      kept.push(line);
      continue;
    }
    const call = callOpen.exec(line);
    if (call !== null) {
      const before = line.slice(0, call.index);
      let end = at;
      let after: string | undefined;
      for (; end < lines.length && (end === at || !fence.test(lines[end] ?? "")); end++) {
        const from = end === at ? call.index + call[0].length : 0;
        const rest = (lines[end] ?? "").slice(from);
        const closed = callClose.exec(rest);
        if (closed !== null) {
          after = rest.slice(closed.index + closed[0].length);
          break;
        }
      }
      if (after === undefined) {
        if (!streaming) {
          kept.push(line);
          continue;
        }
        if (before.trim() !== "") kept.push(before.trimEnd());
        break;
      }
      const joined = (/(^|\s)$/.test(before) ? before + after.trimStart() : before + after).trimEnd();
      lines.splice(at, end - at + 1, ...(joined.trim() === "" ? [] : [joined]));
      at--;
      continue;
    }
    if (strayClose.test(line)) continue;
    if (streaming && at === lines.length - 1 && partialCall.test(line)) {
      const head = line.replace(partialCall, "").trimEnd();
      if (head.trim() !== "") kept.push(head);
      break;
    }
    if (streaming && at === lines.length - 1 && partialOpener.test(line)) break;
    const share = shareOpen.exec(line);
    if (share === null && !formOpen.test(line) && !cardOpen.test(line)) {
      kept.push(line);
      continue;
    }
    const closes = share !== null ? choiceClose : formOpen.test(line) ? formClose : cardClose;
    let end = at;
    while (end < lines.length && !closes.test(lines[end] ?? "")) end++;
    if (end >= lines.length) {
      if (streaming) break;
      kept.push(line);
      continue;
    }
    if (cardOpen.test(line)) {
      kept.push(...lines.slice(at, end + 1));
      at = end;
      continue;
    }
    const body = lines.slice(at + 1, end).map((entry) => option.exec(entry.trim()));
    if (share !== null && body.length === 2 && body.every((found) => found !== null)) {
      choices.push({ id: share[1] ?? "", options: body.map((found) => ({ value: (found?.[1] ?? "").trim(), label: (found?.[2] ?? "").trim() })) });
    }
    at = end;
  }
  return { words: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(), choices };
}

/**
 * A message's words as they are copied, quoted, emailed or, `spoken`, read aloud: an agent reply's plain words, without
 * its cards, share questions, forms and Markdown marks; the owner's own words as written. @throws {never}
 */
export function wordsOf(line: { readonly mine: boolean; readonly text: string }, spoken = false): string {
  return line.mine ? line.text : replyWords(replyBlocks(line.text).words, spoken);
}
