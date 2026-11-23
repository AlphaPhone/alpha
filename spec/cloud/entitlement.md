# Entitlement

What the phone knows of the owner's plan: a statement the cloud signs for
the signed-in account, short-lived, and verified on the phone against the
keys the cloud publishes, for the entitlement audience of the
[deployment](./index.md). The phone reads it through the
[routes](./routes.md) with its own key. Whether the plan admits the
assistant's use of the cloud is decided here, from that statement alone,
with a short grace while the cloud cannot be reached.

## Story: Know my plan honestly

> As the owner, I want my phone to say I have a plan only while a signed
> statement says so and has not run out, and never to treat a refusal or a
> forged answer as a plan.

### The phone holds the signed-in account, the last reading of its statement, what the statement says until when, and a grace record

The plan is unknown until a statement arrives; active until its statement
runs out; refused when a trusted statement says there is no plan; lapsed
when an active statement ran out; offline when the cloud could not be
reached; untrusted when an answer could not be verified. The grace record
remembers when an active plan was last verified for this account, and when
that plan's period ends.

```quint
import read as R from "../kit/read"

type Plan = Unknown | Active | Refused | Lapsed | Offline | Untrusted
type Grace = { held: bool, credential: int, at: int, ends: int }
type Entitlement = {
  credential: int, askedFor: int, clock: int, read: R::Read,
  plan: Plan, until: int, grace: Grace,
}
type Effect = Fetch({ ticket: int, credential: int })
type Moved = { state: Entitlement, out: List[Effect] }

pure val noGrace: Grace = { held: false, credential: 0, at: 0, ends: 0 }

pure val initial: Entitlement = {
  credential: 0, askedFor: 0, clock: 0, read: R::unread,
  plan: Unknown, until: 0, grace: noGrace,
}

pure val nowValues = Set(0, 60, 3600, 604800, 700000)
pure val untilValues = Set(60, 3600, 700000)
pure val endsValues = Set(0, 3600, 900000)
pure val ticketValues = Set(1, 2, 3)
pure val credentialValues = Set(1, 2)
pure val accountValues = Set(1, 2)
```

### Time only moves forward, and an active statement lapses the moment its time comes

```quint
pure def lapsed(now: int, s: Entitlement): Entitlement =
  { ...s, clock: now, plan: if (s.plan == Active and now >= s.until) Lapsed else s.plan }

pure def canTick(s: Entitlement, now: int): bool = now > s.clock

pure def tick(s: Entitlement, now: int): Entitlement = lapsed(now, s)
```

### Signing in to an account forgets everything known of the one before and asks for the new account's statement

```quint
pure def canSignIn(s: Entitlement, credential: int, now: int): bool =
  credential > 0 and credential != s.credential and now >= s.clock

pure def signIn(s: Entitlement, credential: int, now: int): Moved =
  val asked = R::ask(s.read)
  { state: { ...s, credential: credential, askedFor: credential, clock: now, read: asked, plan: Unknown, until: 0, grace: noGrace },
    out: List(Fetch({ ticket: asked.ticket, credential: credential })) }
```

### Signing out forgets the plan and the grace record

```quint
pure def canSignOut(s: Entitlement, now: int): bool = s.credential != 0 and now >= s.clock

pure def signOut(s: Entitlement, now: int): Entitlement =
  { ...s, credential: 0, clock: now, plan: Unknown, until: 0, grace: noGrace }
```

### The statement can be read again at any time while signed in, and only the newest reading's answer counts

```quint
pure def canRefresh(s: Entitlement, now: int): bool = s.credential != 0 and now >= s.clock

pure def refresh(s: Entitlement, now: int): Moved =
  val asked = R::ask(s.read)
  { state: { ...lapsed(now, s), read: asked, askedFor: s.credential },
    out: List(Fetch({ ticket: asked.ticket, credential: s.credential })) }

pure def answersNow(s: Entitlement, ticket: int, now: int): bool =
  R::canAnswer(s.read, ticket) and s.credential != 0 and s.askedFor == s.credential and now >= s.clock
```

### A statement is trusted only when it is signed by a published key, for this deployment's audience, about the signed-in account, and has not run out

```quint
type Verdict = Grants | Refuses | Distrusted

pure def judge(keyKnown: bool, audience: bool, account: int, credential: int, now: int, until: int, active: bool): Verdict =
  if (keyKnown and audience and account == credential and now < until) (if (active) Grants else Refuses)
  else Distrusted
```

### A trusted statement replaces what the phone knew; an untrusted one changes nothing but the reading's failure

A trusted active statement also rewrites the grace record, but only with a
plan period that ends after now: an end already past is never carried
forward. A trusted refusal removes the record. An answer that cannot be
verified keeps an active statement that has not run out, and a refusal.

```quint
pure def canSigned(s: Entitlement, ticket: int, now: int): bool = answersNow(s, ticket, now)

pure def signed(s: Entitlement, ticket: int, now: int, active: bool, until: int, ends: int, keyKnown: bool, audience: bool, account: int): Entitlement =
  val t = lapsed(now, s)
  val verdict = judge(keyKnown, audience, account, s.credential, now, until, active)
  if (verdict == Grants)
    { ...t, read: R::answer(t.read, true), plan: Active, until: until,
      grace: if (ends > now) { held: true, credential: s.credential, at: now, ends: ends } else noGrace }
  else if (verdict == Refuses) { ...t, read: R::answer(t.read, true), plan: Refused, until: 0, grace: noGrace }
  else { ...t, read: R::answer(t.read, false), plan: if (t.plan == Active or t.plan == Refused) t.plan else Untrusted }
```

