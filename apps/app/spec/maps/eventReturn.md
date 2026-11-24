# Return to a Calendar event

A Calendar event's location opens Maps on a search for it, once. While Maps
is the view Calendar opened it from, and the owner is not navigating, "Back
to event" re-reads that exact event before returning: the same id and start,
or for a canonical event the same owner binding and revision. A found event
opens its detail page and unwinds Maps; a missing one says "Event moved" and
forgets the origin; a refused permission says "Allow Calendar"; anything else
says "Couldn't check". The origin carries no location or search text and is
never stored. A canonical event is checked through the Calendar area's own
read for the account that handed it over: a different owner or session, or an
owner change during the read, says "Event changed" and forgets the origin.

## Domain

### The return holds the current origin and at most one attempt to check it

```quint
type ReturnReply = EventFound | EventMissing | EventAmbiguous | PermissionNeeded | ReadUnknown | OwnerChanged
type ReturnNotice = NoReturnNotice | EventMoved | EventChanged | AllowCalendar | CouldNotCheck
type EventReturn = {
  inMaps: bool, visible: bool, suspended: bool, navigating: bool, fromCalendar: bool,
  origin: int, lastOrigin: int, active: int, lastAttempt: int, attemptOrigin: int, returned: int, notice: ReturnNotice,
}
pure val initial: EventReturn = {
  inMaps: false, visible: true, suspended: false, navigating: false, fromCalendar: false,
  origin: 0, lastOrigin: 0, active: 0, lastAttempt: 0, attemptOrigin: 0, returned: 0, notice: NoReturnNotice,
}
pure def retireAttempt(keep: bool, s: EventReturn): EventReturn = if (keep) s else { ...s, active: 0, attemptOrigin: 0 }
pure def returnable(o: int, s: EventReturn): bool =
  s.inMaps and s.visible and not(s.suspended) and not(s.navigating) and s.fromCalendar and o > 0 and o == s.origin
pure val originValues = Set(1, 2, 3)
pure val attemptValues = Set(1, 2, 3)
```

## Story: Go back to the event whose place I opened

> As the owner, I want "Back to event" to take me to the event I came from,
> only while it is still there, and never twice.

### An event's place enters Maps with a new origin; leaving, hiding or unloading retires the attempt

```quint
pure def canEnterFromEvent(s: EventReturn): bool = true
pure def enterFromEvent(s: EventReturn): EventReturn =
  { ...retireAttempt(false, s), inMaps: true, fromCalendar: true, navigating: false, origin: s.lastOrigin + 1, lastOrigin: s.lastOrigin + 1, notice: NoReturnNotice }
pure def canLeaveMaps(s: EventReturn): bool = s.inMaps
pure def leaveMaps(s: EventReturn): EventReturn = { ...retireAttempt(false, s), inMaps: false, fromCalendar: false, navigating: false }
pure def canHideReturn(s: EventReturn): bool = s.visible
pure def hideReturn(s: EventReturn): EventReturn = { ...retireAttempt(false, s), visible: false }
pure def canShowReturn(s: EventReturn): bool = not(s.visible)
pure def showReturn(s: EventReturn): EventReturn = { ...s, visible: true }
pure def canPageHide(s: EventReturn): bool = not(s.suspended)
pure def pageHide(s: EventReturn): EventReturn = { ...retireAttempt(false, s), suspended: true }
pure def canPageShow(s: EventReturn): bool = s.suspended
pure def pageShow(s: EventReturn): EventReturn = { ...s, suspended: false }
pure def canSetNavigating(s: EventReturn, on: bool): bool = s.inMaps and on != s.navigating
pure def setNavigating(s: EventReturn, on: bool): EventReturn = { ...s, navigating: on }
pure def canSetFromCalendar(s: EventReturn, on: bool): bool = s.inMaps and on != s.fromCalendar
pure def setFromCalendar(s: EventReturn, on: bool): EventReturn = { ...s, fromCalendar: on }
pure def offered(s: EventReturn): bool = returnable(s.origin, s)
pure def stepAnEventPlaceEntersWithANewOrigin(before: EventReturn, via: str, after: EventReturn): bool =
  via == "enterFromEvent" implies (after.origin > before.lastOrigin and after.origin == after.lastOrigin and after.active == 0)
pure def stepLeavingHidingOrUnloadingRetiresTheAttempt(before: EventReturn, via: str, after: EventReturn): bool =
  (via == "leaveMaps" or via == "hideReturn" or via == "pageHide") implies (after.active == 0 and after.attemptOrigin == 0)
```

### One check per tap, and only its reply for the current origin returns, once

A tap while a check is pending, or when return is not offered, does nothing.
A reply of an earlier visit, or one after Maps left, changes nothing.
A Calendar event is checked for the owner, revision, start and calendar source revision it was opened with,
so a changed calendar selection is not taken for the same event.

```quint
pure def canTapReturn(s: EventReturn, origin: int): bool = returnable(origin, s) and s.active == 0
pure def tapReturn(s: EventReturn, origin: int): EventReturn =
  { ...s, active: s.lastAttempt + 1, lastAttempt: s.lastAttempt + 1, attemptOrigin: origin, notice: NoReturnNotice }
pure def canReturnReply(s: EventReturn, attempt: int, reply: ReturnReply): bool = attempt > 0 and attempt <= s.lastAttempt
pure def returnReply(s: EventReturn, attempt: int, reply: ReturnReply): EventReturn =
  if (attempt != s.active or not(returnable(s.attemptOrigin, s))) s
  else if (reply == EventFound) { ...retireAttempt(false, s), inMaps: false, fromCalendar: false, returned: s.returned + 1, origin: 0 }
  else if (reply == EventMissing or reply == EventAmbiguous) { ...retireAttempt(false, s), origin: 0, notice: EventMoved }
  else if (reply == OwnerChanged) { ...retireAttempt(false, s), origin: 0, notice: EventChanged }
  else { ...retireAttempt(false, s), notice: if (reply == PermissionNeeded) AllowCalendar else CouldNotCheck }
pure def alwaysTheAttemptOwnsTheVisit(s: EventReturn): bool =
  s.active > 0 implies s.attemptOrigin > 0 and s.attemptOrigin == s.origin and s.inMaps and s.visible and not(s.suspended)
pure def alwaysReturnsAtMostOncePerOrigin(s: EventReturn): bool = s.returned <= s.lastOrigin and s.origin <= s.lastOrigin
pure def stepAReturnUnwindsOnce(before: EventReturn, after: EventReturn): bool = after.returned <= before.returned + 1
pure def sometimesReturned(s: EventReturn): bool = s.returned >= 1
pure def sometimesEventMoved(s: EventReturn): bool = s.notice == EventMoved
```
