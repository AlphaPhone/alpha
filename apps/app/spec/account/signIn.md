# Sign-in screen

Alpha's own Eliza Cloud sign-in screens: Google through the native host, or an email or text
message code typed into Alpha, then a second verification when the account has one. No Cloud web
page is part of a sign-in. The native host (`AlphaCloudSignIn`) holds the session, verifiers,
codes and keys; the screen sees which methods are ready, the attempt it names and each outcome.
On Android a signed-out phone shows the required page; the browser preview shows a first-run page;
elsewhere the owner opens sign-in from Account or a plan prompt.

## Story: Choose how to sign in

> As the owner, I choose Google, email or my phone number on Alpha's own screen, and I am only
> offered what can work right now, so that I never start a sign-in that cannot finish.

### The host and its commit boundary are fixed before anything starts

The browser development host reports whether a cancelled Google attempt had already stored its
key; the Android host does not.

```quint
type Host = AndroidHost | PreviewHost | BrowserHost
type Entry = NoEntry | RequiredEntry | FirstRunEntry | OpenedEntry
type Screen = ScreenClosed | Choose | GoogleWait | CodeStep | FactorStep
type Work = NoWork | Probing | GoogleWork | Sending | Resending | Verifying | SavingOwnKeys
type CodeMethod = EmailCode | PhoneCode
type FactorKind = TotpFactor | SmsFactor | PasskeyFactor
type Fault = NoFault | AttemptFailed | SendFailed | ResendFailed | WrongCode | CodeSpent
type Net = NetUnknown | NetOnline | NetOffline | NetUnvalidated
type Methods = { known: bool, google: bool, email: bool, phone: bool }
type SignIn = {
  host: Host, hostFixed: bool, commitBoundary: bool, startupResolved: bool, signedIn: bool, opened: bool, ownKeys: bool,
  screen: Screen, work: Work, fault: Fault, method: CodeMethod, factor: FactorKind, methods: Methods, net: Net,
  automatic: bool, latch: bool, probes: int, late: bool, readinessOwner: bool, lateAdopted: int, lateDropped: int,
  attempt: int, attempts: int, stale: bool, prefill: bool, address: bool, cooldown: bool,
  storedKey: int, adoptedKey: int, priorKey: int, hostCommitted: bool, adoptedByBack: bool
}
pure val unknownMethods: Methods = { known: false, google: false, email: false, phone: false }
pure val initial: SignIn = {
  host: BrowserHost, hostFixed: false, commitBoundary: false, startupResolved: false, signedIn: false, opened: false, ownKeys: false,
  screen: ScreenClosed, work: NoWork, fault: NoFault, method: EmailCode, factor: TotpFactor, methods: unknownMethods, net: NetUnknown,
  automatic: false, latch: false, probes: 0, late: false, readinessOwner: false, lateAdopted: 0, lateDropped: 0,
  attempt: 0, attempts: 0, stale: false, prefill: false, address: false, cooldown: false,
  storedKey: 0, adoptedKey: 0, priorKey: 0, hostCommitted: false, adoptedByBack: false
}
pure def canFixHost(s: SignIn, host: Host, boundary: bool): bool = not(s.hostFixed) and s.probes == 0 and s.work == NoWork
pure def fixHost(s: SignIn, host: Host, boundary: bool): SignIn = { ...s, host: host, commitBoundary: boundary and host == BrowserHost, hostFixed: true }
pure def canStartupSettles(s: SignIn): bool = s.hostFixed and not(s.startupResolved)
pure def startupSettles(s: SignIn): SignIn = { ...s, startupResolved: true }
pure def alwaysOnlyTheBrowserHostHasABoundary(s: SignIn): bool = s.commitBoundary implies s.host == BrowserHost
```

### Sign-in is shown as the required page, the first-run page, or the dialog the owner opened

Saved own keys end any sign-in entry. A usable sign-in shows none unless the owner opened one.

