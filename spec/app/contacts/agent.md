# Agent requests

What the agent may ask of the phone: a call, a text, or a contact added,
changed or deleted. The agent names a number or a contact by search text; the search
runs on the phone and the agent never receives the address book. The owner
sees the exact number, or the contact before and after, on the phone and
approves each request; nothing happens without that. A call or a text to a
contact always lets the owner pick the exact number, even when only one was
found. A call the owner
approves is handed to the phone's dialer, as in [Phone](../phone/); a text is
sent once, as in [Sending](../messages/sending.md); a contact change is
written as in [Contacts](./). A text the agent only drafts is
[Alpha's suggestion](../messages/composer.md), which never sends. The agent is told only how its
request ended.

## Domain

### Who sends an event

The owner, the agent, and the phone answering what Alpha asked of it.

```quint
type Actor = Owner | Agent | Device
```

### What a request holds

One request at a time: what was asked, how far it got, how many contacts
or numbers the search found, whether more matched than are shown, how many
contacts already hold a new contact's name or number, whether a text names
a number the owner wrote, whether the number is an emergency number, the
exact number, text and contact the request acts on, the search, the review
shown to the owner, the action taken and how the request ended.

```quint
import read as R from "../../kit/read"
import review as V from "../../kit/review"
import attempt as A from "../../kit/attempt"

type Ask = Dial | Text | AddContact | ChangeContact | DeleteContact
type Stage = Quiet | Looking | Choosing | Shown | Acting | Confirming | Ended
type Ending = Done | Declined | Withdrawn | NotFound | Unavailable | EmergencyRefused | NotWritten | Unchanged | NotDone | Unsure
type Request = {
  stage: Stage, ask: Ask, matches: int, more: bool, twins: int, addressed: bool, emergency: bool,
  number: str, text: str, contact: str,
  lookup: R::Read, review: V::Review, attempt: A::Attempt, ending: Ending,
}

pure val initial: Request = {
  stage: Quiet, ask: Dial, matches: 0, more: false, twins: 0, addressed: false, emergency: false,
  number: "", text: "", contact: "",
  lookup: R::unread, review: V::unreviewed, attempt: A::plan(0), ending: Done,
}
```

### What a request asks of the phone and tells the agent

A search of the contacts on the phone, the approved action under its
number (a handoff to the dialer, a text under its operation ID, or one write
naming the version of the contact the owner was shown), a read of the
phone's own send record for a text whose outcome is not yet known, and the
agent's answer.

```quint
type Effect =
  | Search({ ticket: int })
  | Act({ id: int, ask: Ask, number: str, text: str, contact: str })
  | ReadBack({ id: int })
  | Answer({ ending: Ending })

type Moved = { state: Request, out: List[Effect] }

pure def told(ending: Ending): List[Effect] = List(Answer({ ending: ending }))

pure def acting(id: int, r: Request): List[Effect] =
  List(Act({ id: id, ask: r.ask, number: r.number, text: r.text, contact: r.contact }))

pure def acts(out: List[Effect]): bool = out.some(e => match e { | Act(a) => true | _ => false })
```

### What the simulator tries

```quint
pure val ticketValues = Set(1, 2)
pure val idValues = Set(1, 2, 3)
pure val matchesValues = Set(-1, 0, 1, 2)
pure val numberValues = Set("", "+14155550100")
pure val textValues = Set("", "Running late")
pure val contactValues = Set("", "7")
pure val weight_found = 3
pure val weight_approve = 3
```

## Story: Let the agent ask for a call or a contact change

> As the owner, I want the agent to ask for a call, a text or a change to my
> contacts by name, have the contact found on my phone, and see exactly
> what it would do.

### Only the agent asks, and only when no other request is open

A call or a text to a number is shown at once. A call or a text to a
contact, a new contact, and a change or deletion first search the contacts
on the phone. A call to an emergency number is refused at once, with the
reason. Locking the phone leaves a request that is looking, offering a
choice or shown as it is: nothing but the events below ends it.

```quint
pure def open(r: Request): bool = r.stage != Quiet and r.stage != Ended

pure def finish(ending: Ending, r: Request): Moved =
  { state: { ...r, stage: Ended, ending: ending }, out: told(ending) }

pure def anew(v: V::Review): V::Review = V::present(V::revise(v))

pure def canAsked(r: Request, ask: Ask, byName: bool, emergency: bool, written: bool, pictures: bool, number: str, text: str, by: Actor): bool =
  by == Agent and not(open(r)) and (byName or not(reachesANumber(ask)) or number != "")

pure def reachesANumber(ask: Ask): bool = ask == Dial or ask == Text

pure def asked(r: Request, ask: Ask, byName: bool, emergency: bool, written: bool, pictures: bool, number: str, text: str, by: Actor): Moved =
  val fresh = {
    ...r, ask: ask, matches: 0, more: false, twins: 0, contact: "",
    number: if (reachesANumber(ask) and not(byName)) number else "", text: if (ask == Text) text else "",
    addressed: reachesANumber(ask) and not(byName), emergency: ask == Dial and emergency and not(byName),
  }
  val lookup = R::ask(r.lookup)
  if (fresh.emergency) finish(EmergencyRefused, fresh)
  else if (reachesANumber(ask) and not(byName) and not(written)) finish(NotWritten, fresh)
  else if (ask == Text and pictures) finish(Unavailable, fresh)
  else if (reachesANumber(ask) and not(byName)) { state: { ...fresh, stage: Shown, matches: 1, review: anew(r.review) }, out: List() }
  else { state: { ...fresh, stage: Looking, lookup: lookup }, out: List(Search({ ticket: lookup.ticket })) }
```

### A call or a text to a number reaches only a number the owner wrote

The agent may name a number only when the owner wrote that number in the
request; any other number, such as one taken from a message's body or
written in place of a contact, ends the request at once, saying the number
is not one the owner wrote. A number is never searched for.

```quint
pure def alwaysOnlyANumberIsRefusedAsNotWritten(r: Request): bool =
  (r.stage == Ended and r.ending == NotWritten) implies reachesANumber(r.ask)

pure def sometimesNotWritten(r: Request): bool = r.stage == Ended and r.ending == NotWritten and r.ask == Text
```

### A text with pictures the agent asks for answers that it is unavailable

Only the owner sends pictures, from the composer.

```quint
pure def sometimesPicturesUnavailable(r: Request): bool = r.stage == Ended and r.ending == Unavailable and r.ask == Text and r.lookup.ticket == 0
```

### Only the phone answers the newest search, and the request goes on by what it found

For a call or a text, the search finds numbers: each number of each
matching contact is one choice, and the owner always picks the exact
number, even when only one was found. For a change or a deletion it finds
contacts: none ends the request, one is shown and several are offered for
the owner to choose. A change that would leave the one contact found as it
is ends at once, since it is never offered. A new contact is always shown,
and the contacts that already hold its name or number are counted, to be
shown first. A failed search ends the request as unavailable.

```quint
pure def canFound(r: Request, ticket: int, matches: int, contact: str, by: Actor): bool =
  by == Device and r.stage == Looking and R::canAnswer(r.lookup, ticket) and matches >= 0
    and ((matches == 1 and not(reachesANumber(r.ask)) and r.ask != AddContact) implies contact != "")

pure def found(r: Request, ticket: int, ok: bool, matches: int, more: bool, unchanged: bool, contact: str, by: Actor): Moved =
  val searched = {
    ...r, lookup: R::answer(r.lookup, ok), matches: matches, more: ok and more and matches >= 1,
    contact: if (ok and matches == 1 and not(reachesANumber(r.ask)) and r.ask != AddContact) contact else "",
  }
  if (not(ok)) finish(Unavailable, searched)
  else if (r.ask == AddContact) { state: { ...searched, stage: Shown, matches: 1, twins: matches, review: anew(r.review) }, out: List() }
  else if (matches == 0) finish(NotFound, searched)
  else if (reachesANumber(r.ask) or matches >= 2) { state: { ...searched, stage: Choosing }, out: List() }
  else if (r.ask == ChangeContact and unchanged) finish(Unchanged, searched)
  else { state: { ...searched, stage: Shown, review: anew(r.review) }, out: List() }
```

### The owner picks the exact number or the one contact, and that one is shown

A call to a number the phone judges an emergency number is refused with
the reason. A change that would leave the chosen contact as it is ends at
once.

```quint
pure def canChoose(r: Request, number: str, contact: str, emergency: bool, unchanged: bool, by: Actor): bool =
  by == Owner and r.stage == Choosing and contact != "" and (reachesANumber(r.ask) iff number != "")

pure def choose(r: Request, number: str, contact: str, emergency: bool, unchanged: bool, by: Actor): Moved =
  val chosen = { ...r, number: number, contact: contact, emergency: r.ask == Dial and emergency }
  if (chosen.emergency) finish(EmergencyRefused, chosen)
  else if (r.ask == ChangeContact and unchanged) finish(Unchanged, chosen)
  else { state: { ...chosen, stage: Shown, matches: 1, review: anew(r.review) }, out: List() }
```

### A change that would leave the contact as it is is never offered

```quint
pure def alwaysAnUnchangedContactIsNeverOffered(r: Request): bool =
  (r.stage == Ended and r.ending == Unchanged) implies (r.ask == ChangeContact and not(r.review.showing))
```

### A change is shown line by line, and a removed value never reads as kept

Each number and address of the contact is a line of its own, never cut
short, that says in words what the change does to it: Remove, with the value
struck through; Add, with the value in bold; or Keep. A deletion reads the
contact first and shows each of its lines as Remove. A new name also shows
"Rename from" with the old name. A new number that is already saved under
another contact's name shows that contact's name beside it, and a new
contact whose name or number is already in Contacts shows those contacts
first, with "Add (keep existing)" in bold. A name is looked up in at most
ten contacts, and the review says when more matched.

```quint
type LineChange = RemoveLine | AddLine | KeepLine

pure val maxMatches = 10

pure def lineChange(before: bool, after: bool): LineChange =
  if (before and not(after)) RemoveLine else if (after and not(before)) AddLine else KeepLine

pure def lawARemovedValueNeverReadsAsKept(before: bool, after: bool): bool =
  (before and not(after)) iff lineChange(before, after) == RemoveLine

pure def alwaysAShownRequestNamesWhatItActsOn(r: Request): bool =
  (r.stage == Shown or r.stage == Acting or r.stage == Confirming) implies
    ((reachesANumber(r.ask) implies r.number != "") and ((r.ask == ChangeContact or r.ask == DeleteContact) implies r.contact != ""))

pure def alwaysMoreMatchedOnlyAfterASearch(r: Request): bool =
  (r.more implies (r.lookup.status == R::Loaded and r.matches >= 1))
    and (r.twins > 0 implies (r.ask == AddContact and r.lookup.status == R::Loaded))
```

### A request is shown only for exactly one number or contact, and a choice is offered for several contacts or any of the numbers found

```quint
pure def alwaysOnlyOneIsShown(r: Request): bool =
  ((r.stage == Shown or r.stage == Acting or r.stage == Confirming) implies r.matches == 1)
    and (r.stage == Choosing implies (r.matches >= 2 or (reachesANumber(r.ask) and r.matches >= 1)))
    and ((r.stage == Shown) == r.review.showing)
```

### A request can be shown, offered as a choice, find nothing, or fail to search

```quint
pure def sometimesChoosing(r: Request): bool = r.stage == Choosing and r.ask == ChangeContact
pure def sometimesTheOnlyNumberIsPicked(r: Request): bool = r.stage == Choosing and r.ask == Text and r.matches == 1
pure def sometimesMoreMatched(r: Request): bool = r.stage == Choosing and r.more
pure def sometimesATwinIsShownFirst(r: Request): bool = r.stage == Shown and r.ask == AddContact and r.twins >= 1
pure def sometimesUnchanged(r: Request): bool = r.ending == Unchanged
pure def sometimesShownCall(r: Request): bool = r.stage == Shown and r.ask == Dial and r.lookup.status == R::Loaded
pure def sometimesNotFound(r: Request): bool = r.stage == Ended and r.ending == NotFound
pure def sometimesUnavailable(r: Request): bool = r.stage == Ended and r.ending == Unavailable
```

## Story: Approve what the agent asked

> As the owner, I want nothing to happen until I approve exactly what I was
> shown, and never a call to an emergency number by the agent.

### The contact can change on the phone while it is shown, and then the owner sees it again before approving

```quint
pure def canChanged(r: Request, by: Actor): bool = by == Device and r.stage == Shown

pure def changed(r: Request, by: Actor): Request = { ...r, review: V::revise(r.review) }

pure def canShowAgain(r: Request, by: Actor): bool = by == Owner and r.stage == Shown and not(V::canConfirm(r.review))

pure def showAgain(r: Request, by: Actor): Request = { ...r, review: V::present(r.review) }
```

### Only the owner approves, only what is shown as it is now, and only when the phone has ruled out an emergency call

`clear` is Phone's fact that no call which may be an emergency call is
live. Approving acts once, under the next number. A text to a number the
owner wrote, shown on its card, whose whole review is showing, can also be
approved by the owner saying "Send this text" as the next thing said in
Talk. A text to a contact has its number picked on the phone, by touch.
Nothing else is approved by voice, and the phrase is never spoken back.

```quint
pure def canApprove(r: Request, clear: bool, spoken: bool, by: Actor): bool =
  by == Owner and r.stage == Shown and V::canConfirm(r.review) and clear and (spoken implies (r.ask == Text and r.addressed))

pure def approve(r: Request, clear: bool, spoken: bool, by: Actor): Moved =
  val attempt = A::dispatch(A::record(A::plan(r.attempt.id + 1)))
  { state: { ...r, stage: Acting, review: V::confirm(r.review), attempt: attempt }, out: acting(attempt.id, r) }
```

### The owner can decline, and a review Alpha stops showing is withdrawn

```quint
pure def canDecline(r: Request, by: Actor): bool = by == Owner and (r.stage == Choosing or r.stage == Shown)

pure def decline(r: Request, by: Actor): Moved = finish(Declined, { ...r, review: V::dismiss(r.review) })

pure def canWithdraw(r: Request, by: Actor): bool = by == Device and (r.stage == Looking or r.stage == Choosing or r.stage == Shown)

pure def withdraw(r: Request, by: Actor): Moved = finish(Withdrawn, { ...r, review: V::dismiss(r.review) })
```

### Only a text to a number the owner wrote is approved by voice, and only that text names the number at once

```quint
pure def alwaysAnAddressedRequestReachesANumber(r: Request): bool = r.addressed implies reachesANumber(r.ask)
pure def sometimesAnAddressedText(r: Request): bool = r.stage == Shown and r.ask == Text and r.addressed
```

### Nothing is done but what the owner approved, as it was shown, once

```quint
pure def stepOnlyApprovedRequestsAct(before: Request, via: str, after: Request, out: List[Effect]): bool =
  acts(out) implies (via == "approve" and before.stage == Shown and V::canConfirm(before.review)
    and out == acting(before.attempt.id + 1, before))
```

### The agent never calls an emergency number, and is told why

```quint
pure def alwaysNoEmergencyCallByTheAgent(r: Request): bool =
  (r.emergency implies r.ask == Dial) and (r.emergency iff (r.stage == Ended and r.ending == EmergencyRefused))

pure def stepTheRefusalIsExplained(before: Request, via: str, after: Request, out: List[Effect]): bool =
  (after.stage == Ended and before.stage != Ended) implies out == told(after.ending)
```

### An action is in hand only after an approval, and its number is never reused

```quint
pure def alwaysTheActionIsWellFormed(r: Request): bool =
  r.attempt.id >= 0 and r.attempt.outcome != A::Recorded
    and (r.attempt.id == 0 implies r.attempt.outcome == A::Planned)
    and ((r.stage == Acting or r.stage == Confirming) implies r.attempt.outcome == A::Sent)
    and (r.attempt.outcome == A::Sent implies (r.stage == Acting or r.stage == Confirming))
    and (r.stage == Confirming implies r.ask == Text)
```

### A request can be approved, declined, refused as an emergency call, or seen again after a change

```quint
pure def sometimesChangedWhileShown(r: Request): bool = r.stage == Shown and not(V::canConfirm(r.review))
pure def sometimesActing(r: Request): bool = r.stage == Acting and r.ask == DeleteContact
pure def sometimesDeclined(r: Request): bool = r.ending == Declined and r.matches >= 2
pure def sometimesEmergencyRefused(r: Request): bool = r.ending == EmergencyRefused and r.lookup.status == R::Loaded
```

## Story: Learn how the request ended

> As the owner, I want the agent told whether what I approved happened, and
> never to have it done twice when Alpha cannot tell.

### Only the phone answers the action, and the request ends as that answer says

A call whose answer was lost, or a write whose answer was lost, ends as
unknown and is never repeated by this request. A text Android only
submitted is watched for its final record, up to six reads half a second
apart. A text whose outcome is still unknown, or whose answer was lost, is
settled only by the phone's own send record for its operation ID: read
back once, it ends as sent, not sent, or unknown, and nothing is sent
again. A contact deletion that Android queues waits for that deletion's
receipt before Alpha reports whether it happened.

```quint
pure def canActed(r: Request, id: int, by: Actor): bool = by == Device and r.stage == Acting and A::canConclude(r.attempt, id)

pure def concluded(done: bool, known: bool, r: Request): Moved =
  val attempt = A::conclude(r.attempt, done, known)
  finish(if (attempt.outcome == A::Confirmed) Done else if (attempt.outcome == A::Refused) NotDone else Unsure, { ...r, attempt: attempt })

pure def acted(r: Request, id: int, done: bool, known: bool, by: Actor): Moved =
  if (r.ask == Text and not(known)) { state: { ...r, stage: Confirming }, out: List(ReadBack({ id: r.attempt.id })) }
  else concluded(done, known, r)

pure def canAnswerLost(r: Request, by: Actor): bool = by == Device and r.stage == Acting and r.attempt.outcome == A::Sent

pure def answerLost(r: Request, by: Actor): Moved = acted(r, r.attempt.id, false, false, by)

pure def canReadBack(r: Request, id: int, by: Actor): bool = by == Device and r.stage == Confirming and A::canConclude(r.attempt, id)

pure def readBack(r: Request, id: int, wasSent: bool, known: bool, by: Actor): Moved = concluded(wasSent, known, r)

pure def canReadBackLost(r: Request, by: Actor): bool = by == Device and r.stage == Confirming

pure def readBackLost(r: Request, by: Actor): Moved = concluded(false, false, r)
```

### A text whose outcome is unknown is read back, never sent again

```quint
pure def stepAnUnknownTextIsReadBack(before: Request, via: str, after: Request, out: List[Effect]): bool =
  (after.stage == Confirming and before.stage != Confirming) implies (before.ask == Text and out == List(ReadBack({ id: before.attempt.id })))

pure def sometimesReadBack(r: Request): bool = r.stage == Confirming
pure def sometimesReadBackSent(r: Request): bool = r.ending == Done and r.ask == Text and r.attempt.outcome == A::Confirmed and r.addressed
```

### An approved action ends

It ends with the phone's answer, or as unknown when Alpha stops waiting
for one.

```quint
pure def leadsToAnActionEnds(r: Request, later: Request): bool = (r.stage == Acting or r.stage == Confirming) implies later.stage == Ended

pure val fair_acted = "weak"
pure val fair_answerLost = "weak"
pure val fair_readBack = "weak"
pure val fair_readBackLost = "weak"
```

### A request can end done, failed or unknown

```quint
pure def sometimesDone(r: Request): bool = r.ending == Done and r.ask == Dial
pure def sometimesTextSent(r: Request): bool = r.ending == Done and r.ask == Text and r.lookup.status == R::Loaded
pure def sometimesUnknown(r: Request): bool = r.ending == Unsure and r.ask == ChangeContact
```

## Story: Let the agent read what I have open

> As the owner, I want the agent to read only what I have open on the
> phone, to name the sender of my latest text by its number and never its
> words, and to open the keypad or my contacts for me without doing
> anything there.

### The agent reads only the conversation, voicemail or contact open on screen, as the phone last read it

A read shares the open conversation's last twenty messages, the open
voicemail with the transcript made of it, or the open contact's name,
numbers and addresses. With nothing open, or with what is open not yet
read, the agent is told none is selected. A read asks the phone nothing
new and changes nothing. The agent may also open the keypad filled in with
a number, as a number handed to [Phone](../phone/), or Contacts on a
search, learning only whether a contact matched: only the owner's tap then
calls or changes anything.

```quint
type Opened = NothingOpen | OpenUnread | OpenRead
type Shared = SharesIt | NoneSelected

pure def readOf(opened: Opened): Shared = if (opened == OpenRead) SharesIt else NoneSelected

pure def lawOnlyWhatIsOpenAndReadIsShared(opened: Opened): bool = (readOf(opened) == SharesIt) iff (opened == OpenRead)
```

### The latest text's sender is named by its number alone, and the whole number only where the agent asked for it

The phone reads the newest incoming text's address, never its words: the
last four digits, or the whole number and its conversation when the agent
asked for it, so a reply can be drafted to that sender. No text, a sender
that is not a number, and a failed read are each said as such.

```quint
type SenderSaid = WholeNumber | LastFour | NoText | NotANumber | ReadFailed

pure def senderSaid(read: bool, texts: bool, dialable: bool, whole: bool): SenderSaid =
  if (not(read)) ReadFailed else if (not(texts)) NoText else if (not(dialable)) NotANumber
  else if (whole) WholeNumber else LastFour

pure def lawTheWholeNumberOnlyWhenAsked(read: bool, texts: bool, dialable: bool, whole: bool): bool =
  (senderSaid(read, texts, dialable, whole) == WholeNumber) implies whole
```
