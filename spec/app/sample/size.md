# Text size

The size of Alpha's text: the owner chooses it, the phone keeps it, and the
whole page follows it from the moment Alpha opens. It is the sample of a
machine that lives from launch: its events name their sender, its opening
asks the phone what it kept, the phone's own signals reach it, and a
setting the phone does not answer is given up.

## Story: Read Alpha at my size

> As the owner, I want Alpha's text at the size I chose, from the first
> thing I see, and to be told when the phone could not keep a change.

### A size is one of five, set by one asking of the phone at a time, with ten seconds for its answer

```quint
import read as R from "../../kit/read"

type Sender = Owner | Phone
type Effect = Apply({ ticket: int, percent: int })
type Size = { started: bool, percent: int, wanted: int, setting: R::Read, due: int, unkept: bool }
type Moved = { state: Size, out: List[Effect] }

pure val initial: Size = { started: false, percent: 100, wanted: 100, setting: R::unread, due: 0, unkept: false }
pure val limit = 10000
pure def offered(percent: int): bool = Set(75, 100, 115, 130, 150).contains(percent)
pure val percentValues = Set(100, 130, 140)
pure val wasValues = Set(0, 130)
pure val atValues = Set(0, 1)
pure val nowValues = Set(0, 10000, 10001)
pure val ticketValues = Set(0, 1, 2)
```

### When Alpha opens, the phone says the size it kept, once, and a size it does not offer counts as none

```quint
pure def canStart(s: Size, by: Sender): bool = by == Phone and not(s.started)

pure def start(s: Size, was: int, by: Sender): Size =
  val percent = if (offered(was)) was else 100
  { ...s, started: true, percent: percent, wanted: percent }
```

### The owner chooses another offered size once Alpha has started, one change at a time

```quint
pure def canChoose(s: Size, percent: int, by: Sender): bool =
  by == Owner and s.started and offered(percent) and percent != s.percent and s.setting.status != R::Loading

pure def choose(s: Size, percent: int, at: int, by: Sender): Moved =
  val setting = R::ask(s.setting)
  { state: { ...s, wanted: percent, setting: setting, due: at + limit, unkept: false },
    out: List(Apply({ ticket: setting.ticket, percent: percent })) }
```

### The phone answers the newest asking: the size is the one wanted, or it stays and the owner is told

```quint
pure def canApplied(s: Size, ticket: int, by: Sender): bool = by == Phone and R::canAnswer(s.setting, ticket)

pure def applied(s: Size, ticket: int, kept: bool, by: Sender): Size =
  { ...s, setting: R::answer(s.setting, kept), percent: if (kept) s.wanted else s.percent,
    wanted: if (kept) s.wanted else s.percent, unkept: not(kept) }
```

### An asking the phone has not answered after ten seconds is given up, and the size stays

```quint
pure def canGiveUp(s: Size, now: int, by: Sender): bool = by == Phone and s.setting.status == R::Loading and now >= s.due

pure def giveUp(s: Size, now: int, by: Sender): Size =
  { ...s, setting: R::answer(s.setting, false), wanted: s.percent, unkept: true }
```

### Once the owner has left the page, a size that was not kept is no longer told

```quint
pure def canSeen(s: Size, visible: bool, by: Sender): bool = by == Phone and not(visible) and s.unkept

pure def seen(s: Size, visible: bool, by: Sender): Size = { ...s, unkept: false }
```

### The size is always one the phone offers

```quint
pure def alwaysAnOfferedSize(s: Size): bool = offered(s.percent) and offered(s.wanted)
```

### A size is set only once Alpha has started

```quint
pure def alwaysSettingOnlyOnceStarted(s: Size): bool = s.setting.status == R::Loading implies s.started
```

### A size can be kept, and a change can fail to be

```quint
pure def sometimesKept(s: Size): bool = s.percent == 130 and s.setting.status == R::Loaded

pure def sometimesUnkept(s: Size): bool = s.unkept
```