```quint
pure def entryOf(s: SignIn): Entry =
  if (s.ownKeys) NoEntry
  else if (s.opened) OpenedEntry
  else if (s.signedIn) NoEntry
  else if (s.host == AndroidHost and s.startupResolved) RequiredEntry
  else if (s.host == PreviewHost and s.startupResolved) FirstRunEntry
  else NoEntry
pure def isPage(e: Entry): bool = e == RequiredEntry or e == FirstRunEntry
pure def canSessionChanged(s: SignIn, usable: bool): bool = s.hostFixed and usable != s.signedIn and s.work == NoWork
pure def sessionChanged(s: SignIn, usable: bool): SignIn =
  if (usable) { ...s, signedIn: true, opened: false, screen: ScreenClosed, latch: false, fault: NoFault, attempt: 0, stale: false, address: false, prefill: false }
  else { ...s, signedIn: false, screen: ScreenClosed, latch: false, attempt: 0, stale: false, address: false, prefill: false }
pure def alwaysAChooserNeedsAnEntry(s: SignIn): bool = s.screen != ScreenClosed implies entryOf(s) != NoEntry
pure def sometimesRequiredPage(s: SignIn): bool = entryOf(s) == RequiredEntry and s.screen == Choose
pure def sometimesFirstRunPage(s: SignIn): bool = entryOf(s) == FirstRunEntry and s.screen == Choose
```

### The automatic page checks readiness once, and an owner's check keeps the agent running

The automatic page reads the host's readiness once, after startup, until a chooser is shown or the
page ends; it starts no sign-in. The owner opens sign-in, or retries the check, only with nothing
in the slot. After a check the owner started, the resident agent is ensured.

```quint
type SignInEffect = ReadMethods | StartGoogle | SendCode | VerifyCode | CancelAttempt | EnsureResident | Adopted
type SignInStep = { state: SignIn, out: List[SignInEffect] }
pure def probing(automatic: bool, s: SignIn): SignIn =
  { ...s, work: Probing, readinessOwner: true, automatic: automatic, late: false, probes: s.probes + 1 }
pure def canAutomaticProbe(s: SignIn): bool =
  isPage(entryOf(s)) and s.screen == ScreenClosed and not(s.latch) and s.work == NoWork and s.startupResolved
pure def automaticProbe(s: SignIn): SignInStep = { state: probing(true, { ...s, latch: true }), out: List(ReadMethods) }
pure def canLatchReleases(s: SignIn): bool = s.latch and (s.screen != ScreenClosed or entryOf(s) == NoEntry)
pure def latchReleases(s: SignIn): SignIn = { ...s, latch: false }
pure def canOwnerOpens(s: SignIn): bool =
  s.hostFixed and s.work == NoWork and not(s.ownKeys) and (s.screen == ScreenClosed or s.screen == Choose)
pure def ownerOpens(s: SignIn): SignInStep =
  { state: probing(false, { ...s, opened: s.opened or not(isPage(entryOf(s))), fault: NoFault }), out: List(ReadMethods) }
pure val methodsValues = Set(
  { known: true, google: true, email: true, phone: true }, { known: true, google: false, email: true, phone: false },
  { known: true, google: false, email: false, phone: false }, { known: false, google: false, email: false, phone: false })
pure def canProbeSettles(s: SignIn, methods: Methods, lateFollows: bool): bool = s.work == Probing
pure def probeSettles(s: SignIn, methods: Methods, lateFollows: bool): SignInStep =
  { state: { ...s, work: NoWork, screen: Choose, methods: methods, late: lateFollows },
    out: if (s.automatic) List() else List(EnsureResident) }
pure def alwaysAProbeOwnsReadiness(s: SignIn): bool = s.work == Probing implies s.readinessOwner
pure def alwaysTheAutomaticCheckFollowsStartup(s: SignIn): bool = s.latch implies s.startupResolved
pure def stepAnOwnersCheckKeepsTheAgentRunning(before: SignIn, via: str, after: SignIn, out: List[SignInEffect]): bool =
  (via == "probeSettles" and not(before.automatic)) implies out.includes(EnsureResident)
```

### A late readiness answer changes the methods only for the chooser its check showed

