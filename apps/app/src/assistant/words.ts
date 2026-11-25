// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"
import { withoutMapsCards } from "@elizaos/plugin-maps-client";

/** A message's words as the owner reads them: an agent reply without the Maps cards it carries; the owner's own words as written. @throws {never} */
export function wordsOf(line: { readonly mine: boolean; readonly text: string }): string {
  return line.mine ? line.text : withoutMapsCards(line.text);
}
