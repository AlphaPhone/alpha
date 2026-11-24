# Adoption

What the earlier Alpha kept on the phone, carried into the stores this
Alpha keeps it in. The earlier Alpha kept drafts and pending records in
encrypted slots of its own connection plugin, and preferences and saved
places under its own keys of the page's storage. This Alpha keeps secrets
in the phone's secure store and each machine's state under the machine's
own key. The earlier on-device agent's store is kept aside, unread, for a
later import. An area that owned something the earlier Alpha kept names the
earlier place beside its own, and the value moves the first time the area
reads it; which places an area adopts is the area's to say.

## Story: Keep what the earlier Alpha kept

> As the owner, I want the drafts, pending records, preferences and places
> the earlier Alpha kept to be there after the update, and never to lose
> one in the move.

### A value is moved by copying it only where the new place is still empty, and its earlier place is cleared only once the new place holds a value

The copy is the area's own reading of the earlier value as what it keeps
now. A value the new place already holds, the copy or a newer one the area
saved since, wins. A value that could not be read, copied or written stays
where it was, to be moved on a later reading; an earlier place that could
not be cleared is cleared on a later reading, once the new place is seen
to hold a value.

```quint
type Adoption = NothingToAdopt | Adopted | AlreadyKept | NotAdopted

pure def adoptionOf(earlierHeld: bool, currentHeld: bool, copied: bool): Adoption =
  if (not(earlierHeld)) NothingToAdopt
  else if (currentHeld) AlreadyKept
  else if (copied) Adopted
  else NotAdopted

pure def earlierCleared(a: Adoption): bool = a == Adopted or a == AlreadyKept

pure def lawAnEarlierValueIsClearedOnlyWhenTheNewPlaceHoldsOne(earlierHeld: bool, currentHeld: bool, copied: bool): bool =
  earlierCleared(adoptionOf(earlierHeld, currentHeld, copied)) implies (currentHeld or copied)

pure def lawAnUncopiedValueStaysWhereItWas(earlierHeld: bool): bool = not(earlierCleared(adoptionOf(earlierHeld, false, false)))

pure def lawANewerValueIsNeverOverwritten(earlierHeld: bool, copied: bool): bool =
  adoptionOf(earlierHeld, true, copied) != Adopted
```

## Story: Keep what the earlier on-device agent stored

> As the owner, I want my phone's agent to start after the update without
> losing what the earlier agent kept, so that my conversations, memories,
> schedules and workflows can still be brought in.

### The earlier agent's store and runtime are moved aside by rename, and never opened, changed or deleted

The earlier agent kept its PGlite store and workspace in
`files/.eliza/workspace` and its runtime in `files/agent`, which is now the
parent of eliza's per-account state directories. eliza's agent keeps its
own store and never reads or migrates an older one. So before every launch
Alpha's host moves the earlier workspace to
`files/agent-legacy/eliza-workspace` and, while the earlier runtime's
`agent-bundle.js` is still in `files/agent`, every entry there that is not
an account state directory to `files/agent-legacy/payload`, the bundle
last, so a launch that stops part way looks again next time. Each move is
one rename within the app's files: nothing is copied, opened, rewritten or
deleted, and a link is moved as the link. A source moves only to a name the
archive does not hold; otherwise, or when the rename fails, it stays where
it is and is tried again at the next launch. The launch never waits on the
move and is never refused by it. Only erasing Alpha's data removes the
archive.

```quint
type Move = NothingToMove | MovedAside | KeptInPlace

pure def moveOf(sourceHeld: bool, archiveHeld: bool, renamed: bool): Move =
  if (not(sourceHeld)) NothingToMove
  else if (archiveHeld or not(renamed)) KeptInPlace
  else MovedAside

pure def lawASourceMovesOnlyIntoAFreeArchiveName(sourceHeld: bool, archiveHeld: bool, renamed: bool): bool =
  moveOf(sourceHeld, archiveHeld, renamed) == MovedAside implies (sourceHeld and not(archiveHeld) and renamed)

pure def lawAnArchivedEntryIsNeverWrittenOver(sourceHeld: bool, renamed: bool): bool =
  moveOf(sourceHeld, true, renamed) != MovedAside

pure def lawAFailedRenameKeepsTheSourceInPlace(sourceHeld: bool, archiveHeld: bool): bool =
  sourceHeld implies moveOf(sourceHeld, archiveHeld, false) == KeptInPlace
```
