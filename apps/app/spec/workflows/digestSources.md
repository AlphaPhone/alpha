# Digest sources

What a digest may read: the phone's own Calendar and reminders, which the phone answers only under
the owner's consent, or Google mail and Calendar, which Cloud reads under a read grant the owner
authorizes. Each source is reviewed as exactly what will be read, for how long, and that its data
goes to the agent's model (legacy `NativeDigestConsent`, `digest-delegation`,
`digest-authorization-document`, `digest-live-sources`; PRD AP-04).

## Domain

### Sources hold the session, whether Alpha is in front, the read-grant request and the phone's consent

```quint
type Authorization = NoAuthorization | Starting | Reviewing | Completing | Granted | AuthorizationFailed
type Consent = NoConsent | ConsentAsked | ConsentApproved | ConsentRefused | ConsentRevoked
type Sources = {
  session: int, now: int, foreground: bool,
  authorization: Authorization, mutation: str, email: bool, calendar: bool, requestExpiresAt: int, grantExpiresAt: int,
  consent: Consent, consentExpiresAt: int, consentCalendar: bool, consentReminders: bool
}
pure val initial: Sources = {
  session: 0, now: 0, foreground: true,
  authorization: NoAuthorization, mutation: "", email: false, calendar: false, requestExpiresAt: 0, grantExpiresAt: 0,
  consent: NoConsent, consentExpiresAt: 0, consentCalendar: false, consentReminders: false
}
pure val requestLifetimeMs = 600000
pure val grantLifetimeMs = 604800000
pure val maximumConsentMs = 604800000
pure val renewalWindowMs = 86400000
```

### What the simulator tries

```quint
pure val sessionValues = Set(1, 2)
pure val mutationValues = Set("m1", "m2")
pure val nowValues = Set(1, 700000)
pure val expiresAtValues = Set(1, 600000, 604800001)
```

## Story: Let my digest read Google through Cloud only as I authorized

> As the owner, I authorize Cloud to read my Google mail or Calendar for my digest for a week, and I
> want a request I did not finish to expire, and a repeated request never to widen what it reads.

### A read-grant request names one or two kinds, and repeating its mutation id keeps those kinds

```quint
pure def canStart(s: Sources, mutation: str, email: bool, calendar: bool): bool =
  s.session != 0 and s.foreground and mutation != "" and (email or calendar) and
  (s.authorization == NoAuthorization or s.authorization == AuthorizationFailed or s.authorization == Granted or
    (s.mutation == mutation and s.email == email and s.calendar == calendar and s.authorization == Starting))
pure def start(s: Sources, mutation: str, email: bool, calendar: bool): Sources =
  { ...s, authorization: Starting, mutation: mutation, email: email, calendar: calendar, requestExpiresAt: s.now + requestLifetimeMs }
pure def stepARepeatedRequestKeepsItsKinds(before: Sources, via: str, after: Sources): bool =
  (via == "start" and before.mutation == after.mutation and before.authorization == Starting) implies
    (before.email == after.email and before.calendar == after.calendar)
pure def alwaysARequestNamesAKind(s: Sources): bool = s.authorization != NoAuthorization implies (s.email or s.calendar)
```

### The owner approves the request in review, only while it waits, and within ten minutes

```quint
pure def canStarted(s: Sources): bool = s.authorization == Starting
pure def started(s: Sources): Sources = { ...s, authorization: Reviewing }
pure def canApprove(s: Sources): bool = s.authorization == Reviewing and s.now < s.requestExpiresAt and s.foreground
pure def approve(s: Sources): Sources = { ...s, authorization: Completing }
pure def canCompleted(s: Sources, ok: bool): bool = s.authorization == Completing
pure def completed(s: Sources, ok: bool): Sources =
  if (ok) { ...s, authorization: Granted, grantExpiresAt: s.now + grantLifetimeMs } else { ...s, authorization: AuthorizationFailed }
pure def canCancelRequest(s: Sources): bool = s.authorization == Reviewing or s.authorization == Starting
pure def cancelRequest(s: Sources): Sources = { ...s, authorization: AuthorizationFailed }
pure def alwaysAGrantLastsAtMostAWeek(s: Sources): bool = s.authorization == Granted implies (s.grantExpiresAt > 0 and s.grantExpiresAt <= s.now + grantLifetimeMs)
pure def sometimesGranted(s: Sources): bool = s.authorization == Granted
```

### The clock expires a waiting request and a grant; renewal is due in the last day

