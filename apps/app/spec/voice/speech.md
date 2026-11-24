# Speech output

Everything Alpha says aloud goes through one of four channels: conversation replies, readings
(a note or a reply the owner asked to hear), app speech (Maps steps, workflow results) and Cloud
read-aloud. Each channel plays one passage at a time and must confirm the native speaker stopped
before the next starts. The native output path, its focus, warm-up worker and lead trim are the os
package's (`spec/os/voice/speechOutput.md`); this spec is what the renderer asks of them, what it
refuses to say, and what it does when a stop is not confirmed.

## Domain

### Each channel holds its stage and whether a successor waits behind its cleanup

```quint
type Channel = Replies | Reading | AppSpeech | CloudReading
type ChainStage = Idle | Playing | Retiring | Recovering | Latched
type Chain = { stage: ChainStage, waiting: bool }
type SpeechChains = { replies: Chain, reading: Chain, app: Chain, cloud: Chain, refusals: int, restartShown: bool,
  successions: int, warmConnection: int, warmedAt: int, now: int }
pure val idle: Chain = { stage: Idle, waiting: false }
pure val initial: SpeechChains = { replies: idle, reading: idle, app: idle, cloud: idle, refusals: 0, restartShown: false,
  successions: 0, warmConnection: 0, warmedAt: 0, now: 0 }
pure def chainOf(s: SpeechChains, ch: Channel): Chain =
  if (ch == Replies) s.replies else if (ch == Reading) s.reading else if (ch == AppSpeech) s.app else s.cloud
pure def withChain(ch: Channel, c: Chain, s: SpeechChains): SpeechChains =
  if (ch == Replies) { ...s, replies: c } else if (ch == Reading) { ...s, reading: c } else if (ch == AppSpeech) { ...s, app: c } else { ...s, cloud: c }
pure def recoverable(ch: Channel): bool = ch == AppSpeech or ch == CloudReading
```

## Story: Never hear two things at once, or anything after I stopped it

> As the owner, I want each new passage to wait until the last one has really stopped, and Alpha to
> tell me to restart it when speech cannot be stopped, so that nothing talks over itself or keeps
> talking after I asked it not to.

### A new passage waits behind the cleanup of the one before it

Asking to speak while a passage plays retires it; the new one starts once its stop is confirmed.

```quint
pure def canSpeak(s: SpeechChains, ch: Channel): bool = {
  val c = chainOf(s, ch)
  not(c.waiting) and c.stage != Recovering
}
pure def speak(s: SpeechChains, ch: Channel): SpeechChains = {
  val c = chainOf(s, ch)
  if (c.stage == Idle) withChain(ch, { stage: Playing, waiting: false }, s)
  else if (c.stage == Playing or c.stage == Retiring) withChain(ch, { stage: Retiring, waiting: true }, s)
  else if (recoverable(ch)) withChain(ch, { stage: Recovering, waiting: false }, s)
  else { ...s, refusals: s.refusals + 1, restartShown: true }
}
pure def canFinished(s: SpeechChains, ch: Channel): bool = chainOf(s, ch).stage == Playing
pure def finished(s: SpeechChains, ch: Channel): SpeechChains = withChain(ch, { stage: Retiring, waiting: false }, s)
pure def alwaysASuccessorWaitsOnlyBehindCleanup(s: SpeechChains): bool =
  (s.replies.waiting implies s.replies.stage == Retiring) and (s.reading.waiting implies s.reading.stage == Retiring)
  and (s.app.waiting implies s.app.stage == Retiring) and (s.cloud.waiting implies s.cloud.stage == Retiring)
pure def sometimesASuccessorStartedAfterCleanup(s: SpeechChains): bool = s.replies.stage == Playing and s.successions >= 1
```

### An unconfirmed stop latches the channel; app speech and Cloud reading get one native stop to reopen it

Replies and readings stay latched until Alpha restarts, and each refused passage shows
"Speech could not be stopped. Restart Alpha."

