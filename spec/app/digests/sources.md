# Sources

The sources a digest reads, each with the owner's consent: the phone's
calendars, its reminders, a connected Google account, and a snapshot the
owner shares by hand. The owner consents to a source for a number of
hours, and chooses what of it may be read; the agent's reads are answered
by the phone with at most 12 items of what was chosen, and only while that
consent lasts. When it runs out, a notice is wanted to ask the owner to
renew it. On the agent's side a source is eliza's digest offer
(`workflow/hostedDigest`, its `sourcePresent`, `revoked` and `expiresAt`);
the consent and the answers to reads are the phone's own.

The notices area (`spec/app/notices`) posts the renewal notice and takes
each tap once; who is signed in is a fact of the account area. Time enters
as `now`, and the shell wakes the phone when a consent expires.

## Story: Consent to a source for a while

> As the owner, I want a digest to read a source only while I allow it,
> only what I chose of it, for as long as I chose, and to stop it at any
> time.

### Sources holds the owner, the time last seen, each source's consent and what it covers, the review of a consent, calendar access and the phone's calendars

A source is consented to until an hour, at a revision that changes each
time it is given again, over a scope: the calendars chosen, or the
characters of a snapshot.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import permission as P from "../../kit/permission"

type Kind = PhoneCalendars | PhoneReminders | Google | Snapshot
type Consent = NoConsent | Granted | Revoked
type Source = { consent: Consent, until: int, revision: int, scope: int, unlisted: bool, renewal: bool }
type Effect =
  | GrantSource({ kind: Kind, until: int, revision: int, scope: int })
  | RevokeSource({ kind: Kind })
  | AnswerRead({ ticket: int, kind: Kind, items: int })
  | WantRenewal({ kind: Kind, until: int })
  | DropRenewal({ kind: Kind })
  | ReadCalendars({ ticket: int })
  | AskCalendarAccess
  | OpenSettings
type Sources = {
  owner: int, now: int, sources: Kind -> Source,
  review: V::Review, reviewing: Kind, hours: int, scope: int,
  access: P::Permission, calendars: R::Read, listed: int, answered: int, lastItems: int,
}
type Moved = { state: Sources, out: List[Effect] }

pure val maxHours = 720
pure val maxCalendars = 16
pure val maxSnapshot = 4000
pure val maxRead = 12
pure val soon = 24
pure val none: Source = { consent: NoConsent, until: 0, revision: 0, scope: 0, unlisted: false, renewal: false }
pure val allNone: Kind -> Source =
  Map(PhoneCalendars -> none, PhoneReminders -> none, Google -> none, Snapshot -> none)

pure val initial: Sources = {
  owner: 0, now: 0, sources: allNone,
  review: V::unreviewed, reviewing: PhoneCalendars, hours: 24, scope: 0,
  access: P::unasked, calendars: R::unread, listed: 0, answered: 0, lastItems: 0,
}

pure val nowValues = Set(0, 1, 24, 30)
pure val hoursValues = Set(0, 1, 24, 721)
pure val scopeValues = Set(0, 1, 17)
pure val itemsValues = Set(0, 3, 20)
pure val countValues = Set(0, 1)
pure val revisionValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val ownerValues = Set(0, 1, 2)
pure val kindValues = Set(PhoneCalendars, Snapshot, Google)
```

### A source's consent lasts until its hour, and not at or after it, and is said to expire soon in its last day

```quint
pure def sourceOf(s: Sources, kind: Kind): Source = s.sources.getOr(kind, none)

pure def lasts(src: Source, now: int): bool = src.consent == Granted and now < src.until

pure def expiresSoon(src: Source, now: int): bool = lasts(src, now) and src.until - now <= soon

pure def usable(s: Sources, kind: Kind, revision: int, now: int): bool =
  lasts(sourceOf(s, kind), now) and revision == sourceOf(s, kind).revision and revision >= 1
