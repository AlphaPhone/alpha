# Email a file

Share → Email from Files or Photos stages the file in a new local email draft, as an Android share
starts a new compose. Tapping Email binds one file and one email account; the file is read, checked,
read again and must be unchanged, and only then does Inbox start a new draft with it. The draft the
owner left unfinished is set aside as it was and never takes the file, and a file that draft already
holds is refused rather than shared into a second email. Nothing is sent: sending is Inbox's own
review.

## Domain

### One attempt to email one file

Files and accounts are numbered by the shell; a change of either retires the attempt.

```quint
type EmailPhase = EmailIdle | EmailReading | EmailReviewing | EmailInserted | EmailFailed | EmailCancelled
type InsertAnswer = InsertedNew | DuplicateRefused | InsertRefused
type EmailShare = { phase: EmailPhase, source: int, reviewedSource: int, account: int, reviewedAccount: int,
  bytes: int, newDraft: bool, foreground: bool, grant: bool }
pure val initial: EmailShare = { phase: EmailIdle, source: 1, reviewedSource: 0, account: 1, reviewedAccount: 0,
  bytes: 0, newDraft: false, foreground: true, grant: true }
pure def bound(s: EmailShare): bool = s.foreground and s.grant and s.reviewedSource == s.source and s.reviewedAccount == s.account
```

## Story: Email a file from Files without touching the draft I was writing

> As the owner, I want Email to start a new draft with exactly the file I chose, keep the draft I left
> unfinished as it was, and stop with one clear reason when the file or account changed.

### Email reads the file it was tapped for, under the account it was tapped in

```quint
pure def canBeginEmail(s: EmailShare): bool =
  (s.phase == EmailIdle or s.phase == EmailFailed or s.phase == EmailInserted) and s.foreground and s.grant
pure def beginEmail(s: EmailShare): EmailShare =
  { ...s, phase: EmailReading, reviewedSource: s.source, reviewedAccount: s.account, bytes: 0, newDraft: false }
pure def canReadDone(s: EmailShare): bool = s.phase == EmailReading
pure def readDone(s: EmailShare, intact: bool): EmailShare =
  if (intact and bound(s)) { ...s, phase: EmailReviewing, bytes: s.source } else { ...s, phase: EmailFailed, bytes: 0 }
```

### Inbox starts a new draft with the file only after a second read matches the first

```quint
pure def canInsertReply(s: EmailShare): bool = s.phase == EmailReviewing
pure def insertReply(s: EmailShare, reread: bool, answer: InsertAnswer): EmailShare =
  if (reread and bound(s) and answer == InsertedNew) { ...s, phase: EmailInserted, newDraft: true }
  else { ...s, phase: EmailFailed, bytes: 0, newDraft: false }
pure def alwaysTheDraftHoldsExactlyTheReviewedFile(s: EmailShare): bool =
  s.phase == EmailInserted implies (s.newDraft and s.bytes == s.reviewedSource and s.account == s.reviewedAccount)
pure def alwaysAFailedAttemptAddsNothing(s: EmailShare): bool = s.phase == EmailFailed implies (not(s.newDraft) and s.bytes == 0)
pure def sometimesInserted(s: EmailShare): bool = s.phase == EmailInserted
pure def sometimesTheFileChangedDuringTheRead(s: EmailShare): bool = s.phase == EmailFailed and s.source != s.reviewedSource
```

### A changed account, leaving the screen or losing the grant cancels the attempt and holds no bytes

A changed file fails the attempt at its next check; the owner taps Email again for the new one.

```quint
pure def changeSource(s: EmailShare): EmailShare = { ...s, source: if (s.source == 1) 2 else 1 }
pure def changeAccount(s: EmailShare): EmailShare =
  { ...s, account: if (s.account == 1) 2 else 1, phase: if (s.phase == EmailIdle) EmailIdle else EmailCancelled, bytes: 0, newDraft: false }
pure def canBackground(s: EmailShare): bool = s.foreground
pure def background(s: EmailShare): EmailShare = { ...s, foreground: false, phase: EmailCancelled, bytes: 0, newDraft: false }
pure def canRevokeGrant(s: EmailShare): bool = s.grant
pure def revokeGrant(s: EmailShare): EmailShare = { ...s, grant: false, phase: EmailCancelled, bytes: 0, newDraft: false }
pure def canRestart(s: EmailShare): bool = s.phase == EmailCancelled
pure def restart(s: EmailShare): EmailShare = { ...s, phase: EmailIdle, foreground: true, grant: true, bytes: 0, newDraft: false }
pure def alwaysACancelledAttemptHoldsNoBytes(s: EmailShare): bool = s.phase == EmailCancelled implies (s.bytes == 0 and not(s.newDraft))
pure def sometimesCancelledByAccount(s: EmailShare): bool = s.phase == EmailCancelled and s.account != s.reviewedAccount and s.reviewedAccount != 0
```
