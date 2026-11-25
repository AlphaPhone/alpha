// spec/app/assistant/search.md, "Search from a closed Contact remembers the card that opened it"

/** The trigger on the exact card and visit, which the search dialog returns focus to. */
export function contactChatActionsId(route: number, person: string): string {
  return `contact-chat-actions-${route}-${person}`;
}
