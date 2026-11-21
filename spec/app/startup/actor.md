# Actor

Who sends an event to Startup's machines: the owner, by a tap, or the
resident agent. The shell names the sender of each event it has
authenticated. What the owner alone may do is answered here once, for
[Access](./access.md) and [Recovery](./recovery.md).

## Story: Only the owner answers for the phone

> As the owner, I want only my own taps to grant Alpha an access, pass a
> step, or rebuild and switch my Home; the agent may at most ask to show
> me something.

### The owner or the agent sends each event, and only the owner answers

Allow, Settings, Check, Continue, Skip, Done and "Set up Alpha access" in
Access, and Reload, Reload anyway and Switch Home in Recovery, are the
owner's alone. The agent can at most open a review of one access, which
the owner leaves at will.

```quint
type Actor = Owner | Agent

pure def answers(by: Actor, allowed: bool): bool = by == Owner and allowed
```

### The agent never answers, whatever is allowed

```quint
pure def lawTheAgentNeverAnswers(allowed: bool): bool = not(answers(Agent, allowed)) and (answers(Owner, allowed) iff allowed)
```