```

### Each kind of source covers its own scope: 1 to 16 calendars the phone lists, a snapshot of 1 to 4000 characters, and nothing to choose for reminders or Google

```quint
pure def scopeFits(s: Sources, kind: Kind, scope: int): bool =
  if (kind == PhoneCalendars) 1 <= scope and scope <= maxCalendars and scope <= s.listed and s.calendars.status == R::Loaded and P::allows(s.access)
  else if (kind == Snapshot) 1 <= scope and scope <= maxSnapshot
  else scope == 0
```

### Consent is given for 1 to 720 hours, after the owner confirms what was shown, and giving it again makes a new revision

The review says which source, what of it is read, that the agent's AI gets
it also while the phone is locked, and until when.

```quint
pure def canReviewConsent(s: Sources, kind: Kind, hours: int, scope: int): bool =
  s.owner >= 1 and 1 <= hours and hours <= maxHours and scopeFits(s, kind, scope) and not(s.review.showing)

pure def reviewConsent(s: Sources, kind: Kind, hours: int, scope: int): Sources =
  { ...s, review: V::present(s.review), reviewing: kind, hours: hours, scope: scope }

pure def canCancelConsent(s: Sources): bool = s.review.showing

pure def cancelConsent(s: Sources): Sources = { ...s, review: V::dismiss(s.review) }

pure def canConfirmConsent(s: Sources, now: int): bool = V::canConfirm(s.review) and now >= s.now

pure def confirmConsent(s: Sources, now: int): Moved =
  val before = sourceOf(s, s.reviewing)
  val given = { consent: Granted, until: now + s.hours, revision: before.revision + 1, scope: s.scope, unlisted: false, renewal: false }
  { state: { ...s, now: now, review: V::confirm(s.review), sources: s.sources.put(s.reviewing, given) },
    out: List(GrantSource({ kind: s.reviewing, until: now + s.hours, revision: given.revision, scope: s.scope }))
      .concat(if (before.renewal) List(DropRenewal({ kind: s.reviewing })) else List()) }
```

### The owner can stop a source at any time, and its renewal notice goes with it

```quint
pure def canRevoke(s: Sources, kind: Kind): bool = sourceOf(s, kind).consent == Granted

pure def revoke(s: Sources, kind: Kind): Moved =
  val src = sourceOf(s, kind)
  { state: { ...s, sources: s.sources.put(kind, { ...src, consent: Revoked, renewal: false }),
      review: if (s.reviewing == kind) V::dismiss(s.review) else s.review },
    out: List(RevokeSource({ kind: kind })).concat(if (src.renewal) List(DropRenewal({ kind: kind })) else List()) }
```

### Each read the agent asks for is answered once, by its own source's consent at the time it is asked: at most 12 items of what was chosen, at the revision consented to, and nothing otherwise; a read older than one answered is refused

```quint
pure def canReadAsked(s: Sources, ticket: int, kind: Kind, revision: int, items: int, now: int): bool =
  ticket > s.answered and now >= s.now and items >= 0

pure def readAsked(s: Sources, ticket: int, kind: Kind, revision: int, items: int, now: int): Moved =
  val given = if (usable(s, kind, revision, now)) (if (items > maxRead) maxRead else items) else 0
  { state: { ...s, now: now, answered: ticket, lastItems: given }, out: List(AnswerRead({ ticket: ticket, kind: kind, items: given })) }
```

### Nothing of a source is read without its consent, past its hour, or beyond 12 items

```quint
pure def stepNothingIsReadWithoutConsent(before: Sources, via: str, after: Sources, out: List[Effect]): bool =
  out.every(e => match e {
    | AnswerRead(r) => r.items <= maxRead
        and (r.items >= 1 implies (sourceOf(before, r.kind).consent == Granted and after.now < sourceOf(before, r.kind).until))
    | GrantSource(g) => via == "confirmConsent" and V::canConfirm(before.review) and g.until > after.now and g.kind == before.reviewing
    | _ => true
  })
