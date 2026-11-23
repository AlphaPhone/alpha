# Shade

Android's shade is the one notification and quick-settings surface (owner decisions A-32 and A-33).
Alpha draws no shade of its own: the launcher asks Android to expand it, from Home's notifications
control or a pull on empty Home (spec/shell/gestures.md, "A pull asks for Android's shade only on
empty launcher Home"). A browser build has no Android; its development build stands in for it
(spec/shell/navigation.md, "The stand-in shade opens only over Home"), and any other browser build
explains where notifications are. Android's answer is awaited for five seconds; a fallback never
claims that the shade opened.

## Story: Pull down for my notifications

> As the owner, I want a pull on Home to show Android's notifications, and when Android does not,
> to be told how to reach them instead of seeing nothing.

### Only Android is asked, one request at a time, and only from Home

A pull while a request is still waiting is ignored. A locked Home shows no notifications. A build
without Android explains the top-edge swipe.

```quint
type ShadeSurface = AndroidShade | StandInShade | NoShade
type ShadeReply = ShadeOpened | ShadeNotInFront | ShadeStandalone | ShadePermissionMissing | ShadeUnsupported
type Fallback = NoFallback | FallbackNotInFront | FallbackStandalone | FallbackUnavailable | FallbackLocked
type Shade = {
  surface: ShadeSurface, configured: bool, home: bool, secure: bool,
  asking: bool, ticket: int, late: int, fallback: Fallback, opened: int
}
pure val initial: Shade = {
  surface: NoShade, configured: false, home: true, secure: false,
  asking: false, ticket: 0, late: 0, fallback: NoFallback, opened: 0
}
pure val WaitMs = 5000
pure val ticketValues = Set(1, 2, 3)
pure def canConfigure(s: Shade, surface: ShadeSurface): bool = not(s.configured)
pure def configure(s: Shade, surface: ShadeSurface): Shade = { ...s, surface: surface, configured: true }
pure def onHome(s: Shade, home: bool): Shade = { ...s, home: home }
pure def lock(s: Shade, secure: bool): Shade = { ...s, secure: secure }
pure def canPull(s: Shade): bool = s.configured and s.home and s.surface != StandInShade
pure def pull(s: Shade): Shade =
  if (s.secure) { ...s, fallback: FallbackLocked }
  else if (s.surface == NoShade) { ...s, fallback: FallbackStandalone }
  else if (s.asking) s
  else { ...s, asking: true, ticket: s.ticket + 1, fallback: NoFallback }
pure def alwaysOnlyAndroidIsAsked(s: Shade): bool = s.asking implies s.surface == AndroidShade
pure def alwaysCountsAreNotNegative(s: Shade): bool = s.late >= 0 and s.opened >= 0 and s.ticket >= 0
```

### Android's answer settles its own request; a late one changes nothing on the page

Only an opened shade passes without a message. When the wait ends the pull reads as unavailable and
later pulls are taken again; Android may still answer the old request, which then changes nothing
the owner sees.

```quint
pure def fallbackFor(reply: ShadeReply): Fallback =
  if (reply == ShadeOpened) NoFallback
  else if (reply == ShadeNotInFront) FallbackNotInFront
  else if (reply == ShadeStandalone) FallbackStandalone
  else FallbackUnavailable
pure def canAnswer(s: Shade, ticket: int, reply: ShadeReply): bool =
  ticket >= 1 and ticket <= s.ticket and ((s.asking and ticket == s.ticket) or s.late > 0)
pure def answer(s: Shade, ticket: int, reply: ShadeReply): Shade =
  if (s.asking and ticket == s.ticket)
    { ...s, asking: false, fallback: fallbackFor(reply), opened: if (reply == ShadeOpened) s.opened + 1 else s.opened }
  else { ...s, late: s.late - 1 }
pure def canWaitEnds(s: Shade, ticket: int): bool = s.asking and ticket == s.ticket
pure def waitEnds(s: Shade, ticket: int): Shade = { ...s, asking: false, late: s.late + 1, fallback: FallbackUnavailable }
pure def canDismissFallback(s: Shade): bool = s.fallback != NoFallback
pure def dismissFallback(s: Shade): Shade = { ...s, fallback: NoFallback }
pure def stepALateAnswerIsInvisible(before: Shade, via: str, after: Shade): bool =
  (via == "answer" and not(before.asking)) implies (after.fallback == before.fallback and after.opened == before.opened)
pure def sometimesLateAnswerWhileAskingAgain(s: Shade): bool = s.late > 0 and s.asking
pure def sometimesOpened(s: Shade): bool = s.opened > 0 and s.fallback == NoFallback
pure def lawOnlyOpenedIsSilent(reply: ShadeReply): bool = (fallbackFor(reply) == NoFallback) iff (reply == ShadeOpened)
```
