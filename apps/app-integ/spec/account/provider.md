# AI provider

What the phone's agent answers with: Eliza Cloud through the signed-in account's plan, or the
owner's own Cerebras key, with an optional Cartesia voice key. The keys are typed into Alpha's form
and go straight to the native host (`Agent.configureProvider`), which checks them with the provider,
keeps them in its encrypted store and never returns them. The renderer holds only whether each key
is saved, the route in use and the host's opaque revision; it never stores, logs or shows a key,
and a refusal is shown in Alpha's own words, never in text that could repeat one. Showing a saved
key is the host's own secure dialog. Every change takes a lease from the host
(`prepareProviderConfiguration`) and names the revision the form read, so a change made from an
outdated form is refused. The form lives in Account's AI provider section, and the sign-in page's
"Use my own keys" opens it.

## Story: Use my own keys instead of Cloud

> As the owner, I save my own Cerebras key, and a voice key if I want one, switch between Cloud and
> my own keys whenever I like without losing either, and remove a key only after I confirm it.

### The form shows what the host reports, and a failed read keeps the last known choice

A read that fails never switches the owner to Cloud.

```quint
type Route = CloudRoute | OwnRoute
type KeyName = TextKey | VoiceKey
type ProviderWork = ProviderIdle | Reading | Saving | Choosing | Removing | Revealing
type ProviderFault = NoProviderFault | ReadFailed | KeyNotAccepted | ChangeNotConfirmed | NeedsTextKey
type Review = NoReview | Reviewing({ reviewed: KeyName })
type ChangeOutcome = ChangeConfirmed | ChangeLost | ChangeDenied
type Provider = {
  known: bool, route: Route, textKey: bool, voiceKey: bool, revision: int, work: ProviderWork, fault: ProviderFault,
  target: Route, removing: KeyName, review: Review, signedIn: bool,
  reads: int, saves: int, switches: int, removals: int, lost: int
}
type ProviderEffect = ReadProvider | SaveKeys | SelectRoute | RemoveKey | RevealKey | OpenSignIn
type ProviderStep = { state: Provider, out: List[ProviderEffect] }
pure val initial: Provider = {
  known: false, route: CloudRoute, textKey: false, voiceKey: false, revision: 0, work: ProviderIdle, fault: NoProviderFault,
  target: CloudRoute, removing: TextKey, review: NoReview, signedIn: false,
  reads: 0, saves: 0, switches: 0, removals: 0, lost: 0
}
pure def idle(p: Provider): bool = p.work == ProviderIdle
pure def canRead(p: Provider): bool = idle(p)
pure def read(p: Provider): ProviderStep = { state: { ...p, work: Reading, reads: p.reads + 1 }, out: List(ReadProvider) }
pure def canReadSettled(p: Provider, ok: bool, route: Route, textKey: bool, voiceKey: bool): bool =
  p.work == Reading and (route == OwnRoute implies textKey)
pure def readSettled(p: Provider, ok: bool, route: Route, textKey: bool, voiceKey: bool): Provider =
  if (ok) { ...p, work: ProviderIdle, known: true, route: route, textKey: textKey, voiceKey: voiceKey, revision: p.revision + 1,
    review: NoReview, fault: if (p.fault == ReadFailed) NoProviderFault else p.fault }
  else { ...p, work: ProviderIdle, fault: ReadFailed }
pure def alwaysOwnKeysNeedATextKey(p: Provider): bool = p.route == OwnRoute implies p.textKey
pure def stepAFailedReadKeepsTheChoice(before: Provider, via: str, after: Provider): bool =
  (via == "readSettled" and after.fault == ReadFailed) implies
    (after.route == before.route and after.textKey == before.textKey and after.voiceKey == before.voiceKey and after.known == before.known)
pure def sometimesReadFailedKeptOwnKeys(p: Provider): bool = p.fault == ReadFailed and p.route == OwnRoute
```

### Saving keys selects them, and adds a key only on the host's word

The host checks the Cerebras key before it answers; an answer that does not show the key saved is
not a save.

```quint
pure def canSave(p: Provider): bool = idle(p)
pure def save(p: Provider): ProviderStep = { state: { ...p, work: Saving, fault: NoProviderFault, review: NoReview }, out: List(SaveKeys) }
pure def canSaveSettled(p: Provider, accepted: bool, voice: bool): bool = p.work == Saving
pure def saveSettled(p: Provider, accepted: bool, voice: bool): Provider =
  if (accepted) { ...p, work: ProviderIdle, known: true, route: OwnRoute, textKey: true, voiceKey: p.voiceKey or voice,
    revision: p.revision + 1, saves: p.saves + 1 }
  else { ...p, work: ProviderIdle, fault: KeyNotAccepted }
pure def stepAKeyIsAddedOnlyByTheHost(before: Provider, via: str, after: Provider): bool =
  ((after.textKey and not(before.textKey)) or (after.voiceKey and not(before.voiceKey))) implies (via == "saveSettled" or via == "readSettled")
pure def sometimesOwnKeysSaved(p: Provider): bool = p.saves >= 1 and p.route == OwnRoute and p.voiceKey
pure def sometimesKeyNotAccepted(p: Provider): bool = p.fault == KeyNotAccepted and not(p.textKey)
```

### Switching keeps both keys, needs a saved text key for own keys and a sign-in for Cloud

Choosing Cloud while signed out opens sign-in and changes nothing; choosing own keys with no saved
text key asks for one.

