# Keyboard dictation

Alpha's auxiliary voice input method, opened from the stock keyboard's microphone in any app's
text field: a framework overlay makes it the default voice input while the normal keyboard stays
selected, and the owner may opt out. It records, sends the clip once to the selected network
provider and inserts the words into the field it started in. It is native (`AlphaKeyboardDictationService`
with `KeyboardDictationCloud` and `KeyboardDictationPolicy`); the renderer has no part in it, and
this spec states what it must do.

## Domain

### A keyboard dictation holds its phase, its capture ticket, its provider route and what it inserted and requested

```quint
type ImePhase = ImeClosed | ImeReady | ImeRecording | ImeTranscribing
type ImeRoute = ImeCloud | ImeDirect
type ImeEnd = NoEnd | ImeInserted | ImeRefused | ImeTimedOut | ImeCancelled
type KeyboardDictation = { phase: ImePhase, ticket: int, route: ImeRoute, field: int, account: int, provider: int,
  inserted: int, requests: int, captures: int, last: ImeEnd }
pure val initial: KeyboardDictation = { phase: ImeClosed, ticket: 0, route: ImeCloud, field: 0, account: 0, provider: 0,
  inserted: 0, requests: 0, captures: 0, last: NoEnd }
pure val ticketValues = Set(1, 2, 3)
pure val fieldValues = Set(1, 2)
pure val accountValues = Set(1, 2)
pure val providerValues = Set(1, 2)
```

## Story: Dictate into any text field

> As the owner typing in another app, I want to tap the keyboard's microphone, speak and tap Stop,
> and find my words in that field and nowhere else, so that dictation works everywhere and never
> sends anything.

### Start is explicit, discloses the upload, and is refused in a password or no-learning field

The panel says "Uses your selected Alpha voice provider… Stop inserts text; it never sends it."

```quint
pure def canOpenPanel(k: KeyboardDictation, route: ImeRoute): bool = k.phase == ImeClosed
pure def openPanel(k: KeyboardDictation, route: ImeRoute): KeyboardDictation = { ...k, phase: ImeReady, ticket: k.ticket + 1, route: route, last: NoEnd }
pure def canStartCapture(k: KeyboardDictation, field: int, account: int, provider: int, secretField: bool): bool =
  k.phase == ImeReady and not(secretField) and field >= 1 and account >= 1 and provider >= 1
pure def startCapture(k: KeyboardDictation, field: int, account: int, provider: int, secretField: bool): KeyboardDictation =
  { ...k, phase: ImeRecording, ticket: k.ticket + 1, field: field, account: account, provider: provider, captures: k.captures + 1 }
pure def canStopCapture(k: KeyboardDictation, ticket: int): bool = k.phase == ImeRecording and ticket == k.ticket
pure def stopCapture(k: KeyboardDictation, ticket: int): KeyboardDictation = { ...k, phase: ImeTranscribing, requests: k.requests + 1 }
pure def alwaysOneRequestPerCapture(k: KeyboardDictation): bool =
  k.requests <= k.captures and k.requests >= k.captures - 1 and (k.phase == ImeRecording implies k.requests == k.captures - 1)
```

### The words are inserted once, into the unchanged field, under the unchanged account and provider

Any change of field, account or provider while recording or transcribing refuses the result; so
does a reply that is not a success, not valid text, or, over Cloud, not marked as Cartesia's
(`X-Eliza-STT-Provider`). The direct route never falls back to Cloud. Either way the audio is wiped
and the connection closed.

```quint
pure def canFinish(k: KeyboardDictation, ticket: int, field: int, account: int, provider: int, httpOk: bool, validText: bool, providerHeader: bool): bool =
  k.phase == ImeTranscribing and ticket == k.ticket
pure def finish(k: KeyboardDictation, ticket: int, field: int, account: int, provider: int, httpOk: bool, validText: bool, providerHeader: bool): KeyboardDictation = {
  val accepted = httpOk and validText and (k.route == ImeDirect or providerHeader) and field == k.field and account == k.account and provider == k.provider
  { ...k, phase: ImeClosed, ticket: k.ticket + 1, inserted: k.inserted + (if (accepted) 1 else 0), last: if (accepted) ImeInserted else ImeRefused }
}
pure def alwaysAtMostOneInsertPerCapture(k: KeyboardDictation): bool = k.inserted >= 0 and k.inserted <= k.requests
pure def stepTheRouteNeverChangesMidCapture(before: KeyboardDictation, after: KeyboardDictation): bool =
  (before.phase == ImeRecording or before.phase == ImeTranscribing) implies after.route == before.route
pure def sometimesInserted(k: KeyboardDictation): bool = k.last == ImeInserted
pure def sometimesRefusedAfterAFieldChange(k: KeyboardDictation): bool = k.last == ImeRefused and k.requests >= 1
```

### A dictation that has not answered in 90 seconds times out, and Cancel ends it at once

The upload connects within 20 s and reads within 60 s; a reply over 256 KiB or a transcript over
16,384 characters is refused. A field or authority change is noticed within 250 ms.

```quint
pure val transcribeDeadlineMs = 90000
pure val connectTimeoutMs = 20000
pure val readTimeoutMs = 60000
pure val maxReplyBytes = 262144
pure val maxTranscriptChars = 16384
pure val monitorEveryMs = 250
pure def canTimedOut(k: KeyboardDictation, ticket: int): bool = k.phase == ImeTranscribing and ticket == k.ticket
pure def timedOut(k: KeyboardDictation, ticket: int): KeyboardDictation = { ...k, phase: ImeClosed, ticket: k.ticket + 1, last: ImeTimedOut }
pure def canCancel(k: KeyboardDictation): bool = k.phase != ImeClosed
pure def cancel(k: KeyboardDictation): KeyboardDictation =
  { ...k, phase: ImeClosed, ticket: k.ticket + 1, last: ImeCancelled }
pure def sometimesTimedOut(k: KeyboardDictation): bool = k.last == ImeTimedOut
```

### A reopened panel needs a fresh Start

```quint
pure def stepAReopenedPanelIsReady(before: KeyboardDictation, via: str, after: KeyboardDictation): bool =
  via == "openPanel" implies after.phase == ImeReady
```
