# Views

The views the agent opens on this phone and the commands it gives inside
them. A turn tells the agent which renderer it may deliver to
(`viewClientId`, `viewDelivery: "completed-action"` and the view in front,
`uiView`; and in its voice context `viewDelivery`, `uiClientId` and
`uiNotesEditor: "saved-note-v1"`, since this phone's Notes editor shows the
agent's own Notes records) unless the screen is private. A reply whose action results
prepared a view (`navigationPrepared` with a `navigationBinding` for this
renderer) is delivered by the owner-bound claim of the agent's view routes:
`POST /api/views/interact-claim` with the binding, then exactly one
`POST /api/views/interact-result` with `{ success, result: { switched } }`.
Maps is delivered through its own delivery (`spec/maps/delivery.md`), which
runs a redelivered effect at most once. The agent's commands inside a view
arrive on the resident's `view-interact` feed for this renderer
(`ResidentFeeds.view`), each claimed once by the same routes; only Browser
has commands (back, forward and reload), owned by Browser
(`spec/browser/agent.md`), and a request for the page text is refused with
where the page comes from (`spec/browser/pageContext.md`). Nothing here is
retried: a lost claim or result stays unknown.

## Story: Have my agent open the screen it means

> As the owner, when my agent says "here it is" and names a screen, I want
> that screen to open once, only while I am still where I asked, so that
> the phone never jumps somewhere on its own later.

### A prepared view opens once under a returned claim, only while the screen and the session are the ones the turn was sent from, and every claim is settled once

The claim waits at most 5 seconds; a claim without a claim id runs
nothing. After a claim, the view switch happens at most once, and the one
result says whether the view in front is now the target on a screen that is
not private. A failure after the claim and before the switch sends one
negative result within 1.5 seconds; a lost result is never sent again. A
view this phone does not have, a page inside a view it does have, or a
binding for another renderer is reported in the chat and nothing is
claimed. A view switch the delivery makes is the assistant's own and does
not retire the turn's cards.

```quint
type Delivered = NothingPrepared | DeliveredView | UnknownView | UnavailableView
pure val claimWaitMs = 5000
pure val negativeWaitMs = 1500
pure def claims(prepared: bool, ours: bool, known: bool, present: bool): bool = prepared and ours and known and present
pure def delivered(claimed: bool, switched: bool, accepted: bool, stillCurrent: bool): Delivered =
  if (not(claimed)) UnknownView else if (switched and accepted and stillCurrent) DeliveredView else UnknownView
pure def reported(prepared: bool, ours: bool, known: bool): Delivered =
  if (not(prepared)) NothingPrepared else if (ours and not(known)) UnavailableView else NothingPrepared
pure def negativeSent(claimed: bool, switchedOrAcknowledged: bool): bool = claimed and not(switchedOrAcknowledged)
pure def lawAnUnknownViewIsNeverClaimed(present: bool): bool = not(claims(true, true, false, present))
pure def lawAnotherRenderersBindingIsNeverClaimed(known: bool): bool = not(claims(true, false, known, true))
pure def lawNoClaimNoView(switched: bool, accepted: bool): bool = delivered(false, switched, accepted, true) != DeliveredView
pure def lawAnAcknowledgedClaimSendsNoNegative(claimed: bool): bool = not(negativeSent(claimed, true))
```

### A prepared Notes view that names a saved note opens that note's editor, and is delivered only while exactly that note is in front

A show of Notes whose handoff says `subview: "saved-note-v1"` is the
agent's saved Notes editor (the agent prepares it only for a turn that said
`uiNotesEditor: "saved-note-v1"`, and the handoff carries no note id). Its
claim adds `targetProtocol: "saved-note-v1"`, and the claim's answer names
the note as `target: { kind: "saved-note", noteId }`. After the claim, Notes
opens that note in its editor as spec/notes/list.md's "The agent opens the
one saved note I named, and never over another note's unsaved edit" allows,
then comes to the front at that note. The one result says switched, with
`shown: { kind: "saved-note", noteId }`, only when Notes is in front on a
screen that is not private with exactly that saved note in its editor, and
the delivery says delivered only then. A claim answer that names no note, or
a note that did not open, sends one negative result and is unknown. A saved
editor on any other view is not claimed, and every other claim is sent as
before, without the target protocol.

