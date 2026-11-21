# Binding

What the running resident [agent](./index.md) is told to use: Cloud AI
for the account signed in, or nothing from Cloud. The sign-in comes from
[Session](./session.md); whether Cloud AI is allowed from
[Plan](./plan.md) with [AI provider](./provider.md); whether the agent is
up from the agent's machine, whose `Unbind` is `unbind` here whenever the
agent leaves up; and whether a turn is in flight from the assistant.

## Story: Use Cloud AI only under the current sign-in and plan

> As the owner, I want the agent to use Cloud AI only for the account
> signed in and while the plan allows it, and to be told when Alpha
> cannot tell what the agent is using.

### The agent is unbound, being bound, bound, or bound without the phone confirming it, for the sign-in and plan last asked

```quint
type Status = Unbound | Rebinding | Bound | BindUnknown
type Effect = Bind({ ticket: int, signIn: int, cloud: bool })
type Binding = { status: Status, ticket: int, signIn: int, cloud: bool }
type Moved = { state: Binding, out: List[Effect] }

pure val initial: Binding = { status: Unbound, ticket: 0, signIn: 0, cloud: false }

pure val ticketValues = Set(1, 2, 3)
pure val signInValues = Set(0, 1, 2)

pure def alwaysCloudNeedsASignIn(b: Binding): bool =
  (b.cloud implies b.signIn > 0) and (b.status == Unbound implies (b.signIn == 0 and not(b.cloud))) and b.ticket >= 0
```

### The agent is bound only while it is up, and leaving up unbinds it, so an answer for it is refused

```quint
pure def unbind(b: Binding): Binding = { ...b, status: Unbound, signIn: 0, cloud: false }

pure def lawLeavingUpRefusesTheAnswer(signIn: int, cloud: bool): bool =
  val asked = rebind(initial, signIn, cloud, false, true).state
  not(canBound(unbind(asked), asked.ticket)) and not(canRebind(initial, signIn, cloud, false, false))
```

### A rebind waits for a turn in flight, and is made at most once for each change of sign-in or plan

```quint
pure def canRebind(b: Binding, signIn: int, cloud: bool, busy: bool, up: bool): bool =
  up and not(busy) and b.status != Rebinding and signIn >= 0 and (cloud implies signIn > 0)
    and (signIn != b.signIn or cloud != b.cloud)

pure def rebind(b: Binding, signIn: int, cloud: bool, busy: bool, up: bool): Moved =
  { state: { status: Rebinding, ticket: b.ticket + 1, signIn: signIn, cloud: cloud },
    out: List(Bind({ ticket: b.ticket + 1, signIn: signIn, cloud: cloud })) }

pure def stepARebindIsForAChange(before: Binding, via: str, after: Binding): bool =
  via == "rebind" implies (after.signIn != before.signIn or after.cloud != before.cloud)

pure def lawARebindWaitsForATurnInFlight(signIn: int, cloud: bool): bool =
  not(canRebind(initial, signIn, cloud, true, true))
```

### Only the phone's answer binds the agent; a refusal leaves it unbound to be tried again, and an answer that cannot be trusted is shown as unconfirmed

```quint
pure def canBound(b: Binding, ticket: int): bool = b.status == Rebinding and ticket == b.ticket

pure def bound(b: Binding, ticket: int, ok: bool, known: bool): Binding =
  if (not(known)) { ...b, status: BindUnknown } else if (ok) { ...b, status: Bound } else unbind(b)

pure def unconfirmedBinding(b: Binding): bool = b.status == BindUnknown

pure def stepOnlyTheAnswerBinds(before: Binding, via: str, after: Binding): bool =
  (after.status == Bound and before.status != Bound) implies via == "bound"

pure def lawARefusedBindCanBeTriedAgain(signIn: int): bool =
  val asked = rebind(initial, signIn, true, false, true).state
  signIn > 0 implies canRebind(bound(asked, asked.ticket, false, true), signIn, true, false, true)
```

### The agent can be bound to Cloud

```quint
pure def sometimesBoundToCloud(b: Binding): bool = b.status == Bound and b.cloud
```

### What the agent is bound to can be unconfirmed

```quint
pure def sometimesBindingUnconfirmed(b: Binding): bool = unconfirmedBinding(b)
```

### A bind can be made again after a refusal or after the agent left up

```quint
pure def sometimesABindIsMadeAgain(b: Binding): bool = b.status == Bound and b.ticket >= 2
```
