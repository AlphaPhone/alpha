# Operation

The words the approvals share: who sends an event, and what kind of thing
the agent asks the phone to do. Whether an operation may run without the
owner's review, and whether Alpha can read back how it ended, depends only
on its kind.

## Story: Know what the agent is asking for

> As the owner, I want Alpha to tell apart what only shows me something from
> what reads my things or changes them, so that it asks me before anything
> that matters.

### The owner, the agent and the phone each send their own events

The phone stands for Android and the app itself: time passing, a restart,
the screen becoming protected, and the answers of what it was asked to do.

```quint
type Actor = Owner | Agent | Phone
```

### An operation shows something, opens a web page, glances at the calendar, reads the owner's things, changes something, makes something, or is an emergency call

Showing opens an app, a Settings page, a file or a photo; no operation
changes a setting, which the owner does in Settings. Opening a web
page goes to an address. Glancing reads the calendar and when the owner is
free. Reading takes the owner's notes or messages into the conversation.
Changing edits, deletes, sends or calls, and Alpha can read back how it
ended. Making writes a note or takes a photo, which Alpha cannot read back.

```quint
type Operation = Show | OpenPage | Glance | Look | Change | Make | EmergencyCall

pure def changesNothing(operation: Operation): bool =
  operation == Show or operation == OpenPage or operation == Glance or operation == Look
```

### Showing, glancing, and opening a web page whose address the owner typed are the allow-list of what may run without review

Reading the owner's notes or messages, and writing a note or taking a
photo, always need review: unlike the old app, writing a note is no longer
run without asking, because it makes something.

```quint
pure def allowListed(operation: Operation, typed: bool): bool =
  operation == Show or operation == Glance or (operation == OpenPage and typed)
```

### Only a change can be read back to tell how it ended

```quint
pure def provable(operation: Operation): bool = operation == Change
```

### The owner chooses whether Alpha may act directly or must ask first; a choice that cannot be read counts as asking first

The choice is a setting; it reaches the approvals as an event parameter.

```quint
type Preference = Direct | ReviewFirst | Unreadable
```

### The agent never places an emergency call

```quint
pure def emergency(operation: Operation): bool = operation == EmergencyCall
```

### Whatever is on the allow-list changes nothing, cannot be read back, and is never an emergency call

```quint
pure def lawTheAllowListChangesNothing(operation: Operation, typed: bool): bool =
  allowListed(operation, typed) implies (changesNothing(operation) and not(emergency(operation)) and not(provable(operation)))
```

### A web page opens without review only at an address the owner typed

```quint
pure def lawAWebPageNeedsATypedAddress(typed: bool): bool =
  allowListed(OpenPage, typed) iff typed
```
