# Conversation

The voice assistant: once started it listens, sends each finished spoken turn by itself, speaks the
reply and listens again. The turn itself (gaps, the end-of-turn query, echo, barge-in, the heard
report) is the session of `@elizaos/agent/voice`; this spec is what Alpha decides around it: when
voice may start, which route and duplex it uses, what it says when it cannot go on, how it ends,
and that a typed message sent meanwhile is never lost. The shell reports the session's shown phase
and each failure as events.

## Domain

### A conversation holds what it shows, its route and duplex, the speaker, its quiet retries, its notice, its retirement and any screen the agent claimed

```quint
type Route = Device | Cloud | Direct
type Duplex = Interruptible | TakesTurns
type Shown = Off | Starting | Listening | Thinking | Speaking | AwaitingReview | Retrying | Retiring | Failed
type SessionPhase = PhaseStarting | PhaseListening | PhaseThinking | PhaseSpeaking
type Notice = NoNotice | PausedForCall | CallHoldsMicrophone | CannotInterrupt | ReviewInChat | VoicePaused
  | StopUnconfirmed | RestOfReplyUnread
type ScreenClaim = NoClaim | ClaimCommitted | ClaimPinned
type Conversation = { shown: Shown, route: Route, duplex: Duplex, cloudDisclosed: bool, cartesiaDisclosed: bool,
  muted: bool, muteOffered: bool, retries: int, notice: Notice, mediaUnconfirmed: bool, starts: int,
  typedAsked: int, typedSent: int, typedDropped: int, typedWaiting: bool, claim: ScreenClaim, claimsRefused: int, pins: int, kept: int, closedByHide: bool }
pure val initial: Conversation = { shown: Off, route: Device, duplex: TakesTurns, cloudDisclosed: false, cartesiaDisclosed: false,
  muted: false, muteOffered: false, retries: 0, notice: NoNotice, mediaUnconfirmed: false, starts: 0,
  typedAsked: 0, typedSent: 0, typedDropped: 0, typedWaiting: false, claim: NoClaim, claimsRefused: 0, pins: 0, kept: 0, closedByHide: false }
pure def retiredAs(shown: Shown, c: Conversation): Conversation = { ...c, shown: shown, muted: false, claim: NoClaim }
pure def running(s: Shown): bool =
  s == Starting or s == Listening or s == Thinking or s == Speaking or s == Retrying
pure def startable(s: Shown): bool = s == Off or s == Failed
```

## Story: Start talking only when Alpha can listen safely

> As the owner, I want voice to start only when I start it on a phone I am using, and to tell me
> once what network speech receives before it listens, so that my microphone never opens behind my
> back or sends my voice without my knowing.

### Network voice listens only after its recipient was disclosed and the owner started it

