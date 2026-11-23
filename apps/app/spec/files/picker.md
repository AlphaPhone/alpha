# File picker

How another area, such as the assistant's composer or an email draft, has the owner choose real files:
from the folders of the phone's storage, or from the system document picker. A file chosen from
storage is checked when it is tapped: its identity is read twice around a fresh listing of its folder,
and it is chosen only when all of them agree. Its bytes are read again when the owner attaches, and
must still be that file. The picker answers its caller once, with the files attached or with none, and a
read or listing that answers after it closed changes nothing. While it is open the picker is a sheet
layer in the shell's navigation, over whichever app opened it, so Back or HOME dismisses it and its
caller gets no files.

## Domain

### One picker session and the files chosen in it

`token` is the reviewed identity of a file chosen from storage, and empty for one the system picker
handed over.

```quint
import storage.* from "./storage"
type PickerOutcome = Choosing | Attached | Dismissed
type PickerError = NoError | TooMany | FileChanged | Unsupported | ReadFailed | AccessNeeded
type Picked = { key: str, name: str, mimeType: str, size: int, token: str }
type Picker = { open: bool, epoch: int, ticket: int, path: str, rows: List[Row], listing: ListingOutcome, loading: bool,
  reading: str, attaching: bool, maximum: int, selected: List[Picked], outcome: PickerOutcome, error: PickerError, delivered: int }
pure val initial: Picker = { open: false, epoch: 0, ticket: 0, path: "", rows: List(), listing: Unread, loading: false,
  reading: "", attaching: false, maximum: 0, selected: List(), outcome: Dismissed, error: NoError, delivered: 0 }
pure def chosen(s: Picker, key: str): bool = s.selected.some(p => p.key == key)
pure def rowOf(s: Picker, key: str): Row = s.rows.foldl(noRow, (found, r) => if (r.key == key) r else found)
pure def busy(s: Picker): bool = s.reading != "" or s.attaching
pure val maximumValues = Set(1, 2, 10)
pure val tokenValues = Set("", "t1")
pure val filesValues = Set(List(), List({ key: "device:1", name: "scan.pdf", mimeType: "application/pdf", size: 5, token: "" }))
```

## Story: Choose a file from my phone for another app on Alpha

> As the owner, I want to browse my folders, choose up to the files the caller can take, and attach
> exactly the files I chose, as they are now.

### A picker opens empty, at the storage root, for at most the files its caller can take

```quint
pure def canOpenPicker(s: Picker, maximum: int): bool = not(s.open) and maximum >= 1
pure def openPicker(s: Picker, maximum: int): Picker =
  { ...initial, open: true, epoch: s.epoch + 1, ticket: s.ticket + 1, loading: true, maximum: maximum, outcome: Choosing, delivered: 0 }
pure def canBrowseFolder(s: Picker, path: str): bool = s.open and not(busy(s))
pure def browseFolder(s: Picker, path: str): Picker = { ...s, path: path, ticket: s.ticket + 1, loading: true, rows: List(), listing: Unread, error: NoError }
pure def canFolderReply(s: Picker, ticket: int, result: ListingOutcome): bool = ticket >= 1 and ticket <= s.ticket and result != Unread
pure def folderReply(s: Picker, ticket: int, rows: List[Row], result: ListingOutcome, granted: bool): Picker =
  if (not(s.open) or ticket != s.ticket) s
  else if (not(granted)) { ...s, loading: false, rows: List(), listing: Unread, error: AccessNeeded }
  else { ...s, loading: false, rows: keptRows(result, rows), listing: result }
pure def lawALateFolderReplyChangesNothing(s: Picker, ticket: int, rows: List[Row]): bool =
  ticket != s.ticket implies folderReply(s, ticket, rows, Complete, true) == s
pure val sValues = Set(initial, { ...initial, open: true, epoch: 1, ticket: 2, loading: true, maximum: 2, outcome: Choosing })
```

