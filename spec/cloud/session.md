# Billing session

Changing or cancelling a plan touches money, so the cloud accepts it only
with a fresh account session, never with the phone's own key. The phone
proves the session with a code emailed to the account's own address, holds
it in memory for at most an hour, never stores it and never shows it to the
page, and binds it to the key the phone holds and the account the cloud
names for that key. The session exists only on the product's own cloud
(see [Cloud](./index.md)); the [billing](./billing.md) changes are what it
is for, and it travels only on their routes (see [Routes](./routes.md)).

## Story: Prove it is me before my plan changes

> As the owner, I want a change to my plan to need a code sent to my own
> email, and the proof to last no longer than an hour, so that someone
> holding my unlocked phone for a moment cannot change what I pay.

### The phone holds the key and account it is signed in with, and the proof of a session

The proof goes from none, to a code asked for, to a code sent until a
time, to the code being checked, to a proven session. The session itself
is a secret.

```quint
type Proof = NoProof | CodeAsked | CodeSent | Checking | Proven
type SecretSession = str
type Effect =
  | SendCode({ account: int, ticket: int })
  | CheckCode({ account: int, ticket: int })
  | Attach({ request: int, session: SecretSession })
type Session = {
  clock: int, key: int, account: int,
  proof: Proof, ticket: int, provenFor: int, codeUntil: int, since: int, until: int, session: SecretSession,
}
type Moved = { state: Session, out: List[Effect] }

pure val hour = 3600

pure val initial: Session = {
  clock: 0, key: 0, account: 0,
  proof: NoProof, ticket: 0, provenFor: 0, codeUntil: 0, since: 0, until: 0, session: "",
}

pure val nowValues = Set(0, 60, 3600, 7200)
pure val untilValues = Set(60, 1800, 90000)
pure val expiresValues = Set(60, 3600, 90000)
pure val keyValues = Set(0, 1, 2)
pure val accountValues = Set(1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val requestValues = Set(1, 2)
pure val weight_askCode = 3
pure val weight_codeSent = 3
pure val weight_checkCode = 3
pure val weight_checked = 3
```

### Time only moves forward; a session ends when its hour or its own expiry comes, and a code when its time comes

Time is given by the owner's own steps; an answer of the cloud carries no
time of its own and is taken at the time of the last step.

```quint
pure def forgotten(now: int, s: Session): Session = { ...s, clock: now, proof: NoProof, provenFor: 0, session: "" }

pure def aged(now: int, s: Session): Session =
  val t = { ...s, clock: now }
  if (t.proof == Proven and now >= t.until) forgotten(now, t)
  else if (t.proof == CodeSent and now >= t.codeUntil) forgotten(now, t)
  else t

pure def usable(s: Session, now: int): bool = now >= s.clock and aged(now, s).proof == Proven
```

### A new key or another account ends the session and any code asked for

The key is the one [Sign-in](./signIn.md) keeps, or none once signed out;
the account is the one the cloud names for that key. Neither is ever taken
from the page.

```quint
pure def canIdentify(s: Session, key: int, account: int): bool = key != s.key or account != s.account

pure def identify(s: Session, key: int, account: int): Session = { ...forgotten(s.clock, s), key: key, account: account }
```

### A code is sent to the account's own address, only on the product's own cloud, and only while signed in

A code can be asked for again while one is waiting.

```quint
pure def canAskCode(s: Session, own: bool, now: int): bool =
  val t = aged(now, s)
  own and s.key != 0 and s.account != 0 and now >= s.clock and (t.proof == NoProof or t.proof == CodeSent)

pure def askCode(s: Session, own: bool, now: int): Moved =
  val ticket = s.ticket + 1
  { state: { ...aged(now, s), proof: CodeAsked, ticket: ticket, provenFor: s.key },
    out: List(SendCode({ account: s.account, ticket: ticket })) }
```

### Only the answer to the newest asking is taken

```quint
pure def answers(s: Session, ticket: int, waiting: Proof): bool = s.proof == waiting and ticket == s.ticket
```

### A sent code waits until its time; a code the cloud would not send leaves no proof

