# Actor

Who sends an event to Alpha: the owner, or the resident agent. The shell names
the sender of each event it has authenticated, and an area checks whether that
sender is the one allowed to act.

## Story: Check who sent an event

> As the owner, I want each event checked against who is allowed to send it,
> so the agent never acts in my place.

### An event is sent by the owner or the agent, and only the allowed sender answers

```quint
type Actor = Owner | Agent

pure def answers(by: Actor, allowed: Actor): bool = by == allowed
```

### Only the allowed sender answers

```quint
pure def lawOnlyTheAllowedSenderAnswers(by: Actor, allowed: Actor): bool =
  (answers(by, allowed) implies by == allowed) and answers(allowed, allowed) and not(answers(Agent, Owner))
```
