# Agent access to Google

The owner's two switches for what the agent may change through Google:
Gmail changes (labelling, archiving, marking read and sending) and
Calendar edits. The phone's Google host enforces them and treats a
switch it has no record of as off. A switch is never a grant: switching
off disconnects nothing and the agent still reads what the grants in
[Google & email](./google.md) allow. Inbox and Calendar take the facts
below. The switches belong to the Cloud account signed in, so a new
sign-in from [Session](./session.md) reads them again.

## Story: Decide what the agent may change in Google

> As the owner, I want to switch off the agent's changes to my mail or
> my calendar without disconnecting anything, and never to be shown a
> switch the phone does not enforce.

### The switches are held as the phone last read them back, with which ones were saved since and not yet confirmed

```quint
import read as R from "../../kit/read"
import outside as O from "./outside"

type Switch = MailChanges | CalendarEdits
type Access = { mail: bool, calendar: bool }
type Trouble = Fine | NotSaved
type Effect = ReadAccess({ check: int }) | SaveAccess({ ticket: int, mail: bool, calendar: bool })
type AgentAccess = { known: Access, unsure: Access, read: R::Read, saving: bool, ticket: int, trouble: Trouble }
type Moved = { state: AgentAccess, out: List[Effect] }

pure val off: Access = { mail: false, calendar: false }

pure val initial: AgentAccess = { known: off, unsure: off, read: R::unread, saving: false, ticket: 0, trouble: Fine }

pure val ticketValues = Set(1, 2, 3)
pure val weight_accessRead = 10
```

### Each switch is shown as the phone last read it back, and one saved but not yet read back is shown off

Before the phone has answered, both are off.

```quint
pure def shown(a: AgentAccess): Access =
  { mail: a.known.mail and not(a.unsure.mail), calendar: a.known.calendar and not(a.unsure.calendar) }

pure def stepASwitchIsShownOnOnlyAsReadBack(before: AgentAccess, via: str, after: AgentAccess): bool =
  ((shown(after).mail and not(shown(before).mail)) or (shown(after).calendar and not(shown(before).calendar)))
    implies via == "accessRead"
```

### The switches are read from the phone, and only the newest reading is taken

```quint
pure def canReadAccess(a: AgentAccess): bool = a.read.status != R::Loading

pure def readAccess(a: AgentAccess): Moved = { state: { ...a, read: R::ask(a.read) }, out: List(ReadAccess({ check: a.read.ticket + 1 })) }

pure def canAccessRead(a: AgentAccess, ticket: int): bool = R::canAnswer(a.read, ticket)

pure def accessRead(a: AgentAccess, ticket: int, ok: bool, mail: bool, calendar: bool): AgentAccess =
  if (ok and not(a.saving)) { ...a, read: R::answer(a.read, true), known: { mail: mail, calendar: calendar }, unsure: off }
  else { ...a, read: R::answer(a.read, ok) }
```

### Only the owner switches, once both switches are read back, one save at a time; a save writes the other switch as read back, and every save is read back whatever the phone answers

A save the phone refused is said so; the switch shows what the phone
reads back. A switch never read, or saved and not yet read back, is
never written over.

```quint
pure def canSetAccess(a: AgentAccess, which: Switch, on: bool, origin: O::Origin): bool =
  not(a.saving) and O::acts(origin) and a.read.status == R::Loaded and a.unsure == off

pure def setAccess(a: AgentAccess, which: Switch, on: bool, origin: O::Origin): Moved =
  val now = shown(a)
  val want = if (which == MailChanges) { ...now, mail: on } else { ...now, calendar: on }
  { state: { ...a, saving: true, ticket: a.ticket + 1, trouble: Fine,
      unsure: if (which == MailChanges) { ...a.unsure, mail: true } else { ...a.unsure, calendar: true } },
    out: List(SaveAccess({ ticket: a.ticket + 1, mail: want.mail, calendar: want.calendar })) }

pure def canAccessSaved(a: AgentAccess, ticket: int): bool = a.saving and ticket == a.ticket

pure def accessSaved(a: AgentAccess, ticket: int, ok: bool): Moved =
  readAccess({ ...a, saving: false, trouble: if (ok) Fine else NotSaved })

pure def stepASaveWritesOnlyTheSwitchChanged(before: AgentAccess, after: AgentAccess, out: List[Effect]): bool =
  out.every(e => match e {
    | SaveAccess(x) => before.unsure == off and before.read.status == R::Loaded
        and (x.mail == before.known.mail or x.calendar == before.known.calendar)
    | _ => true
  })

pure def stepEverySaveIsReadBack(before: AgentAccess, via: str, after: AgentAccess, out: List[Effect]): bool =
  via == "accessSaved" implies (
    out.length() == 1 and out.every(e => match e { | ReadAccess(r) => r.check == after.read.ticket | _ => false })
      and after.read.status == R::Loading)
```

