# Camera, Photos, scanning and media

Alpha's own Camera and Photos (PRD AP-10): a viewfinder that runs only while
Camera is in front, photos and videos written straight to the phone's media
store, the full photo library Android permits, document scans read on the
device, and every change to a photo reviewed before it is made. The camera,
the library and the system pickers are Android's (`ElizaCamera`,
`AlphaPhotos`, `AlphaPhotoLibrary`, `AlphaNoteDocuments`) reached through the
platform's `Native` service; the lock screen's secure camera stays the
system's. Full photo access is a local permission, never an upload: the
assistant receives only reviewed identities, never file names or pixels it
was not shown.

| Part | Specification |
| --- | --- |
| Viewfinder | [Modes, preview custody, shutter, timer, flash, zoom, recording](./viewfinder.md) |
| Focus | [Tap to focus and the one driver write per track](./focus.md) |
| Agent capture | [The assistant's one requested photo](./agentCapture.md) |
| Recorder | [A browser recording within its size limit](./recorder.md) |
| Library | [The permitted catalog window and Recently deleted](./library.md) |
| Browse | [Selection, the viewer, batches and the read-only filter](./browse.md) |
| Albums | [Album dialogs and album storage](./albums.md) |
| Agent requests | [The assistant's select, open, album, share and filter requests over Photos](./agentLibrary.md) |
| Library review | [The assistant's reviewed library changes and identity-only reads](./libraryReview.md) |
| Edit | [Photo edits and saved copies](./edit.md) |
| Copy request | [The pending saved-copy request that survives a restart](./copyIntent.md) |
| Video edit | [Trim, rotate and crop a video copy](./videoEdit.md) |
| Scan | [Scan pages, drafts, export and Keep](./scan.md) |
| Scan dialogs | [Text review, searchable review, correction, page capture and system pickers](./scanDialogs.md) |
| Media | [Selected media, reviewed bytes, questions about a photo and previews](./media.md) |
| Notices | [The one short line over Camera and Photos](./notices.md) |
