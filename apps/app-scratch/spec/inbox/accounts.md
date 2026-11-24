# Gmail accounts and grants

The Inbox shows one Gmail account at a time: the connected Google account the owner chose, as Eliza
Cloud reports it for the current Cloud session. Google connection itself belongs to the account
area; the Inbox reads its account list and asks it for more access. Reading is granted first and on
its own; changing the mailbox (send, Gmail drafts, archive, Trash, read and star changes) is one
later, incremental consent (owner decision P-37).

## Story: Choose which Gmail account my Inbox shows

> As the owner, I want my Inbox to open on the account I chose last, to switch accounts when I want,
> and never to show mail of an account that is no longer connected or readable.

### A selection is always a connected account that can read mail

An account can be read when it is connected, has a connection id and holds the Gmail read
capability. The remembered choice is only a hint for the next check: it never selects an account
that the fresh account list does not report readable. When the selected account stops being
readable, the open account falls back to the remembered one, then to the first readable one, or to
none.

```quint
type GmailCapability = CapIdentity | CapTriage | CapSend | CapDrafts | CapMailbox
type MailAccount = { id: str, label: str, address: str, connected: bool, capabilities: List[GmailCapability] }
type AccountsPhase = CloudRestoring | SignedOut | Checking | Checked | CheckFailed
type MailAccounts = {
  session: str, keySession: str, phase: AccountsPhase, rows: List[MailAccount], fromDisk: bool,
  selected: str, hint: str, readEpoch: int, withdrawals: int, revoked: List[str]
}
pure val initial: MailAccounts = {
  session: "", keySession: "", phase: CloudRestoring, rows: List(), fromDisk: false,
  selected: "", hint: "", readEpoch: 0, withdrawals: 0, revoked: List()
}
pure def readable(a: MailAccount): bool = a.connected and a.id != "" and a.capabilities.includes(CapTriage)
pure def readableIn(rows: List[MailAccount], id: str): bool = rows.some(a => a.id == id and readable(a))
pure def firstReadable(rows: List[MailAccount]): str = rows.foldl("", (found, a) => if (found == "" and readable(a)) a.id else found)
pure def chosen(rows: List[MailAccount], keep: str, hint: str): str =
  if (keep != "" and readableIn(rows, keep)) keep
  else if (hint != "" and readableIn(rows, hint)) hint
  else firstReadable(rows)
pure def alwaysSelectionIsReadable(s: MailAccounts): bool = s.selected == "" or readableIn(s.rows, s.selected)
pure def lawAHintNeverSelectsAnUnreadableAccount(rows: List[MailAccount], keep: str, hint: str): bool =
  chosen(rows, keep, hint) == "" or readableIn(rows, chosen(rows, keep, hint))
pure val acctA: MailAccount = { id: "a", label: "Work", address: "a@example.com", connected: true, capabilities: List(CapIdentity, CapTriage, CapSend, CapDrafts, CapMailbox) }
pure val acctB: MailAccount = { id: "b", label: "Home", address: "b@example.com", connected: true, capabilities: List(CapIdentity, CapTriage) }
pure val acctC: MailAccount = { id: "c", label: "Old", address: "c@example.com", connected: false, capabilities: List() }
pure val rowsValues = Set(List()).union(Set(List(acctA, acctB))).union(Set(List(acctB, acctC)))
pure val keepValues = Set("", "a", "c")
pure val hintValues = Set("", "b", "c")
```

### Saved accounts show at once but stay read-only until Cloud confirms them

On a cold start the Inbox may show the accounts and choice saved on this phone while Cloud restores
the session; it never shows a Connect prompt meanwhile. Saved mail of a saved account is shown
read-only: no change, send or Gmail draft is offered until a fresh account list for the current
session has been read.

```quint
pure def mayChangeMail(s: MailAccounts): bool = s.phase == Checked and not(s.fromDisk) and s.selected != ""
pure def showsConnect(s: MailAccounts): bool = s.phase == Checked and firstReadable(s.rows) == ""
pure def canRestoreSaved(s: MailAccounts): bool = s.phase == CloudRestoring and s.rows == List()
pure def restoreSaved(s: MailAccounts, saved: List[MailAccount], choice: str): MailAccounts = {
  val following = if (readableIn(saved, choice)) choice else ""
  { ...s, rows: saved, fromDisk: true, selected: following, hint: choice, readEpoch: if (following != "") s.readEpoch + 1 else s.readEpoch }
}
pure def alwaysSavedAccountsCannotChangeMail(s: MailAccounts): bool = s.fromDisk implies not(mayChangeMail(s))
pure def alwaysNoConnectPromptBeforeTheCheck(s: MailAccounts): bool = s.phase != Checked implies not(showsConnect(s))
pure def sometimesSavedSelectionShown(s: MailAccounts): bool = s.fromDisk and s.selected != ""
pure val savedValues = Set(List()).union(Set(List(acctA, acctB)))
pure val choiceValues = Set("", "a", "b")
```

