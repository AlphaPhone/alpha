# Adding to a draft

Files and contacts going into the draft open in the
[composer](./drafts.md). A file joins only once the picker gives one that
fits the draft's account; a file handed over from Files or Photos is
shown to the owner first; a contact is picked only where this phone has
Alpha's contacts and Android allows them. What joins is handed to the
composer as an edit. Text handed over from elsewhere in Alpha, "Use in
email" included, is not an attachment: it is [offered into an
email](./suggestion.md).

The shell passes the number of the draft open in the composer (0 when
none), whether the draft's account has room for a file of the size given
under its limits, whether the shell admits contacts on this phone, and
Android's Contacts permission as the phone reports it, and tells when a
draft is closed.

## Story: Add files and people to my draft

> As the owner, I want to attach files that fit, see a file another part
> of Alpha hands to my email before it goes in, and pick people from my
> contacts where the phone has them, or be shown how to allow it.

### Adding holds the draft a file is picked for, the picker's read, why a file was refused, the file handed over under review, and what the owner is shown about contacts

Thing 0 is nothing handed over.

```quint
import permission as P from "../../kit/permission"
import read as R from "../../kit/read"

type Picked = Fits | TooLarge | Unreadable | Cancelled
type Refusal = Accepted | TooBig | NotReadable | NoRoom
type Contacts = Usable | Asked | InSettings | NotOnThisPhone
type Adding = {
  draft: int, picker: R::Read, refused: Refusal,
  thing: int, mib: int, into: int, account: int, contacts: Contacts,
  contactDraft: int, people: R::Read, query: str, addresses: int, morePeople: bool,
}

type Effect =
  | PickFile({ ticket: int })
  | Attach({ draft: int, account: int, mib: int })
  | PickContact({ draft: int, ticket: int, query: str, further: bool })
  | AddContact({ draft: int, ticket: int, address: int })
  | AskForContacts({ draft: int })
  | OpenContactsSettings
type Added = { state: Adding, out: List[Effect] }

pure val initial: Adding = {
  draft: 0, picker: R::unread, refused: Accepted, thing: 0, mib: 0, into: 0, account: 0, contacts: Usable,
  contactDraft: 0, people: R::unread, query: "", addresses: 0, morePeople: false,
}

pure val draftValues = Set(0, 1, 2)
pure val accountValues = Set(0, 1)
pure val thingValues = Set(0, 1, 2)
pure val mibValues = Set(1, 6)
pure val ticketValues = Set(1, 2, 3, 4)
pure val queryValues = Set("", "Pat")
pure val addressValues = Set(1, 2, 3)
pure val addressesValues = Set(0, 1, 2, 3)
pure val contactsValues = Set(
  { grant: P::Unasked, asked: false },
  { grant: P::Granted, asked: true },
  { grant: P::Denied, asked: true },
)
```

### A file is attached to the draft open only once the picker gives one that fits within the room its account leaves; one too large, unreadable or without room is refused and said so

The picker answers once, under its own ticket.

```quint
pure def canAttach(s: Adding, draft: int): bool = draft != 0 and s.picker.status != R::Loading

pure def attach(s: Adding, draft: int): Added =
  val picker = R::ask(s.picker)
  { state: { ...s, draft: draft, picker: picker, refused: Accepted }, out: List(PickFile({ ticket: picker.ticket })) }

pure def canPicked(s: Adding, ticket: int, mib: int): bool = R::canAnswer(s.picker, ticket) and mib >= 1

pure def picked(s: Adding, ticket: int, result: Picked, mib: int, room: bool): Added =
  val refused =
    if (result == TooLarge) TooBig else if (result == Unreadable) NotReadable
    else if (result == Fits and not(room)) NoRoom else Accepted
  val done = { ...s, picker: R::answer(s.picker, result != Cancelled), refused: refused }
  if (result == Fits and room) { state: done, out: List(Attach({ draft: s.draft, account: 0, mib: mib })) }
  else { state: done, out: List() }
```

