# Linked attachment

A text note saved from a document keeps a link to that document. Its attachment opens the document the
phone still holds a reference to, or, for an older link that kept only the document's fingerprint, the
exact file the owner picks again through the system picker. Opening never edits the note.

## Story: Open the document a note came from

> As the owner, I want a note's attachment to open the original document, and a different file never to
> be opened in its place.

### A retained reference opens directly; a fingerprint opens only the exact file picked

The open is owned by the note on screen with the same link; leaving Notes, a hidden page or a changed link
retires it. A picked file opens only when its SHA-256, size and type match the link; a mismatch says so
and opens nothing. A picker selection is always released afterwards.

```quint
type AttachStage = AttachIdle | AttachOpening | AttachPick | AttachRead | AttachRelease
type Attachment = { active: bool, linked: bool, referenced: bool, owned: bool, stage: AttachStage, grant: bool, exact: bool,
  opened: int, mismatches: int }
pure val initial: Attachment = { active: true, linked: true, referenced: false, owned: false, stage: AttachIdle, grant: false,
  exact: false, opened: 0, mismatches: 0 }
pure def canConfigure(s: Attachment, linked: bool, referenced: bool): bool = s.stage == AttachIdle
pure def configure(s: Attachment, linked: bool, referenced: bool): Attachment = { ...s, linked: linked, referenced: referenced and linked }
pure def canTap(s: Attachment): bool = s.active and s.linked and s.stage == AttachIdle
pure def tap(s: Attachment): Attachment =
  { ...s, owned: true, stage: if (s.referenced) AttachOpening else AttachPick, exact: s.referenced }
pure def canLeaveAttachment(s: Attachment): bool = s.active
pure def leaveAttachment(s: Attachment): Attachment = { ...s, active: false, owned: false }
pure def canEnterAttachment(s: Attachment): bool = not(s.active)
pure def enterAttachment(s: Attachment): Attachment = { ...s, active: true }
pure def canChangedLink(s: Attachment): bool = s.active
pure def changedLink(s: Attachment): Attachment = { ...s, owned: false }
pure def canChoose(s: Attachment, selected: bool): bool = s.stage == AttachPick
pure def choose(s: Attachment, selected: bool): Attachment =
  if (selected) { ...s, grant: true, stage: if (s.owned) AttachRead else AttachRelease } else { ...s, owned: false, stage: AttachIdle }
pure def canVerify(s: Attachment, matches: bool): bool = s.stage == AttachRead
pure def verify(s: Attachment, matches: bool): Attachment =
  if (matches and s.owned) { ...s, stage: AttachOpening, exact: true }
  else { ...s, stage: AttachRelease, mismatches: if (matches) s.mismatches else s.mismatches + 1 }
pure def canFinishOpen(s: Attachment): bool = s.stage == AttachOpening
pure def finishOpen(s: Attachment): Attachment =
  { ...s, owned: false, stage: if (s.grant) AttachRelease else AttachIdle, exact: false, opened: s.opened + 1 }
pure def canRelease(s: Attachment): bool = s.stage == AttachRelease
pure def release(s: Attachment): Attachment = { ...s, owned: false, grant: false, stage: AttachIdle }
pure def alwaysOpenRequiresExactSource(s: Attachment): bool = s.stage == AttachOpening implies s.exact
pure def alwaysSelectionOwnedByOperation(s: Attachment): bool = s.grant implies (s.stage == AttachRead or s.stage == AttachOpening or s.stage == AttachRelease)
pure def alwaysRetainedLinkSkipsPicker(s: Attachment): bool = (s.referenced and s.stage != AttachIdle) implies not(s.grant)
pure def sometimesOpenedReference(s: Attachment): bool = s.opened >= 1 and s.referenced
pure def sometimesMismatchRefused(s: Attachment): bool = s.mismatches >= 1
```

### A document's grant is released only when neither a saved note nor Trash still refers to it

On Android the phone keeps a document's read grant while a note names its reference, also after the
picker selection that granted it is gone. After a fresh read of both the saved notes and Trash, a
reference no note names, last retained more than three days ago, is removed and its grant released, so a
restored note still opens its source.

```quint
pure def releasesSource(readBoth: bool, liveReference: bool, trashReference: bool, retainedAgoMs: int): bool =
  readBoth and not(liveReference or trashReference) and retainedAgoMs > 259200000
pure val retainedAgoMsValues = Set(0, 259200000, 259200001)
pure def lawRestorableSourceGrantSurvives(readBoth: bool, liveReference: bool, trashReference: bool, retainedAgoMs: int): bool =
  (liveReference or trashReference) implies not(releasesSource(readBoth, liveReference, trashReference, retainedAgoMs))
pure def lawUnreadNotesReleaseNothing(liveReference: bool, trashReference: bool, retainedAgoMs: int): bool =
  not(releasesSource(false, liveReference, trashReference, retainedAgoMs))
```
