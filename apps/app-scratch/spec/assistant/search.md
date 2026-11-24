# Search

Chat search across the owner's conversations, from the chat actions menu.
A query of at least two characters is sent 250 ms after the last keystroke
to `GET /api/conversations/messages/search?q=…&limit=50&offset=…`; a page of
exactly 50 results offers more. A result row shows its snippet (or text)
and date; opening it restores that conversation around the message
(`GET /api/conversations/:id/messages?around=:messageId`), scrolls it into
the middle and marks it for 1.8 s. An answer publishes only in the owner
scope that asked it: closing search, or an owner, agent or account change,
retires the question.

## Story: Find something I said in an earlier chat

> As the owner, I want to search my chats and jump to a message, and never
> see results from another account or a search I already closed.

### A search answer shows only while search is open and its owner scope is the one that asked

```quint
type Search = { owner: int, held: int, open: bool, pending: bool, results: bool, page: int, more: bool }
pure val initial: Search = { owner: 0, held: 0, open: false, pending: false, results: false, page: 0, more: false }
pure val minimumQuery = 2
pure val pageSize = 50
pure val debounceMs = 250
pure val markMs = 1800
pure def openSearch(s: Search): Search = { ...s, open: true, pending: false, results: false, page: 0, more: false }
pure def canQuery(s: Search, len: int): bool = s.open and not(s.pending) and len >= minimumQuery
pure def query(s: Search, len: int): Search = { ...s, pending: true, held: s.owner, page: 0 }
pure def canLoadMore(s: Search): bool = s.open and not(s.pending) and s.results and s.more
pure def loadMore(s: Search): Search = { ...s, pending: true, held: s.owner, page: s.page + 1 }
pure def answer(s: Search, count: int): Search = {
  val live = s.pending and s.open and s.held == s.owner
  { ...s, pending: false, results: live or (s.results and s.page > 0 and s.open), more: live and count == pageSize }
}
pure def closeSearch(s: Search): Search = { ...s, open: false, pending: false, results: false, more: false }
pure def retire(s: Search): Search = { ...s, owner: s.owner + 1, open: false, pending: false, results: false, more: false }
pure def alwaysResultsBelongToTheOpenOwner(s: Search): bool = s.results implies (s.open and s.held == s.owner)
pure def alwaysMoreNeedsResults(s: Search): bool = s.more implies s.results
pure def sometimesResultsShown(s: Search): bool = s.results and s.more
pure def sometimesARetiredAnswerShowedNothing(s: Search): bool = s.owner >= 1 and not(s.results) and s.held < s.owner
pure val lenValues = Set(0, 1, 2, 5)
pure val countValues = Set(0, 3, 50)
```

### A hit in another chat opens only with no attachment waiting

Opening a result restores that chat; it is refused while the composer holds
an attachment ("Send or remove the attachment before changing chats.").

```quint
pure def jumpAllowed(attachments: int, sameChat: bool): bool = sameChat or attachments == 0
pure def lawAnAttachmentKeepsItsChat(attachments: int): bool = attachments > 0 implies not(jumpAllowed(attachments, false))
pure val attachmentsValues = Set(0, 1)
```
