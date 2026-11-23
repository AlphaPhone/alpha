# Web source dialog

A summary note saved from a web page keeps that page as its source. Opening the source is the owner's
action, never an automatic fetch while the note renders: a dialog shows the page's name and address and
offers Open source page and Remove web source. A dialog accepts one action and never re-enables its
controls; a dialog that is closed, hidden, left or over a changed note accepts none.

## Story: Visit or remove the web page a note came from

> As the owner, I want to open the page a summary came from, or take the link out of the note, only from
> the dialog over that exact note.

### One action per dialog, only while the dialog is fresh over the note it reviewed

Closing aborts a visit that has not started, and a visit that happened closes the dialog. A saved removal
lands even when its dialog is gone, and a removal that is not confirmed says Unconfirmed in its open
dialog. A dialog left open over a note whose link was removed can no longer act. Before a dialog opens it
takes whether the note in front carries a link, so a removal on one note never keeps the dialog of another
note's link from opening.

```quint
type DialogAction = NoAction | VisitAction | RemoveAction
type SourceDialog = { visit: bool, hidden: bool, rev: int, linked: bool, gen: int, opened: bool, expected: int,
  busy: bool, acted: int, unconfirmed: bool, op: DialogAction, opGen: int, edits: int, navigations: int,
  removals: int, refused: int }
pure val initial: SourceDialog = { visit: true, hidden: false, rev: 0, linked: true, gen: 0, opened: false, expected: 0,
  busy: false, acted: 0, unconfirmed: false, op: NoAction, opGen: 0, edits: 0, navigations: 0, removals: 0, refused: 0 }
pure def fresh(s: SourceDialog): bool = s.opened and s.visit and s.rev == s.expected
pure def shown(s: SourceDialog): bool = s.opGen == s.gen and s.opened
pure def canShowLink(s: SourceDialog, linked: bool): bool = not(s.opened)
pure def showLink(s: SourceDialog, linked: bool): SourceDialog = { ...s, linked: linked }
pure def canOpenDialog(s: SourceDialog): bool = s.visit and not(s.hidden) and s.linked
pure def openDialog(s: SourceDialog): SourceDialog =
  { ...s, gen: s.gen + 1, opened: true, expected: s.rev, busy: false, acted: 0, unconfirmed: false }
pure def canCloseDialog(s: SourceDialog): bool = s.opened
pure def closeDialog(s: SourceDialog): SourceDialog = { ...s, opened: false }
pure def canLeaveVisit(s: SourceDialog): bool = s.visit
pure def leaveVisit(s: SourceDialog): SourceDialog = { ...s, visit: false, opened: false }
pure def canEnterVisit(s: SourceDialog): bool = not(s.visit)
pure def enterVisit(s: SourceDialog): SourceDialog = { ...s, visit: true }
pure def canHideDialogPage(s: SourceDialog): bool = not(s.hidden)
pure def hideDialogPage(s: SourceDialog): SourceDialog = { ...s, hidden: true, opened: false }
pure def canShowDialogPage(s: SourceDialog): bool = s.hidden
pure def showDialogPage(s: SourceDialog): SourceDialog = { ...s, hidden: false }
pure def outsideEdit(s: SourceDialog): SourceDialog = { ...s, rev: s.rev + 1, edits: s.edits + 1 }
pure def canAct(s: SourceDialog, kind: DialogAction): bool = kind != NoAction and s.opened and (s.busy or s.op == NoAction)
pure def act(s: SourceDialog, kind: DialogAction): SourceDialog =
  if (s.busy or not(fresh(s))) { ...s, refused: s.refused + 1 } else { ...s, busy: true, acted: s.acted + 1, op: kind, opGen: s.gen }
pure def canVisitSettled(s: SourceDialog, ok: bool): bool = s.op == VisitAction and (not(ok) or shown(s))
pure def visitSettled(s: SourceDialog, ok: bool): SourceDialog =
  if (ok) { ...s, op: NoAction, navigations: s.navigations + 1, opened: false }
  else { ...s, op: NoAction, unconfirmed: if (shown(s)) true else s.unconfirmed }
pure def canRemoveSettled(s: SourceDialog, saved: bool): bool = s.op == RemoveAction
pure def removeSettled(s: SourceDialog, saved: bool): SourceDialog =
  if (saved) { ...s, op: NoAction, linked: false, rev: s.rev + 1, removals: s.removals + 1, opened: if (s.opGen == s.gen) false else s.opened }
  else { ...s, op: NoAction, unconfirmed: if (shown(s)) true else s.unconfirmed }
pure def alwaysOneActionPerDialog(s: SourceDialog): bool = (s.acted == 0 or s.acted == 1) and ((s.acted == 1) == s.busy)
pure def alwaysHiddenOrLeftPageHasNoDialog(s: SourceDialog): bool = s.opened implies (not(s.hidden) and s.visit)
pure def alwaysDialogOverRemovedLinkIsStale(s: SourceDialog): bool = (s.opened and not(s.linked)) implies not(fresh(s))
pure def alwaysUnconfirmedDialogStaysBusy(s: SourceDialog): bool = s.unconfirmed implies s.busy
pure def sometimesVisited(s: SourceDialog): bool = s.navigations > 0 and not(s.opened)
pure def sometimesRemoved(s: SourceDialog): bool = not(s.linked) and s.removals == 1
pure def sometimesUnconfirmedRemoval(s: SourceDialog): bool = s.unconfirmed and s.opened
```