```

### Consent lasts at most 720 hours from when it was given, and covers only what its kind may cover

```quint
pure def bounded(src: Source, now: int): bool = and {
  src.until >= 0, src.until <= now + maxHours, src.revision >= 0, src.scope >= 0,
  src.consent == NoConsent implies (src.until == 0 and src.revision == 0),
  src.consent != NoConsent implies src.revision >= 1,
}

pure def alwaysConsentIsBounded(s: Sources): bool = and {
  s.now >= 0, 1 <= s.hours, s.hours <= maxHours, s.answered >= 0, 0 <= s.lastItems, s.lastItems <= maxRead,
  bounded(sourceOf(s, PhoneCalendars), s.now), bounded(sourceOf(s, PhoneReminders), s.now),
  bounded(sourceOf(s, Google), s.now), bounded(sourceOf(s, Snapshot), s.now),
  sourceOf(s, Snapshot).scope <= maxSnapshot, sourceOf(s, PhoneCalendars).scope <= maxCalendars,
  sourceOf(s, PhoneReminders).scope == 0, sourceOf(s, Google).scope == 0,
}
```

### A source can be read with consent, a read refused once its hour passed before the phone woke, a consent expire soon, a snapshot be shared, and a source be revoked

```quint
pure def sometimesASourceIsReadWithConsent(s: Sources): bool = s.lastItems >= 1 and s.answered >= 1

pure def sometimesAReadIsRefusedBeforeTheWake(s: Sources): bool =
  val src = sourceOf(s, Google)
  src.consent == Granted and not(src.renewal) and s.now >= src.until and s.answered >= 1 and s.lastItems == 0

pure def sometimesConsentExpiresSoon(s: Sources): bool = expiresSoon(sourceOf(s, Snapshot), s.now) and s.now >= 1

pure def sometimesASnapshotIsShared(s: Sources): bool = sourceOf(s, Snapshot).consent == Granted and sourceOf(s, Snapshot).scope >= 1

pure def sometimesASourceIsRevoked(s: Sources): bool = sourceOf(s, Snapshot).consent == Revoked
```

## Story: Choose the phone's calendars

> As the owner, I want to choose which of my phone's calendars a digest
> reads, to be asked for calendar access once and sent to Settings after,
> and to be told when a calendar I chose is no longer on my phone.

### The phone's calendars are listed only with calendar access, which is asked for once and afterwards changed in Settings

```quint
pure def canAskCalendarAccess(s: Sources): bool = s.owner >= 1 and P::canAsk(s.access)

pure def askCalendarAccess(s: Sources): Moved = { state: { ...s, access: P::ask(s.access) }, out: List(AskCalendarAccess) }

pure def calendarAccess(s: Sources, grant: P::Grant): Sources = { ...s, access: P::observe(s.access, grant) }

pure def canOpenSettings(s: Sources): bool = P::needsSettings(s.access)

pure def openSettings(s: Sources): Moved = { state: s, out: List(OpenSettings) }

pure def canListCalendars(s: Sources): bool = P::allows(s.access) and s.calendars.status != R::Loading

pure def listCalendars(s: Sources): Moved =
  val asked = R::ask(s.calendars)
  { state: { ...s, calendars: asked }, out: List(ReadCalendars({ ticket: asked.ticket })) }
```

### A calendar chosen that the phone no longer lists is reported on its source

```quint
pure def canCalendarsListed(s: Sources, ticket: int, count: int): bool = R::canAnswer(s.calendars, ticket) and count >= 0

pure def calendarsListed(s: Sources, ticket: int, ok: bool, count: int, missing: bool): Sources =
  val src = sourceOf(s, PhoneCalendars)
  if (not(ok)) { ...s, calendars: R::answer(s.calendars, false) }
  else { ...s, calendars: R::answer(s.calendars, true), listed: count,
         sources: s.sources.put(PhoneCalendars, { ...src, unlisted: src.consent == Granted and (missing or src.scope > count) }) }