### A file handed over from Files or Photos is shown to the owner before it joins the draft open, or starts a new message from the account given, and only where it fits

```quint
pure def canBring(s: Adding, thing: int, mib: int, draft: int, account: int): bool =
  thing != 0 and mib >= 1 and s.thing == 0 and (draft != 0 or account != 0)

pure def bring(s: Adding, thing: int, mib: int, draft: int, account: int): Adding =
  { ...s, thing: thing, mib: mib, into: draft, account: if (draft != 0) 0 else account, refused: Accepted }

pure def canTakeIn(s: Adding): bool = s.thing != 0

pure def takeIn(s: Adding, room: bool): Added =
  val gone = { ...s, thing: 0, mib: 0, into: 0, account: 0 }
  if (room) { state: { ...gone, refused: Accepted }, out: List(Attach({ draft: s.into, account: s.account, mib: s.mib })) }
  else { state: { ...gone, refused: NoRoom }, out: List() }

pure def canLeaveOut(s: Adding): bool = s.thing != 0

pure def leaveOut(s: Adding): Adding = { ...s, thing: 0, mib: 0, into: 0, account: 0 }
```

### A contact is picked only where the phone has Alpha's contacts and Android allows them; without the permission the owner is asked once, and afterwards sent to Settings; on a phone without them nothing is asked and the owner is told

```quint
pure def canPickContact(s: Adding, draft: int, admitted: bool, contacts: P::Permission): bool =
  draft != 0 and admitted and P::allows(contacts)

pure def readPeople(draft: int, s: Adding, query: str, further: bool): Added =
  val people = R::ask(s.people)
  {
    state: { ...s, contactDraft: draft, contacts: Usable, people: people, query: query,
      addresses: if (further) s.addresses else 0, morePeople: false },
    out: List(PickContact({ draft: draft, ticket: people.ticket, query: query, further: further })),
  }

pure def pickContact(s: Adding, draft: int, admitted: bool, contacts: P::Permission): Added =
  readPeople(draft, s, "", false)

pure def canWantContacts(s: Adding, draft: int, admitted: bool, contacts: P::Permission): bool =
  draft != 0 and not(admitted and P::allows(contacts))

pure def wantContacts(s: Adding, draft: int, admitted: bool, contacts: P::Permission): Added =
  val gone = closePeople(s)
  if (not(admitted)) { state: { ...gone, contacts: NotOnThisPhone }, out: List() }
  else if (P::canAsk(contacts)) { state: { ...gone, contacts: Asked, contactDraft: draft }, out: List(AskForContacts({ draft: draft })) }
  else { state: { ...gone, contacts: InSettings, contactDraft: draft }, out: List(OpenContactsSettings) }

pure def lawNoContactsWhereThePhoneHasNone(draft: int, contacts: P::Permission): bool =
  not(canPickContact(initial, draft, false, contacts)) and wantContacts(initial, draft, false, contacts).out.length() == 0
```

### The people shown are for the draft and the newest Contacts read, and choosing one adds only its displayed address

Search reads anew and more reads the next page. Cancel, closing the
draft, or a new owner retires the picker and refuses a late answer.

