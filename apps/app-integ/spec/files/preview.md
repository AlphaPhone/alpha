# Files preview

The preview shows the one file the owner tapped, opened from Recent or chose with the system picker. A
tap waits for the Files view, then checks storage access, then asks the device for a selection of that file; the selection is shown only in the visit that
asked for it, and one that arrives after the owner left or moved on is given back unopened. A type the
preview cannot show opens in another app instead, unless that app's reply hands the file back. The
preview's content (text, a PDF page, a picture or a recording) is read once per opening, and a reply for
an earlier opening is ignored. The sandboxed document viewer and the preview are each closed exactly once,
by their own controls, by Back, or by Files leaving the screen.

## Domain

### A shown document is the device's selection of one file and what Files knew of it

`path` and `volume` are empty for a document picked outside Files. `size` is the device's own count
of the file's bytes, or the listing's when the device gave none; `-1` when neither knows. The device
reports a size or a time only when its provider answered it, so `modified` is `0` when unknown and
an unknown size is never shown as zero.

```quint
import storage.* from "./storage"
type DocSource = Browsed | Picked | Remembered
type Doc = { selection: str, path: str, volume: str, name: str, mimeType: str, kind: FileKind, size: int, modified: int, source: DocSource }
type Content = ContentNone | ContentReading | ContentText | ContentPdf | ContentMedia | ContentUnavailable | ContentNeedsReselect
type OpenRoute = PreviewHere | OpenElsewhere
type RenameAnswer = Renamed | RenamedReselect | RenameRefused
type PreviewState = { active: bool, epoch: int, pending: bool, requestedEpoch: int, route: OpenRoute,
  shown: bool, shownEpoch: int, doc: Doc, content: Content, body: str, serial: int, opened: int, closes: int, released: int,
  renaming: bool, viewer: bool, viewerOpened: int, viewerCloses: int }
pure val noDoc: Doc = { selection: "", path: "", volume: "", name: "", mimeType: "", kind: KindOther, size: -1, modified: 0, source: Browsed }
pure val initial: PreviewState = { active: false, epoch: 0, pending: false, requestedEpoch: 0, route: PreviewHere,
  shown: false, shownEpoch: 0, doc: noDoc, content: ContentNone, body: "", serial: 0, opened: 0, closes: 0, released: 0,
  renaming: false, viewer: false, viewerOpened: 0, viewerCloses: 0 }
pure def openRoute(previewable: bool, elsewhere: bool): OpenRoute = if (not(previewable) and elsewhere) OpenElsewhere else PreviewHere
pure def lawAPreviewableFileStaysHere(elsewhere: bool): bool = openRoute(true, elsewhere) == PreviewHere
```

### What the simulator tries

```quint
pure val docA: Doc = { selection: "s1", path: "Download/a.pdf", volume: "", name: "a.pdf", mimeType: "application/pdf", kind: KindPdf, size: 10, modified: 2, source: Browsed }
pure val docB: Doc = { selection: "s2", path: "", volume: "", name: "photo.jpg", mimeType: "image/jpeg", kind: KindImage, size: 2000000, modified: 3, source: Picked }
pure val docValues = Set(docA, docB)
pure val serialValues = Set(1, 2)
pure val bodyValues = Set("", "lease text")
```

## Story: Open the file I tapped, and only in the visit I tapped it

> As the owner, I want a tap to open that file, a file Files cannot show to open in another app, and
> nothing to open after I left Files or tapped something else.

### One open is asked for at a time, and its selection is shown only in the visit that asked

Leaving or entering Files starts a new visit. A selection granted for an earlier visit is released: it
is never shown, and the shell gives it back to the device.

```quint
pure def canEnterPreview(s: PreviewState): bool = not(s.active)
pure def enterPreview(s: PreviewState): PreviewState = { ...s, active: true, epoch: s.epoch + 1 }
pure def canLeavePreview(s: PreviewState): bool = s.active
pure def leavePreview(s: PreviewState): PreviewState =
  { ...s, active: false, epoch: s.epoch + 1, shown: false, content: ContentNone, body: "", renaming: false, viewer: false,
    closes: s.closes + (if (s.shown) 1 else 0), viewerCloses: s.viewerCloses + (if (s.viewer) 1 else 0) }
pure def canRequestOpen(s: PreviewState): bool = s.active and not(s.pending) and not(s.renaming)
pure def requestOpen(s: PreviewState, previewable: bool, elsewhere: bool): PreviewState =
  { ...s, pending: true, requestedEpoch: s.epoch, route: openRoute(previewable, elsewhere) }
pure def canOpenReply(s: PreviewState): bool = s.pending
pure def openReply(s: PreviewState, granted: bool, doc: Doc): PreviewState = {
  val isCurrent = s.active and s.requestedEpoch == s.epoch
  if (granted and isCurrent)
    { ...s, pending: false, shown: true, shownEpoch: s.epoch, doc: doc, content: ContentReading, body: "", serial: s.serial + 1,
      opened: s.opened + 1, closes: s.closes + (if (s.shown) 1 else 0), viewer: false,
      viewerCloses: s.viewerCloses + (if (s.viewer) 1 else 0) }
  else { ...s, pending: false, released: s.released + (if (granted) 1 else 0) }
}
pure def alwaysAShownFileBelongsToThisVisit(s: PreviewState): bool = s.shown implies (s.active and s.shownEpoch == s.epoch)
pure def alwaysEachOpeningClosesOnce(s: PreviewState): bool = s.opened - s.closes == (if (s.shown) 1 else 0)
pure def stepALateSelectionIsReleasedNotShown(before: PreviewState, via: str, after: PreviewState): bool =
  (via == "openReply" and not(before.active and before.requestedEpoch == before.epoch)) implies
    (after.shown == before.shown and after.doc == before.doc and after.opened == before.opened)
pure def sometimesALateSelectionIsReleased(s: PreviewState): bool = s.released > 0 and not(s.shown)
pure def sometimesOpenedElsewhere(s: PreviewState): bool = s.route == OpenElsewhere and not(s.pending) and not(s.shown)
```

