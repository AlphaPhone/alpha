# Activity

Agent activity, under About ([Settings](./index.md)): Restart Alpha or Try
again when the agent needs the owner, and the actions the agent took or
proposed on the phone, where the owner declines a proposal or says whether
an action whose outcome the agent could not see really happened.

None of it is kept here. The account area owns the agent's connection as
the owner sees it (starting, ready, needing a restart or another try,
offline, not packaged with this build), its recovery with a bounded number
of starts, and Cancel while it is busy; the shell passes its state with each
event. The approvals area owns each phone action's custody and settles the
owner's word on it; this page reads its journal through the agent and
reads it again after each word. Conversations open in Ask Alpha, and
Export diagnostics is the [Developer](./developer.md) export.

## Story: Help the agent recover

> As the owner, I want to see when my agent needs me to restart it or try
> again, and to ask for that from here.

### Restart Alpha is offered only when the account area says the agent needs a restart, and Try again only when it needs another try

The account area carries it out and decides whether one more start is
allowed.

```quint
import read as R from "../../kit/read"
import timed as T from "./timed"

type Connection = Ready | Starting | NeedsRestart | NeedsRetry | Offline | Unpackaged
type Recovery = Restart | Retry
type Row = { proposal: int, declinable: bool, unsettled: bool }

type Activity = { journal: T::Timed, rows: List[Row] }

type Effect =
  Recover({ how: Recovery })
  | ReadJournal({ reading: int })
  | Reject({ proposal: int })
  | Reconcile({ proposal: int, happened: bool })
type Sent = { state: Activity, out: List[Effect] }

pure val initial: Activity = { journal: T::unasked, rows: List() }

pure def needs(how: Recovery, connection: Connection): bool =
  if (how == Restart) connection == NeedsRestart else connection == NeedsRetry

pure def canRecover(s: Activity, how: Recovery, connection: Connection): bool = needs(how, connection)

pure def recover(s: Activity, how: Recovery, connection: Connection): Sent = { state: s, out: List(Recover({ how: how })) }
```

### Asking for a recovery changes nothing on this page

```quint
pure def isRecover(e: Effect): bool = match e { | Recover(r) => true | _ => false }

pure def stepARecoveryIsHandedOver(before: Activity, after: Activity, out: List[Effect]): bool =
  out.some(e => isRecover(e)) implies (after == before and out.length() == 1)
```

## Story: Answer for what the agent did on the phone

> As the owner, I want to see what the agent did or proposed on my phone,
> decline what I do not want, and settle what it could not confirm, with
> my answer recorded where the action is kept.

Activity holds the last read of the phone-action journal and the rows it
returned. Each row is an action as the approvals area recorded it, with whether it
can still be declined and whether its outcome is unsettled. Until the agent
is ready, the page says the actions load when it is; without an agent
packaged with this build, it says so.

### The journal is read only while the agent is ready, one read at a time, with ten seconds to answer

```quint
pure val readLimit = 10000
pure val atValues = Set(0, 4000, 20000)

pure def askJournal(at: int, s: Activity): Sent =
  val asking = T::ask(s.journal, at, readLimit)
  { state: { ...s, journal: asking }, out: List(ReadJournal({ reading: asking.read.ticket })) }

pure def canRefreshActions(s: Activity, at: int, connection: Connection): bool =
  connection == Ready and not(T::busy(s.journal))

pure def refreshActions(s: Activity, at: int, connection: Connection): Sent = askJournal(at, s)
```

### What is shown is what the journal held when last read; a read that fails or is not answered in time leaves it as it was and says so