The disclosure names Cloud or Cartesia and what it receives (`route.md`, "Network speech receives
my audio, the words used to decide my turn has ended, and the reply text; the phone sends
nothing"); it is acknowledged once for each recipient.

```quint
pure def disclosedFor(c: Conversation, route: Route): bool =
  route == Device or (route == Cloud and c.cloudDisclosed) or (route == Direct and c.cartesiaDisclosed)
pure def canDisclose(c: Conversation, route: Route): bool = route != Device and not(disclosedFor(c, route))
pure def disclose(c: Conversation, route: Route): Conversation =
  if (route == Cloud) { ...c, cloudDisclosed: true } else { ...c, cartesiaDisclosed: true }
pure def alwaysNetworkVoiceWasDisclosed(c: Conversation): bool =
  (running(c.shown) or c.shown == AwaitingReview) implies disclosedFor(c, c.route)
```

### Voice starts only from the owner, on a lit, visible phone with no sensitive screen, no reset and no call

The shell admits a start: an owner bound, the page in front, no sensitive surface, no reset under
way, the screen lit and past boot. A call refuses it with one line and opens nothing. Media that
could not be confirmed stopped keeps voice closed until Alpha restarts.

```quint
pure def duplexOf(echoCancelled: bool, live: bool): Duplex = if (echoCancelled and live) Interruptible else TakesTurns
pure def canStart(c: Conversation, route: Route, echoCancelled: bool, live: bool, muteOffered: bool, admitted: bool, callActive: bool): bool =
  startable(c.shown) and not(c.mediaUnconfirmed) and admitted and not(callActive) and disclosedFor(c, route)
pure def start(c: Conversation, route: Route, echoCancelled: bool, live: bool, muteOffered: bool, admitted: bool, callActive: bool): Conversation = {
  val duplex = duplexOf(echoCancelled, live)
  { ...c, shown: Starting, route: route, duplex: duplex, muted: false, muteOffered: muteOffered, retries: 0, claim: NoClaim, closedByHide: false,
    notice: if (duplex == TakesTurns) CannotInterrupt else NoNotice, starts: c.starts + 1 }
}
pure def canStartRefusedForCall(c: Conversation): bool = startable(c.shown)
pure def startRefusedForCall(c: Conversation): Conversation = { ...c, notice: CallHoldsMicrophone }
pure def stepVoiceStartsOnlyFromTheOwner(before: Conversation, via: str, after: Conversation): bool =
  after.starts != before.starts implies (via == "start" and after.starts == before.starts + 1)
pure def alwaysUnconfirmedMediaKeepsVoiceClosed(c: Conversation): bool = c.mediaUnconfirmed implies startable(c.shown)
pure def sometimesTalking(c: Conversation): bool = c.shown == Speaking and c.route == Cloud
pure def sometimesRefusedForACall(c: Conversation): bool = c.shown == Off and c.notice == CallHoldsMicrophone
```

### A reply can be interrupted only over an echo-cancelled live capture, and Alpha says so once a start when it cannot

Without the platform's echo canceller, or on Cloud batch speech, the microphone stays closed while
the reply plays and Stop speaking ends it.

```quint
pure def lawInterruptibleNeedsEchoCancellationAndALiveCapture(echoCancelled: bool, live: bool): bool =
  duplexOf(echoCancelled, live) == Interruptible iff (echoCancelled and live)
pure def sometimesTakesTurns(c: Conversation): bool = c.shown == Speaking and c.duplex == TakesTurns
```

## Story: Hear my turn end at the right moment

> As the owner, I want my turn to end when I have finished, judged by meaning in Cloud and by a
> long pause everywhere, so that the assistant neither cuts me off nor waits for ever.

### Clef in Cloud judges the end of a turn on the Cloud route; the phone's scorer does elsewhere; a long pause always ends it

Only the Cloud route sends the transcribed words for this; a Cartesia key never makes Clef run.

```quint
type Endpointer = ClefInCloud | PhoneScorer
pure def endpointerOf(route: Route): Endpointer = if (route == Cloud) ClefInCloud else PhoneScorer
pure def lawOnlyCloudReadsWordsToEndATurn(route: Route): bool = (endpointerOf(route) == ClefInCloud) iff (route == Cloud)
```

### An open microphone ends a turn at the first pause and a 400 ms hold interrupts; Cloud streaming waits 400 ms after its final; Stop sends no heard report

An echo-cancelled live capture on the phone segments after 256 ms of silence and sends the turn at
once. Speech held 400 ms takes back a pending turn or interrupts a playing reply; a transcript the
echo gate accepts does either sooner. Cloud streaming keeps capture open 400 ms after the
provider's final. Other captures keep the session's own gaps. Only the owner's Stop keeps the reply
whole in the chat and reports nothing as heard.

```quint
type TimingProfile = { shortGapMs: int, longGapMs: int, bargeInHoldMs: int, heardOnStop: bool }
pure val openMicHangoverMs = 256
pure val openMicProfile: TimingProfile = { shortGapMs: 0, longGapMs: 0, bargeInHoldMs: 400, heardOnStop: false }
pure val cloudStreamProfile: TimingProfile = { shortGapMs: 0, longGapMs: 400, bargeInHoldMs: 400, heardOnStop: false }
pure val sessionProfile: TimingProfile = { shortGapMs: 300, longGapMs: 1200, bargeInHoldMs: 700, heardOnStop: false }
pure def profileOf(route: Route, duplex: Duplex): TimingProfile =
  if (duplex == TakesTurns) sessionProfile else if (route == Device) openMicProfile else cloudStreamProfile
pure def lawStopNeverReportsWhatWasHeard(route: Route, duplex: Duplex): bool = not(profileOf(route, duplex).heardOnStop)
pure def lawEveryProfileIsWithinTheSessionsBounds(route: Route, duplex: Duplex): bool = {
  val p = profileOf(route, duplex)
  p.shortGapMs >= 0 and p.shortGapMs <= p.longGapMs and p.longGapMs <= 10000 and p.bargeInHoldMs >= 0 and p.bargeInHoldMs <= 5000
}
pure def lawAnOpenMicSendsAtTheFirstPause(duplex: Duplex): bool =
  duplex == Interruptible implies (profileOf(Device, duplex).shortGapMs == 0 and profileOf(Device, duplex).longGapMs == 0)
```

### A Cloud stream listens, speaks the replies and the cue and mutes the speaker on one relay session, and only voice retiring ends it

On the Cloud route, where the phone has the Cloud speech relay (`AlphaCloudSpeechStream`), a
conversation opens one session of the os package's shared streaming speech
(`createCloudStreamingSpeech` of `@elizaos/os/bridges/voice`): its capture hears the owner, the
reply and the acknowledgement cue are spoken on it so that its echo cancelling knows Alpha's own
voice, and Mute sets its output gain. The end of a turn mutes and drains the relay's microphone
and keeps the session. Stop, a call, leaving or hiding the screen, review, a failed relay and a
quiet retry end it, and the next start opens a fresh one under the key in force then. A relay that
could not confirm its stop leaves voice closed until Alpha restarts.

```quint
type RelayUse = RelayListens | RelaySpeaks | RelayMutes | RelayTurnEnds | RelayRetires
pure def onTheRelay(route: Route, live: bool): bool = route == Cloud and live
pure def endsTheRelay(use: RelayUse): bool = use == RelayRetires
pure def lawOnlyRetiringEndsTheRelay(use: RelayUse): bool = endsTheRelay(use) iff use == RelayRetires
pure def lawATurnsEndKeepsTheRelay(route: Route, live: bool): bool = onTheRelay(route, live) implies not(endsTheRelay(RelayTurnEnds))
pure def lawOnlyCloudSpeechUsesTheRelay(route: Route, live: bool): bool = onTheRelay(route, live) implies route == Cloud
pure def lawTheRelayIsInterruptible(route: Route, live: bool): bool = onTheRelay(route, live) implies duplexOf(true, live) == Interruptible
```

### What the conversation shows follows the session while it runs, and speaking clears the quiet retries

```quint
pure def shownOf(p: SessionPhase): Shown =
  if (p == PhaseStarting) Starting else if (p == PhaseListening) Listening else if (p == PhaseThinking) Thinking else Speaking
pure def canObserved(c: Conversation, phase: SessionPhase): bool = running(c.shown)
pure def observed(c: Conversation, phase: SessionPhase): Conversation =
  { ...c, shown: shownOf(phase), retries: if (phase == PhaseSpeaking) 0 else c.retries,
    notice: if (c.notice == CannotInterrupt or c.notice == RestOfReplyUnread) c.notice else NoNotice }
```

### Streamed text is spoken early only from confirmed frames of a reply proven direct

A provisional or unlabelled frame ends early speech for that turn; the confirmed reply then skips
only the sentences already spoken exactly.

```quint
type Frame = ConfirmedFrame | ProvisionalFrame | UnlabelledFrame
pure def speaksEarly(frame: Frame, provenDirect: bool): bool = frame == ConfirmedFrame and provenDirect
pure def lawOnlyConfirmedDirectFramesSpeakEarly(frame: Frame, provenDirect: bool): bool =
  speaksEarly(frame, provenDirect) implies (frame == ConfirmedFrame and provenDirect)
```

### A reply that stops partway stays whole in the chat and says the rest was not read

```quint
pure def canReplyBroke(c: Conversation): bool = c.shown == Speaking
pure def replyBroke(c: Conversation): Conversation = { ...c, shown: Listening, notice: RestOfReplyUnread }
```

## Story: Keep voice going through a passing failure

> As a Cloud member, I want voice to try again quietly when Cloud is briefly busy, and to pause
> without alarm when it stays busy, so that a short outage does not end my conversation.

### A busy Cloud is retried quietly at most twice in a row; a long wait pauses voice; own keys and other failures are shown

Busy is a 503 or a rate-limited 429; a long wait is more than 30 seconds. A retry starts afresh
only if its chat is still current.

```quint
pure val maxQuietRetries = 2
pure def canSessionFailed(c: Conversation, transient: bool, longWait: bool): bool = running(c.shown)
pure def sessionFailed(c: Conversation, transient: bool, longWait: bool): Conversation =
  if (c.route == Direct or not(transient)) { ...retiredAs(Failed, c), notice: NoNotice }
  else if (c.retries >= maxQuietRetries or longWait) { ...retiredAs(Off, c), notice: VoicePaused, retries: 0 }
  else { ...c, shown: Retrying, retries: c.retries + 1, claim: NoClaim }
pure def canRetryWaited(c: Conversation, chatCurrent: bool): bool = c.shown == Retrying
pure def retryWaited(c: Conversation, chatCurrent: bool): Conversation =
  if (chatCurrent) { ...c, shown: Starting, claim: NoClaim } else { ...retiredAs(Off, c), retries: 0 }
pure def alwaysAtMostTwoQuietRetries(c: Conversation): bool =
  c.retries >= 0 and c.retries <= maxQuietRetries and (c.shown == Retrying implies c.retries >= 1)
pure def alwaysOwnKeyVoiceIsNeverRetriedQuietly(c: Conversation): bool = c.shown == Retrying implies c.route != Direct
pure def sometimesQuietlyRetried(c: Conversation): bool = c.shown == Retrying and c.retries == 2
pure def sometimesPausedQuietly(c: Conversation): bool = c.notice == VoicePaused and c.starts >= 1
```

## Story: Review what voice is about to do

> As the owner, I want a spoken request that needs my approval, such as a call or a text, to stop
> with the microphone off and wait in the chat, so that voice never acts for me unseen.

### A reply that needs review stops voice with the microphone off and says it waits in the chat

Nothing streamed before it is spoken.

```quint
pure def canReviewNeeded(c: Conversation): bool = c.shown == Thinking or c.shown == Speaking
pure def reviewNeeded(c: Conversation): Conversation = { ...c, shown: AwaitingReview, notice: ReviewInChat, claim: NoClaim }
pure def canReviewSettled(c: Conversation): bool = c.shown == AwaitingReview
pure def reviewSettled(c: Conversation): Conversation = retiredAs(Retiring, c)
pure def sometimesWaitingForReview(c: Conversation): bool = c.shown == AwaitingReview
```

## Story: Mute the speaker without ending voice

> As the owner, I want to silence Alpha's voice and turn it back on in the same conversation, so
> that I can keep listening to the text without stopping.

### Mute changes only the output, is offered only where the phone can mute speech, and ends with the conversation

```quint
pure def canMuteSpeaker(c: Conversation, muted: bool): bool = c.muteOffered and running(c.shown) and muted != c.muted
pure def muteSpeaker(c: Conversation, muted: bool): Conversation = { ...c, muted: muted }
pure def alwaysMutingNeedsItsControl(c: Conversation): bool = c.muted implies (c.muteOffered and (running(c.shown) or c.shown == AwaitingReview))
```

## Story: End voice cleanly, and never lose what I type

> As the owner, I want Stop, a call, leaving the screen or signing out to end voice and its audio,
> and a message I type meanwhile to go out once voice has stopped, so that nothing keeps listening
> and nothing I wrote is dropped.

### Stop, a call, a hidden or sensitive screen, sign-out and reset retire voice; a call says so once

Retiring holds the panel until the media's stop is confirmed. A conversation with no media closes
at once. A capture the phone ended for a call retires voice as the call does, one it ended because
Alpha left the front is a hidden page, and one it cancelled is a stop; none is shown as a failure. A screen change made inside the agent's own claim is not a departure; the claim's
settlement decides it.

```quint
pure def active(s: Shown): bool = running(s) or s == AwaitingReview
pure def canStop(c: Conversation, media: bool): bool = active(c.shown) or c.shown == Failed
pure def stop(c: Conversation, media: bool): Conversation =
  if (media) retiredAs(Retiring, c) else { ...retiredAs(Off, c), retries: 0 }
pure def canCallStarted(c: Conversation): bool = active(c.shown)
pure def callStarted(c: Conversation): Conversation = { ...retiredAs(Retiring, c), notice: PausedForCall }
pure def canLeft(c: Conversation): bool = active(c.shown) and c.claim == NoClaim
pure def left(c: Conversation): Conversation = retiredAs(Retiring, c)
pure def sometimesPausedForACall(c: Conversation): bool = c.shown == Off and c.notice == PausedForCall
```

### Voice closed by hiding the page says once, when the page returns, that a call paused it if a call was live then or since; a plain app switch says nothing

On the Alpha image the call screen is its own activity, so a call hides Alpha before Telecom's
reading arrives; the hidden page's capture loss is never shown as a voice failure.

```quint
pure def canHidden(c: Conversation): bool = active(c.shown) and c.claim == NoClaim
pure def hidden(c: Conversation): Conversation = { ...retiredAs(Retiring, c), closedByHide: true }
pure def canReturned(c: Conversation, callSeen: bool): bool = c.closedByHide
pure def returned(c: Conversation, callSeen: bool): Conversation =
  { ...c, closedByHide: false, notice: if (callSeen) PausedForCall else c.notice }
pure def stepAReturnTellsOfACallOnlyOnce(before: Conversation, via: str, after: Conversation): bool =
  via == "returned" implies (before.closedByHide and not(after.closedByHide))
pure def sometimesToldOfACallOnReturn(c: Conversation): bool = c.notice == PausedForCall and not(c.closedByHide) and c.shown == Off and c.starts >= 1
```

### A message typed while voice retires waits for the stop and goes out once, unless its chat changed

A message typed while voice runs retires voice first. Media that could not be confirmed stopped
keeps voice closed, never the message.

```quint
pure def canTypedSend(c: Conversation): bool = not(c.typedWaiting)
pure def typedSend(c: Conversation): Conversation =
  if (c.shown == Retiring or active(c.shown)) { ...retiredAs(Retiring, c), typedAsked: c.typedAsked + 1, typedWaiting: true }
  else { ...c, typedAsked: c.typedAsked + 1, typedSent: c.typedSent + 1 }
pure def canCleanupSettled(c: Conversation, confirmed: bool, sendCurrent: bool): bool = c.shown == Retiring
pure def cleanupSettled(c: Conversation, confirmed: bool, sendCurrent: bool): Conversation = {
  val sent = c.typedWaiting and sendCurrent
  val dropped = c.typedWaiting and not(sendCurrent)
  { ...c, shown: Off, retries: 0, mediaUnconfirmed: c.mediaUnconfirmed or not(confirmed),
    notice: if (confirmed) c.notice else StopUnconfirmed, typedWaiting: false,
    typedSent: c.typedSent + (if (sent) 1 else 0), typedDropped: c.typedDropped + (if (dropped) 1 else 0) }
}
pure def alwaysATypedMessageIsNeverLost(c: Conversation): bool =
  c.typedAsked == c.typedSent + c.typedDropped + (if (c.typedWaiting) 1 else 0) and (c.typedWaiting implies c.shown == Retiring)
pure def sometimesSentAfterVoiceStopped(c: Conversation): bool = c.typedSent >= 1 and c.shown == Off and c.starts >= 1
pure def sometimesStopUnconfirmed(c: Conversation): bool = c.mediaUnconfirmed and c.notice == StopUnconfirmed
```

## Story: Keep talking on a screen the agent opens for me

> As the owner talking to Alpha, I want voice to stay on when the assistant itself opens the screen
> I asked for, and to stop when I go somewhere myself or the screen is not the one it said, so that
> voice follows my request and never listens on a screen I did not expect.

### Voice stays on through a screen change only when the agent claimed it, the screen pinned its context and the change was delivered with exactly that context

A turn claims one destination while voice runs and its chat is current; a second claim, or one
from a chat that is no longer current, is refused and leaves the first alone. The screen pins its
context when it commits. Voice continues there only when the change was delivered, pinned and is
still exactly what is shown; an undelivered, unpinned or changed screen retires voice. Any
navigation by the owner, or by anything but the claim, retires voice as leaving does.

```quint
pure def canClaimScreen(c: Conversation, chatCurrent: bool): bool = running(c.shown)
pure def claimScreen(c: Conversation, chatCurrent: bool): Conversation =
  if (c.claim != NoClaim or not(chatCurrent)) { ...c, claimsRefused: c.claimsRefused + 1 } else { ...c, claim: ClaimCommitted }
pure def canScreenPinned(c: Conversation): bool = c.claim == ClaimCommitted
pure def screenPinned(c: Conversation): Conversation = { ...c, claim: ClaimPinned, pins: c.pins + 1 }
pure def canScreenSettled(c: Conversation, delivered: bool, contextCurrent: bool): bool = c.claim != NoClaim
pure def screenSettled(c: Conversation, delivered: bool, contextCurrent: bool): Conversation =
  if (delivered and contextCurrent and c.claim == ClaimPinned) { ...c, claim: NoClaim, kept: c.kept + 1 }
  else retiredAs(Retiring, c)
pure def alwaysAClaimNeedsRunningVoice(c: Conversation): bool = c.claim != NoClaim implies running(c.shown)
pure def alwaysAKeptScreenWasPinned(c: Conversation): bool = c.kept >= 0 and c.kept <= c.pins
pure def stepOnlyAPinnedDeliveredScreenKeepsVoice(before: Conversation, via: str, after: Conversation): bool =
  (via == "screenSettled" and running(after.shown)) implies (before.claim == ClaimPinned and after.kept == before.kept + 1)
pure def sometimesKeptOnTheAgentsScreen(c: Conversation): bool = c.kept >= 1 and running(c.shown)
pure def sometimesAnUnconfirmedScreenRetiredVoice(c: Conversation): bool = c.shown == Retiring and c.pins >= 1 and c.kept == 0
pure def sometimesASecondClaimRefused(c: Conversation): bool = c.claimsRefused >= 1 and c.claim == ClaimPinned
```
