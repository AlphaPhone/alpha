# Agent opens and view commands

What the agent may do in Browser beyond the tab controls of [the session](./session.md): open one
HTTPS address the owner's message named (a device action, journaled and receipted by the assistant's
device-action coordinator, which owns its custody), and send back, forward or reload to the exact
tab the owner was looking at (a view command: claimed once, never journaled, never repeated). The
destination a message may name is `@elizaos/plugin-browser`'s request grounding; the command's
binding to the observed tab is its remote control. This spec adds what Alpha's Browser requires of
both.

## Story: Open the site I asked for

> As the owner, I want the agent to open an HTTPS site I named in my message once, without asking
> again, to ask me first when I did not type it or when I want every phone action reviewed, and to
> report the tab it created even when Browser could not be shown.

### Only an HTTPS address without credentials becomes an open card, and opens without review only once per message, when the owner typed it and reviews are off

An unreadable review preference counts as on.

```quint
type Scheme = HttpsAddress | HttpAddress | CredentialAddress
type Preference = ReviewOff | ReviewOn | ReviewUnreadable
type Authority = NoAuthority | DirectRequest | OwnerReview
type Journal = JournalEmpty | JournalTerminal
type CommandStage = NoCommand | Claimed | Bound | Sent | CommandRefused | Acknowledged
type AgentBrowsing = {
  preference: Preference, scheme: Scheme, typed: bool, card: bool, authority: Authority, autoUsed: bool, autoOpens: int,
  tab: str, journal: Journal, receiptTried: bool, synced: bool, presented: bool, tabReceipt: bool,
  command: CommandStage, claimRevision: int, boundRevision: int, sentRevision: int, claims: int, sends: int, acks: int,
}
pure val initial: AgentBrowsing = {
  preference: ReviewOff, scheme: HttpsAddress, typed: false, card: false, authority: NoAuthority, autoUsed: false, autoOpens: 0,
  tab: "", journal: JournalEmpty, receiptTried: false, synced: false, presented: false, tabReceipt: false,
  command: NoCommand, claimRevision: -1, boundRevision: -1, sentRevision: -1, claims: 0, sends: 0, acks: 0,
}
pure def asks(a: AgentBrowsing): bool = a.preference != ReviewOff
pure def idle(a: AgentBrowsing): bool = a.authority == NoAuthority
pure def prefer(a: AgentBrowsing, preference: Preference): AgentBrowsing = { ...a, preference: preference }
pure def canPropose(a: AgentBrowsing, scheme: Scheme, typed: bool): bool = idle(a) or a.journal == JournalTerminal
pure def propose(a: AgentBrowsing, scheme: Scheme, typed: bool): AgentBrowsing =
  { ...a, scheme: scheme, typed: typed, card: scheme == HttpsAddress, authority: NoAuthority,
    tab: "", journal: JournalEmpty, receiptTried: false, synced: false, presented: false, tabReceipt: false }
pure def canNewMessage(a: AgentBrowsing): bool = idle(a) or a.journal == JournalTerminal
pure def newMessage(a: AgentBrowsing): AgentBrowsing = { ...a, card: false, authority: NoAuthority, autoUsed: false, autoOpens: 0, typed: false }
pure def canOpenDirect(a: AgentBrowsing): bool = a.card and idle(a) and not(asks(a)) and a.typed and not(a.autoUsed)
pure def openDirect(a: AgentBrowsing): AgentBrowsing = { ...a, card: false, authority: DirectRequest, autoUsed: true }
pure def canOpenReviewed(a: AgentBrowsing): bool = a.card and idle(a)
pure def openReviewed(a: AgentBrowsing): AgentBrowsing = { ...a, card: false, authority: OwnerReview }
pure def alwaysOnlyHttpsWithoutCredentialsOpens(a: AgentBrowsing): bool = (a.card or a.tab != "") implies a.scheme == HttpsAddress
pure def alwaysADirectOpenWasTyped(a: AgentBrowsing): bool = a.authority == DirectRequest implies a.typed
pure def alwaysOneDirectOpenPerMessage(a: AgentBrowsing): bool = a.autoOpens <= 1
pure val tabValues = Set("t1", "t2")
pure val revisionValues = Set(0, 1, 2)
```

### The open creates its tab without selecting it, the journal's receipt names that tab, and the tab is shown only after the receipt was attempted and only while the same foreground is current

