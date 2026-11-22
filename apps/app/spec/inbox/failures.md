# What an Inbox failure means

Every failure of a Gmail read or change is shown as one of a few kinds, each with its own short
sentence and a retry where one can help. The kind decides what stays on screen: only a revocation
closes the open message and drops saved mail; any other failure keeps what the owner was reading.

## Story: Understand why Gmail did not answer

> As the owner, I want a failed read or change to tell me in a word or two what went wrong and what
> I can do, and never to lose the message I was reading because of it.

### A failure is classified by its cause, in a fixed order

A refused attachment is a decision about the file, never Gmail being unavailable. Next comes being
offline. A Cloud answer is classified by its code first (reauthorization, stale revision, not
found), then by its status: 403 and 404 mean the access was revoked, 409 means revoked for a read
and stale for a change, 400 and 413 mean Gmail refused the request. A transport error whose message
names the network counts as offline; anything else is unavailable.

```quint
type FailureKind = NoFailure | Offline | Revoked | Stale | Gone | Refused | Rejected | Unavailable
type FailureContext = ReadContext | OperationContext
type ProtocolCode = NoCode | ReauthRequired | StaleRevision | NotFoundCode | OtherCode
type FailureInput = { refusedAttachment: bool, offline: bool, protocol: bool, http: bool, status: int, code: ProtocolCode, networkMessage: bool }
pure def httpKind(f: FailureInput, context: FailureContext): FailureKind =
  if (f.code == ReauthRequired) Revoked else if (f.code == StaleRevision) Stale else if (f.code == NotFoundCode) Gone
  else if (f.status == 403 or f.status == 404) Revoked
  else if (f.status == 409) (if (context == ReadContext) Revoked else Stale)
  else if (f.status == 400 or f.status == 413) Rejected
  else Unavailable
pure def classify(f: FailureInput, context: FailureContext): FailureKind =
  if (f.refusedAttachment) Refused
  else if (f.offline) Offline
  else if (f.protocol) (if (f.http) httpKind(f, context) else Unavailable)
  else if (f.networkMessage) Offline
  else Unavailable
pure def lawEveryFailureHasAKind(f: FailureInput, context: FailureContext): bool = classify(f, context) != NoFailure
pure def lawARefusedFileIsNeverUnavailable(f: FailureInput, context: FailureContext): bool =
  f.refusedAttachment implies classify(f, context) == Refused
pure def lawAConflictIsStaleOnlyForAChange(f: FailureInput): bool =
  (f.protocol and f.http and f.status == 409 and f.code == NoCode and not(f.refusedAttachment) and not(f.offline)) implies
    (classify(f, ReadContext) == Revoked and classify(f, OperationContext) == Stale)
pure val fValues = Set(
  { refusedAttachment: false, offline: false, protocol: true, http: true, status: 409, code: NoCode, networkMessage: false },
  { refusedAttachment: false, offline: false, protocol: true, http: true, status: 403, code: NoCode, networkMessage: false },
  { refusedAttachment: false, offline: false, protocol: true, http: true, status: 400, code: StaleRevision, networkMessage: false },
  { refusedAttachment: true, offline: true, protocol: false, http: false, status: 0, code: NoCode, networkMessage: false },
  { refusedAttachment: false, offline: false, protocol: false, http: false, status: 0, code: NoCode, networkMessage: true },
  { refusedAttachment: false, offline: false, protocol: true, http: false, status: 0, code: OtherCode, networkMessage: false })
```

### Only a revocation closes the open message and its saved mail

Offline, stale, gone, refused, rejected and unavailable failures keep the open message, the list and
its Load more cursor on screen with a retry. A revocation drops them and checks the accounts again.

```quint
pure def closesMail(kind: FailureKind): bool = kind == Revoked
pure def offersRetry(kind: FailureKind): bool = kind != NoFailure and kind != Refused
pure def lawOnlyRevocationClosesMail(kind: FailureKind): bool = closesMail(kind) iff kind == Revoked
pure def lawAFailureOffersRetryUnlessTheFileWasRefused(kind: FailureKind): bool =
  (kind != NoFailure and kind != Refused) implies offersRetry(kind)
```

### An unreadable or oversized attachment download is a refused file

A Cloud answer for an attachment that is not the shape promised, or is too large (413), is a refusal
of that file: it is not opened or saved, and the message stays open.

```quint
pure def attachmentFailure(invalidResponse: bool, status: int, other: FailureKind): FailureKind =
  if (invalidResponse or status == 413) Refused else other
pure def lawAnOversizedAttachmentIsRefused(other: FailureKind): bool = attachmentFailure(false, 413, other) == Refused
```