```quint
pure def canLateMethods(s: SignIn, methods: Methods): bool = s.late
pure def lateMethods(s: SignIn, methods: Methods): SignIn = {
  val adopt = s.readinessOwner and s.work == NoWork and s.screen == Choose
  { ...s, late: false, methods: if (adopt) methods else s.methods,
    lateAdopted: if (adopt) s.lateAdopted + 1 else s.lateAdopted, lateDropped: if (adopt) s.lateDropped else s.lateDropped + 1 }
}
pure def alwaysALateAnswerFollowsACheck(s: SignIn): bool = s.late implies s.work != Probing
pure def sometimesLateAnswerAdopted(s: SignIn): bool = s.lateAdopted >= 1
pure def sometimesLateAnswerDropped(s: SignIn): bool = s.lateDropped >= 1
```

### Email works while readiness is unknown; Google and text messages need their own readiness

```quint
pure def methodReady(m: Methods, method: CodeMethod): bool =
  if (method == EmailCode) not(m.known) or m.email else m.known and m.phone
pure def lawEmailWorksWhileReadinessIsUnknown(m: Methods): bool = not(m.known) implies methodReady(m, EmailCode)
pure def lawPhoneNeedsItsReadiness(m: Methods): bool = methodReady(m, PhoneCode) implies (m.known and m.phone)
pure def canChooseMethod(s: SignIn, method: CodeMethod): bool =
  s.screen == Choose and s.work == NoWork and method != s.method and methodReady(s.methods, method)
pure def chooseMethod(s: SignIn, method: CodeMethod): SignIn = { ...s, method: method, fault: NoFault }
```

### Nothing starts while the phone is offline

The network state is Android's own: offline, connected without validated internet, or online. A
captive Wi-Fi portal leaves the drafts on screen.

```quint
pure def reachable(n: Net): bool = n != NetOffline
pure def canNetworkSeen(s: SignIn, net: Net): bool = net != s.net
pure def networkSeen(s: SignIn, net: Net): SignIn = { ...s, net: net }
pure def stepNothingStartsWhileOffline(before: SignIn, via: str, after: SignIn): bool =
  (via == "tapGoogle" or via == "submitAddress" or via == "resend" or via == "verify") implies reachable(before.net)
pure def sometimesOfflineChooser(s: SignIn): bool = s.screen == Choose and s.net == NetOffline
```

## Story: Sign in with Google

> As the owner, I sign in with my Google account, and leaving that wait never hides a sign-in that
> already finished.

### Google waits for the host, and a stored key is adopted or its attempt keeps running

The host stores the new key before its waiting call answers. Back during the wait cancels the
attempt; with a commit boundary a key already stored keeps the attempt running, and without one a
key other than the one held before is adopted instead of being hidden behind the chooser.

