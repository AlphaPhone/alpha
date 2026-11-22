# Mail attachments

What may be attached to an outgoing email, and how a file from Files or Photos reaches a draft. The
bytes themselves are checked by the shell: a supported type's name ends in its extension and its
content starts as that type does (PDF, PNG, JPEG, WebP, or strict UTF-8 text with no NUL); its
SHA-256 and size are taken once and compared at every later step. Nothing is uploaded until Send or
a reviewed Gmail draft save.

## Story: Attach files to an email I write

> As the owner, I want to attach documents and images to an email within what my account accepts,
> and to be told plainly why a file cannot be attached.

### Attachments stay within the account's policy, ten files and 5 MiB, with distinct names

An account without a policy accepts one attachment. Forwarded originals count toward the number of
files and the total size, and share the name space (names compare without case).

```quint
type OutgoingFile = { name: str, nameKey: str, mimeType: str, bytes: int, sha256: str, dataBase64: str }
type ForwardPart = { partId: str, name: str, nameKey: str, mimeType: str, bytes: int }
type AttachmentPolicy = { maximumOutgoing: int, maximumTotalBytes: int }
type Admission = Admitted | TooManyFiles | DuplicateName | TooManyBytes | FileTooLarge
pure val maxFiles: int = 10
pure val maxFileBytes: int = 5242880
pure val defaultPolicy: AttachmentPolicy = { maximumOutgoing: 1, maximumTotalBytes: 5242880 }
pure def smaller(x: int, y: int): int = if (x < y) x else y
pure def fileCap(policy: AttachmentPolicy): int = smaller(policy.maximumOutgoing, maxFiles)
pure def bytesCap(policy: AttachmentPolicy): int = smaller(policy.maximumTotalBytes, maxFileBytes)
pure def totalBytes(files: List[OutgoingFile], parts: List[ForwardPart]): int =
  parts.foldl(files.foldl(0, (n, f) => n + f.bytes), (n, p) => n + p.bytes)
pure def nameTaken(files: List[OutgoingFile], parts: List[ForwardPart], key: str): bool =
  files.some(f => f.nameKey == key) or parts.some(p => p.nameKey == key)
pure def admit(files: List[OutgoingFile], parts: List[ForwardPart], file: OutgoingFile, policy: AttachmentPolicy): Admission =
  if (file.bytes < 0 or file.bytes > maxFileBytes) FileTooLarge
  else if (files.length() + parts.length() >= fileCap(policy)) TooManyFiles
  else if (nameTaken(files, parts, file.nameKey)) DuplicateName
  else if (totalBytes(files, parts) + file.bytes > bytesCap(policy)) TooManyBytes
  else Admitted
pure def lawAnAdmittedFileKeepsTheListWithinPolicy(files: List[OutgoingFile], parts: List[ForwardPart], file: OutgoingFile, policy: AttachmentPolicy): bool =
  admit(files, parts, file, policy) == Admitted implies
    (files.length() + parts.length() + 1 <= fileCap(policy) and totalBytes(files, parts) + file.bytes <= bytesCap(policy)
     and not(nameTaken(files, parts, file.nameKey)))
pure def lawADefaultAccountAcceptsOneFile(file: OutgoingFile, other: OutgoingFile): bool =
  admit(List(other), List(), file, defaultPolicy) != Admitted
pure val pdf: OutgoingFile = { name: "plan.pdf", nameKey: "plan.pdf", mimeType: "application/pdf", bytes: 1000, sha256: "a1", dataBase64: "JVBERi0=" }
pure val filesValues = Set(List()).union(Set(List(pdf)))
pure val partsValues = Set(List()).union(Set(List({ partId: "1", name: "Plan.PDF", nameKey: "plan.pdf", mimeType: "application/pdf", bytes: 5000000 })))
pure val fileValues = Set(pdf).union(Set({ ...pdf, name: "photo.png", nameKey: "photo.png", mimeType: "image/png", bytes: 5242881 }))
  .union(Set({ ...pdf, name: "notes.txt", nameKey: "notes.txt", mimeType: "text/plain", bytes: 300000 }))
pure val otherValues = Set(pdf)
pure val policyValues = Set(defaultPolicy).union(Set({ maximumOutgoing: 20, maximumTotalBytes: 26214400 }))
```

### A file is attached only as the bytes that were reviewed

The picker's file is read, its type and content checked, and its SHA-256 and size compared with the
first read; a file that changed in between is refused and must be chosen again.

