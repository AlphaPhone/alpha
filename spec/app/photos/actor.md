# Who acts on photos

The senders every machine of [Photos](./index.md) and the
[Camera](../camera/) shares, stated once: the owner, Alpha's agent, and the
phone, which carries Android's answers and what another area of Alpha
reports. The shell knows who sent each event.

## Story: Know who did what

> As the owner, I want every change to my photos and every photo taken to be
> traced to me, to Alpha's agent or to the phone.

### An event comes from the owner, from Alpha's agent or from the phone

```quint
import attempt as A from "../../kit/attempt"

type Actor = Owner | Agent | Phone
```

### An attempt is in flight from when it is recorded until its answer

```quint
pure def busy(a: A::Attempt): bool = a.outcome == A::Recorded or a.outcome == A::Sent
```