```quint
type GoogleOutcome = GoogleSignedIn | GoogleFactor({ googleFactor: FactorKind }) | GoogleFailed
pure def canTapGoogle(s: SignIn): bool =
  s.screen == Choose and s.work == NoWork and s.methods.known and s.methods.google and reachable(s.net)
pure def tapGoogle(s: SignIn): SignInStep =
  { state: { ...s, work: GoogleWork, screen: GoogleWait, fault: NoFault, prefill: false, priorKey: s.storedKey, hostCommitted: false, readinessOwner: false },
    out: List(StartGoogle) }
pure def canHostCommitsKey(s: SignIn): bool = s.work == GoogleWork and not(s.hostCommitted)
pure def hostCommitsKey(s: SignIn): SignIn = { ...s, storedKey: s.storedKey + 1, hostCommitted: true }
pure def signedInFrom(key: int, s: SignIn): SignIn =
  { ...s, work: NoWork, screen: ScreenClosed, fault: NoFault, signedIn: true, opened: false, attempt: 0, stale: false, address: false, prefill: false, storedKey: key, adoptedKey: key, hostCommitted: false }
pure val outcomeValues = Set(GoogleSignedIn, GoogleFactor({ googleFactor: TotpFactor }), GoogleFactor({ googleFactor: PasskeyFactor }), GoogleFailed)
pure def canGoogleEnds(s: SignIn, outcome: GoogleOutcome): bool =
  s.work == GoogleWork and ((outcome == GoogleSignedIn) iff s.hostCommitted)
pure def googleEnds(s: SignIn, outcome: GoogleOutcome): SignInStep = match outcome {
  | GoogleSignedIn => { state: signedInFrom(s.storedKey, s), out: List(Adopted) }
  | GoogleFactor(f) => { state: { ...s, work: NoWork, screen: FactorStep, factor: f.googleFactor, fault: NoFault,
      attempts: s.attempts + 1, attempt: s.attempts + 1, stale: false, address: false }, out: List() }
  | GoogleFailed => { state: { ...s, work: NoWork, screen: Choose, fault: AttemptFailed, prefill: false }, out: List() }
}
pure def canBackDuringGoogle(s: SignIn): bool = s.work == GoogleWork
pure def backDuringGoogle(s: SignIn): SignInStep =
  if (s.commitBoundary and s.hostCommitted) { state: s, out: List() }
  else if (not(s.commitBoundary) and s.storedKey != s.priorKey) { state: { ...signedInFrom(s.storedKey, s), adoptedByBack: true }, out: List(CancelAttempt, Adopted) }
  else { state: { ...s, work: NoWork, screen: Choose, fault: NoFault, prefill: false }, out: List(CancelAttempt) }
pure def alwaysAStoredKeyIsNeverHidden(s: SignIn): bool = s.storedKey != s.adoptedKey implies (s.work == GoogleWork and s.hostCommitted)
pure def sometimesAdoptedByBack(s: SignIn): bool = s.adoptedByBack and s.screen == ScreenClosed and s.adoptedKey == s.storedKey
pure def sometimesCommittedAttemptSurvivesBack(s: SignIn): bool = s.commitBoundary and s.work == GoogleWork and s.hostCommitted
pure def sometimesGoogleSecondFactor(s: SignIn): bool = s.screen == FactorStep and s.priorKey == s.storedKey and s.attempts == 1 and not(s.address)
```

## Story: Sign in with a code

> As the owner, I type the code sent to my email or phone, ask for a new one when it expires, and
> finish a second verification when my account has one, with the address I typed kept for me.

### A code is sent before it is asked for, and a resend the host did not take keeps the earlier code

A send or resend starts a cooldown the host sets; the screen offers no resend until it ends.

```quint
pure def canSubmitAddress(s: SignIn): bool =
  s.screen == Choose and s.work == NoWork and methodReady(s.methods, s.method) and reachable(s.net) and not(s.cooldown)
pure def submitAddress(s: SignIn): SignInStep =
  { state: { ...s, work: Sending, fault: NoFault, readinessOwner: false }, out: List(SendCode) }
pure def canSendEnds(s: SignIn, accepted: bool): bool = s.work == Sending
pure def sendEnds(s: SignIn, accepted: bool): SignIn =
  if (accepted) { ...s, work: NoWork, screen: CodeStep, fault: NoFault, prefill: false, address: true,
    attempts: s.attempts + 1, attempt: s.attempts + 1, stale: false, cooldown: true }
  else { ...s, work: NoWork, screen: Choose, fault: SendFailed, prefill: true }
pure def canResend(s: SignIn): bool = s.screen == CodeStep and s.work == NoWork and not(s.cooldown) and reachable(s.net)
pure def resend(s: SignIn): SignInStep = { state: { ...s, work: Resending, fault: NoFault }, out: List(SendCode) }
pure def canResendEnds(s: SignIn, accepted: bool): bool = s.work == Resending
pure def resendEnds(s: SignIn, accepted: bool): SignIn =
  if (accepted) { ...s, work: NoWork, fault: NoFault, attempts: s.attempts + 1, attempt: s.attempts + 1, stale: false, cooldown: true }
  else { ...s, work: NoWork, fault: ResendFailed }
pure def canCooldownEnds(s: SignIn): bool = s.cooldown
pure def cooldownEnds(s: SignIn): SignIn = { ...s, cooldown: false }
pure def sometimesFailedResendKeepsTheAttempt(s: SignIn): bool = s.fault == ResendFailed and s.screen == CodeStep and s.attempt != 0
```

### A wrong code keeps the step, a spent code leaves only Resend, and any other failure returns to the choice

