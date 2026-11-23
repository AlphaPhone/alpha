# Read aloud and Ask about page

Read aloud speaks one bounded excerpt of the page the owner is looking at; Ask about page puts an
excerpt the owner reviewed into the assistant's question editor. On Android the excerpt comes only
from the native host's isolated reading world of the shown HTTPS page (`reviewReading`,
`reviewQuestion`), which classifies credentials and codes, holds the lease and spends one speech
token bound to the voice route the request named; a WebView without isolated worlds offers no
reading at all. On the browser build the page is a sandboxed frame, so the owner reviews the public
page text, or pastes text, and it is spoken locally. The shell reads the page, the speech binding
and whether text looks sensitive; the 5,000-unit bound and the sensitive-text test are the shared
page-reading rules of `@elizaos/os/browser`.

## Story: Read only the page I am looking at

> As the owner, I want Read aloud to read the page I see, to stop the moment I leave it, and never
> to read a page that may hold my passwords or codes.

### A reading is bound to the shown page it was asked for, and the device's support is asked once

Only a definite answer about isolated reading is remembered; a failed query asks again. The browser
build reads a page's public text itself rather than through an isolated world, so it answers
supported at once.

```quint
type ReadPage = { tab: str, url: str, navigation: str, revision: int, shown: bool, settled: bool, secure: bool }
pure val noReadPage: ReadPage = { tab: "", url: "", navigation: "", revision: 0, shown: false, settled: false, secure: false }
type ReadingSupport = SupportUnknown | Supported | Unsupported
type ReadingKind = ReadAloud | AskAboutPage | ReadLocally
type ReadingPhase = NotReading | Preparing | Extracting | Reviewing | Speaking
type Excerpt = NoExcerpt | PageText | UserText | SensitiveText
type Reading = {
  support: ReadingSupport, phase: ReadingPhase, kind: ReadingKind, bound: ReadPage,
  excerpt: Excerpt, text: str, blocked: bool, sourcePending: bool, edited: bool, generation: int, speech: int,
}
pure val initial: Reading = { support: SupportUnknown, phase: NotReading, kind: ReadAloud, bound: noReadPage,
  excerpt: NoExcerpt, text: "", blocked: false, sourcePending: false, edited: false, generation: 0, speech: 0 }
type ReadingProblem = ReadingUnsupported | NoVoice | LoadHttpsToRead | LoadHttpsToAsk | SensitivePage | ReadingFailed | ReadingStopped | SpeechFailed
type ReadingNote = { problem: ReadingProblem }
type Utterance = { generation: int }
type ReadingEffect = QuerySupport | RequestReading(ReadPage) | SpendToken(Utterance) | CancelReading | RequestExcerpt(ReadPage)
  | ComposeQuestion(ReadPage) | FetchSource(ReadPage) | SpeakLocally(Utterance) | StopLocalSpeech | Note(ReadingNote)
type ReadingChange = { state: Reading, out: List[ReadingEffect] }
pure def note(problem: ReadingProblem): ReadingEffect = Note({ problem: problem })
pure def samePage(a: ReadPage, b: ReadPage): bool =
  b.shown and b.settled and a.tab == b.tab and a.url == b.url and a.navigation == b.navigation and a.revision == b.revision
pure def ended(bump: int, r: Reading): Reading = { ...r, phase: NotReading, bound: noReadPage, excerpt: NoExcerpt, text: "", blocked: false, sourcePending: false, edited: false, generation: r.generation + bump, speech: 0 }
pure val readyPage: ReadPage = { tab: "t1", url: "https://example.test/", navigation: "1", revision: 1, shown: true, settled: true, secure: true }
pure val pageValues: Set[ReadPage] = List(readyPage, { ...readyPage, revision: 2 }, { ...readyPage, shown: false },
  { ...readyPage, settled: false }, { ...readyPage, secure: false }).foldl(Set(), (acc, x) => acc.union(Set(x)))
pure val generationValues = Set(1, 2, 3)
pure val bodyValues = Set("", "Some page text")
pure def canSupportNeeded(r: Reading): bool = r.support == SupportUnknown
pure def supportNeeded(r: Reading): ReadingChange = { state: r, out: List(QuerySupport) }
pure def canSupportAnswered(r: Reading, available: bool, definite: bool): bool = r.support == SupportUnknown
pure def supportAnswered(r: Reading, available: bool, definite: bool): Reading =
  if (not(definite)) r else { ...r, support: if (available) Supported else Unsupported }
pure def alwaysAReadingIsBoundToAPage(r: Reading): bool = r.phase != NotReading implies r.bound.tab != ""
```