```quint
pure def canTick(s: Sources, now: int): bool = now > s.now
pure def tick(s: Sources, now: int): Sources =
  { ...s, now: now,
    authorization: if ((s.authorization == Reviewing or s.authorization == Starting) and now >= s.requestExpiresAt) AuthorizationFailed
      else if (s.authorization == Granted and now >= s.grantExpiresAt) NoAuthorization else s.authorization,
    grantExpiresAt: if (s.authorization == Granted and now >= s.grantExpiresAt) 0 else s.grantExpiresAt,
    consent: if (s.consent == ConsentApproved and now >= s.consentExpiresAt) NoConsent else s.consent,
    consentExpiresAt: if (s.consent == ConsentApproved and now >= s.consentExpiresAt) 0 else s.consentExpiresAt }
pure def renewalDue(expiresAt: int, now: int): bool = expiresAt > now and expiresAt - now <= renewalWindowMs
pure def lawRenewalIsDueOnlyInTheLastDay(expiresAt: int, now: int): bool = renewalDue(expiresAt, now) implies expiresAt - now <= 86400000
```

### Revoking a grant is confirmed before the source reads as revoked

```quint
pure def canRevokeGrant(s: Sources, confirmed: bool): bool = s.authorization == Granted and s.foreground
pure def revokeGrant(s: Sources, confirmed: bool): Sources = if (confirmed) { ...s, authorization: NoAuthorization, grantExpiresAt: 0 } else s
```

### Removing Google access first shows every saved source and digest that reads through it, and a changed list asks again

