# Browser alerts

The browser owner can allow or silence Alpha's alerts from Notifications
in Settings. The choice applies to alert presentation. Scheduling, recorded
occurrences and workflow approval custody continue. Android reports its
own alert settings.

## Story: Choose whether Alpha shows browser alerts

> As the owner, I want to turn browser alerts on or off and keep that choice
> when I reopen Alpha.

### The browser reads its saved choice at startup and refreshes when another tab changes it

```quint
type Status = Unavailable | Enabled | Disabled
type Phase = Idle | Reading | Writing
type Sender = Owner | Browser
type Alerts = { started: bool, web: bool, phase: Phase, revision: int, status: Status, saveFailed: bool }
type Effect = Read({ read: int }) | Save({ write: int, desired: bool })
type Changed = { state: Alerts, out: List[Effect] }

pure val initial: Alerts = { started: false, web: false, phase: Idle, revision: 0, status: Unavailable, saveFailed: false }

pure def read(nextRevision: int, s: Alerts): Changed =
  { state: { ...s, phase: Reading, revision: nextRevision }, out: List(Read({ read: nextRevision })) }

pure def canStart(s: Alerts, web: bool, by: Sender): bool = by == Browser and not(s.started)

pure def start(s: Alerts, web: bool, by: Sender): Changed =
  if (web) read(s.revision + 1, { ...s, started: true, web: true })
  else { state: { ...s, started: true }, out: List() }

pure def canRefresh(s: Alerts, by: Sender): bool = s.web and s.phase != Writing

pure def refresh(s: Alerts, by: Sender): Changed = read(s.revision + 1, s)

pure def canReadBack(s: Alerts, read: int, status: Status, by: Sender): bool =
  s.web and s.phase == Reading and read == s.revision and by == Browser

pure def readBack(s: Alerts, read: int, status: Status, by: Sender): Changed =
  { state: { ...s, phase: Idle, status: status }, out: List() }
```

### Only the owner can change the saved choice, and the reread after the save supplies the displayed answer

```quint
pure def offersChoice(s: Alerts): bool = s.web and s.phase == Idle and s.status != Unavailable

pure def canChoose(s: Alerts, desired: bool, by: Sender): bool =
  offersChoice(s) and by == Owner and desired != (s.status == Enabled)

pure def choose(s: Alerts, desired: bool, by: Sender): Changed =
  { state: { ...s, phase: Writing, revision: s.revision + 1, saveFailed: false },
    out: List(Save({ write: s.revision + 1, desired: desired })) }

pure def canSaved(s: Alerts, write: int, ok: bool, by: Sender): bool =
  s.web and s.phase == Writing and write == s.revision and by == Browser

pure def saved(s: Alerts, write: int, ok: bool, by: Sender): Changed = read(s.revision + 1, { ...s, saveFailed: not(ok) })

pure def alwaysAndroidHasNoBrowserAlertWork(s: Alerts): bool = not(s.web) implies s.phase == Idle

pure def stepOnlyTheOwnerChooses(before: Alerts, via: str, after: Alerts, out: List[Effect]): bool =
  out.every(fx => match fx { | Save(work) => via == "choose" and offersChoice(before) and after.phase == Writing | _ => true })

pure def sometimesOff(s: Alerts): bool = s.web and s.status == Disabled
```