```quint
pure def canCleanupSettled(s: SpeechChains, ch: Channel, confirmed: bool): bool = chainOf(s, ch).stage == Retiring
pure def cleanupSettled(s: SpeechChains, ch: Channel, confirmed: bool): SpeechChains = {
  val c = chainOf(s, ch)
  if (confirmed) withChain(ch, { stage: if (c.waiting) Playing else Idle, waiting: false }, { ...s, successions: s.successions + (if (c.waiting) 1 else 0) })
  else if (c.waiting and recoverable(ch)) withChain(ch, { stage: Recovering, waiting: false }, s)
  else withChain(ch, { stage: Latched, waiting: false }, { ...s, restartShown: s.restartShown or not(recoverable(ch)) })
}
pure def canRecoverySettled(s: SpeechChains, ch: Channel, confirmed: bool): bool = chainOf(s, ch).stage == Recovering
pure def recoverySettled(s: SpeechChains, ch: Channel, confirmed: bool): SpeechChains =
  if (confirmed) withChain(ch, { stage: Playing, waiting: false }, s)
  else withChain(ch, { stage: Latched, waiting: false }, { ...s, restartShown: true })
pure def stepRepliesAndReadingsStayLatched(before: SpeechChains, after: SpeechChains): bool =
  (before.replies.stage == Latched implies after.replies.stage == Latched) and (before.reading.stage == Latched implies after.reading.stage == Latched)
pure def alwaysARefusalShowsRestart(s: SpeechChains): bool =
  s.refusals >= 0 and (s.refusals >= 1 implies s.restartShown)
  and ((s.replies.stage == Latched or s.reading.stage == Latched) implies s.restartShown)
pure def sometimesRecovered(s: SpeechChains): bool = s.app.stage == Playing and s.restartShown
pure def sometimesReadingRefused(s: SpeechChains): bool = s.reading.stage == Latched and s.refusals >= 1
```

### A reading the owner starts first retires a running voice conversation and waits for its replies to stop

A message read aloud from the chat ends the conversation that is talking, and starts only once the
reply channel is idle; it never plays over a reply.

```quint
pure def readingMayStart(conversationActive: bool, repliesStage: ChainStage): bool = not(conversationActive) and repliesStage == Idle
pure def lawAReadingNeverPlaysOverAReply(conversationActive: bool, repliesStage: ChainStage): bool =
  readingMayStart(conversationActive, repliesStage) implies (repliesStage != Playing and repliesStage != Retiring and not(conversationActive))
```

### Voice enters only when its replies are not latched, not still retiring, and no recording is open

```quint
type VoiceEntry = EntryAllowed | MediaNotStopped | FinishOrDiscard
pure def voiceEntry(s: SpeechChains, recorderOpen: bool): VoiceEntry =
  if (s.replies.stage == Latched) MediaNotStopped
  else if (s.replies.stage == Retiring or s.replies.stage == Recovering or recorderOpen) FinishOrDiscard
  else EntryAllowed
pure val sValues = Set(initial, { ...initial, replies: { stage: Latched, waiting: false }, restartShown: true },
  { ...initial, replies: { stage: Retiring, waiting: false } })
pure def lawALatchedReplyChannelRefusesVoice(s: SpeechChains, recorderOpen: bool): bool =
  s.replies.stage == Latched implies voiceEntry(s, recorderOpen) == MediaNotStopped
```

## Story: Hear the reply start at once

> As the owner, I want the first words of a reply to play as soon as they exist, so that talking to
> Alpha feels immediate.

### A sent turn warms the phone's output, and Cloud is warmed at most once a minute for each connection

The phone's warm-up is advisory and its failure is ignored. Cloud is warmed when Alpha comes to the
front, the sheet opens, Talk is pressed or a connection becomes active.

