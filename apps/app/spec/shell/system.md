# System

What the renderer relies on from Alpha's Android side and states for it, so the shell and
`android/` agree: one live MainActivity owns the page, the text zoom Android applies, and the
Settings handoff. The Java code in `android/` implements these; the shell reads their results.
Android's App info, shade and default-app handoffs are the system bridge's own rules (its spec,
"App info opens Android's details page for exactly the entry the owner chose" and "The shade opens
only from a focused launcher build that holds the status bar permission").

```quint
type HomeStart = OwnPage | DeliverToLive | HandOffToLive
type SettingsReply = SettingsOpened | SettingsUnavailable | SettingsUnsupported | SettingsPending
type FontScale = FontNormal | FontLarge | FontLarger | FontTiny
```

## Story: Keep one Alpha, sized the way I chose

> As the owner, I want one Alpha behind every way I open it (HOME, a notification, a sign-in
> return), its text at the size I set, and its Settings shortcuts to land on the right page.

### A start reaches the live instance once, and the hand-off stops after three unanswered starts

A HOME, launcher, notification or sign-in-return start that resolves to the task the live
instance owns reaches it as a new intent, delivered once. A start in another task hands off to the
live instance and finishes; after three hand-offs that the live instance never acknowledged, the
next start keeps its own page instead, so the phone is never left without one. The renderer sees a
delivered HOME as one "go Home".

```quint
pure def homeStart(sameTask: bool, live: bool, unreliable: bool): HomeStart =
  if (sameTask) DeliverToLive else if (live and not(unreliable)) HandOffToLive else OwnPage
pure def unreliableAfter(unacked: int): bool = unacked >= 3
pure def lawAnUnreliableHandOffKeepsAPage(sameTask: bool, live: bool): bool =
  homeStart(sameTask, live, true) != HandOffToLive
pure def lawAStartInTheSameTaskIsDelivered(live: bool, unreliable: bool): bool = homeStart(true, live, unreliable) == DeliverToLive
pure val unackedValues = Set(0, 2, 3)
pure def lawThreeUnansweredStartsStopTheHandOff(unacked: int): bool = unreliableAfter(unacked) iff unacked >= 3
```

### Text zoom is Alpha's size times the system font scale, from 75% to 150%

Alpha's own size is 75% to 150%; any other stored value reads as 100%. Android's large and larger
system fonts multiply it by 1.5 and 2; the WebView's zoom is never below one percent. A saved size
is reported only when Android stored it and the WebView applied it; a write Android did not confirm
is reported unconfirmed.

```quint
pure def preference(raw: int): int = if (raw >= 75 and raw <= 150) raw else 100
pure def effectiveZoom(font: FontScale, raw: int): int = {
  val percent = preference(raw)
  if (font == FontLarge) (percent * 3 + 1) / 2 else if (font == FontLarger) percent * 2 else if (font == FontTiny) 1 else percent
}
pure val rawValues = Set(0, 74, 75, 100, 150, 151)
pure def lawZoomIsPositive(font: FontScale, raw: int): bool = effectiveZoom(font, raw) >= 1
pure def lawOutOfRangeReadsAsDefault(raw: int): bool = (raw < 75 or raw > 150) implies preference(raw) == 100
```

### A Settings shortcut opens its own page first and a broader page only where one is listed

At most one start is accepted: the second candidate is tried only after the first failed, and a
reply that names the broader page says it was not the specific one. An unknown page is unsupported
without starting anything; a finished activity answers unavailable.

```quint
pure def settingsReply(known: bool, live: bool, firstOk: bool, hasFallback: bool, fallbackOk: bool): SettingsReply =
  if (not(known)) SettingsUnsupported
  else if (not(live)) SettingsUnavailable
  else if (firstOk) SettingsOpened
  else if (hasFallback and fallbackOk) SettingsOpened
  else SettingsUnavailable
pure def specificPage(firstOk: bool): bool = firstOk
pure def lawABroadPageNeedsAListedFallback(known: bool, live: bool, fallbackOk: bool): bool =
  settingsReply(known, live, false, false, fallbackOk) != SettingsOpened
pure def lawAnUnknownPageStartsNothing(live: bool, firstOk: bool, hasFallback: bool, fallbackOk: bool): bool =
  settingsReply(false, live, firstOk, hasFallback, fallbackOk) == SettingsUnsupported
```