```quint
pure def canExecuted(a: AgentBrowsing, tab: str): bool = not(idle(a)) and a.journal == JournalEmpty and a.tab == "" and a.scheme == HttpsAddress and tab != ""
pure def executed(a: AgentBrowsing, tab: str): AgentBrowsing =
  { ...a, tab: tab, autoOpens: a.autoOpens + (if (a.authority == DirectRequest) 1 else 0) }
pure def canJournalFinished(a: AgentBrowsing): bool = a.tab != "" and a.journal == JournalEmpty
pure def journalFinished(a: AgentBrowsing): AgentBrowsing = { ...a, journal: JournalTerminal, tabReceipt: true }
pure def canReceiptSent(a: AgentBrowsing, ok: bool): bool = a.journal == JournalTerminal and not(a.receiptTried)
pure def receiptSent(a: AgentBrowsing, ok: bool): AgentBrowsing = { ...a, receiptTried: true, synced: ok }
pure def canPresentOpened(a: AgentBrowsing, foreground: bool): bool = a.tab != "" and a.receiptTried and not(a.presented)
pure def presentOpened(a: AgentBrowsing, foreground: bool): AgentBrowsing = if (foreground) { ...a, presented: true } else a
pure def alwaysTheReceiptNamesTheCreatedTab(a: AgentBrowsing): bool =
  (a.tabReceipt iff a.journal == JournalTerminal) and (a.tabReceipt implies a.tab != "")
pure def alwaysPresentationFollowsTheReceiptAttempt(a: AgentBrowsing): bool =
  a.presented implies (a.tab != "" and a.journal == JournalTerminal and a.receiptTried)
pure def sometimesTheCreatedTabStaysUnselected(a: AgentBrowsing): bool = a.tabReceipt and a.receiptTried and not(a.presented)
```

## Story: Go back, forward or reload only on the page I was looking at

> As the owner, I want "go back" to act once on the tab I was looking at when I asked, to do nothing
> if that page changed, and to be told the command was sent, not that the page finished loading.

### A view command is claimed once for the Browser view, and is bound only with reviews off, on the native host's shown, uncovered page, at the revision it was claimed for

The browser build's page is a sandboxed frame, so it takes no view command. A page that moved on
while the claim waited refuses it.

```quint
pure def canClaim(a: AgentBrowsing, revision: int, inBrowser: bool): bool =
  (a.command == NoCommand or a.command == Acknowledged) and inBrowser and a.claims < 3
pure def claim(a: AgentBrowsing, revision: int, inBrowser: bool): AgentBrowsing =
  { ...a, command: Claimed, claims: a.claims + 1, claimRevision: revision, boundRevision: -1, sentRevision: -1 }
pure def canClaimSettled(a: AgentBrowsing, revision: int, nativeHost: bool, shown: bool, covered: bool): bool = a.command == Claimed
pure def claimSettled(a: AgentBrowsing, revision: int, nativeHost: bool, shown: bool, covered: bool): AgentBrowsing =
  if (revision != a.claimRevision or asks(a) or not(nativeHost) or not(shown) or covered) { ...a, command: CommandRefused }
  else { ...a, command: Bound, boundRevision: revision }
pure def alwaysABoundCommandHadReviewsOff(a: AgentBrowsing): bool = (a.command == Bound or a.command == Sent) implies not(asks(a))
```

### The native call names the admitted revision, is sent at most once per claim, and its result is a dispatch, never a finished page

One acknowledgement settles each claim, delivered or lost; the command is never sent again to get
one. A dispatched back, forward or reload reports that the command was sent and asks for a read of
the page afterwards (eliza#40019).

```quint
type CommandReport = { dispatched: bool, completed: bool, requiresReadback: bool }
pure def reportOf(stage: CommandStage): CommandReport =
  { dispatched: stage == Sent, completed: false, requiresReadback: stage == Sent }
pure def lawAViewCommandNeverReportsAFinishedPage(stage: CommandStage): bool = not(reportOf(stage).completed)
pure def canCommandSent(a: AgentBrowsing, revision: int): bool = a.command == Bound
pure def commandSent(a: AgentBrowsing, revision: int): AgentBrowsing =
  if (revision == a.boundRevision) { ...a, command: Sent, sentRevision: revision, sends: a.sends + 1 } else { ...a, command: CommandRefused }
pure def canAcknowledged(a: AgentBrowsing, delivered: bool): bool = a.command == Sent or a.command == CommandRefused
pure def acknowledged(a: AgentBrowsing, delivered: bool): AgentBrowsing =
  { ...a, command: Acknowledged, acks: a.acks + (if (delivered) 1 else 0) }
pure def alwaysASentCommandNamesItsBoundRevision(a: AgentBrowsing): bool = a.command == Sent implies (a.sentRevision == a.boundRevision and a.boundRevision >= 0)
pure def alwaysACommandIsNeverRepeated(a: AgentBrowsing): bool = a.sends <= a.claims and a.acks <= a.claims
pure def sometimesACommandWasSent(a: AgentBrowsing): bool = a.command == Acknowledged and a.sends > 0
```