```quint
pure val cloudWarmEveryMs = 60000
pure def canWarmCloud(s: SpeechChains, connection: int, now: int): bool =
  connection >= 1 and now >= s.now and (connection != s.warmConnection or now - s.warmedAt >= cloudWarmEveryMs)
pure def warmCloud(s: SpeechChains, connection: int, now: int): SpeechChains = { ...s, warmConnection: connection, warmedAt: now, now: now }
pure val connectionValues = Set(1, 2)
pure val nowValues = Set(0, 30000, 60000, 120000)
pure def stepCloudIsWarmedAtMostOnceAMinutePerConnection(before: SpeechChains, via: str, after: SpeechChains): bool =
  (via == "warmCloud" and before.warmConnection == after.warmConnection and before.warmConnection >= 1)
    implies after.warmedAt - before.warmedAt >= cloudWarmEveryMs
pure def alwaysTheWarmClockIsCurrent(s: SpeechChains): bool = s.warmedAt <= s.now and s.warmedAt >= 0
pure def sometimesWarmedTwice(s: SpeechChains): bool = s.warmedAt >= cloudWarmEveryMs
```

### Each finished sentence is spoken while the rest is generated, in order, and streamed audio is never kept

The first passage is sentence-sized, a boundary at least 20 characters in, and none is longer than
300 characters.

```quint
pure val firstBoundaryChars = 20
pure val passageChars = 300
pure def passageFits(chars: int): bool = chars >= 1 and chars <= passageChars
pure def lawAPassageIsBounded(chars: int): bool = passageFits(chars) implies chars <= 300
```

## Story: Never have a secret read aloud

> As the owner, I want Alpha to refuse to say a password, key or card number, and a reading to
> refuse what it cannot say well, so that nothing private is spoken and nothing is garbled.

### A spoken reply refuses only a likely password, key or card; everything else it cannot say becomes a pause

A reply with nothing left to say is silent, not an error.

```quint
type Screened = SpeakIt | RefusedSecret | NothingToSay | RefusedLink | RefusedCharacters | RefusedLength
pure def screenReply(likelySecret: bool, sayableChars: int): Screened =
  if (likelySecret) RefusedSecret else if (sayableChars == 0) NothingToSay else SpeakIt
pure def lawOnlyASecretRefusesAReply(likelySecret: bool, sayableChars: int): bool =
  (screenReply(likelySecret, sayableChars) == RefusedSecret) iff likelySecret
```

### A reading also refuses a link or email address, characters it cannot say and more than 16,000 characters

It is screened on every platform before any audio is requested.

```quint
pure val readingMaxChars = 16000
pure def screenReading(likelySecret: bool, linkOrEmail: bool, unsayable: bool, chars: int): Screened =
  if (chars == 0 or chars > readingMaxChars) RefusedLength else if (linkOrEmail) RefusedLink
  else if (likelySecret) RefusedSecret else if (unsayable) RefusedCharacters else SpeakIt
pure val charsValues = Set(0, 12, 16000, 16001)
pure def lawAReadingSpeaksOnlyCleanBoundedText(likelySecret: bool, linkOrEmail: bool, unsayable: bool, chars: int): bool =
  screenReading(likelySecret, linkOrEmail, unsayable, chars) == SpeakIt
    iff (chars >= 1 and chars <= readingMaxChars and not(linkOrEmail or likelySecret or unsayable))
```

### Display dates, clock times, percentages and label colons are spoken as words

Before a passage is split for speech, a named date is said by its weekday, month and ordinal day
("Sun, Nov 22" is "Sunday, November twenty-second"), a clock time or range with A M or P M, noon and
midnight by name, a percent sign as "percent", and a colon after a word as a pause. Every route
speaks the planned pieces, so a bare 24-hour clock is a time wherever it stands. A passage that looks
like it holds a secret is left as it is, so its refusal still sees the label.

```quint
type DisplayText = NamedDate | ClockTime | PercentSign | LabelColon | OtherDisplay
pure def saidAsWords(shown: DisplayText, likelySecret: bool): bool = not(likelySecret) and shown != OtherDisplay
pure def lawASecretKeepsItsLabels(shown: DisplayText): bool = not(saidAsWords(shown, true))
pure def lawEveryDisplayFormIsSaidAsWords(shown: DisplayText): bool = saidAsWords(shown, false) iff shown != OtherDisplay
```