### A tapped file is chosen only after its identity and its listing agree

A folder opens instead of being chosen; a choice beyond the caller's limit is refused with a reason.

```quint
pure def canReviewFile(s: Picker, key: str): bool =
  s.open and not(busy(s)) and not(s.loading) and listed(s.rows, key) and rowOf(s, key).kind != KindFolder and not(chosen(s, key))
pure def reviewFile(s: Picker, key: str): Picker =
  if (s.selected.length() >= s.maximum) { ...s, error: TooMany } else { ...s, reading: key, error: NoError }
pure def canReviewReply(s: Picker, key: str): bool = s.reading == key and key != ""
pure def reviewReply(s: Picker, key: str, token: str, agrees: bool): Picker = {
  val row = rowOf(s, key)
  if (not(s.open)) s
  else if (agrees and token != "" and listed(s.rows, key))
    { ...s, reading: "", selected: s.selected.append({ key: key, name: row.name, mimeType: row.mimeType, size: row.size, token: token }) }
  else { ...s, reading: "", error: FileChanged }
}
pure def canUnchoose(s: Picker, key: str): bool = s.open and not(busy(s)) and chosen(s, key)
pure def unchoose(s: Picker, key: str): Picker = { ...s, selected: s.selected.select(p => p.key != key), error: NoError }
pure def canDeviceFiles(s: Picker, files: List[Picked]): bool = s.open and not(busy(s)) and files.length() >= 1
pure def deviceFiles(s: Picker, files: List[Picked]): Picker = {
  val room = s.maximum - s.selected.length()
  val taken = files.foldl(List(), (acc, f) => if (acc.length() < room and not(chosen(s, f.key)) and not(acc.some(a => a.key == f.key))) acc.append(f) else acc)
  { ...s, selected: s.selected.concat(taken), error: if (taken.length() < files.length()) TooMany else NoError }
}
pure def alwaysWithinTheCallersLimit(s: Picker): bool = s.selected.length() <= s.maximum
pure def alwaysAReviewHasRoom(s: Picker): bool = s.reading == "" or (s.selected.length() < s.maximum and not(chosen(s, s.reading)))
pure def alwaysEachFileIsChosenOnce(s: Picker): bool = s.selected.every(p => s.selected.select(o => o.key == p.key).length() == 1)
pure def sometimesTwoChosen(s: Picker): bool = s.selected.length() == 2
pure def sometimesAChangedFileRefused(s: Picker): bool = s.error == FileChanged
```

### Attaching reads the chosen files again and answers the caller once

```quint
pure def canAttach(s: Picker): bool = s.open and not(busy(s)) and s.selected.length() > 0
pure def attach(s: Picker): Picker = { ...s, attaching: true, error: NoError }
pure def canAttachReply(s: Picker): bool = s.attaching
pure def attachReply(s: Picker, intact: bool): Picker =
  if (not(s.open)) s
  else if (intact) { ...s, open: false, attaching: false, outcome: Attached, delivered: s.selected.length(), selected: List(), rows: List() }
  else { ...s, attaching: false, error: ReadFailed }
pure def canDismiss(s: Picker): bool = s.open
pure def dismiss(s: Picker): Picker = { ...s, open: false, reading: "", attaching: false, outcome: Dismissed, selected: List(), rows: List(), delivered: 0 }
pure def alwaysAClosedPickerHoldsNothing(s: Picker): bool = not(s.open) implies (s.selected.length() == 0 and s.reading == "" and not(s.attaching))
pure def alwaysOnlyAnAttachedPickerDelivered(s: Picker): bool = s.delivered > 0 implies (s.outcome == Attached and not(s.open))
pure def sometimesAttachedTwo(s: Picker): bool = s.outcome == Attached and s.delivered == 2
pure def sometimesDismissedWhileReading(s: Picker): bool = s.outcome == Dismissed and s.epoch >= 1
```
