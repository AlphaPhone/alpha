# Telegram notices

Background sync and notification rules for [Telegram](./): watermarked updates
(`since != 0` baseline before posting), strict suppression of own, muted,
archived and currently visible front-chat messages, deep-link opening on notice
tap, and immediate withdrawal on visible read, sign-out or revocation.

## Story: Hear about new Telegram messages without noise

> As the owner, I want notifications for new Telegram messages that arrive after
> sign-in, never for my own messages, muted or archived chats, or the chat I am
> already looking at, and I want tapping a notice to open that chat and reading
> it or signing out to clear its notices.

### Watching holds authentication, sync read, baseline watermark, front visible chat, muted and archived sets, and posted notices

```quint
import read as R from "../../kit/read"

type ChatKind = DirectMessage | GroupChat | Supergroup | BroadcastChannel
type Incoming = { chat: int, message: int, kind: ChatKind, isOwn: bool, mentioned: bool }
type Notices = {
  authenticated: bool, notifyAllowed: bool, check: R::Read, since: int,
  frontChat: int, muted: Set[int], archived: Set[int], upChats: Set[int], posts: int,
}

type Effect =
  | ScheduleSync
  | UnscheduleSync
  | PollUpdates({ ticket: int, since: int })
  | PostNotice({ chat: int, message: int })
  | WithdrawChat({ chat: int })
  | WithdrawAll
  | OpenChat({ chat: int, message: int })
type Noticed = { state: Notices, out: List[Effect] }

pure val initial: Notices = {
  authenticated: false, notifyAllowed: false, check: R::unread, since: 0,
  frontChat: 0, muted: Set(), archived: Set(), upChats: Set(), posts: 0,
}

pure val ticketValues = Set(1, 2, 3, 4, 5)
pure val pointValues = Set(1, 2)
pure val chatValues = Set(0, 1, 2)
pure val messageValues = Set(1, 2)
pure val incomingValues = Set(
  { chat: 1, message: 1, kind: DirectMessage, isOwn: false, mentioned: false },
  { chat: 1, message: 2, kind: DirectMessage, isOwn: true, mentioned: false },
  { chat: 1, message: 1, kind: Supergroup, isOwn: false, mentioned: true },
  { chat: 2, message: 1, kind: GroupChat, isOwn: false, mentioned: false },
  { chat: 1, message: 1, kind: BroadcastChannel, isOwn: false, mentioned: false },
  { chat: 0, message: 0, kind: DirectMessage, isOwn: false, mentioned: false },
)
pure val weight_poll = 2
pure val weight_polled = 2
```

### Own, muted, archived, read-only broadcast and currently visible front-chat messages are always suppressed

```quint
pure def shouldNotify(
  isOwn: bool, muted: bool, archived: bool, frontChat: int, chat: int, kind: ChatKind, mentioned: bool
): bool =
  chat > 0 and not(isOwn) and not(muted) and not(archived) and frontChat != chat
    and (kind == DirectMessage or kind == GroupChat or (kind == Supergroup and mentioned))

pure def lawSuppressedMessagesNeverNotify(chat: int, kind: ChatKind, mentioned: bool): bool =
  not(shouldNotify(true, false, false, 0, chat, kind, mentioned))
    and not(shouldNotify(false, true, false, 0, chat, kind, mentioned))
    and not(shouldNotify(false, false, true, 0, chat, kind, mentioned))
    and not(shouldNotify(false, false, false, chat, chat, kind, mentioned))
```

### Watching starts once authenticated with notification permission, and stops with full withdrawal on sign-out, revocation or permission loss

```quint
pure def watching(s: Notices): bool = s.authenticated and s.notifyAllowed

pure def canWatchChanged(s: Notices, authenticated: bool, notifyAllowed: bool): bool =
  authenticated != s.authenticated or notifyAllowed != s.notifyAllowed

pure def watchChanged(s: Notices, authenticated: bool, notifyAllowed: bool): Noticed =
  val was = watching(s)
  val nowOn = authenticated and notifyAllowed
  if (not(authenticated))
    {
      state: { ...initial, check: { ...s.check, status: R::Idle }, posts: s.posts },
      out: if (was or s.upChats.size() > 0) List(UnscheduleSync, WithdrawAll) else List(),
    }
  else if (not(nowOn))
    {
      state: { ...s, authenticated: true, notifyAllowed: false, check: { ...s.check, status: R::Idle }, upChats: Set() },
      out: if (was or s.upChats.size() > 0) List(UnscheduleSync, WithdrawAll) else List(),
    }
  else if (not(was))
    { state: { ...s, authenticated: true, notifyAllowed: true }, out: List(ScheduleSync) }
  else { state: s, out: List() }

pure def canMuteOrArchiveChanged(s: Notices, chat: int, isMuted: bool, isArchived: bool): bool =
  s.authenticated and chat > 0

pure def muteOrArchiveChanged(s: Notices, chat: int, isMuted: bool, isArchived: bool): Notices = {
  ...s,
  muted: if (isMuted) s.muted.union(Set(chat)) else s.muted.exclude(Set(chat)),
  archived: if (isArchived) s.archived.union(Set(chat)) else s.archived.exclude(Set(chat)),
}
```