A second verification continues under the same attempt; a passkey factor cannot be completed in
Alpha. Every other failure, an unreachable Cloud included, returns to the method choice with the
address filled in when the step was reached from one.

```quint
type VerifyOutcome = CodeAccepted | CodeNeedsFactor({ codeFactor: FactorKind }) | CodeWrong | CodeUsedUp | CodeFailed
pure val verifiedValues = Set(CodeAccepted, CodeNeedsFactor({ codeFactor: SmsFactor }), CodeWrong, CodeUsedUp, CodeFailed)
pure def canVerify(s: SignIn): bool =
  (s.screen == CodeStep or (s.screen == FactorStep and s.factor != PasskeyFactor)) and s.work == NoWork and not(s.stale) and reachable(s.net)
pure def verify(s: SignIn): SignInStep = { state: { ...s, work: Verifying, fault: NoFault }, out: List(VerifyCode) }
pure def isFactorOutcome(v: VerifyOutcome): bool = match v { | CodeNeedsFactor(f) => true | _ => false }
pure def canVerifyEnds(s: SignIn, verified: VerifyOutcome): bool = s.work == Verifying and (isFactorOutcome(verified) implies s.screen == CodeStep)
pure def verifyEnds(s: SignIn, verified: VerifyOutcome): SignInStep = match verified {
  | CodeAccepted => { state: signedInFrom(s.storedKey + 1, s), out: List(Adopted) }
  | CodeNeedsFactor(f) => { state: { ...s, work: NoWork, screen: FactorStep, factor: f.codeFactor }, out: List() }
  | CodeWrong => { state: { ...s, work: NoWork, fault: WrongCode }, out: List() }
  | CodeUsedUp => if (s.screen == CodeStep) { state: { ...s, work: NoWork, stale: true, fault: CodeSpent }, out: List() }
      else { state: { ...s, work: NoWork, screen: Choose, fault: AttemptFailed, attempt: 0, stale: false, prefill: s.address, address: false }, out: List() }
  | CodeFailed => { state: { ...s, work: NoWork, screen: Choose, fault: AttemptFailed, attempt: 0, stale: false, prefill: s.address, address: false }, out: List() }
}
pure def alwaysStaleOnlyOnTheCodeStep(s: SignIn): bool = s.stale implies s.screen == CodeStep
pure def alwaysAttemptOnlyOnCodeSteps(s: SignIn): bool = (s.attempt != 0) iff (s.screen == CodeStep or s.screen == FactorStep)
pure def alwaysASpentCodeIsNeverVerified(s: SignIn): bool = s.work == Verifying implies not(s.stale)
pure def alwaysPrefillOnlyOnTheChooser(s: SignIn): bool = s.prefill implies s.screen == Choose
pure def alwaysAddressOnlyOnCodeSteps(s: SignIn): bool = s.address implies (s.screen == CodeStep or s.screen == FactorStep)
pure def alwaysTheScreenMatchesItsWork(s: SignIn): bool =
  ((s.work == GoogleWork) iff (s.screen == GoogleWait)) and (s.work == Sending implies s.screen == Choose)
    and (s.work == Resending implies s.screen == CodeStep) and (s.work == Verifying implies (s.screen == CodeStep or s.screen == FactorStep))
pure def sometimesSpentCode(s: SignIn): bool = s.stale and s.work == NoWork
pure def sometimesSignedInWithACode(s: SignIn): bool = s.signedIn and s.adoptedKey >= 1 and s.attempts >= 1 and not(s.adoptedByBack)
```

## Story: Leave sign-in

> As the owner, Back takes me one step out of sign-in, and the required page stays until I am
> signed in or use my own keys.

### Back ends the step in flight, then the code step, then the dialog; the required page keeps its chooser

During a check, Back ends it, and an owner's check still ensures the agent. During a send or a
verification it cancels that attempt. On the required or first-run page showing its chooser with
nothing pending, Back changes nothing.

