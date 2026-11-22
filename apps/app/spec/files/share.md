# Files share panel

Share from Files opens one panel of destinations for the file or files the owner selected: another app
through Android's share sheet, a new email draft, Messages for a small picture, or a saved copy. Each
panel is numbered. Only the newest panel on screen can send anything, and it sends once, to the
destination the owner chose, after it closed. A panel opened while Files is hidden is settled unseen;
hiding Files closes the one on screen. When the selection changed after the panel opened, the panel
says so and sends nothing. A failed destination is reported; Files never falls back to another one.

## Domain

### Panels, the destinations each offers and what each sent

```quint
import storage.* from "./storage"
type Destination = SystemSheet | EmailDraft | MessagesPicture | SaveCopy | CancelShare
type DeliveryOutcome = Delivered | DeliveryAborted | DeliveryFailed
type ShareEffect = { panel: int, destination: Destination }
type SharePanel = { seen: int, active: int, hidden: bool, invalid: List[int], emails: List[int], messages: List[int],
  settled: List[int], effects: List[ShareEffect], notice: bool, alerts: int }
pure val initial: SharePanel = { seen: 0, active: 0, hidden: false, invalid: List(), emails: List(), messages: List(),
  settled: List(), effects: List(), notice: false, alerts: 0 }
pure def afterClose(active: int, panel: SharePanel): SharePanel =
  if (active == 0) panel else { ...panel, active: 0, settled: panel.settled.append(active), notice: false }
pure def offers(s: SharePanel, id: int, destination: Destination): bool =
  (destination != EmailDraft or s.emails.includes(id)) and (destination != MessagesPicture or s.messages.includes(id))
pure val idValues = Set(1, 2, 3)
```

## Story: Share the files I selected, to the place I chose

> As the owner, I want Share to send my selection once to the place I tap, nowhere else, and nothing
> at all when I cancel, leave Files or the selection changed.

### A selection reaches Android's share sheet only when it is one to 100 files that are all still there

A folder or a missing file in the selection refuses the share before any of it is handed over.

```quint
pure def chooserAdmits(count: int, folders: int, missing: int): bool = count >= 1 and count <= shareMax and folders == 0 and missing == 0
pure val countValues = Set(0, 1, 100, 101)
pure val foldersValues = Set(0, 1)
pure val missingValues = Set(0, 1)
pure def lawAFolderIsNeverShared(count: int, missing: int): bool = not(chooserAdmits(count, 1, missing))
pure def lawAShareStaysWithinTheLimit(count: int, folders: int, missing: int): bool = chooserAdmits(count, folders, missing) implies count <= shareMax
```

### A new panel retires the one before it, and one opened while Files is hidden is settled unseen

```quint
pure def openPanel(s: SharePanel, email: bool, messages: bool): SharePanel = {
  val id = s.seen + 1
  val previous = afterClose(s.active, s)
  if (s.hidden) { ...previous, seen: id, settled: previous.settled.append(id) }
  else { ...previous, seen: id, active: id, emails: if (email) s.emails.append(id) else s.emails,
    messages: if (messages) s.messages.append(id) else s.messages }
}
pure def canRetirePanel(s: SharePanel): bool = s.active != 0
pure def retirePanel(s: SharePanel): SharePanel = afterClose(s.active, s)
pure def canVisibility(s: SharePanel, hidden: bool): bool = hidden != s.hidden
pure def visibility(s: SharePanel, hidden: bool): SharePanel = if (hidden) afterClose(s.active, { ...s, hidden: true }) else { ...s, hidden: false }
pure def alwaysTheActivePanelIsUnsettled(s: SharePanel): bool = s.active != 0 implies (not(s.hidden) and not(s.settled.includes(s.active)))
```

### A changed selection retires the panel with a notice, and nothing is sent from it

```quint
pure def canInvalidate(s: SharePanel): bool = s.active != 0 and not(s.invalid.includes(s.active))
pure def invalidate(s: SharePanel): SharePanel = { ...s, invalid: s.invalid.append(s.active) }
pure def canPoll(s: SharePanel): bool = s.active != 0
pure def poll(s: SharePanel): SharePanel = if (s.invalid.includes(s.active)) afterClose(s.active, s) else s
pure def alwaysTheNoticeBelongsToAStaleSelection(s: SharePanel): bool = s.notice implies (s.active != 0 and s.invalid.includes(s.active))
```

### The owner's choice sends once, from the panel on screen, after it closed

```quint
pure def canChoose(s: SharePanel, id: int, destination: Destination): bool = id >= 1 and id <= s.seen
pure def choose(s: SharePanel, id: int, destination: Destination, outcome: DeliveryOutcome): SharePanel = {
  val previous = afterClose(s.active, s)
  if (id != s.active or s.hidden or not(offers(s, id, destination))) s
  else if (s.invalid.includes(id)) { ...s, notice: true }
  else if (destination == CancelShare) previous
  else { ...previous, effects: s.effects.append({ panel: id, destination: destination }),
    alerts: if (outcome == DeliveryFailed) s.alerts + 1 else s.alerts }
}
pure def alwaysAnEffectFollowsItsPanelsClose(s: SharePanel): bool =
  s.effects.every(e => s.settled.includes(e.panel) and offers(s, e.panel, e.destination) and e.destination != CancelShare)
pure def alwaysEachPanelSendsOnce(s: SharePanel): bool = s.effects.every(e => s.effects.select(o => o.panel == e.panel).length() == 1)
pure def sometimesEmailed(s: SharePanel): bool = s.effects.some(e => e.destination == EmailDraft)
pure def sometimesAStaleSelectionNotified(s: SharePanel): bool = s.notice
pure def sometimesAFailureReported(s: SharePanel): bool = s.alerts > 0 and s.effects.length() == 1
```