### The content shown is the reply for this opening

`body` is the text read, or the address of the picture or recording the device serves for this
selection.

```quint
pure def canContentReply(s: PreviewState, serial: int): bool = s.shown and serial >= 1 and serial <= s.serial
pure def contentReply(s: PreviewState, serial: int, content: Content, body: str): PreviewState =
  if (serial != s.serial or content == ContentNone or content == ContentReading) s else { ...s, content: content, body: body }
pure def canClosePreview(s: PreviewState): bool = s.shown and not(s.renaming)
pure def closePreview(s: PreviewState): PreviewState =
  { ...s, shown: false, content: ContentNone, body: "", closes: s.closes + 1, viewer: false, viewerCloses: s.viewerCloses + (if (s.viewer) 1 else 0) }
pure def sometimesShowsAPdf(s: PreviewState): bool = s.shown and s.content == ContentPdf
```

### A rename shows the same file under its new name, or asks to choose it again

A provider that renamed a file but kept no access asks the owner to choose the renamed file again.

```quint
pure def canBeginRename(s: PreviewState): bool = s.shown and not(s.renaming) and s.content != ContentNeedsReselect
pure def beginRename(s: PreviewState): PreviewState = { ...s, renaming: true }
pure def canRenameReply(s: PreviewState): bool = s.renaming
pure def renameReply(s: PreviewState, answer: RenameAnswer, doc: Doc): PreviewState =
  if (answer == Renamed) { ...s, renaming: false, doc: { ...doc, source: s.doc.source }, content: ContentReading, body: "", serial: s.serial + 1 }
  else if (answer == RenamedReselect) { ...s, renaming: false, content: ContentNeedsReselect }
  else { ...s, renaming: false }
pure def sometimesReselectAfterRename(s: PreviewState): bool = s.shown and s.content == ContentNeedsReselect
```

### The document viewer opens over the preview and closes exactly once

```quint
pure def canOpenViewer(s: PreviewState): bool = s.shown and not(s.viewer)
pure def openViewer(s: PreviewState): PreviewState = { ...s, viewer: true, viewerOpened: s.viewerOpened + 1 }
pure def canCloseViewer(s: PreviewState): bool = s.viewer
pure def closeViewer(s: PreviewState): PreviewState = { ...s, viewer: false, viewerCloses: s.viewerCloses + 1 }
pure def alwaysTheViewerClosesOnce(s: PreviewState): bool =
  s.viewerOpened - s.viewerCloses == (if (s.viewer) 1 else 0) and (s.viewer implies s.shown)
pure def sometimesViewerReopened(s: PreviewState): bool = s.viewer and s.viewerOpened == 2
```

## Story: Do something with the file I am looking at

> As the owner, I want the file's menu to offer only what this file allows: email a document, send a
> small picture by Messages, ask Alpha about what I can read, and move, rename or trash a file I
> browsed to.

### Each preview action is offered exactly when the file allows it

Email takes plain text, PDF, PNG, JPEG and WebP. Messages takes a PNG or JPEG of known size within the
1 MiB picture limit, on the AOSP image. Ask Alpha needs readable text, a picture or a rendered PDF
page. A file picked outside Files is not in a folder Files knows, so it cannot be moved or trashed
here.

```quint
pure val mmsPictureBytes = 1048576
pure def emailable(mimeType: str): bool =
  mimeType == "text/plain" or mimeType == "application/pdf" or mimeType == "image/png" or mimeType == "image/jpeg" or mimeType == "image/webp"
pure def messageable(mimeType: str, bytes: int): bool = (mimeType == "image/png" or mimeType == "image/jpeg") and bytes > 0 and bytes <= mmsPictureBytes
pure def askable(s: PreviewState): bool = s.shown and (s.content == ContentText or s.content == ContentPdf or (s.content == ContentMedia and s.doc.kind == KindImage))
pure def linkable(s: PreviewState): bool = s.doc.selection != "" and emailable(s.doc.mimeType)
pure def inFolder(s: PreviewState): bool = s.shown and s.doc.source == Browsed and s.doc.path != ""
pure val mimeTypeValues = Set("image/png", "image/gif", "application/pdf")
pure val bytesValues = Set(-1, 0, 1048576, 1048577)
pure def lawMessagesTakeOnlySmallPictures(mimeType: str, bytes: int): bool = messageable(mimeType, bytes) implies (bytes <= mmsPictureBytes and emailable(mimeType))
```