```quint
pure def noteInFront(inFront: bool, shownNote: str, noteId: str): bool = inFront and noteId != "" and shownNote == noteId
pure def claimsNote(target: str, savedEditor: bool): bool = not(savedEditor) or target == "notes"
pure def lawANamedNoteIsDeliveredOnlyWhileItIsInFront(inFront: bool, shownNote: str, noteId: str, accepted: bool): bool =
  delivered(true, noteInFront(inFront, shownNote, noteId), accepted, noteInFront(inFront, shownNote, noteId)) == DeliveredView implies (inFront and shownNote == noteId)
pure def lawANoteIsNeverClaimedOutsideNotes(target: str): bool = target != "notes" implies not(claimsNote(target, true))
pure def lawAClaimNamingNoNoteIsNeverDelivered(inFront: bool, shownNote: str, accepted: bool): bool =
  delivered(true, noteInFront(inFront, shownNote, ""), accepted, noteInFront(inFront, shownNote, "")) != DeliveredView
pure val shownNoteValues = Set("", "groceries", "recipes")
pure val noteIdValues = Set("", "groceries")
pure val targetValues = Set("notes", "home", "maps")
```

### Maps' view is delivered by Maps, at most once per effect

A prepared Maps view is handed to Maps with its binding, one request number
per delivery and one effect number per binding's request id, the same
across a redelivery; Maps claims it, brings itself forward and settles the
claim. The assistant claims nothing for it itself.

```quint
pure def mapsDelivers(target: str): bool = target == "maps"
pure def assistantClaims(target: str, known: bool): bool = known and not(mapsDelivers(target))
pure def lawMapsIsNeverClaimedTwice(known: bool): bool = not(assistantClaims("maps", known))
```

## Story: Let my agent press back or reload only on the page I am looking at

> As the owner, I want my agent's commands inside a view to run only on
> the view in front, never when I asked to review phone actions first, and
> never twice.

### A view command is claimed once, refused under "Ask before Alpha acts", run only in Browser, and answered once

A command is taken only for this renderer, on a screen that is not
private, once per request id while it runs, within 4.5 seconds. After its
claim, "Ask before Alpha acts" (on when it cannot be read) answers
`review-required: the owner reviews phone actions first`; a command for
any view but Browser answers `UNSUPPORTED: This phone has no agent command
for that view.`; Browser's own refusal answers with its code and message;
Browser's back, forward and reload answer with Browser's result envelope.
A command whose screen or session changed before it ran is answered as
failed or unknown and not repeated.

```quint
type ViewAnswer = Refused | ReviewRequired | Unsupported | BrowserAnswered
pure val interactionWaitMs = 4500
pure def taken(ours: bool, privateScreen: bool, running: bool): bool = ours and not(privateScreen) and not(running)
pure def answerOf(claimed: bool, asks: bool, browser: bool, command: bool): ViewAnswer =
  if (not(claimed)) Refused else if (asks) ReviewRequired else if (not(browser)) Unsupported else if (command) BrowserAnswered else Unsupported
pure def runs(claimed: bool, asks: bool, browser: bool, command: bool): bool = answerOf(claimed, asks, browser, command) == BrowserAnswered
pure def lawReviewFirstRunsNoCommand(browser: bool, command: bool): bool = not(runs(true, true, browser, command))
pure def lawOnlyBrowserHasCommands(command: bool): bool = not(runs(true, false, false, command))
pure def lawNoClaimNoCommand(asks: bool): bool = not(runs(false, asks, true, true))
pure def lawAPrivateScreenTakesNoCommand(running: bool): bool = not(taken(true, true, running))
```