```

### Calendar access can be refused and sent to Settings, and a chosen calendar can go missing

```quint
pure def sometimesCalendarAccessIsRefused(s: Sources): bool = s.access.grant == P::Denied and P::needsSettings(s.access)

pure def sometimesACalendarGoesMissing(s: Sources): bool = sourceOf(s, PhoneCalendars).unlisted
```

## Story: Renew a source's access

> As the owner, I want to be told once when a source's consent runs out,
> and a tap on that notice to take me to renew it.

### When a source's hour comes, a notice is wanted to renew it, once per consent

```quint
pure def canExpired(s: Sources, kind: Kind, now: int): bool =
  val src = sourceOf(s, kind)
  src.consent == Granted and now >= src.until and now >= s.now and not(src.renewal)

pure def expired(s: Sources, kind: Kind, now: int): Moved =
  val src = sourceOf(s, kind)
  { state: { ...s, now: now, sources: s.sources.put(kind, { ...src, renewal: true }) },
    out: List(WantRenewal({ kind: kind, until: src.until })) }
```

### Opening the renewal notice opens the renewal review of its source

The notices area takes each tap once.

```quint
pure def canRenewalOpened(s: Sources, kind: Kind): bool = sourceOf(s, kind).renewal and not(s.review.showing) and s.owner >= 1

pure def renewalOpened(s: Sources, kind: Kind): Sources =
  { ...s, review: V::present(s.review), reviewing: kind, hours: 24, scope: sourceOf(s, kind).scope }
```

### A renewal notice is wanted only while its consent has run out

```quint
pure def renewalHonest(src: Source, now: int): bool = src.renewal implies (src.consent == Granted and now >= src.until)

pure def alwaysARenewalIsForConsentThatRanOut(s: Sources): bool = and {
  renewalHonest(sourceOf(s, PhoneCalendars), s.now), renewalHonest(sourceOf(s, PhoneReminders), s.now),
  renewalHonest(sourceOf(s, Google), s.now), renewalHonest(sourceOf(s, Snapshot), s.now),
}

pure def stepARenewalIsWantedOnce(before: Sources, via: str, after: Sources, out: List[Effect]): bool =
  out.every(e => match e {
    | WantRenewal(w) => via == "expired" and not(sourceOf(before, w.kind).renewal) and sourceOf(after, w.kind).renewal
    | DropRenewal(d) => sourceOf(before, d.kind).renewal and not(sourceOf(after, d.kind).renewal)
    | _ => true
  })
```

### Consent can be renewed from its notice

```quint
pure def sometimesConsentIsRenewed(s: Sources): bool =
  val src = sourceOf(s, Google)
  lasts(src, s.now) and src.revision >= 2 and not(src.renewal)
```

## Story: Keep sources to their owner and through a restart

> As the owner, I want my consents kept through a restart, and none of
> them used for whoever signs in next.

### A restart closes the review and keeps every consent and its notice

```quint
pure def restart(s: Sources): Sources = { ...s, review: V::dismiss(s.review), calendars: { ...s.calendars, status: R::Idle } }
```

### When another owner signs in, the previous owner's consents no longer answer reads, and their renewal notices are dropped

```quint
pure def drops(s: Sources, kind: Kind): List[Effect] = if (sourceOf(s, kind).renewal) List(DropRenewal({ kind: kind })) else List()

pure def canOwnerChanged(s: Sources, owner: int): bool = owner != s.owner and owner >= 0

pure def ownerChanged(s: Sources, owner: int): Moved =
  { state: { ...initial, owner: owner, now: s.now, answered: s.answered, access: s.access, calendars: { ...s.calendars, status: R::Idle } },
    out: drops(s, PhoneCalendars).concat(drops(s, PhoneReminders)).concat(drops(s, Google)).concat(drops(s, Snapshot)) }
```
