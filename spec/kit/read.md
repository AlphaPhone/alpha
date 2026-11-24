# Read

Something Alpha reads from outside: the phone, the resident agent or the
cloud. An answer can arrive late or not at all, so each asking takes a new
ticket and only the newest ticket's answer counts.

## Story: Read from outside

> As the owner, I want what I see to be the answer to the last thing asked,
> never an older answer that arrived late.

### A read is idle, loading, loaded or failed, under the ticket of its last asking

```quint
type Status = Idle | Loading | Loaded | Failed
type Read = { status: Status, ticket: int }

pure val unread: Read = { status: Idle, ticket: 0 }
```

### Asking again takes the next ticket, whatever came before

```quint
pure def ask(r: Read): Read = { status: Loading, ticket: r.ticket + 1 }
```

### Only the newest ticket's answer is taken, once

```quint
pure def canAnswer(r: Read, ticket: int): bool = r.status == Loading and ticket == r.ticket

pure def answer(r: Read, ok: bool): Read = { ...r, status: if (ok) Loaded else Failed }
```

### An answer to an older asking is refused

```quint
pure def lawAnOlderAnswerIsRefused(ticket: int, earlier: int, ok: bool): bool =
  earlier <= ticket implies not(canAnswer(ask({ status: Loading, ticket: ticket }), earlier))
```

### An answer is not taken twice

```quint
pure def lawAnAnswerIsTakenOnce(ticket: int, ok: bool): bool =
  not(canAnswer(answer({ status: Loading, ticket: ticket }, ok), ticket))
```