```quint
pure def canCodeSent(s: Session, ticket: int, until: int): bool = answers(s, ticket, CodeAsked)

pure def codeSent(s: Session, ticket: int, until: int): Session =
  if (until > s.clock) { ...s, proof: CodeSent, codeUntil: until } else forgotten(s.clock, s)

pure def canCodeNotSent(s: Session, ticket: int): bool = answers(s, ticket, CodeAsked)

pure def codeNotSent(s: Session, ticket: int): Session = forgotten(s.clock, s)
```

### The owner's code is checked only while it is waiting

```quint
pure def canCheckCode(s: Session, now: int): bool = now >= s.clock and aged(now, s).proof == CodeSent

pure def checkCode(s: Session, now: int): Moved =
  val ticket = s.ticket + 1
  { state: { ...aged(now, s), proof: Checking, ticket: ticket },
    out: List(CheckCode({ account: s.account, ticket: ticket })) }
```

### A checked code proves a session for at most an hour, and only if the cloud names the same account for it; a wrong code may be typed again while the code waits

A session for another account proves nothing, and the code is spent.

```quint
pure def canChecked(s: Session, ticket: int): bool = answers(s, ticket, Checking)

pure def checked(s: Session, ticket: int, session: SecretSession, expires: int, account: int): Session =
  if (account == s.account and expires > s.clock)
    { ...s, proof: Proven, since: s.clock, until: if (expires < s.clock + hour) expires else s.clock + hour, session: session }
  else forgotten(s.clock, s)

pure def canWrongCode(s: Session, ticket: int): bool = answers(s, ticket, Checking)

pure def wrongCode(s: Session, ticket: int): Session = { ...s, proof: CodeSent }
```

### The session goes out only with a billing request, and only while it is proven

The shell asks for it as it sends a change the owner confirmed, under that
request's number.

```quint
pure def canUse(s: Session, now: int, request: int): bool = usable(s, now)

pure def use(s: Session, now: int, request: int): Moved =
  { state: aged(now, s), out: List(Attach({ request: request, session: s.session })) }
```

### A session the cloud refuses is spent

```quint
pure def canRefused(s: Session): bool = s.proof == Proven

pure def refused(s: Session): Session = forgotten(s.clock, s)
```

### A proven session lasts at most an hour and ends before its own expiry

```quint
pure def alwaysASessionLastsAnHourAtMost(s: Session): bool =
  s.proof == Proven implies (s.until <= s.since + hour and s.since <= s.clock and s.clock < s.until)
```

### A proof belongs to the key the phone holds now

```quint
pure def alwaysAProofIsForTheKeyHeldNow(s: Session): bool =
  s.proof != NoProof implies (s.provenFor == s.key and s.key != 0)
```

### Without a proven session the phone holds no session

```quint
pure def alwaysNoSessionWithoutProof(s: Session): bool = s.proof != Proven implies s.session == ""
```

### The session leaves the phone only while proven, for the key held now, before its time

```quint
pure def stepTheSessionLeavesOnlyWhileProven(before: Session, via: str, after: Session, out: List[Effect]): bool =
  out.every(e => match e {
    | Attach(a) => via == "use" and after.proof == Proven and after.clock < after.until and after.provenFor == after.key
    | _ => true
  })
```

### Time never goes back

```quint
pure def stepTimeNeverGoesBack(before: Session, after: Session): bool = after.clock >= before.clock
```

### A restart loses the session: it is never stored

```quint
pure def restart(s: Session): Session = forgotten(s.clock, s)

pure def stepARestartForgetsTheSession(before: Session, via: str, after: Session): bool =
  via == "restart" implies (after.proof == NoProof and after.session == "")
```

### The page sees whether a code waits or a session is proven, never the session

```quint
type Seen = { proof: Proof }

pure def seen(s: Session): Seen = { proof: s.proof }
```

### A session can be proven

```quint
pure def sometimesProven(s: Session): bool = s.proof == Proven
```

### A code can wait to be typed

```quint
pure def sometimesCodeWaiting(s: Session): bool = s.proof == CodeSent
```

### A proven session can run out

```quint
pure def sometimesASessionRanOut(s: Session): bool = s.proof == NoProof and s.until > 0 and s.clock >= s.until
```
