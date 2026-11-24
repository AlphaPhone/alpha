# Home cards

Home's Messages and Phone cards on the Alpha image. A card exists only while its source was read
and has something new: unread conversations, or new missed calls and new voicemail. Each source is
a bounded, unlocked, foreground-only read made while Home is in front, refreshed every thirty
seconds and on a return to the app, kept in memory only and dropped when Home leaves or hides. A
card is one target that opens its app; nothing here calls, sends, plays or marks read.

## Story: See what is new from Home

> As the owner, I want Home to show a Messages card while I have unread texts and a Phone card
> while I have new missed calls or voicemail, each opening the right place in one tap.

### The cards hold whether each source was read and what it had that is new

```quint
type UnreadThread = { threadId: str, title: str, snippet: str, date: int }
type NewMissed = { callerKey: str, title: str, date: int }
type NewVoicemail = { voicemailId: str, title: str, date: int, seconds: int }
type AttentionRead = {
  threadsOk: bool, unreadRows: List[UnreadThread], callsOk: bool, missedRows: List[NewMissed],
  voicemailOk: bool, voicemailRows: List[NewVoicemail]
}
type Attention = {
  homeShown: bool, epoch: int, readAt: int,
  threadsRead: bool, unread: List[UnreadThread], callsRead: bool, missed: List[NewMissed], voicemailRead: bool, fresh: List[NewVoicemail]
}
pure val initial: Attention = {
  homeShown: false, epoch: 0, readAt: 0,
  threadsRead: false, unread: List(), callsRead: false, missed: List(), voicemailRead: false, fresh: List()
}
pure val ticketValues = Set(0, 1, 2)
pure val atValues = Set(0, 30000)
pure val readValues = Set(
  { threadsOk: false, unreadRows: List(), callsOk: false, missedRows: List(), voicemailOk: false, voicemailRows: List() },
  { threadsOk: true, unreadRows: List({ threadId: "thread:1", title: "Maya Chen", snippet: "See you", date: 5 }), callsOk: true,
    missedRows: List({ callerKey: "4155550100", title: "Ann", date: 4 }), voicemailOk: false, voicemailRows: List() },
  { threadsOk: true, unreadRows: List(), callsOk: false, missedRows: List(), voicemailOk: true,
    voicemailRows: List({ voicemailId: "v1", title: "Ann", date: 3, seconds: 24 }) })
```

### A card exists only for a source that was read and has something new

A source that was not read (refused, failed, or not granted) is never "nothing new"; the two
Phone sources are separate, so either alone can show the card.

```quint
pure def messagesCard(a: Attention): bool = a.threadsRead and a.unread.length() > 0
pure def phoneCard(a: Attention): bool = (a.callsRead and a.missed.length() > 0) or (a.voicemailRead and a.fresh.length() > 0)
pure def canHomeShown(a: Attention): bool = not(a.homeShown)
pure def homeShown(a: Attention): Attention = { ...a, homeShown: true, epoch: a.epoch + 1 }
pure def canHomeHidden(a: Attention): bool = a.homeShown
pure def homeHidden(a: Attention): Attention = { ...initial, epoch: a.epoch + 1 }
pure def canReadAsked(a: Attention): bool = a.homeShown
pure def readAsked(a: Attention): Attention = { ...a, epoch: a.epoch + 1 }
pure def canReadAnswered(a: Attention, ticket: int): bool = a.homeShown and ticket == a.epoch
pure def readAnswered(a: Attention, ticket: int, read: AttentionRead, at: int): Attention =
  { ...a, readAt: at, threadsRead: read.threadsOk, unread: if (read.threadsOk) read.unreadRows else List(),
    callsRead: read.callsOk, missed: if (read.callsOk) read.missedRows else List(),
    voicemailRead: read.voicemailOk, fresh: if (read.voicemailOk) read.voicemailRows else List() }
pure def alwaysRowsOnlyFromARead(a: Attention): bool =
  (a.unread.length() > 0 implies a.threadsRead) and (a.missed.length() > 0 implies a.callsRead) and (a.fresh.length() > 0 implies a.voicemailRead)
pure def alwaysNothingWhileHomeIsHidden(a: Attention): bool = not(a.homeShown) implies not(messagesCard(a) or phoneCard(a))
pure def sometimesBothCards(a: Attention): bool = messagesCard(a) and phoneCard(a)
pure def sometimesOnlyVoicemail(a: Attention): bool = phoneCard(a) and a.missed.length() == 0
```

### One unread conversation opens it, several open the list; missed calls lead to Recents, otherwise Voicemail

```quint
type PhoneCardTarget = GoRecents | GoVoicemail
pure def messagesTarget(a: Attention): str = if (a.unread.length() == 1) a.unread.nthOr(0, { threadId: "", title: "", snippet: "", date: 0 }).threadId else ""
pure def phoneTarget(a: Attention): PhoneCardTarget = if (a.missed.length() > 0) GoRecents else GoVoicemail
pure def alwaysAThreadTargetIsUnread(a: Attention): bool = messagesTarget(a) == "" or a.unread.some(t => t.threadId == messagesTarget(a))
pure def sometimesTheCardOpensOneConversation(a: Attention): bool = messagesTarget(a) != ""
```
