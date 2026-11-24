# Files

Files browses the phone's shared storage with the owner's all-files access (PRD AP-10): Browse with its
categories, storage volumes and Trash, folders, the agent's read-only filter, and a preview of the file
the owner tapped. Every change acts on the rows the owner selected or reviewed, is sent in chunks the
device accepts, and is reported only from the device's own receipts; a chunk whose result is unknown is
never claimed. A folder is called empty, or a search complete, only after a complete read. The agent
filters and opens files directly; sharing, moving, trashing and new folders are proposals the owner
reviews with Files on screen, and a move or trash carries the identity of each file as the review read
it. Other areas choose a real file through the Files picker. The device's own custody of the files,
their Trash and their read-only handoff is the os package's file storage; this spec states what the
renderer shows and sends. A website's download, and the Browser's Show in Files that opens Files at
Downloads, are the [Browser's downloads](../browser/downloads.md).

| Area | Specifications |
| --- | --- |
| Storage | [Rows, places, volumes and listings](./storage.md) |
| Browsing | [Browser and its reads](./browser.md), [agent filter](./filter.md), [Trash](./trash.md) |
| Changes | [Batches and receipts](./mutations.md), [agent proposals](./proposal.md) |
| Opening | [Preview and its visit](./preview.md), [PDF pages](./pdf.md), [Recent files](./recent.md) |
| Sharing | [Share panel](./share.md), [Email draft](./emailDraft.md), [downloads of selected files](./downloads.md) |
| Choosing | [File picker for other areas](./picker.md) |
