# Activity

Agent activity, under About ([Settings](./index.md)): whether the agent
needs the owner to restart it or try again, and the actions it took or
proposed on the phone, where the owner declines a proposal or says whether
an action whose outcome the agent could not see really happened. The
agent's state, its conversations and its actions are the agent's: this
page reads them, sends the owner's word, and reads them back. Conversations
open in Ask Alpha.

## Story: Help the agent recover

> As the owner, I want to see when my agent needs me to restart it or try
> again, and to do that once, from here.

### Activity holds what the agent last reported, a restart or retry in flight, the phone actions as last read, and the owner's word in flight

The agent is ready, starting, in need of a restart, in need of another
try, or not packaged with this build.

```quint
import read as R from "../../kit/read"

type Agent = Ready | Starting | NeedsRestart | NeedsRetry | Unpackaged
type Progress = Proposed | Unconfirmed | Completed | DidNotHappen | Rejected | ActionFailed
type PhoneAction = { id: int, progress: Progress }
type Verdict = Decline | Happened | Didnt

type Activity = {
  agent: Agent, recovery: R::Read,
  history: R::Read, actions: List[PhoneAction],
  deciding: R::Read, decided: int, verdict: Verdict,
}

type Effect =
  RestartAgent({ restart: int })
  | RetryAgent({ retry: int })
  | ReadActions({ reading: int })
  | DecideAction({ decision: int, entry: int, word: Verdict })
type Sent = { state: Activity, out: List[Effect] }

pure val initial: Activity = {
  agent: Starting, recovery: R::unread,
  history: R::unread, actions: List(),
  deciding: R::unread, decided: 0, verdict: Decline,
}
```

### The agent's state is what the agent last reported

Ask Alpha's area owns the agent and sends its state here.

```quint
pure def agentReported(s: Activity, agent: Agent): Activity = { ...s, agent: agent }
```

### Restart Alpha is offered only when the agent needs a restart, Try again only when it needs another try, and one at a time

```quint
pure def canRestartAgent(s: Activity): bool = s.agent == NeedsRestart and s.recovery.status != R::Loading

pure def restartAgent(s: Activity): Sent =
  val asking = R::ask(s.recovery)
  { state: { ...s, recovery: asking }, out: List(RestartAgent({ restart: asking.ticket })) }

pure def canRetryAgent(s: Activity): bool = s.agent == NeedsRetry and s.recovery.status != R::Loading

pure def retryAgent(s: Activity): Sent =
  val asking = R::ask(s.recovery)
  { state: { ...s, recovery: asking }, out: List(RetryAgent({ retry: asking.ticket })) }
```

### The answer to a restart or retry is taken once; the agent's state then comes from the agent

```quint
pure val recoveryValues = Set(1, 2)

pure def canRecoveryAnswered(s: Activity, recovery: int, ok: bool): bool = R::canAnswer(s.recovery, recovery)

pure def recoveryAnswered(s: Activity, recovery: int, ok: bool): Activity = { ...s, recovery: R::answer(s.recovery, ok) }
```

### The agent is asked to restart or try again only by the owner's row, for the state it reported

```quint
pure def isRecovery(e: Effect): bool = match e { | RestartAgent(r) => true | RetryAgent(r) => true | _ => false }

pure def stepRecoveryOnlyWhenNeeded(before: Activity, via: str, after: Activity, out: List[Effect]): bool =
  out.every(e => match e {
    | RestartAgent(r) => via == "restartAgent" and before.agent == NeedsRestart and r.restart == after.recovery.ticket
    | RetryAgent(r) => via == "retryAgent" and before.agent == NeedsRetry and r.retry == after.recovery.ticket
    | _ => true
  })
```

### A restart can be under way

```quint
pure def sometimesRestarting(s: Activity): bool = s.recovery.status == R::Loading and s.agent == NeedsRestart
```

## Story: Answer for what the agent did on the phone

> As the owner, I want to see what the agent did or proposed on my phone,
> decline what I do not want, and settle what it could not confirm, with
> my answer recorded by the agent.

