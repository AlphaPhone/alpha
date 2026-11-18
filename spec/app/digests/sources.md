# Sources

A source a digest reads on the phone, such as its calendars or reminders.
The owner consents to it for a number of hours; the agent's reads are
answered with what the source holds only while that consent lasts. When it
runs out, a notice asks the owner to renew it, once.

## Story: Consent to a source for a while

> As the owner, I want a digest to read a source only while I allow it, for
> as long as I chose, and to stop it at any time.

### A source holds the consent, until when it lasts, the time last seen, the review of a consent and the renewal notice

```quint
import review as V from "../../kit/review"

type Consent = NoConsent | Granted | Revoked
type Notice = Unposted | Posted | Opened
type Effect =
  | GrantSource({ until: int })
  | RevokeSource
  | AnswerRead({ ticket: int, payload: bool })
  | PostRenewal({ until: int })
  | WithdrawRenewal
type Source = {
  consent: Consent, until: int, now: int,
  review: V::Review, hours: int, renewal: Notice, answered: int,
}
type Moved = { state: Source, out: List[Effect] }

pure val maxHours = 720

pure val initial: Source = {
  consent: NoConsent, until: 0, now: 0,
  review: V::unreviewed, hours: 24, renewal: Unposted, answered: 0,
}

pure val nowValues = Set(0, 1, 24, 30)
pure val hoursValues = Set(0, 1, 24, 721)
pure val ticketValues = Set(1, 2, 3)
```

### Consent lasts until its hour, and not at or after it

```quint
pure def lasts(s: Source): bool = s.consent == Granted and s.now < s.until
```

### Time is told to the source as it passes, and never goes back

When consent runs out, a notice asks the owner to renew it, once.

```quint
pure def canTick(s: Source, now: int): bool = now > s.now

pure def tick(s: Source, now: int): Moved =
  val later = { ...s, now: now }
  val expiring = s.consent == Granted and now >= s.until and s.renewal == Unposted
  if (expiring) { state: { ...later, renewal: Posted }, out: List(PostRenewal({ until: s.until })) }
  else { state: later, out: List() }
```

### Consent is given for 1 to 720 hours, after the owner confirms what was shown

```quint
pure def canReviewConsent(s: Source, hours: int): bool = 1 <= hours and hours <= maxHours and not(s.review.showing)

pure def reviewConsent(s: Source, hours: int): Source = { ...s, review: V::present(s.review), hours: hours }

pure def canCancelConsent(s: Source): bool = s.review.showing

pure def cancelConsent(s: Source): Source = { ...s, review: V::dismiss(s.review) }

pure def canConfirmConsent(s: Source): bool = V::canConfirm(s.review)

pure def confirmConsent(s: Source): Moved =
  {
    state: { ...s, review: V::confirm(s.review), consent: Granted, until: s.now + s.hours, renewal: Unposted },
    out: List(GrantSource({ until: s.now + s.hours })).concat(if (s.renewal == Posted) List(WithdrawRenewal) else List()),
  }
```

### The owner can stop a source at any time, and its renewal notice goes with it

```quint
pure def canRevoke(s: Source): bool = s.consent == Granted

pure def revoke(s: Source): Moved =
  { state: { ...s, consent: Revoked, renewal: Unposted, review: V::dismiss(s.review) },
    out: List(RevokeSource).concat(if (s.renewal == Posted) List(WithdrawRenewal) else List()) }
```

### Every read the agent asks for is answered once, with what the source holds only while consent lasts

A refusal carries nothing of the source.

```quint
pure def canReadAsked(s: Source, ticket: int): bool = ticket > s.answered

pure def readAsked(s: Source, ticket: int): Moved =
  { state: { ...s, answered: ticket }, out: List(AnswerRead({ ticket: ticket, payload: lasts(s) })) }

pure def stepNothingIsReadWithoutConsent(before: Source, via: str, after: Source, out: List[Effect]): bool =
  out.every(e => match e {
    | AnswerRead(r) => r.payload implies (before.consent == Granted and before.now < before.until)
    | GrantSource(g) => via == "confirmConsent" and V::canConfirm(before.review) and g.until > before.now
    | _ => true
  })
```

### Consent lasts at most 720 hours from when it was given

```quint
pure def alwaysConsentIsBounded(s: Source): bool = and {
  s.now >= 0, s.until >= 0, s.until <= s.now + maxHours,
  1 <= s.hours, s.hours <= maxHours,
  s.consent == NoConsent implies s.until == 0,
}
```

### A source can be read with consent, refused after it ran out, and revoked

```quint
pure def sometimesASourceIsReadWithConsent(s: Source): bool = lasts(s) and s.answered >= 1

pure def sometimesConsentRunsOut(s: Source): bool = s.consent == Granted and not(lasts(s)) and s.answered >= 1

pure def sometimesASourceIsRevoked(s: Source): bool = s.consent == Revoked and s.until >= 1
```

## Story: Renew a source's access

> As the owner, I want to be told once when a source's consent runs out,
> and a tap on that notice to take me to renew it.

### A tap on the renewal notice opens the renewal review once

```quint
pure def canRenewalTapped(s: Source): bool = s.renewal == Posted and not(s.review.showing)

pure def renewalTapped(s: Source): Source = { ...s, renewal: Opened, review: V::present(s.review) }
```

### A renewal notice is shown only while consent has run out, and is posted once per consent

```quint
pure def alwaysARenewalIsForConsentThatRanOut(s: Source): bool =
  s.renewal != Unposted implies (s.consent == Granted and s.now >= s.until)

pure def stepARenewalIsPostedOnce(before: Source, via: str, after: Source): bool =
  (after.renewal == Posted and before.renewal != Posted) implies (via == "tick" and before.renewal == Unposted)
```

### A restart closes the review and keeps the consent and its notice

```quint
pure def restart(s: Source): Source = { ...s, review: V::dismiss(s.review) }
```

### Consent can be renewed from its notice

```quint
pure def sometimesConsentIsRenewed(s: Source): bool = lasts(s) and s.until > 24 and s.renewal == Unposted and s.answered >= 1
```
