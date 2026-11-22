# Camera and Photos notices

One short line over Camera or Photos, only for an outcome the owner has to
act on: "Not saved", "Busy", "Saved · max length", "Couldn't zoom", a
library change summary. A new line replaces the last; a line goes away after
five seconds unless it is persistent, and only the line that set the timer
can be cleared by it. The owner can dismiss it.

## Story: Be told only what I need to act on

> As the owner, I want one short line when something needs me and nothing
> otherwise, so that Camera and Photos stay clear.

### A notice holds the current line, whether it stays, and the generation that set it

```quint
type Notices = { said: str, persistent: bool, generation: int }
pure val initial: Notices = { said: "", persistent: false, generation: 0 }
pure val textValues = Set("", "Not saved", "Busy")
pure val generationValues = Set(0, 1, 2)
```

### A new line replaces the last; an empty line clears it

```quint
pure def say(n: Notices, text: str, persistent: bool): Notices = { said: text, persistent: persistent and text != "", generation: n.generation + 1 }
pure def alwaysEmptyLineIsNotPersistent(n: Notices): bool = n.said == "" implies not(n.persistent)
```

### A line expires only from its own timer, and never when it is persistent

```quint
pure def canExpire(n: Notices, generation: int): bool = n.said != "" and not(n.persistent) and generation == n.generation
pure def expire(n: Notices, generation: int): Notices = { ...n, said: "" }
pure def canDismiss(n: Notices): bool = n.said != ""
pure def dismiss(n: Notices): Notices = { ...n, said: "", persistent: false }
pure def sometimesPersistentLine(n: Notices): bool = n.persistent
pure def stepOnlyItsOwnTimerExpiresALine(before: Notices, via: str, after: Notices): bool =
  via == "expire" implies after.generation == before.generation
```