### The agent may change mail or calendar only when both the grant and the switch allow it, and switching off never touches what it may read

```quint
type MailRights = { read: bool, modify: bool, send: bool }

pure def agentMail(grantRead: bool, grantModify: bool, grantSend: bool, a: AgentAccess): MailRights =
  { read: grantRead, modify: grantModify and shown(a).mail, send: grantSend and shown(a).mail }

pure def agentMayEditCalendar(a: AgentAccess): bool = shown(a).calendar

pure def lawSwitchingOffKeepsReadingAndNeedsBoth(grantRead: bool, grantModify: bool, grantSend: bool, mail: bool): bool =
  val a = { ...initial, known: { mail: mail, calendar: false } }
  agentMail(grantRead, grantModify, grantSend, a).read == grantRead
    and (agentMail(grantRead, grantModify, grantSend, a).modify iff (grantModify and mail))
    and not(agentMail(grantRead, grantModify, grantSend, { ...a, unsure: { mail: true, calendar: false } }).send)
```

### Changes to mail can be allowed as the phone read them back

```quint
pure def sometimesMailChangesAllowed(a: AgentAccess): bool = shown(a).mail and a.read.status == R::Loaded and a.ticket > 0
```

### A switch saved and not yet read back is shown off

```quint
pure def sometimesUnconfirmedIsOff(a: AgentAccess): bool = a.known.calendar and a.unsure.calendar and not(shown(a).calendar)
```

### A save can be refused and the switches read back

```quint
pure def sometimesNotSaved(a: AgentAccess): bool = a.trouble == NotSaved and a.read.status == R::Loading
```

## Story: Keep the switches to their sign-in, across a restart and an erase

> As the owner, I want the switches read again for a new sign-in and
> after Alpha restarts, a save cut short shown off until it is read back,
> and both off after I erase Alpha.

### A new sign-in, or signing out, shows both switches off until they are read again for it

```quint
pure def canReset(a: AgentAccess, signIn: int): bool = signIn >= 0

pure def reset(a: AgentAccess, signIn: int): Moved =
  val r = { ...a, unsure: { mail: true, calendar: true }, saving: false, read: O::retire(a.read), trouble: Fine }
  if (signIn > 0) readAccess(r) else { state: r, out: List() }

pure def stepANewSignInShowsNothingUntilReadBack(before: AgentAccess, via: str, after: AgentAccess): bool =
  via == "reset" implies (not(shown(after).mail) and not(shown(after).calendar) and not(after.saving))
```

### A switch can be read back after a new sign-in

```quint
pure def sometimesReadAgainForANewSignIn(a: AgentAccess): bool = a.unsure.mail and a.unsure.calendar and a.read.status == R::Loading and a.ticket == 0
```

### A restart reads the switches again and keeps a save cut short unconfirmed

```quint
pure def restart(a: AgentAccess): Moved = readAccess({ ...a, saving: false, read: O::retire(a.read) })
```

### Erasing Alpha turns both switches off and refuses every answer still in flight

```quint
pure def erase(a: AgentAccess): AgentAccess = { ...a, known: off, unsure: off, saving: false, read: O::retire(a.read), trouble: Fine }
```
