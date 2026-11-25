// spec/app/assistant/search.md, "Search from a closed Contact remembers the card that opened it"
import type { Alpha } from "../runtime/area.tsx";

/** Ask the existing Assistant search owner to open over this card. */
export function searchFromContact(alpha: Alpha, route: number, person: string): void {
  void Promise.all([import("./index.tsx"), import("./assistant.vibe")])
    .then(([{ default: assistant }, { openContactChatSearch }]) => assistant.runtime(alpha).runPromiseExit(openContactChatSearch(route, person)))
    .catch(() => undefined);
}