### Read aloud asks the native host for one reading of the shown settled HTTPS page, and speaks only the token it returns, once

Without isolated reading, or without a voice for this agent, nothing is asked for and the owner is
told why. The menu closes first, and the page must still be the one asked about when the native
request goes out. Speech that fails before it ends says so; speech the owner stopped says nothing.
Each spoken token is numbered, so the late end of a stopped reading never ends a newer one.

```quint
pure def canReadAloud(r: Reading, page: ReadPage, voice: bool): bool = r.phase == NotReading
pure def readAloud(r: Reading, page: ReadPage, voice: bool): ReadingChange =
  if (r.support == Unsupported) { state: r, out: List(note(ReadingUnsupported)) }
  else if (not(voice)) { state: r, out: List(note(NoVoice)) }
  else if (not(page.shown and page.settled and page.secure)) { state: r, out: List(note(LoadHttpsToRead)) }
  else { state: { ...r, phase: Preparing, kind: ReadAloud, bound: page }, out: List() }
pure def canReadingPrepared(r: Reading, page: ReadPage): bool = r.phase == Preparing and r.kind == ReadAloud
pure def readingPrepared(r: Reading, page: ReadPage): ReadingChange =
  if (samePage(r.bound, page)) { state: { ...r, phase: Extracting }, out: List(RequestReading(r.bound)) }
  else { state: ended(1, r), out: List(CancelReading) }
pure def canReadingReturned(r: Reading, ok: bool, sensitive: bool): bool = r.phase == Extracting and r.kind == ReadAloud
pure def readingReturned(r: Reading, ok: bool, sensitive: bool): ReadingChange =
  if (ok) { state: { ...r, phase: Speaking, generation: r.generation + 1, speech: r.generation + 1 }, out: List(SpendToken({ generation: r.generation + 1 })) }
  else { state: ended(1, r), out: List(CancelReading, note(if (sensitive) SensitivePage else ReadingFailed)) }
pure def canSpeechEnded(r: Reading, generation: int, ok: bool): bool = generation >= 1
pure def speechEnded(r: Reading, generation: int, ok: bool): ReadingChange =
  if (r.phase == Speaking and r.kind == ReadAloud and generation == r.speech)
    { state: ended(1, r), out: if (ok) List(CancelReading) else List(CancelReading, note(SpeechFailed)) }
  else { state: r, out: List() }
pure def stepATokenIsSpentOnlyForAReturnedReading(before: Reading, via: str, after: Reading, out: List[ReadingEffect]): bool =
  out.every(e => match e { | SpendToken(u) => via == "readingReturned" and before.phase == Extracting and u.generation == after.speech | _ => true })
pure def stepOnlyTheLatestTokenEndsARead(before: Reading, via: str, after: Reading, out: List[ReadingEffect]): bool =
  (via == "speechEnded" and out.length() > 0) implies (before.phase == Speaking and before.kind == ReadAloud and after.phase == NotReading)
pure def alwaysAReadAloudSpeaksItsLatestToken(r: Reading): bool = (r.kind == ReadAloud and r.phase == Speaking) implies (r.speech == r.generation and r.speech >= 1)
pure def sometimesSpeaking(r: Reading): bool = r.phase == Speaking and r.kind == ReadAloud
```

### Stop, leaving the page, a new document of the bound tab, hiding Alpha and the assistant opening end the reading

```quint
pure def canStopReading(r: Reading): bool = r.phase != NotReading
pure def stopReading(r: Reading): ReadingChange =
  { state: ended(1, r), out: if (r.kind == ReadLocally) List(StopLocalSpeech) else List(CancelReading) }
pure def canPageChanged(r: Reading, page: ReadPage): bool = r.phase != NotReading
pure def pageChanged(r: Reading, page: ReadPage): ReadingChange =
  if (samePage(r.bound, page)) { state: r, out: List() }
  else { state: ended(1, r), out: if (r.kind == ReadLocally) List(StopLocalSpeech) else List(CancelReading) }
pure def stepALeftPageIsNeverStillRead(before: Reading, via: str, after: Reading): bool =
  (via == "pageChanged" and after.phase != NotReading) implies after.bound == before.bound
```