```quint
pure val readingValues = Set(1, 2, 3)
pure val rowsValues = Set(
  List(),
  List({ proposal: 1, declinable: true, unsettled: false }),
  List({ proposal: 1, declinable: false, unsettled: true }, { proposal: 2, declinable: false, unsettled: false }),
)

pure def canActionsRead(s: Activity, reading: int, ok: bool, rows: List[Row]): bool = T::canAnswer(s.journal, reading)

pure def actionsRead(s: Activity, reading: int, ok: bool, rows: List[Row]): Activity =
  if (ok) { ...s, journal: T::answer(s.journal, true), rows: rows } else { ...s, journal: T::answer(s.journal, false) }

pure val nowValues = Set(0, 4000, 20000, 40000)

pure def canGiveUpOnActions(s: Activity, now: int): bool = T::canGiveUp(s.journal, now)

pure def giveUpOnActions(s: Activity, now: int): Activity = { ...s, journal: T::answer(s.journal, false) }

pure def stepTheActionsAreTheJournals(before: Activity, via: str, after: Activity): bool =
  after.rows != before.rows implies (via == "actionsRead" and after.journal.read.status == R::Loaded)
```

### Every read of the journal ends

```quint
pure def leadsToAReadEnds(s: Activity, later: Activity): bool = T::busy(s.journal) implies not(T::busy(later.journal))

pure val fair_giveUpOnActions = "weak"
```

### A proposal can be declined, and an unsettled action marked as happened or not, while the agent is ready, from a journal read and not being read again

The word goes to the approvals area, under the proposal's own number, and
the journal is then read again: what changes on screen is what the
approvals area recorded.

```quint
pure val proposalValues = Set(1, 2)

pure def listed(s: Activity, proposal: int, declining: bool): bool =
  s.rows.some(r => r.proposal == proposal and (if (declining) r.declinable else r.unsettled))

pure def ready(s: Activity, connection: Connection): bool =
  connection == Ready and s.journal.read.status == R::Loaded

pure def canDecline(s: Activity, proposal: int, at: int, connection: Connection): bool =
  ready(s, connection) and listed(s, proposal, true)

pure def decline(s: Activity, proposal: int, at: int, connection: Connection): Sent =
  val again = askJournal(at, s)
  { state: again.state, out: List(Reject({ proposal: proposal })).concat(again.out) }

pure def canReconcileAction(s: Activity, proposal: int, happened: bool, at: int, connection: Connection): bool =
  ready(s, connection) and listed(s, proposal, false)

pure def reconcileAction(s: Activity, proposal: int, happened: bool, at: int, connection: Connection): Sent =
  val again = askJournal(at, s)
  { state: again.state, out: List(Reconcile({ proposal: proposal, happened: happened })).concat(again.out) }
```

### The owner's word goes only for an action shown that takes it, once, and is followed by reading the journal again

```quint
pure def isWord(e: Effect): bool = match e { | Reject(r) => true | Reconcile(r) => true | _ => false }

pure def stepAWordFitsTheActionShown(before: Activity, after: Activity, out: List[Effect]): bool =
  out.some(e => isWord(e)) implies
    (before.journal.read.status == R::Loaded and out.length() == 2
      and out.every(e => match e {
        | Reject(r) => listed(before, r.proposal, true)
        | Reconcile(r) => listed(before, r.proposal, false)
        | ReadJournal(r) => r.reading == after.journal.read.ticket and T::busy(after.journal)
        | _ => false
      }))
```

### Nothing has been listed until the journal was read

```quint
pure def alwaysRowsComeFromARead(s: Activity): bool =
  s.journal.read.ticket >= 0 and (T::busy(s.journal) implies s.journal.read.ticket > 0)
    and (s.journal.read.ticket == 0 implies s.rows.length() == 0)
```

### A proposal can be waiting for the owner's word

```quint
pure def sometimesAProposalToDecline(s: Activity): bool = s.journal.read.status == R::Loaded and s.rows.some(r => r.declinable)
```

### An action can be waiting to be settled

```quint
pure def sometimesAnActionToSettle(s: Activity): bool = s.journal.read.status == R::Loaded and s.rows.some(r => r.unsettled)
```

### The journal can be read with nothing in it

```quint
pure def sometimesNothingListed(s: Activity): bool = s.journal.read.status == R::Loaded and s.rows.length() == 0
```

### A read of the journal can fail with older rows still shown

```quint
pure def sometimesAReadFailed(s: Activity): bool = s.journal.read.status == R::Failed and s.rows.length() > 0
```