```quint
pure def canBack(s: SignIn): bool = entryOf(s) != NoEntry and s.work != GoogleWork
pure def chooserFrom(fill: bool, s: SignIn): SignIn =
  { ...s, work: NoWork, fault: NoFault, screen: Choose, attempt: 0, stale: false, address: false, prefill: fill }
pure def back(s: SignIn): SignInStep = {
  val page = isPage(entryOf(s))
  val ended = { ...s, work: NoWork, late: false }
  val fill = s.screen == CodeStep or s.prefill
  if (s.work == NoWork and s.screen == Choose and page) { state: s, out: List() }
  else if (s.work == Probing)
    { state: if (page) ended else { ...ended, screen: ScreenClosed, opened: false, prefill: false },
      out: if (s.automatic) List() else List(EnsureResident) }
  else if (s.work == SavingOwnKeys) { state: { ...s, work: NoWork }, out: List() }
  else if (s.work != NoWork) { state: chooserFrom(fill, s), out: List(CancelAttempt) }
  else if (s.screen == CodeStep or s.screen == FactorStep) { state: chooserFrom(fill, s), out: List(CancelAttempt) }
  else if (page) { state: s, out: List() }
  else { state: { ...s, screen: ScreenClosed, opened: false, fault: NoFault, prefill: false }, out: List() }
}
pure def stepTheRequiredPageKeepsItsChooser(before: SignIn, via: str, after: SignIn): bool =
  (via == "back" and entryOf(before) == RequiredEntry and before.work == NoWork and before.screen == Choose) implies after == before
pure def sometimesBackClosedTheDialog(s: SignIn): bool = entryOf(s) == NoEntry and s.probes >= 1 and s.work == NoWork and s.screen == ScreenClosed and not(s.signedIn)
```

### Saving own keys ends a readiness check without starting anything, and ends the entry

The owner may skip Cloud for their own provider keys. Saving them takes the slot from a readiness
check (not an attempt the owner started) and is refused behind any other step.

```quint
pure def canOwnKeysStart(s: SignIn): bool = (s.work == NoWork or s.work == Probing) and not(s.ownKeys) and s.hostFixed
pure def ownKeysStart(s: SignIn): SignIn = { ...s, work: SavingOwnKeys, late: false, readinessOwner: false }
pure def canOwnKeysEnd(s: SignIn, saved: bool): bool = s.work == SavingOwnKeys
pure def ownKeysEnd(s: SignIn, saved: bool): SignIn =
  if (saved) { ...s, work: NoWork, ownKeys: true, screen: ScreenClosed, opened: false, attempt: 0, stale: false, address: false, prefill: false }
  else { ...s, work: NoWork }
pure def stepATakenOverCheckStartsNothing(before: SignIn, via: str, after: SignIn, out: List[SignInEffect]): bool =
  via == "ownKeysStart" implies out.length() == 0
pure def alwaysSavedOwnKeysEndTheEntry(s: SignIn): bool = s.ownKeys implies (s.screen == ScreenClosed and entryOf(s) == NoEntry)
pure def sometimesOwnKeysSaved(s: SignIn): bool = s.ownKeys and s.probes >= 1 and s.screen == ScreenClosed
```

## Story: Read the service's terms before signing in

> As the owner, I can read the deployment's Terms and Privacy on the sign-in screen, exactly as the
> service publishes them.

### Terms are the service's published plain text, or nothing

`GET /api/public/service` answers the service name and two documents of titled sections of plain
paragraphs. Anything else is shown as unavailable; no markup, link or authority is taken from it.

```quint
type ServiceText = ServiceUnread | ServiceShown({ revision: str }) | ServiceUnavailable
type PublishedText = { sections: int, plain: bool, extraFields: bool }
pure def readServiceText(t: PublishedText, revision: str): ServiceText =
  if (t.sections >= 1 and t.plain and not(t.extraFields) and revision != "") ServiceShown({ revision: revision }) else ServiceUnavailable
pure val tValues = Set({ sections: 2, plain: true, extraFields: false }, { sections: 0, plain: true, extraFields: false },
  { sections: 1, plain: false, extraFields: false }, { sections: 1, plain: true, extraFields: true })
pure val revisionValues = Set("r1", "")
pure def lawOnlyPlainPublishedTextIsShown(t: PublishedText, revision: str): bool =
  readServiceText(t, revision) != ServiceUnavailable implies (t.plain and not(t.extraFields) and t.sections >= 1)
```
