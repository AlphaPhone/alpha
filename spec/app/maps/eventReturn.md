# Back to the event

A Calendar event's location opens [Maps](./index.md) on a search for it,
once. While Maps is the view Calendar opened it from, and the owner is not
navigating, Back to event reads that exact event again before returning: the
same event, start, owner and revision it was opened with. A found event
opens its page and leaves Maps; a missing one says the event moved and
forgets where Maps came from; a refused permission says to allow Calendar;
anything else says the event could not be checked. Where Maps came from
carries no location or search text and is never stored.

## Story: Go back to the event whose place I opened

> As the owner, I want Back to event to take me to the event I came from,
> only while it is still there, and never twice.

### The return holds where Maps came from and at most one check of it

```quint
type Reply = EventFound | EventMissing | EventAmbiguous | PermissionNeeded | ReadUnknown | OwnerChanged
type Notice = NoNotice | EventMoved | EventChanged | AllowCalendar | CouldNotCheck
type Return = {
  inMaps: bool, visible: bool, navigating: bool, fromCalendar: bool,
  origin: int, lastOrigin: int, active: int, lastAttempt: int, attemptOrigin: int, returned: int, notice: Notice,
}

pure val initial: Return = {
  inMaps: false, visible: true, navigating: false, fromCalendar: false,
  origin: 0, lastOrigin: 0, active: 0, lastAttempt: 0, attemptOrigin: 0, returned: 0, notice: NoNotice,
}

pure def retireAttempt(s: Return): Return = { ...s, active: 0, attemptOrigin: 0 }

pure def returnable(o: int, s: Return): bool = s.inMaps and s.visible and not(s.navigating) and s.fromCalendar and o > 0 and o == s.origin

pure def offered(s: Return): bool = returnable(s.origin, s)

pure val originValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2, 3)
```

### An event's place enters Maps from a new origin, and leaving or hiding Maps retires the check

```quint
pure def canEnterFromEvent(s: Return): bool = true

pure def enterFromEvent(s: Return): Return =
  { ...retireAttempt(s), inMaps: true, fromCalendar: true, navigating: false, origin: s.lastOrigin + 1, lastOrigin: s.lastOrigin + 1, notice: NoNotice }

pure def canLeaveMaps(s: Return): bool = s.inMaps

pure def leaveMaps(s: Return): Return = { ...retireAttempt(s), inMaps: false, fromCalendar: false, navigating: false }

pure def canSeen(s: Return, visible: bool): bool = visible != s.visible

pure def seen(s: Return, visible: bool): Return = if (visible) { ...s, visible: true } else { ...retireAttempt(s), visible: false }

pure def canSetNavigating(s: Return, on: bool): bool = s.inMaps and on != s.navigating

pure def setNavigating(s: Return, on: bool): Return = { ...s, navigating: on }

pure def canSetFromCalendar(s: Return, on: bool): bool = s.inMaps and on != s.fromCalendar

pure def setFromCalendar(s: Return, on: bool): Return = { ...s, fromCalendar: on }
```

### One check per tap, and only its reply for the current origin returns, once

A tap while a check is under way, or when Back to event is not offered,
does nothing. A reply of an earlier visit, or one after Maps left, changes
nothing.

```quint
pure def canTapReturn(s: Return, origin: int): bool = returnable(origin, s) and s.active == 0

pure def tapReturn(s: Return, origin: int): Return =
  { ...s, active: s.lastAttempt + 1, lastAttempt: s.lastAttempt + 1, attemptOrigin: origin, notice: NoNotice }

pure def canReturnReply(s: Return, attempt: int, reply: Reply): bool = attempt > 0 and attempt <= s.lastAttempt

pure def returnReply(s: Return, attempt: int, reply: Reply): Return =
  if (attempt != s.active or not(returnable(s.attemptOrigin, s))) s
  else if (reply == EventFound) { ...retireAttempt(s), inMaps: false, fromCalendar: false, returned: s.returned + 1, origin: 0 }
  else if (reply == EventMissing or reply == EventAmbiguous) { ...retireAttempt(s), origin: 0, notice: EventMoved }
  else if (reply == OwnerChanged) { ...retireAttempt(s), origin: 0, notice: EventChanged }
  else { ...retireAttempt(s), notice: if (reply == PermissionNeeded) AllowCalendar else CouldNotCheck }

pure def alwaysTheCheckOwnsTheVisit(s: Return): bool =
  s.active > 0 implies (s.attemptOrigin > 0 and s.attemptOrigin == s.origin and s.inMaps and s.visible and s.active <= s.lastAttempt)

pure def alwaysReturnsAtMostOncePerOrigin(s: Return): bool = s.returned <= s.lastOrigin and s.origin <= s.lastOrigin and s.origin >= 0

pure def stepAReturnLeavesOnce(before: Return, after: Return): bool = after.returned <= before.returned + 1

pure def sometimesReturned(s: Return): bool = s.returned >= 1

pure def sometimesTheEventMoved(s: Return): bool = s.notice == EventMoved
```