### Back closes the excerpt review the owner sees: Ask about page is closed, and a local reading is stopped

Read aloud on the phone has no review; Back then belongs to Browser's layers.

```quint
pure def reviewShown(r: Reading): bool =
  r.kind != ReadAloud and (r.phase == Reviewing or (r.kind == ReadLocally and r.phase == Speaking))
pure def sometimesALocalReviewIsShown(r: Reading): bool = reviewShown(r) and r.kind == ReadLocally
```

## Story: Ask about a page once I approve the excerpt

> As the owner, I want Ask about page to show me the excerpt first, let me paste text when the page
> cannot be read privately, and refuse a page that may hold credentials.

### Ask takes an excerpt of the shown settled HTTPS page, or opens an empty review where the page cannot be read in isolation

A sensitive page never opens a review.

```quint
pure def canAskAboutPage(r: Reading, page: ReadPage): bool = r.phase == NotReading or r.kind == ReadAloud
pure def askAboutPage(r: Reading, page: ReadPage): ReadingChange = {
  val stopped = if (r.phase != NotReading) List(CancelReading) else List()
  if (r.support == Unsupported) { state: ended(1, r), out: stopped.concat(List(note(ReadingUnsupported))) }
  else if (not(page.shown and page.settled and page.secure)) { state: ended(1, r), out: stopped.concat(List(note(LoadHttpsToAsk))) }
  else { state: { ...ended(1, r), phase: Extracting, kind: AskAboutPage, bound: page }, out: stopped.concat(List(RequestExcerpt(page))) }
}
pure def canExcerptReturned(r: Reading, readable: bool, empty: bool, sensitive: bool, page: ReadPage, body: str): bool = r.phase == Extracting and r.kind == AskAboutPage
pure def excerptReturned(r: Reading, readable: bool, empty: bool, sensitive: bool, page: ReadPage, body: str): ReadingChange =
  if (not(samePage(r.bound, page))) { state: ended(1, r), out: List() }
  else if (sensitive) { state: ended(1, r), out: List(note(SensitivePage)) }
  else { state: { ...r, phase: Reviewing, excerpt: if (readable and not(empty)) PageText else NoExcerpt, text: if (readable and not(empty)) body else "" }, out: List() }
```

### The question goes to the editor only with an excerpt or clean pasted text, and only while the same page is shown

```quint
pure def canQuestionEdited(r: Reading, empty: bool, sensitive: bool, body: str): bool = r.phase == Reviewing and r.kind == AskAboutPage
pure def questionEdited(r: Reading, empty: bool, sensitive: bool, body: str): Reading =
  { ...r, edited: true, text: body, excerpt: if (sensitive) SensitiveText else if (empty) NoExcerpt else UserText }
pure def canQuestionApproved(r: Reading, page: ReadPage): bool =
  r.phase == Reviewing and r.kind == AskAboutPage and (r.excerpt == PageText or r.excerpt == UserText)
pure def questionApproved(r: Reading, page: ReadPage): ReadingChange =
  if (samePage(r.bound, page)) { state: ended(1, r), out: List(ComposeQuestion(r.bound)) }
  else { state: ended(1, r), out: List(note(ReadingStopped)) }
pure def canQuestionClosed(r: Reading): bool = r.phase == Reviewing and r.kind == AskAboutPage
pure def questionClosed(r: Reading): Reading = ended(1, r)
pure def stepAQuestionCarriesAReviewedExcerpt(before: Reading, via: str, after: Reading, out: List[ReadingEffect]): bool =
  out.every(e => match e { | ComposeQuestion(p) => before.excerpt == PageText or before.excerpt == UserText | _ => true })
pure def alwaysTheQuestionReviewNeverSpeaks(r: Reading): bool = r.kind == AskAboutPage implies r.phase != Speaking
pure def sometimesAnEmptyReviewWaitsForText(r: Reading): bool = r.phase == Reviewing and r.kind == AskAboutPage and r.excerpt == NoExcerpt
```

## Story: Read a page aloud on the browser build

> As the owner using the browser build, I want to review the page's public text, or paste my own,
> before it is read aloud on this device, and to hear only the reading I last started.