### Checking the accounts reads them for the current session and keeps a readable selection

A check runs for one Cloud session. Its answer is applied only while that session is still the
current one, replaces every saved row and ends the read-only state. A failed check keeps what is
shown, still read-only.

```quint
pure def canBegin(s: MailAccounts, session: str): bool = session != "" and (s.phase != Checking or session != s.session)
pure def begin(s: MailAccounts, session: str): MailAccounts = { ...s, phase: Checking, session: session }
pure def changeHeld(rows: List[MailAccount], id: str): List[GmailCapability] =
  rows.foldl(List(), (acc, a) => if (a.id == id and readable(a)) a.capabilities.select(c => c == CapSend or c == CapDrafts or c == CapMailbox) else acc)
pure def canAccountsRead(s: MailAccounts, session: str): bool = s.phase == Checking and session == s.session
pure def accountsRead(s: MailAccounts, session: str, fresh: List[MailAccount]): MailAccounts = {
  val previous = s.selected
  val following = chosen(fresh, previous, s.hint)
  val keyChanged = following != previous or (previous != "" and s.keySession != session)
  val held = changeHeld(s.rows, previous)
  val lost = held.some(c => not(changeHeld(fresh, previous).includes(c)))
  { ...s, phase: Checked, rows: fresh, fromDisk: false, selected: following, hint: if (following != "") following else s.hint,
    keySession: session, readEpoch: if (keyChanged) s.readEpoch + 1 else s.readEpoch,
    withdrawals: if (previous != "" and held != List() and (lost or keyChanged)) s.withdrawals + 1 else s.withdrawals }
}
pure def canCheckFailed(s: MailAccounts, session: str): bool = s.phase == Checking and session == s.session
pure def checkFailed(s: MailAccounts, session: str): MailAccounts = { ...s, phase: CheckFailed }
pure def stepAStaleCheckChangesNothing(before: MailAccounts, via: str, after: MailAccounts): bool =
  via == "accountsRead" implies before.phase == Checking
pure val sessionValues = Set("s1", "s2")
pure val freshValues = Set(List()).union(Set(List(acctA, acctB))).union(Set(List(acctB, acctC)))
  .union(Set(List({ ...acctA, capabilities: List(CapIdentity, CapTriage) }, acctB)))
pure def sometimesChecked(s: MailAccounts): bool = s.phase == Checked and s.selected == "a"
pure def sometimesCheckFailedWithSavedMail(s: MailAccounts): bool = s.phase == CheckFailed and s.fromDisk
```

### Switching accounts retires every read made for the previous selection

Each change of the selected account, or of the Cloud session the selection was checked under,
starts a new read epoch: lists, bodies, read-ahead, reviews and notices made under the previous one
are dropped and never shown again.

```quint
pure def canChooseAccount(s: MailAccounts, id: str): bool = s.phase == Checked and not(s.fromDisk) and readableIn(s.rows, id) and id != s.selected
pure def chooseAccount(s: MailAccounts, id: str): MailAccounts = { ...s, selected: id, hint: id, readEpoch: s.readEpoch + 1 }
pure def stepASelectionChangeStartsANewReadEpoch(before: MailAccounts, after: MailAccounts): bool =
  after.selected != before.selected implies after.readEpoch > before.readEpoch
pure val idValues = Set("a", "b", "c")
pure def sometimesSwitched(s: MailAccounts): bool = s.selected == "b" and s.readEpoch >= 2
```

### A confirmed revocation closes the account's mail until a fresh accepted read

When Gmail says the selected account's access is revoked, its list, open message and saved mail
are dropped, the accounts are checked again, and saved mail of that account stays hidden in this
process until a new first page has been accepted for it.