```quint
type FileCheck = { typeMatches: bool, firstHash: str, checkedHash: str, firstBytes: int, checkedBytes: int }
pure def fileAccepted(check: FileCheck): bool =
  check.typeMatches and check.firstHash != "" and check.firstHash == check.checkedHash and check.firstBytes == check.checkedBytes
pure def lawAChangedFileIsRefused(check: FileCheck): bool = check.firstHash != check.checkedHash implies not(fileAccepted(check))
pure val checkValues = Set({ typeMatches: true, firstHash: "a1", checkedHash: "a1", firstBytes: 10, checkedBytes: 10 },
  { typeMatches: true, firstHash: "a1", checkedHash: "b2", firstBytes: 10, checkedBytes: 10 },
  { typeMatches: false, firstHash: "a1", checkedHash: "a1", firstBytes: 10, checkedBytes: 10 })
```

## Story: Email a file from Files or Photos

> As the owner, I want Email in Files or Photos to start a new email with that file attached for me
> to finish, without touching an email I had not finished and without sending anything.

### A shared file always starts a new local draft for the account it was reviewed for

The file is read, reviewed and read again; it is added only if the bytes, name and type are the
same each time and the account is still the one the share was started for. An unfinished email is
set aside to Drafts first; a full Drafts shelf, an unfinished email that needs recovery, or the same
file already in the unfinished email refuses the share up front. Nothing is sent.

```quint
type Handoff = { tokenAtStart: str, tokenNow: str, destinationReady: bool, sameBytesTwice: bool, shelfRoom: bool, duplicate: bool }
type HandoffOutcome = FileAdded | AccountChanged | NotReady | FileChanged | DraftsFull | AlreadyAttached
pure def handoffOutcome(h: Handoff): HandoffOutcome =
  if (not(h.destinationReady)) NotReady
  else if (h.tokenNow != h.tokenAtStart) AccountChanged
  else if (not(h.sameBytesTwice)) FileChanged
  else if (h.duplicate) AlreadyAttached
  else if (not(h.shelfRoom)) DraftsFull
  else FileAdded
pure def lawAFileReachesOnlyTheAccountItWasReviewedFor(h: Handoff): bool = handoffOutcome(h) == FileAdded implies h.tokenNow == h.tokenAtStart
pure def lawAChangedFileIsNeverAdded(h: Handoff): bool = not(h.sameBytesTwice) implies handoffOutcome(h) != FileAdded
pure val hValues = Set({ tokenAtStart: "o1", tokenNow: "o1", destinationReady: true, sameBytesTwice: true, shelfRoom: true, duplicate: false },
  { tokenAtStart: "o1", tokenNow: "o2", destinationReady: true, sameBytesTwice: true, shelfRoom: true, duplicate: false },
  { tokenAtStart: "o1", tokenNow: "o1", destinationReady: true, sameBytesTwice: false, shelfRoom: true, duplicate: false },
  { tokenAtStart: "o1", tokenNow: "o1", destinationReady: true, sameBytesTwice: true, shelfRoom: false, duplicate: false })
```

## Story: Hand an attachment to another app

> As the owner, I want to open a received attachment in the phone's viewer or save it to Files, as
> the exact file I reviewed, and to know whether that really happened.

### Opening or saving hands over only the reviewed bytes, and only a confirmed result is reported as done

The viewer gets a temporary read-only copy; Files gets an exact copy whose SHA-256 is checked again
after it was written. Android only confirms that it was asked to open the file. A save that could
not be confirmed says so and is not offered again in the same review; a cancelled save may be
retried. A view left by Back, by leaving the app or by another opening cancels the handoff.

```quint
type HandoffResult = HandedOpened | HandedCancelled | HandedSaved | HandedUnconfirmed
pure def handoffAllowed(reviewedHash: str, currentHash: str, sameView: bool): bool = reviewedHash != "" and reviewedHash == currentHash and sameView
pure def reportsDone(result: HandoffResult): bool = result == HandedOpened or result == HandedSaved
pure def saveOfferedAgain(result: HandoffResult): bool = result == HandedCancelled
pure def lawAnotherViewHandsNothingOver(reviewedHash: str, currentHash: str): bool = not(handoffAllowed(reviewedHash, currentHash, false))
pure def lawOnlyACancelledSaveIsOfferedAgain(result: HandoffResult): bool = saveOfferedAgain(result) iff result == HandedCancelled
pure val reviewedHashValues = Set("", "a1")
pure val currentHashValues = Set("a1", "b2")
```