The review lists the Google sources and the digests bound to them; confirming reads them again, and
when what would stop reading differs from what was shown, nothing is revoked and the new list is
reviewed (#983).

```quint
type Impact = { sources: int, digests: int }
pure def revokeConfirmable(reviewed: Impact, latest: Impact): bool = reviewed == latest
pure val reviewedValues = Set({ sources: 1, digests: 1 }, { sources: 1, digests: 2 })
pure val latestValues = Set({ sources: 1, digests: 1 }, { sources: 2, digests: 1 })
pure def lawAChangedImpactIsReviewedAgain(reviewed: Impact, latest: Impact): bool =
  reviewed != latest implies not(revokeConfirmable(reviewed, latest))
```

## Story: Let my digest read my phone's Calendar and reminders only with my consent

> As the owner, I consent for a week at most to my digest reading the calendars and reminders I
> chose on this phone, only while I am looking at Alpha, and I can revoke it.

### Consent is asked only in front, for at least one kind, ending after now and within seven days

The phone binds the consent to the owner, agent, installation and enrollment it named when the
review opened, and refuses any other.

```quint
pure def canAskConsent(s: Sources, expiresAt: int, calendar: bool, reminders: bool): bool =
  s.session != 0 and s.foreground and s.consent != ConsentAsked and (calendar or reminders) and
  expiresAt > s.now and expiresAt <= s.now + maximumConsentMs
pure def askConsent(s: Sources, expiresAt: int, calendar: bool, reminders: bool): Sources =
  { ...s, consent: ConsentAsked, consentExpiresAt: expiresAt, consentCalendar: calendar, consentReminders: reminders }
pure def canConsentAnswered(s: Sources, approved: bool): bool = s.consent == ConsentAsked
pure def consentAnswered(s: Sources, approved: bool): Sources =
  if (approved and s.foreground and s.now < s.consentExpiresAt) { ...s, consent: ConsentApproved } else { ...s, consent: ConsentRefused, consentExpiresAt: 0 }
pure def canRevokeConsent(s: Sources): bool = s.consent == ConsentApproved and s.foreground
pure def revokeConsent(s: Sources): Sources = { ...s, consent: ConsentRevoked, consentExpiresAt: 0 }
pure def alwaysConsentLastsAtMostAWeek(s: Sources): bool =
  (s.consent == ConsentApproved or s.consent == ConsentAsked) implies (s.consentExpiresAt > 0 and (s.consentCalendar or s.consentReminders))
pure def sometimesConsented(s: Sources): bool = s.consent == ConsentApproved
pure def sometimesConsentRevoked(s: Sources): bool = s.consent == ConsentRevoked
```

### Leaving Alpha refuses a consent still being answered, and another session forgets every request

```quint
pure def canForeground(s: Sources, front: bool): bool = front != s.foreground
pure def foreground(s: Sources, front: bool): Sources = { ...s, foreground: front }
pure def canSelectSession(s: Sources, session: int): bool = session != s.session
pure def selectSession(s: Sources, session: int): Sources = { ...initial, session: session, now: s.now, foreground: s.foreground }
pure def stepConsentIsGrantedOnlyInFront(before: Sources, via: str, after: Sources): bool =
  (before.consent != ConsentApproved and after.consent == ConsentApproved) implies before.foreground
```

### A phone source is named, reads 1 to 16 of the phone's own calendars or its reminders, and lasts 1 to 168 hours

The calendars offered are the ones the phone lists now, with their revisions; a chosen calendar the
phone no longer lists is chosen again before review. The agent is told of the source only after
the phone consented to exactly that scope, and a source that renews another rebinds each digest of
the old one to the new source's revision under its own version.

```quint
type PhoneSourceProblem = PhoneSourceReady | NeedsSourceName | CalendarsGone | TooManyCalendars | NeedsAKind | NeedsHours
pure val maximumPhoneCalendars = 16
pure def phoneSourceProblem(nameLength: int, chosen: int, missing: int, reminders: bool, hours: int): PhoneSourceProblem =
  if (nameLength < 1 or nameLength > 200) NeedsSourceName
  else if (missing > 0) CalendarsGone
  else if (chosen > maximumPhoneCalendars) TooManyCalendars
  else if (chosen == 0 and not(reminders)) NeedsAKind
  else if (hours < 1 or hours > 168) NeedsHours
  else PhoneSourceReady
pure def sourceRegistered(consented: bool, sameScope: bool): bool = consented and sameScope
pure val chosenValues = Set(0, 1, 16, 17)
pure val missingValues = Set(0, 1)
pure val hoursValues = Set(0, 1, 168, 169)
pure val nameLengthValues = Set(0, 1, 200, 201)
pure def lawAReadySourceReadsSomething(nameLength: int, chosen: int, missing: int, reminders: bool, hours: int): bool =
  phoneSourceProblem(nameLength, chosen, missing, reminders, hours) == PhoneSourceReady implies
    ((chosen >= 1 or reminders) and chosen <= 16 and hours >= 1 and hours <= 168 and missing == 0)
pure def lawNoSourceWithoutConsent(sameScope: bool): bool = not(sourceRegistered(false, sameScope))
```

## Story: Renew my phone source before its week ends

> As the owner, I am reminded before a phone source my digest still reads runs out, and tapping the
> reminder opens a review of a new source for exactly that one.

### A renewal reminder is armed only for a phone source that keeps an enabled digest running

A removed, paused or revoked binding clears it.

```quint
pure def renewalArmed(phone: bool, boundEnabled: bool, revoked: bool): bool = phone and boundEnabled and not(revoked)
pure def lawARevokedSourceIsNeverRenewed(phone: bool, boundEnabled: bool): bool = not(renewalArmed(phone, boundEnabled, true))
```

### A renewal tap acts only on Android and only on the current source it names, and a check with no tap changes nothing

The tap must carry the exact owner, agent, installation, enrollment, source, revision and expiry of
a source that is not revoked; otherwise it says the renewal changed. Off Android, or with no tap,
the panel's status is left as it was (#498).

```quint
type RenewalTap = NoRenewalTap | TapMatches | TapStale
type RenewalAction = RenewalIgnored | RenewalReview | RenewalQuestion | RenewalChanged
pure def renewalAction(android: bool, tap: RenewalTap, question: bool, live: bool): RenewalAction =
  if (not(android) or tap == NoRenewalTap) RenewalIgnored
  else if (tap == TapStale or not(live)) RenewalChanged
  else if (question) RenewalQuestion
  else RenewalReview
pure def lawNoTapChangesNothing(android: bool, question: bool, live: bool): bool = renewalAction(android, NoRenewalTap, question, live) == RenewalIgnored
pure def lawOnlyAndroidRenews(tap: RenewalTap, question: bool, live: bool): bool = renewalAction(false, tap, question, live) == RenewalIgnored
pure def lawAStaleTapNeverOpensAReview(android: bool, question: bool, live: bool): bool =
  renewalAction(android, TapStale, question, live) != RenewalReview
```

## Story: Choose exactly what a Google source reads

> As the owner, I choose one account, mail or Calendar, a window and a count, and I want the source
> to read only that, bound to the account revision I saw.

### A Google selection reads mail or one calendar for 1 to 168 hours and 1 to 25 items, under the reviewed account revision

```quint
type LiveKind = MailKind | CalendarKind
type Selection = { kind: LiveKind, windowHours: int, maxItems: int, calendarId: str, revisionMatches: bool, kindOffered: bool }
pure def validSelection(x: Selection): bool =
  x.revisionMatches and x.kindOffered and x.windowHours >= 1 and x.windowHours <= 168 and x.maxItems >= 1 and x.maxItems <= 25 and
  (x.kind == CalendarKind implies x.calendarId != "")
pure val xValues = Set({ kind: MailKind, windowHours: 24, maxItems: 10, calendarId: "", revisionMatches: true, kindOffered: true },
  { kind: CalendarKind, windowHours: 24, maxItems: 10, calendarId: "", revisionMatches: true, kindOffered: true },
  { kind: MailKind, windowHours: 169, maxItems: 10, calendarId: "", revisionMatches: true, kindOffered: true })
pure def lawAWeekIsTheLongestWindow(x: Selection): bool = validSelection(x) implies x.windowHours <= 168
```
