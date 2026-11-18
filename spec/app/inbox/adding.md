# Adding to a draft

Files, things from elsewhere in Alpha, and contacts going into the draft
open in the [composer](./drafts.md). A file joins only once the picker
gives one that fits; something handed over from Files, Photos, Notes or
Alpha's "Use in email" is shown to the owner first; a contact is picked
only where the phone allows it. What joins is handed to the composer as
an edit.

The shell passes the number and account of the draft open in the
composer (0 when none), Android's Contacts permission as the phone
reports it, and tells when that draft is closed.

## Story: Add files, things and people to my draft

> As the owner, I want to attach files that fit, see what another part of
> Alpha hands to my email before it goes in, and pick people from my
> contacts when the phone lets me, or be shown how to allow it.

### Adding holds the file being picked, the thing handed over under review, and whether Contacts must be allowed

Ticket 0 is no picker open, thing 0 nothing handed over.

```quint
import permission as P from "../../kit/permission"

type Picked = Fits | TooLarge | Unreadable | Cancelled
type Adding = {
  draft: int, picking: int, picks: int, refused: bool,
  thing: int, into: int, account: int, contactsNeeded: bool,
}

type Effect =
  | PickFile({ ticket: int })
  | Attach({ draft: int, account: int, thing: int })
  | AddContact({ draft: int })
  | AskForContacts
  | OpenContactsSettings
type Added = { state: Adding, out: List[Effect] }

pure val initial: Adding = {
  draft: 0, picking: 0, picks: 0, refused: false, thing: 0, into: 0, account: 0, contactsNeeded: false,
}

pure val draftValues = Set(0, 1, 2)
pure val accountValues = Set(0, 1)
pure val thingValues = Set(0, 1, 2)
pure val ticketValues = Set(1, 2, 3)
pure val contactsValues = Set(
  { grant: P::Unasked, asked: false },
  { grant: P::Granted, asked: true },
  { grant: P::Denied, asked: true },
)
```

### A file is attached to the draft open only once the picker gives one that fits; one too large or unreadable is refused and said so

The picker answers once, under its own ticket.

```quint
pure def canAttach(s: Adding, draft: int): bool = draft != 0 and s.picking == 0

pure def attach(s: Adding, draft: int): Added = {
  state: { ...s, draft: draft, picking: s.picks + 1, picks: s.picks + 1, refused: false },
  out: List(PickFile({ ticket: s.picks + 1 })),
}

pure def canPicked(s: Adding, ticket: int): bool = s.picking != 0 and ticket == s.picking

pure def picked(s: Adding, ticket: int, result: Picked): Added =
  val done = { ...s, picking: 0, refused: result == TooLarge or result == Unreadable }
  if (result == Fits) { state: done, out: List(Attach({ draft: s.draft, account: 0, thing: 0 })) }
  else { state: done, out: List() }
```

### Something handed over from elsewhere in Alpha is shown to the owner before it joins the draft open, or starts a new message from the account given

```quint
pure def canBring(s: Adding, thing: int, draft: int, account: int): bool =
  thing != 0 and s.thing == 0 and (draft != 0 or account != 0)

pure def bring(s: Adding, thing: int, draft: int, account: int): Adding =
  { ...s, thing: thing, into: draft, account: if (draft != 0) 0 else account }

pure def canTakeIn(s: Adding): bool = s.thing != 0

pure def takeIn(s: Adding): Added = {
  state: { ...s, thing: 0, into: 0, account: 0 },
  out: List(Attach({ draft: s.into, account: s.account, thing: s.thing })),
}

pure def canLeaveOut(s: Adding): bool = s.thing != 0

pure def leaveOut(s: Adding): Adding = { ...s, thing: 0, into: 0, account: 0 }
```

### A contact is picked only where the phone allows Contacts; without it the owner is asked once, and afterwards sent to Settings

```quint
pure def canPickContact(s: Adding, draft: int, contacts: P::Permission): bool = draft != 0 and P::allows(contacts)

pure def pickContact(s: Adding, draft: int, contacts: P::Permission): Added =
  { state: { ...s, contactsNeeded: false }, out: List(AddContact({ draft: draft })) }

pure def canWantContacts(s: Adding, draft: int, contacts: P::Permission): bool = draft != 0 and not(P::allows(contacts))

pure def wantContacts(s: Adding, draft: int, contacts: P::Permission): Added = {
  state: { ...s, contactsNeeded: true },
  out: List(if (P::canAsk(contacts)) AskForContacts else OpenContactsSettings),
}
```

### Nothing joins a draft but a file that fit, a thing the owner saw, or a contact picked

```quint
pure def stepNothingJoinsUnseen(before: Adding, via: str, after: Adding, out: List[Effect]): bool =
  out.every(e => match e {
    | Attach(a) =>
      (via == "picked" and a.thing == 0 and a.draft == before.draft and a.draft != 0 and not(after.refused))
        or (via == "takeIn" and a.thing == before.thing and a.thing != 0 and a.draft == before.into)
    | AddContact(c) => via == "pickContact" and c.draft != 0 and not(after.contactsNeeded)
    | _ => true
  })
```

### Closing the draft, a new cloud session or a restart drops what was being added to it

```quint
pure def draftClosed(s: Adding, draft: int): Adding =
  if (draft == s.draft or draft == s.into) { ...s, picking: 0, refused: false, thing: 0, into: 0, account: 0, contactsNeeded: false } else s

pure def sessionChanged(s: Adding): Adding = { ...initial, picks: s.picks }

pure def restart(s: Adding): Adding = { ...initial, picks: s.picks }
```

### A picker open is for a draft, and a thing handed over has somewhere to go

```quint
pure def alwaysWhatIsAddedHasADraft(s: Adding): bool =
  (s.picking != 0 implies (s.draft != 0 and s.picking <= s.picks))
    and (s.thing != 0 implies (s.into != 0 or s.account != 0))
```

### A file can be refused, a thing can wait to be seen, and Contacts can need allowing

```quint
pure def sometimesAFileIsRefused(s: Adding): bool = s.refused

pure def sometimesAThingWaitsToBeSeen(s: Adding): bool = s.thing != 0 and s.into == 0

pure def sometimesContactsMustBeAllowed(s: Adding): bool = s.contactsNeeded
```
