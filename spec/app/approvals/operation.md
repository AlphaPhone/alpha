# Operation

The words the approvals share: who sends an event, and what kind of thing
the agent asks the phone to do. Whether an operation may run without the
owner's review depends only on its kind.

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

### An operation shows something, reads the owner's things, changes something, or is an emergency call

Showing is the allow-list: opening an app, a Settings page, a web page the
owner typed, a file or a photo. Reading takes the owner's notes, messages
or calendar into the conversation. Changing creates, edits, deletes, sends
or calls.

```quint
type Operation = Show | Look | Change | EmergencyCall

pure def changesNothing(operation: Operation): bool = operation == Show or operation == Look
```

### Only showing is on the allow-list of what may run without review

```quint
pure def allowListed(operation: Operation): bool = operation == Show
```

### The agent never places an emergency call

```quint
pure def emergency(operation: Operation): bool = operation == EmergencyCall
```

### Whatever is on the allow-list changes nothing, and is never an emergency call

```quint
pure def lawTheAllowListChangesNothing(operation: Operation): bool =
  allowListed(operation) implies (changesNothing(operation) and not(emergency(operation)))
```