```quint
pure def canRevoke(s: MailAccounts, id: str): bool = id != "" and s.selected == id
pure def revoke(s: MailAccounts, id: str): MailAccounts =
  { ...s, selected: "", phase: if (s.session != "") Checking else s.phase, readEpoch: s.readEpoch + 1,
    revoked: if (s.revoked.includes(id)) s.revoked else s.revoked.append(id),
    withdrawals: if (changeHeld(s.rows, id) != List()) s.withdrawals + 1 else s.withdrawals }
pure def canAcceptedRead(s: MailAccounts, id: str): bool = s.phase == Checked and s.selected == id and s.revoked.includes(id)
pure def acceptedRead(s: MailAccounts, id: str): MailAccounts = { ...s, revoked: s.revoked.select(r => r != id) }
pure def savedMailVisible(s: MailAccounts, id: str): bool = id != "" and not(s.revoked.includes(id))
pure def alwaysRevokedAccountIsNotOpen(s: MailAccounts): bool = s.revoked.includes(s.selected) implies s.phase == Checked
pure def sometimesRevokedMailHidden(s: MailAccounts): bool = s.revoked != List() and s.selected == ""
```

### Signing out of Cloud forgets the accounts and withdraws every grant in use

```quint
pure def canSignOut(s: MailAccounts): bool = s.phase != SignedOut
pure def signOut(s: MailAccounts): MailAccounts =
  { ...initial, phase: SignedOut, revoked: s.revoked, readEpoch: s.readEpoch + 1,
    withdrawals: if (s.selected != "" and changeHeld(s.rows, s.selected) != List()) s.withdrawals + 1 else s.withdrawals }
pure def alwaysSignedOutHoldsNoAccount(s: MailAccounts): bool = s.phase == SignedOut implies (s.rows == List() and s.selected == "")
pure def alwaysCountersAreNotNegative(s: MailAccounts): bool = s.readEpoch >= 0 and s.withdrawals >= 0
```

## Story: Grant Gmail access a step at a time

> As the owner, I want to give the Inbox read access first, and to allow changes to my mailbox only
> when I ask for them, without losing access I already gave.

### Each consent asks for identity and reading, keeps what was granted and adds only what was asked

Read access is the identity and triage capabilities. Changing mail asks for send, Gmail drafts and
mailbox changes together; a single change permission asks for that one. A consent never asks for
less than the account already holds.

```quint
type GmailPermission = ReadMail | ChangeMail | SendMail | SaveDrafts | ChangeMailbox
type GrantTier = NoGrant | ReadGrant | ChangeGrant
pure def tier(a: MailAccount): GrantTier =
  if (not(readable(a))) NoGrant
  else if (a.capabilities.includes(CapSend) and a.capabilities.includes(CapDrafts) and a.capabilities.includes(CapMailbox)) ChangeGrant
  else ReadGrant
pure def requestedFor(permission: GmailPermission): List[GmailCapability] =
  if (permission == ReadMail) List() else if (permission == ChangeMail) List(CapSend, CapDrafts, CapMailbox)
  else if (permission == SendMail) List(CapSend) else if (permission == SaveDrafts) List(CapDrafts) else List(CapMailbox)
pure def addMissing(acc: List[GmailCapability], c: GmailCapability): List[GmailCapability] = if (acc.includes(c)) acc else acc.append(c)
pure def consentCapabilities(permission: GmailPermission, granted: List[GmailCapability]): List[GmailCapability] =
  requestedFor(permission).foldl(granted.foldl(List(CapIdentity, CapTriage), (acc, c) => addMissing(acc, c)), (acc, c) => addMissing(acc, c))
pure def lawConsentAlwaysAsksToRead(permission: GmailPermission, granted: List[GmailCapability]): bool =
  consentCapabilities(permission, granted).includes(CapIdentity) and consentCapabilities(permission, granted).includes(CapTriage)
pure def lawConsentNeverShrinksAGrant(permission: GmailPermission, granted: List[GmailCapability]): bool =
  granted.every(c => consentCapabilities(permission, granted).includes(c))
pure def lawReadConsentAsksForNoChange(granted: List[GmailCapability]): bool =
  consentCapabilities(ReadMail, granted).every(c => c == CapIdentity or c == CapTriage or granted.includes(c))
pure def lawChangeTierHoldsEveryChange(a: MailAccount): bool =
  tier(a) == ChangeGrant implies (a.capabilities.includes(CapSend) and a.capabilities.includes(CapDrafts) and a.capabilities.includes(CapMailbox))
pure val grantedValues = Set(List()).union(Set(List(CapIdentity, CapTriage))).union(Set(List(CapIdentity, CapTriage, CapSend)))
pure val aValues = Set(acctA).union(Set(acctB)).union(Set(acctC))
```