```quint
pure val expectedValues = Set(1, 2)
pure def canChooseRoute(p: Provider, route: Route, expected: int): bool =
  idle(p) and p.known and route != p.route and expected == p.revision
pure def chooseRoute(p: Provider, route: Route, expected: int): ProviderStep =
  if (route == OwnRoute and not(p.textKey)) { state: { ...p, fault: NeedsTextKey }, out: List() }
  else if (route == CloudRoute and not(p.signedIn)) { state: p, out: List(OpenSignIn) }
  else { state: { ...p, work: Choosing, target: route, fault: NoProviderFault, review: NoReview }, out: List(SelectRoute) }
pure def canRouteSettled(p: Provider, result: ChangeOutcome): bool = p.work == Choosing
pure def routeSettled(p: Provider, result: ChangeOutcome): ProviderStep =
  if (result == ChangeConfirmed) { state: { ...p, work: ProviderIdle, route: p.target, revision: p.revision + 1, switches: p.switches + 1 }, out: List() }
  else if (result == ChangeLost) { state: { ...p, work: Reading, reads: p.reads + 1, lost: p.lost + 1 }, out: List(ReadProvider) }
  else { state: { ...p, work: ProviderIdle, fault: ChangeNotConfirmed }, out: List() }
pure def canSessionSeen(p: Provider, signedIn: bool): bool = signedIn != p.signedIn
pure def sessionSeen(p: Provider, signedIn: bool): Provider = { ...p, signedIn: signedIn }
pure def stepSwitchingKeepsBothKeys(before: Provider, via: str, after: Provider): bool =
  (via == "chooseRoute" or via == "routeSettled") implies (after.textKey == before.textKey and after.voiceKey == before.voiceKey)
pure def stepCloudNeedsASignIn(before: Provider, via: str, after: Provider, out: List[ProviderEffect]): bool =
  (out.includes(SelectRoute) and after.target == CloudRoute) implies before.signedIn
pure def sometimesBackOnCloudWithKeysKept(p: Provider): bool = p.switches >= 2 and p.route == CloudRoute and p.textKey
```

### A change whose answer was lost is read back once, never sent again

```quint
pure def stepAChangeIsSentOnlyByItsRequest(before: Provider, via: str, after: Provider, out: List[ProviderEffect]): bool =
  (out.includes(SelectRoute) implies via == "chooseRoute") and (out.includes(RemoveKey) implies via == "confirmRemove")
    and (out.includes(SaveKeys) implies via == "save")
pure def sometimesLostChangeReadBack(p: Provider): bool = p.lost >= 1 and idle(p) and p.known
```

### A key is removed only after its own review, and shown only in the host's secure dialog

The text key in use cannot be removed: switch to Cloud first.

```quint
pure def saved(p: Provider, key: KeyName): bool = if (key == TextKey) p.textKey else p.voiceKey
pure def reviewedKey(r: Review): KeyName = match r { | Reviewing(x) => x.reviewed | NoReview => TextKey }
pure def canAskRemove(p: Provider, key: KeyName): bool =
  idle(p) and p.known and p.review == NoReview and saved(p, key) and not(key == TextKey and p.route == OwnRoute)
pure def askRemove(p: Provider, key: KeyName): Provider = { ...p, review: Reviewing({ reviewed: key }), fault: NoProviderFault }
pure def canCancelRemove(p: Provider): bool = p.review != NoReview
pure def cancelRemove(p: Provider): Provider = { ...p, review: NoReview }
pure def canConfirmRemove(p: Provider, expected: int): bool = idle(p) and p.review != NoReview and expected == p.revision
pure def confirmRemove(p: Provider, expected: int): ProviderStep =
  { state: { ...p, work: Removing, removing: reviewedKey(p.review), review: NoReview, fault: NoProviderFault }, out: List(RemoveKey) }
pure def canRemoveSettled(p: Provider, result: ChangeOutcome): bool = p.work == Removing
pure def removeSettled(p: Provider, result: ChangeOutcome): ProviderStep =
  if (result == ChangeConfirmed)
    { state: { ...p, work: ProviderIdle, textKey: p.textKey and p.removing != TextKey, voiceKey: p.voiceKey and p.removing != VoiceKey,
        revision: p.revision + 1, removals: p.removals + 1 }, out: List() }
  else if (result == ChangeLost) { state: { ...p, work: Reading, reads: p.reads + 1, lost: p.lost + 1 }, out: List(ReadProvider) }
  else { state: { ...p, work: ProviderIdle, fault: ChangeNotConfirmed }, out: List() }
pure def canReveal(p: Provider, key: KeyName): bool = idle(p) and p.known and saved(p, key)
pure def reveal(p: Provider, key: KeyName): ProviderStep = { state: { ...p, work: Revealing }, out: List(RevealKey) }
pure def canRevealEnds(p: Provider): bool = p.work == Revealing
pure def revealEnds(p: Provider): Provider = { ...p, work: ProviderIdle }
pure def alwaysAReviewNamesASavedKey(p: Provider): bool = p.review != NoReview implies saved(p, reviewedKey(p.review))
pure def stepAKeyIsRemovedOnlyAfterItsReview(before: Provider, via: str, after: Provider, out: List[ProviderEffect]): bool =
  out.includes(RemoveKey) implies before.review != NoReview
pure def alwaysTheTextKeyInUseIsNeverRemoved(p: Provider): bool =
  ((p.review != NoReview and reviewedKey(p.review) == TextKey) or (p.work == Removing and p.removing == TextKey)) implies p.route == CloudRoute
pure def alwaysOneChangeAtATime(p: Provider): bool = (p.review != NoReview) implies (p.work == ProviderIdle or p.work == Reading or p.work == Revealing)
pure def sometimesVoiceKeyRemoved(p: Provider): bool = p.removals >= 1 and not(p.voiceKey) and p.textKey
```