### The phone actions are read from the agent while it is ready, never while the owner's word is in flight

```quint
pure val readingValues = Set(1, 2, 3)
pure val actionsValues = Set(
  List(),
  List({ id: 1, progress: Proposed }),
  List({ id: 1, progress: Unconfirmed }, { id: 2, progress: Completed }),
  List({ id: 1, progress: Rejected }, { id: 2, progress: DidNotHappen }),
)

pure def readAgain(deciding: R::Read, s: Activity): Sent =
  val asking = R::ask(s.history)
  { state: { ...s, deciding: deciding, history: asking }, out: List(ReadActions({ reading: asking.ticket })) }

pure def canRefreshActions(s: Activity): bool =
  s.agent == Ready and s.history.status != R::Loading and s.deciding.status != R::Loading

pure def refreshActions(s: Activity): Sent = readAgain(s.deciding, s)

pure def canActionsRead(s: Activity, reading: int, actions: List[PhoneAction]): bool = R::canAnswer(s.history, reading)

pure def actionsRead(s: Activity, reading: int, actions: List[PhoneAction]): Activity =
  { ...s, history: R::answer(s.history, true), actions: actions }
```

### A proposal can be declined, and an action the agent could not confirm can be marked as happened or not, while the agent is ready, one at a time

```quint
pure val entryValues = Set(1, 2)

pure def fits(verdict: Verdict, progress: Progress): bool =
  if (verdict == Decline) progress == Proposed else progress == Unconfirmed

pure def listed(s: Activity, entry: int, verdict: Verdict): bool = s.actions.some(a => a.id == entry and fits(verdict, a.progress))

pure def canDecide(s: Activity, entry: int, verdict: Verdict): bool =
  s.agent == Ready and s.deciding.status != R::Loading and s.history.status != R::Loading and listed(s, entry, verdict)

pure def decide(s: Activity, entry: int, verdict: Verdict): Sent =
  val asking = R::ask(s.deciding)
  { state: { ...s, deciding: asking, decided: entry, verdict: verdict }, out: List(DecideAction({ decision: asking.ticket, entry: entry, word: verdict })) }
```

### The owner's word goes to the agent only for an action shown in a state it fits

```quint
pure def stepAWordFitsTheActionShown(before: Activity, via: str, after: Activity, out: List[Effect]): bool =
  out.every(e => match e {
    | DecideAction(d) => via == "decide" and listed(before, d.entry, d.word) and d.decision == after.deciding.ticket
    | _ => true
  })
```

### When the agent has answered, the actions are read again, and what is shown is what the agent recorded

```quint
pure val decisionValues = Set(1, 2)

pure def canDecided(s: Activity, decision: int, ok: bool): bool = R::canAnswer(s.deciding, decision)

pure def decided(s: Activity, decision: int, ok: bool): Sent = readAgain(R::answer(s.deciding, ok), s)

pure def stepAWordIsReadBack(before: Activity, via: str, after: Activity): bool =
  via == "decided" implies (after.history.ticket == before.history.ticket + 1 and after.actions == before.actions)
```

### Only a read from the agent changes the actions shown

```quint
pure def stepTheActionsAreTheAgents(before: Activity, via: str, after: Activity): bool =
  after.actions != before.actions implies via == "actionsRead"
```

### A word in flight and a read of the actions never overlap

```quint
pure def alwaysOneThingAtATime(s: Activity): bool =
  not(s.deciding.status == R::Loading and s.history.status == R::Loading)
```

### The owner can say an unconfirmed action happened

```quint
pure def sometimesSayingItHappened(s: Activity): bool = s.deciding.status == R::Loading and s.verdict == Happened
```

### A declined proposal can be read back

```quint
pure def sometimesDeclineReadBack(s: Activity): bool =
  s.deciding.status == R::Loaded and s.verdict == Decline and s.history.status == R::Loaded
    and s.actions.some(a => a.progress == Rejected)
```