### Polling reads updates from the watermark; the first answer sets the baseline quietly and later answers post only eligible messages

```quint
pure def canPoll(s: Notices): bool = watching(s) and s.check.status != R::Loading

pure def poll(s: Notices): Noticed =
  val check = R::ask(s.check)
  { state: { ...s, check: check }, out: List(PollUpdates({ ticket: check.ticket, since: s.since })) }

pure def canPolled(s: Notices, ticket: int, ok: bool, point: int, incoming: Incoming): bool =
  watching(s) and R::canAnswer(s.check, ticket) and incoming.chat >= 0 and incoming.message >= 0
    and (ok implies (point >= 1 and (s.since != 0 implies point >= s.since)))

pure def polled(s: Notices, ticket: int, ok: bool, point: int, incoming: Incoming): Noticed =
  val check = R::answer(s.check, ok)
  val eligible =
    ok and s.since != 0 and incoming.chat > 0 and incoming.message > 0
      and shouldNotify(
        incoming.isOwn, s.muted.contains(incoming.chat), s.archived.contains(incoming.chat),
        s.frontChat, incoming.chat, incoming.kind, incoming.mentioned
      )
  if (not(ok)) { state: { ...s, check: check }, out: List() }
  else if (s.since == 0) { state: { ...s, check: check, since: point }, out: List() }
  else if (eligible)
    {
      state: { ...s, check: check, since: point, upChats: s.upChats.union(Set(incoming.chat)), posts: s.posts + 1 },
      out: List(PostNotice({ chat: incoming.chat, message: incoming.message })),
    }
  else { state: { ...s, check: check, since: point }, out: List() }
```

### Visible chat read withdraws posted notices for that chat, and tapping a posted notice deep-links to its chat

```quint
pure def canFrontChatChanged(s: Notices, chat: int): bool =
  s.authenticated and chat >= 0 and chat != s.frontChat

pure def frontChatChanged(s: Notices, chat: int): Noticed =
  val clear = chat > 0 and s.upChats.contains(chat)
  {
    state: { ...s, frontChat: chat, upChats: if (clear) s.upChats.exclude(Set(chat)) else s.upChats },
    out: if (clear) List(WithdrawChat({ chat: chat })) else List(),
  }

pure def canTapped(s: Notices, chat: int, message: int): bool =
  watching(s) and chat > 0 and message > 0 and s.upChats.contains(chat)

pure def tapped(s: Notices, chat: int, message: int): Noticed = {
  state: { ...s, upChats: s.upChats.exclude(Set(chat)) },
  out: List(OpenChat({ chat: chat, message: message })),
}

pure def restart(s: Notices): Notices = { ...s, check: { ...s.check, status: R::Idle }, frontChat: 0 }
```

### No notice posts before baseline or for a suppressed chat; reading withdraws that chat's notice and sign-out withdraws all

```quint
pure def alwaysNoticesConsistent(s: Notices): bool =
  s.since >= 0 and s.frontChat >= 0 and s.posts >= 0
    and (not(watching(s)) implies (s.check.status != R::Loading and s.upChats.size() == 0))
    and (not(s.authenticated) implies (s.since == 0 and s.frontChat == 0 and s.muted.size() == 0 and s.archived.size() == 0))
    and (s.frontChat > 0 implies not(s.upChats.contains(s.frontChat)))

pure def stepNoNoticeBeforeBaselineOrSuppressed(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  out.every(e => match e {
    | PostNotice(p) =>
      via == "polled" and before.since != 0 and watching(before)
        and p.chat > 0 and p.message > 0 and p.chat != before.frontChat
        and not(before.muted.contains(p.chat)) and not(before.archived.contains(p.chat))
        and after.upChats.contains(p.chat)
    | _ => true
  })

pure def stepReadingWithdrawsNotices(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  (via == "frontChatChanged" and after.frontChat > 0 and before.upChats.contains(after.frontChat)) implies (
    not(after.upChats.contains(after.frontChat)) and out.includes(WithdrawChat({ chat: after.frontChat }))
  )

pure def stepSignOutWithdrawsAllAndStopsSync(before: Notices, via: str, after: Notices, out: List[Effect]): bool =
  (via == "watchChanged" and not(after.authenticated) and watching(before)) implies (
    after.upChats.size() == 0 and after.since == 0 and out.includes(UnscheduleSync) and out.includes(WithdrawAll)
  )

pure def sometimesBaselineSetQuietly(s: Notices): bool = s.since > 0 and s.posts == 0
pure def sometimesNoticePosted(s: Notices): bool = s.upChats.size() >= 1 and s.posts >= 1
pure def sometimesNoticeWithdrawnOnRead(s: Notices): bool = s.frontChat > 0 and s.posts >= 1 and not(s.upChats.contains(s.frontChat))
```
