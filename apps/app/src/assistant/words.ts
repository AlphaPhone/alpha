// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
// spec/app/assistant/reply.md, "The agent's turn tag is never drawn, copied, quoted, emailed or spoken, and a reply still being written holds back what may become one"
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
const tag = String.raw`(?:\[(?:answer|promise)\](?!\()|<(?:answer|promise)>)`;
const turnTag = new RegExp(String.raw`[ \t]*${tag}[ \t]*(?=\r?$)|${tag}[ \t]*`, "g");
const turnTagSoFar = /(?:[[<](?:a(?:n(?:s(?:w(?:e(?:r)?)?)?)?)?|p(?:r(?:o(?:m(?:i(?:s(?:e)?)?)?)?)?)?)?|\[(?:answer|promise)\])$/;
const inlineCode = /(`+[^`]*`+|`.*$)/;
const partialOpener = /^\s*\[(?:M(?:A(?:P(?:S(?:C(?:A(?:R(?:D)?)?)?)?)?)?)?|C(?:H(?:O(?:I(?:C(?:E(?::[^\]\n]*)?)?)?)?)?)?|F(?:O(?:R(?:M)?)?)?)?$/;

interface Blocks {
  readonly words: string;
  readonly choices: readonly ShareChoice[];
}

/**
 * The model's text without eliza's turn tag, exactly `[answer]`, `[promise]`, `<answer>` or `<promise>`, wherever it
 * stands in prose: never inside a code fence or inline code, and never a link's words. While the reply is still
 * `streaming`, an ending that may still become one, or a tag that may still become a link's words, is held back. Never
 * for the owner's own words. @throws {never}
 */
export function withoutTurnTags(text: string, streaming = false): string {
  let fenced = false;
  return (streaming ? text.replace(turnTagSoFar, "") : text).split("\n").map((line) => {
    const fenceMark = fence.test(line);
    if (fenceMark) fenced = !fenced;
    return fenceMark || fenced ? line : line.split(inlineCode).map((piece, at) => (at % 2 === 0 ? piece.replace(turnTag, "") : piece)).join("");
  }).join("\n");
}

/**
 * A reply read for the owner, without the agent's turn tag: its Maps cards (eliza's recognizer), its Maps share questions and its forms taken out of the
 * words, outside a code fence only, with each share question's answers kept. Any other block reads as text. While the reply
 * is still `streaming`, a block that has not closed, and a last line that may still become one, are held back; in a finished
 * reply an unclosed block stays as text. @throws {never}
 */
export function replyBlocks(text: string, streaming = false): Blocks {
  const lines = withoutMapsCards(withoutTurnTags(text, streaming)).split(/\r?\n/);
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