```quint
pure def canFindPeople(s: Adding, draft: int, query: str): bool =
  draft != 0 and draft == s.contactDraft and s.contacts == Usable and s.people.status != R::Idle

pure def findPeople(s: Adding, draft: int, query: str): Added = readPeople(draft, s, query, false)

pure def canMorePeople(s: Adding, draft: int): bool =
  draft != 0 and draft == s.contactDraft and s.people.status == R::Loaded and s.morePeople

pure def morePeople(s: Adding, draft: int): Added = readPeople(draft, s, s.query, true)

pure def canPeopleRead(s: Adding, draft: int, ticket: int, addresses: int): bool =
  draft != 0 and draft == s.contactDraft and s.contacts == Usable and R::canAnswer(s.people, ticket) and addresses >= 0

pure def peopleRead(s: Adding, draft: int, ticket: int, ok: bool, addresses: int, more: bool): Adding =
  { ...s, people: R::answer(s.people, ok), addresses: if (ok) addresses else 0, morePeople: ok and more }

pure def canChooseContact(s: Adding, draft: int, ticket: int, address: int): bool =
  draft != 0 and draft == s.contactDraft and s.contacts == Usable and s.people.status == R::Loaded and ticket == s.people.ticket
    and address >= 1 and address <= s.addresses

pure def chooseContact(s: Adding, draft: int, ticket: int, address: int): Added =
  { state: s, out: List(AddContact({ draft: draft, ticket: ticket, address: address })) }

pure def canClosePeople(s: Adding): bool = s.contactDraft != 0

pure def closePeople(s: Adding): Adding =
  { ...s, contactDraft: 0, people: R::drop(s.people), query: "", addresses: 0, morePeople: false }

pure def canContactsReported(s: Adding, draft: int): bool =
  draft != 0 and draft == s.contactDraft and s.contacts == Asked

pure def contactsReported(s: Adding, draft: int, allowed: bool): Added =
  if (allowed) readPeople(draft, s, "", false)
  else { state: { ...s, contacts: InSettings }, out: List() }
```

### Nothing joins a draft but a file that fit, a file the owner saw, or a contact picked for it

```quint
pure def stepNothingJoinsUnseen(before: Adding, via: str, after: Adding, out: List[Effect]): bool =
  out.every(e => match e {
    | Attach(a) =>
      a.mib >= 1 and after.refused == Accepted and (
        (via == "picked" and a.account == 0 and a.draft == before.draft and a.draft != 0)
          or (via == "takeIn" and before.thing != 0 and a.draft == before.into and a.account == before.account and a.mib == before.mib)
      )
    | PickContact(c) =>
      (via == "pickContact" or via == "findPeople" or via == "morePeople" or via == "contactsReported")
        and c.draft == after.contactDraft and c.draft != 0
    | AddContact(c) => via == "chooseContact" and canChooseContact(before, c.draft, c.ticket, c.address)
    | _ => true
  })
```

### Closing the draft, a new cloud session or a restart drops what was being added to it

```quint
pure def draftClosed(s: Adding, draft: int): Adding =
  val cleared = if (draft == s.contactDraft) closePeople(s) else s
  if (draft == s.draft or draft == s.into) {
    ...cleared, picker: R::drop(cleared.picker), refused: Accepted, thing: 0, mib: 0, into: 0, account: 0, contacts: Usable,
  } else cleared

pure def sessionChanged(s: Adding): Adding = { ...initial, picker: R::drop(s.picker), people: R::drop(s.people) }

pure def restart(s: Adding): Adding = sessionChanged(s)
```

### A picker open is for a draft, and a file handed over has somewhere to go

```quint
pure def alwaysWhatIsAddedHasADraft(s: Adding): bool =
  (s.picker.status == R::Loading implies s.draft != 0)
    and (s.thing != 0 implies ((s.into != 0 or s.account != 0) and s.mib >= 1))
```

### A file can be refused as too large or for want of room, a file can wait to be seen, and Contacts can need allowing or be missing from this phone

```quint
pure def sometimesAFileIsTooLarge(s: Adding): bool = s.refused == TooBig

pure def sometimesADraftHasNoRoom(s: Adding): bool = s.refused == NoRoom

pure def sometimesAFileWaitsToBeSeen(s: Adding): bool = s.thing != 0 and s.into == 0

pure def sometimesContactsMustBeAllowed(s: Adding): bool = s.contacts == InSettings

pure def sometimesThePhoneHasNoContacts(s: Adding): bool = s.contacts == NotOnThisPhone
```