## Story: Hear a short line for an action, and read the details in the chat

> As the owner talking to Alpha, I want a spoken action reply, such as an email it drafted, said in
> one short line while the full written reply stays in the chat, so that I am not read IDs and
> asides I can see.

### An email draft is said as one line, by whether its card was validated or the action failed; other action replies drop IDs and asides unless I asked for them word for word

With a validated card: "Your email draft is ready to review." Without one: "The suggested email is
in the chat." A failed email action: "The email action failed. The suggested wording is in the
chat." Another action reply loses its delimited ID fields and parenthetical asides, and says "The
details are in the chat." when nothing is left. A request for verbatim or literal fields is said in
full. The written reply is never changed.

```quint
type ActionReply = PlainReply | EmailDraft({ validatedCard: bool }) | EmailFailed | OtherAction({ verbatimAsked: bool, sayableLeft: bool })
type SpokenLine = WholeReply | DraftReadyLine | SuggestedEmailLine | EmailFailedLine | StrippedReply | DetailsInChatLine
pure def spokenLineOf(reply: ActionReply): SpokenLine = match reply {
  | PlainReply => WholeReply
  | EmailDraft(e) => if (e.validatedCard) DraftReadyLine else SuggestedEmailLine
  | EmailFailed => EmailFailedLine
  | OtherAction(o) => if (o.verbatimAsked) WholeReply else if (o.sayableLeft) StrippedReply else DetailsInChatLine
}
pure val replyValues = Set(PlainReply, EmailDraft({ validatedCard: true }), EmailDraft({ validatedCard: false }), EmailFailed,
  OtherAction({ verbatimAsked: true, sayableLeft: false }), OtherAction({ verbatimAsked: false, sayableLeft: true }), OtherAction({ verbatimAsked: false, sayableLeft: false }))
pure def lawAVerbatimRequestIsSaidInFull(sayableLeft: bool): bool =
  spokenLineOf(OtherAction({ verbatimAsked: true, sayableLeft: sayableLeft })) == WholeReply
pure def lawAnEmailIsNeverReadOut(validatedCard: bool): bool =
  spokenLineOf(EmailDraft({ validatedCard: validatedCard })) != WholeReply
```

## Story: Keep a page I read and my voicemail on my phone

> As the owner, I want a page I asked to hear read aloud and my voicemail transcribed only by my
> phone's own voice and recognizer, so that neither the page's text nor a caller's audio leaves the
> phone, whatever speech route my account gives.

### A reviewed page, a local reading and voicemail audio use only the phone; replies and turn guidance use the route in use

A reviewed page plays only from the phone's own synthesis of its one-use reading token, and only when
the phone says the audio was made on the device. A reading the owner reviewed on the browser build
is synthesized on the phone. A voicemail window is transcribed only by the on-device recognizer, and
with no recognizer ready no transcript is made. Replies and Maps turn guidance speak on the route in
use, on the phone when a network route fails before audio.

```quint
type SpeechSource = ConversationReply | TurnGuidance | ReviewedPage | LocalReading | VoicemailAudio
type SpeechEngine = PhoneEngine | RouteInUse
pure def engineFor(source: SpeechSource): SpeechEngine =
  if (source == ReviewedPage or source == LocalReading or source == VoicemailAudio) PhoneEngine else RouteInUse
pure val sourceValues = Set(ConversationReply, TurnGuidance, ReviewedPage, LocalReading, VoicemailAudio)
pure def lawPageTextAndVoicemailNeverLeaveThePhone(source: SpeechSource): bool =
  (source == ReviewedPage or source == LocalReading or source == VoicemailAudio) implies engineFor(source) == PhoneEngine
pure def lawRepliesAndGuidanceFollowTheRoute(source: SpeechSource): bool =
  (source == ConversationReply or source == TurnGuidance) implies engineFor(source) == RouteInUse
```
