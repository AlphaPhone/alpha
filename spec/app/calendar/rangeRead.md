# Reading a reviewed range of the phone's calendars

An approved workflow phone step (`read_calendar_range`, a phone step of the Workflows area) may read the
events of the phone's calendars it names over one reviewed range of at most a week. eliza's
`@elizaos/agent` checks the operation and the result's evidence (`readResult`): every event is from a
named calendar, overlaps the range, is listed once and carries the revision of exactly what is shared.
Alpha supplies the phone's read. A library.

## Story: Let a reviewed step read my phone's calendars for the range I approved

> As the owner, I want an approved step to read only the calendars and the dates I reviewed, only
> titles and times, and nothing when the phone could not read them all.

### A range read runs only on a shown screen, with the phone's Calendar read access granted

A hidden page or a locked screen, or access Android refused, starts nothing.

```quint
pure def rangeReadAdmitted(shown: bool, access: bool): bool = shown and access
pure def lawHiddenNeverReads(access: bool): bool = not(rangeReadAdmitted(false, access))
pure def lawRefusedAccessNeverReads(shown: bool): bool = not(rangeReadAdmitted(shown, false))
```

### Only a complete read within the limit is shared, with titles and times only

A truncated device read, a read the phone refused, more events than the step allows, or a result
eliza does not admit shares nothing. Places, notes and guests never leave the phone.

```quint
type RangeOutcome = RangeShared | RangeTooMany | RangeIncomplete | RangeUnavailable | RangeUnverified
pure def rangeOutcome(readOk: bool, complete: bool, events: int, maximum: int, admitted: bool): RangeOutcome =
  if (not(readOk)) RangeUnavailable
  else if (not(complete)) RangeIncomplete
  else if (events > maximum) RangeTooMany
  else if (not(admitted)) RangeUnverified
  else RangeShared
pure val eventsValues = Set(0, 1, 201)
pure val maximumValues = Set(1, 200)
pure def lawATruncatedReadSharesNothing(events: int, maximum: int, admitted: bool): bool =
  rangeOutcome(true, false, events, maximum, admitted) != RangeShared
pure def lawOverTheLimitSharesNothing(maximum: int, admitted: bool): bool =
  rangeOutcome(true, true, maximum + 1, maximum, admitted) != RangeShared
```

### An event overlaps the range by its instants, and an all-day event by its local dates

An event without length counts when it begins inside the range. An all-day event's UTC dates are
taken as the same dates in the step's zone.

```quint
pure def overlapsRange(begins: int, ends: int, start: int, end: int): bool =
  if (begins == ends) begins >= start and begins < end else begins < end and ends > start
pure val beginsValues = Set(0, 5, 10)
pure val endsValues = Set(0, 5, 10)
pure val startValues = Set(5)
pure val endValues = Set(10)
pure def lawEndingAtTheStartIsOutside(begins: int): bool = begins < 5 implies not(overlapsRange(begins, 5, 5, 10))
```
