// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import { withoutMapsCards } from "@elizaos/plugin-maps-client";

/** A share question a Maps reply asks: the answers it offers, each sent as the owner's words. */
export interface ShareChoice {
  readonly id: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

const fence = /^[ \t]{0,3}(`{3,}|~{3,})/;
const choiceOpen = /^\s*\[CHOICE:maps-share id=([A-Za-z0-9_-]{1,128})\]\s*$/;
const anyChoiceOpen = /^\s*\[CHOICE:[A-Za-z0-9_-]+ id=[^\]]+\]\s*$/;
const choiceClose = /^\s*\[\/CHOICE\]\s*$/;
const formOpen = /^\s*\[FORM\]/;
const formClose = /\[\/FORM\]\s*$/;
const cardOpen = /^\s*\[[ \t]*MAPSCARD[ \t]*\][ \t]*$/;
const option = /^([^=\n]{1,500})=([^=\n]{1,80})$/;

interface Blocks {
  readonly words: string;
  readonly choices: readonly ShareChoice[];
}

/**
 * A reply read for the owner: its Maps cards (eliza's recognizer), its share questions and its forms taken out of the words,
 * outside a code fence only, with each share question's answers kept. A block still being written, with no closing line
 * yet, is held back from the words until it closes. @throws {never}
 */
export function replyBlocks(text: string): Blocks {
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
    if (anyChoiceOpen.test(line) || formOpen.test(line) || cardOpen.test(line)) {
      const closes = anyChoiceOpen.test(line) ? choiceClose : formOpen.test(line) ? formClose : /^\s*\[[ \t]*\/[ \t]*MAPSCARD[ \t]*\][ \t]*$/;
      let end = at;
      while (end < lines.length && !closes.test(lines[end] ?? "")) end++;
      if (end >= lines.length) break;
      if (cardOpen.test(line)) {
        kept.push(...lines.slice(at, end + 1));
        at = end;
        continue;
      }
      const share = choiceOpen.exec(line);
      const body = lines.slice(at + 1, end).map((entry) => option.exec(entry.trim()));
      if (share !== null && body.length === 2 && body.every((found) => found !== null)) {
        choices.push({ id: share[1] ?? "", options: body.map((found) => ({ value: (found?.[1] ?? "").trim(), label: (found?.[2] ?? "").trim() })) });
      }
      at = end;
      continue;
    }
    kept.push(line);
  }
  return { words: kept.join("\n").replace(/\n{3,}/g, "\n\n").trim(), choices };
}

/** A message's words as the owner reads them: an agent reply without its cards, questions and forms; the owner's own words as written. @throws {never} */
export function wordsOf(line: { readonly mine: boolean; readonly text: string }): string {
  return line.mine ? line.text : replyBlocks(line.text).words;
}
