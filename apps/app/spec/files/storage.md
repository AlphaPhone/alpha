# Files storage

The vocabulary every Files spec shares: a listed row, a storage volume, the place the browser shows,
the owner's access, and what a read of a listing established. Paths are relative to one volume
(`Download/lease.pdf`), the volume root is `""`, and the shell validates names and paths before a row
or a request reaches a spec. A row's `folder` is its parent path and its `kind` is read from its MIME
type, so a rule never parses a string.

## Domain

### A row names one file or folder of one volume by a key unique in its listing

The key is the volume and the path together, so the same path on two volumes is two rows. `children`
is a folder's child count, or `-1` when the device does not know it cheaply.

```quint
type FileKind = KindFolder | KindImage | KindVideo | KindAudio | KindPdf | KindDocument | KindOther
type Row = { key: str, path: str, folder: str, name: str, kind: FileKind, mimeType: str, size: int, modified: int, children: int }
type Volume = { id: str, name: str, primary: bool, free: int, total: int }
type FileCategory = Downloads | Images | Videos | Audio | Documents
type Access = AccessUnknown | AccessGranted | AccessDenied | AccessUnavailable
type ListingOutcome = Unread | Complete | Partial | Failed
type Place = Browse | InCategory({ category: FileCategory }) | InFolder({ path: str, volume: str }) | InTrash
pure val noRow: Row = { key: "", path: "", folder: "", name: "", kind: KindOther, mimeType: "", size: 0, modified: 0, children: -1 }
pure val downloadFolder = "Download"
```

### The device's own bounds

A storage call that changes files takes at most 500 paths or Trash IDs; a share hands at most 100
files to another app; an agent operation names at most 50; Trash keeps an item for 30 days.

```quint
pure val batchMax = 500
pure val shareMax = 100
pure val agentPathsMax = 50
pure val retentionDays = 30
pure val dayMillis = 86400000
```

### What the simulator tries

Two files of the Download folder, a folder, two volumes and the listings made of them.

```quint
pure val rowA: Row = { key: "a", path: "Download/a.pdf", folder: "Download", name: "a.pdf", kind: KindPdf, mimeType: "application/pdf", size: 10, modified: 2, children: -1 }
pure val rowB: Row = { key: "b", path: "Download/b.jpg", folder: "Download", name: "b.jpg", kind: KindImage, mimeType: "image/jpeg", size: 20, modified: 3, children: -1 }
pure val rowC: Row = { key: "c", path: "Download/c", folder: "Download", name: "c", kind: KindFolder, mimeType: "", size: 0, modified: 1, children: 2 }
pure val primaryVolume: Volume = { id: "primary", name: "Internal storage", primary: true, free: 40, total: 100 }
pure val cardVolume: Volume = { id: "card", name: "SD card", primary: false, free: 0, total: 0 }
pure val rowsValues = Set(List(), List(rowA), List(rowA, rowB), List(rowC, rowA))
pure val rowValues = Set(rowA, rowB, rowC)
pure val keyValues = Set("a", "b", "c")
pure val chosenValues = Set(List(), List("a"), List("a", "b"))
pure val volumesValues = Set(List(), List(primaryVolume), List(cardVolume, primaryVolume))
pure val vValues = Set(primaryVolume, cardVolume, { ...primaryVolume, free: 100 })
pure val ticketValues = Set(1, 2, 3)
```

## Story: Browse my files by category, folder and volume

> As the owner, I want Downloads, Images, Videos, Audio and Documents to show the files of that kind,
> each volume to open at its root with its free space, and the primary storage first.

### A category lists files of its kind, and Downloads is the Download folder itself

A folder is never in a category. Documents are PDFs and office or text documents anywhere in shared
storage.

```quint
pure def isDocument(kind: FileKind): bool = kind == KindPdf or kind == KindDocument
pure def inCategory(category: FileCategory, row: Row): bool =
  row.kind != KindFolder and (
    if (category == Downloads) row.folder == downloadFolder
    else if (category == Images) row.kind == KindImage
    else if (category == Videos) row.kind == KindVideo
    else if (category == Audio) row.kind == KindAudio
    else isDocument(row.kind))
pure def lawAFolderIsInNoCategory(category: FileCategory, row: Row): bool = row.kind == KindFolder implies not(inCategory(category, row))
```

### The primary volume is listed first, and its used share is a whole percentage of what is known

A volume that reports no total, such as the browser's app storage, shows no bar.

```quint
pure def primaryFirst(volumes: List[Volume]): List[Volume] = volumes.select(v => v.primary).concat(volumes.select(v => not(v.primary)))
pure def usedPercent(v: Volume): int = if (v.total > 0 and v.free >= 0 and v.free <= v.total) (100 * (v.total - v.free)) / v.total else 0
pure def showsBar(v: Volume): bool = v.total > 0
pure def lawPrimaryFirstKeepsEveryVolume(volumes: List[Volume]): bool = primaryFirst(volumes).length() == volumes.length()
pure def lawUsedIsAPercentage(v: Volume): bool = usedPercent(v) >= 0 and usedPercent(v) <= 100
```

## Story: Never be told a folder is empty when Files could not know

> As the owner, I want Files to say a folder or search is empty only after it read all of it, and to
> keep showing what it could read when a read is partial.

### Only a complete read with no rows is empty; a partial read keeps its rows

```quint
pure def claimsEmpty(outcome: ListingOutcome, rows: List[Row]): bool = outcome == Complete and rows.length() == 0
pure def keptRows(outcome: ListingOutcome, rows: List[Row]): List[Row] = if (outcome == Failed or outcome == Unread) List() else rows
pure def lawOnlyACompleteReadIsEmpty(rows: List[Row]): bool =
  not(claimsEmpty(Partial, rows)) and not(claimsEmpty(Failed, rows)) and not(claimsEmpty(Unread, rows))
pure def lawAPartialReadKeepsItsRows(rows: List[Row]): bool = keptRows(Partial, rows) == rows
```

### A selection keeps only the keys the listing still shows

```quint
pure def listed(rows: List[Row], key: str): bool = rows.some(r => r.key == key)
pure def pruned(chosen: List[str], rows: List[Row]): List[str] = chosen.select(k => listed(rows, k))
pure def noRepeats(chosen: List[str]): bool = chosen.every(k => chosen.select(other => other == k).length() == 1)
pure def lawPrunedKeysAreListed(chosen: List[str], rows: List[Row]): bool = pruned(chosen, rows).every(k => listed(rows, k))
pure def lawPruningKeepsDistinctKeysDistinct(chosen: List[str], rows: List[Row]): bool = noRepeats(chosen) implies noRepeats(pruned(chosen, rows))
```

## Story: Get my trashed files back for 30 days

> As the owner, I want each Trash item to tell me how many days it has left, and an item past its 30
> days to have none.

### An item's days left count down from 30 and never go below zero

```quint
pure def trashDaysLeft(deletedAt: int, now: int): int = {
  val left = deletedAt + retentionDays * dayMillis - now
  if (left <= 0) 0 else (left + dayMillis - 1) / dayMillis
}
pure val deletedAtValues = Set(0, 1)
pure val nowValues = Set(0, 1, 2592000000, 2592000001)
pure def lawTrashDaysNeverExceedRetention(deletedAt: int, now: int): bool =
  now >= deletedAt implies trashDaysLeft(deletedAt, now) <= retentionDays
pure def lawExpiredTrashHasNoDaysLeft(deletedAt: int, now: int): bool =
  now >= deletedAt + retentionDays * dayMillis implies trashDaysLeft(deletedAt, now) == 0
```