### When the cloud cannot be reached, an active statement runs on until its time and a refusal stands; otherwise the plan is offline

```quint
pure def canUnreachable(s: Entitlement, ticket: int, now: int): bool = answersNow(s, ticket, now)

pure def unreachable(s: Entitlement, ticket: int, now: int): Entitlement =
  val t = lapsed(now, s)
  { ...t, read: R::answer(t.read, false), plan: if (t.plan == Active or t.plan == Refused) t.plan else Offline }
```

### A restart keeps the signed-in account and its grace record, forgets the statement, and reads it again

The grace record is kept on the phone so that an outage just after a
restart still admits the assistant within it; the statement itself is
read afresh, and nothing read before the restart can answer.

```quint
pure def canRestart(s: Entitlement, now: int): bool = now >= s.clock

pure def restart(s: Entitlement, now: int): Moved =
  val asked = R::ask(s.read)
  if (s.credential == 0) { state: { ...s, clock: now }, out: List() }
  else { state: { ...s, clock: now, read: asked, askedFor: s.credential, plan: Unknown, until: 0 },
    out: List(Fetch({ ticket: asked.ticket, credential: s.credential })) }

pure def stepARestartKeepsOnlyTheAccountAndItsGrace(before: Entitlement, via: str, after: Entitlement): bool =
  via == "restart" implies (
    after.credential == before.credential and after.grace == before.grace
      and (after.credential != 0 implies (after.plan == Unknown and after.read.ticket > before.read.ticket)))
```

### The plan admits the assistant while its statement is active, or while the cloud cannot be reached within seven days of this account's last verified plan and before that plan's period ends

```quint
pure val graceWindow = 604800

pure def graceHolds(s: Entitlement): bool =
  s.grace.held and s.grace.credential == s.credential and s.credential != 0
    and s.clock < s.grace.at + graceWindow and s.clock < s.grace.ends

pure def admits(s: Entitlement): bool = s.plan == Active or (s.plan == Offline and graceHolds(s))
```

### An active plan is never shown past its statement's time

```quint
pure def alwaysAnActivePlanIsUnexpired(s: Entitlement): bool = s.plan == Active implies s.clock < s.until
```

### Signed out, the phone knows no plan and keeps no grace

```quint
pure def alwaysSignedOutHoldsNothing(s: Entitlement): bool =
  s.credential == 0 implies (s.plan == Unknown and not(s.grace.held))
```

### The grace record is the signed-in account's own, and its plan period ends after it was written

```quint
pure def alwaysGraceIsThisAccounts(s: Entitlement): bool =
  s.grace.held implies (s.grace.credential == s.credential and s.grace.at < s.grace.ends)
```

### A refused account keeps no grace, so a restart and an outage after a refusal never let it in

```quint
pure def alwaysARefusalLeavesNoGrace(s: Entitlement): bool = s.plan == Refused implies not(s.grace.held)
```

### A reading in flight was asked for the account signed in now

```quint
pure def alwaysAReadingInFlightIsForThisAccount(s: Entitlement): bool =
  (s.read.status == R::Loading and s.credential != 0) implies s.askedFor == s.credential
```

### A refusal is never upgraded: only a newer trusted statement lets a refused account in again

```quint
pure def stepARefusalIsNeverUpgraded(before: Entitlement, via: str, after: Entitlement): bool =
  (before.plan == Refused and admits(after)) implies via == "signed"
```

### Only a trusted statement makes a plan active or refused

```quint
pure def stepOnlyASignedStatementDecides(before: Entitlement, via: str, after: Entitlement): bool =
  ((after.plan == Active and (before.plan != Active or after.until != before.until))
    or (after.plan == Refused and before.plan != Refused)) implies via == "signed"
```

### Time never goes back

```quint
pure def stepTimeNeverGoesBack(before: Entitlement, after: Entitlement): bool = after.clock >= before.clock
```

### A statement about another account, from an unknown key, for another audience, or already run out, is not trusted

```quint
pure def lawAMisfitStatementIsDistrusted(keyKnown: bool, audience: bool, account: int, credential: int, now: int, until: int, active: bool): bool =
  (account != credential or not(keyKnown) or not(audience) or now >= until)
    implies judge(keyKnown, audience, account, credential, now, until, active) == Distrusted
```

### A plan can be active

```quint
pure def sometimesActive(s: Entitlement): bool = s.plan == Active
```

### A plan can be refused

```quint
pure def sometimesRefused(s: Entitlement): bool = s.plan == Refused
```

### A plan can lapse when its statement runs out

```quint
pure def sometimesLapsed(s: Entitlement): bool = s.plan == Lapsed
```

### The grace can admit the assistant while the cloud cannot be reached

```quint
pure def sometimesAdmittedOffline(s: Entitlement): bool = s.plan == Offline and admits(s)
```

### An answer that cannot be verified leaves an active plan standing

```quint
pure def sometimesUntrustedAnswerKeepsThePlan(s: Entitlement): bool = s.plan == Active and s.read.status == R::Failed
```