### The review opens on a settled page, fetches its public text once, and a sensitive address or text refuses it for good

Text the owner typed is kept when the page text arrives later. A page that changed while its text
was fetched refuses the review.

```quint
pure def canReadLocally(r: Reading, page: ReadPage, sensitiveAddress: bool): bool = r.phase == NotReading
pure def readLocally(r: Reading, page: ReadPage, sensitiveAddress: bool): ReadingChange =
  if (not(page.shown and page.settled)) { state: r, out: List(note(LoadHttpsToRead)) }
  else { state: { ...r, phase: Reviewing, kind: ReadLocally, bound: page, blocked: sensitiveAddress, sourcePending: true, excerpt: NoExcerpt },
    out: List(FetchSource(page)) }
pure def canSourceSettled(r: Reading, found: bool, blockedText: bool, current: bool, body: str): bool = r.kind == ReadLocally and r.phase != NotReading and r.sourcePending
pure def sourceSettled(r: Reading, found: bool, blockedText: bool, current: bool, body: str): Reading = {
  val filled = found and not(r.edited) and not(r.blocked)
  if (not(current) or blockedText) { ...r, sourcePending: false, blocked: true, excerpt: NoExcerpt, text: "" }
  else { ...r, sourcePending: false, excerpt: if (filled) PageText else r.excerpt, text: if (filled) body else r.text }
}
pure def canLocalTyped(r: Reading, sensitive: bool, empty: bool, body: str): bool = r.kind == ReadLocally and r.phase == Reviewing and not(r.blocked)
pure def localTyped(r: Reading, sensitive: bool, empty: bool, body: str): Reading =
  { ...r, edited: true, text: body, excerpt: if (sensitive) SensitiveText else if (empty) NoExcerpt else UserText }
pure def alwaysABlockedReviewHoldsNoText(r: Reading): bool = r.blocked implies (r.excerpt == NoExcerpt and r.text == "" and r.speech == 0)
```

### Read is offered only after the page text settled, speaks a non-empty clean excerpt of the still-current page, and only the latest speech ends the reading

```quint
pure def canLocalRead(r: Reading, current: bool): bool =
  r.kind == ReadLocally and r.phase == Reviewing and not(r.blocked) and not(r.sourcePending)
pure def localRead(r: Reading, current: bool): ReadingChange =
  if (not(current)) { state: ended(1, r), out: List() }
  else if (r.excerpt == SensitiveText) { state: { ...r, blocked: true, excerpt: NoExcerpt, text: "", edited: true }, out: List(note(SensitivePage)) }
  else if (r.excerpt == NoExcerpt) { state: { ...r, edited: true }, out: List() }
  else { state: { ...r, phase: Speaking, edited: true, generation: r.generation + 1, speech: r.generation + 1 },
    out: List(SpeakLocally({ generation: r.generation + 1 })) }
pure def canLocalSpeechEnded(r: Reading, generation: int, ok: bool): bool = generation >= 1
pure def localSpeechEnded(r: Reading, generation: int, ok: bool): ReadingChange =
  if (r.kind == ReadLocally and r.phase == Speaking and generation == r.speech)
    { state: { ...r, phase: Reviewing, speech: 0, generation: r.generation + 1 }, out: if (ok) List() else List(note(SpeechFailed)) }
  else { state: r, out: List() }
pure def stepOnlyTheLatestSpeechReportsItsFailure(before: Reading, via: str, after: Reading, out: List[ReadingEffect]): bool =
  (via == "localSpeechEnded" and out.length() > 0) implies (before.phase == Speaking and after.phase == Reviewing)
pure def canLocalStopped(r: Reading): bool = r.kind == ReadLocally and r.phase == Speaking
pure def localStopped(r: Reading): ReadingChange = { state: { ...r, phase: Reviewing, speech: 0, generation: r.generation + 1 }, out: List(StopLocalSpeech) }
pure def alwaysLocalSpeechReadsCleanText(r: Reading): bool =
  (r.kind == ReadLocally and r.phase == Speaking) implies (not(r.blocked) and not(r.sourcePending) and (r.excerpt == PageText or r.excerpt == UserText) and r.speech == r.generation)
pure def sometimesReadingTypedText(r: Reading): bool = r.kind == ReadLocally and r.phase == Speaking and r.excerpt == UserText
```
