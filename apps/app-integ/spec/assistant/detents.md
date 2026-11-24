# Detents

Where the chat sits is the assistant's: the pill (`Hidden`), the bar (`Input`), the half sheet
(`Sheet`) and full screen (`Full`). This library is the one model of those heights. The dock
([Dock](./dock.md)) moves between them with one gesture; the shell's navigation
(spec/shell/navigation.md) keeps the one the phone shows, orders Back around it and lowers it,
all with these definitions, so the two never disagree about where the chat rests or how far Back
lowers it.

## Story: Find the assistant at the height I left it

> As the owner, I want the assistant to rest on Home's bar or on an app's bar or pill, or to be
> open as a half sheet or full screen, and each Back to lower it one step, so that I always know
> where it is and how to put it away.

### The chat is on the pill, on the bar, a half sheet or full, and only the half sheet and full are open

```quint
type Detent = Hidden | Input | Sheet | Full
pure def isOpen(chat: Detent): bool = chat == Sheet or chat == Full
pure def lawOnlyTheSheetAndFullAreOpen(chat: Detent): bool = isOpen(chat) iff (chat == Sheet or chat == Full)
```

### A surface rests the chat on its pill or on its bar, and Home always keeps its bar

A view whose own bar stands in for the input rests the chat on the bar; every other app view rests
it on the pill. Home rests on the bar, and a height asked for on Home that would hide the bar
settles on the bar instead.

```quint
pure def restFor(pill: bool): Detent = if (pill) Hidden else Input
pure def settledOn(home: bool, chat: Detent): Detent = if (home and chat == Hidden) Input else chat
pure def keepsItsBar(home: bool, chat: Detent): bool = home implies chat != Hidden
pure def lawASettledHomeKeepsItsBar(chat: Detent): bool = keepsItsBar(true, settledOn(true, chat))
pure def lawAwayFromHomeEveryHeightSettles(chat: Detent): bool = settledOn(false, chat) == chat
pure def lawARestIsNeverOpen(pill: bool): bool = not(isOpen(restFor(pill)))
```

### Back lowers a full chat to the half sheet, and a half sheet to where its surface rests

```quint
pure def lowered(chat: Detent, rest: Detent): Detent = if (chat == Full) Sheet else rest
pure def lawLoweringFullLeavesTheSheet(rest: Detent): bool = lowered(Full, rest) == Sheet
pure def lawLoweringTheSheetRests(rest: Detent): bool = lowered(Sheet, rest) == rest
pure def lawLoweringNeverGoesFull(chat: Detent, rest: Detent): bool = not(isOpen(rest)) implies lowered(chat, rest) != Full
```
