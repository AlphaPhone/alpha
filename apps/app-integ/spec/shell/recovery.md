# Recovery

A failure that would leave a blank or broken phone is caught and turned into something the owner
can act on. An uncaught failure before the app has rendered, or a failed render of the shell
itself, shows the recovery screen: "Something went wrong", Reload, and, on a launcher build that may
be the only home screen, Switch Home, which opens Android's Home app picker. It covers every open
dialog and holds the rest of the page inert. A failed render of one app closes only that app: Home
stays usable and says which app closed. Diagnostics keep only the failure's kind, its error class,
the version, the platform and the time; never a message, stack, address or stored value, any of
which can carry the owner's data. The failure class is recorded in the device's problem log.

## Story: Get my phone back when something breaks

> As the owner, I want a broken app to close and leave Home working, and a broken Alpha to offer a
> way out instead of a blank screen, even while Alpha is my home app.

### Before Alpha has rendered, an uncaught failure shows recovery; after, only a failed shell does

```quint
type RecoveryPhase = Running | StartupFailed | RenderFailed
type Recovery = { mounted: bool, phase: RecoveryPhase, errorClass: str, homeEscape: bool, failedApp: str, recorded: int }
pure val initial: Recovery = { mounted: false, phase: Running, errorClass: "", homeEscape: false, failedApp: "", recorded: 0 }
pure val errorClassValues = Set("TypeError", "Error")
pure val appValues = Set("notes", "calendar")
pure def canAppMounted(r: Recovery): bool = not(r.mounted) and r.phase == Running
pure def appMounted(r: Recovery): Recovery = { ...r, mounted: true }
pure def canUncaught(r: Recovery, errorClass: str): bool = r.phase == Running
pure def uncaught(r: Recovery, errorClass: str): Recovery =
  if (r.mounted) r else { ...r, phase: StartupFailed, errorClass: errorClass, recorded: r.recorded + 1 }
pure def canRootFailed(r: Recovery, errorClass: str): bool = r.phase == Running
pure def rootFailed(r: Recovery, errorClass: str): Recovery = { ...r, phase: RenderFailed, errorClass: errorClass, recorded: r.recorded + 1 }
pure def stepRecoveryIsFinal(before: Recovery, after: Recovery): bool = before.phase != Running implies after.phase == before.phase
pure def sometimesStartupRecovery(r: Recovery): bool = r.phase == StartupFailed
pure def sometimesRenderRecovery(r: Recovery): bool = r.phase == RenderFailed and r.homeEscape
```

### A failed app closes and Home says which one

```quint
pure def canViewFailed(r: Recovery, app: str, errorClass: str): bool = r.mounted and r.phase == Running and app != ""
pure def viewFailed(r: Recovery, app: str, errorClass: str): Recovery = { ...r, failedApp: app, errorClass: errorClass, recorded: r.recorded + 1 }
pure def canDismissViewNotice(r: Recovery): bool = r.failedApp != ""
pure def dismissViewNotice(r: Recovery): Recovery = { ...r, failedApp: "" }
pure def alwaysAViewFailureKeepsTheShell(r: Recovery): bool = r.failedApp != "" implies r.mounted
pure def sometimesViewClosed(r: Recovery): bool = r.failedApp != "" and r.phase == Running
```

### Switch Home is offered only where Android reports a launcher build

Any failure to ask hides the button; Reload never depends on it.

```quint
pure def escapeAvailable(r: Recovery, available: bool): Recovery = { ...r, homeEscape: available }
pure def stepTheEscapeFollowsAndroid(before: Recovery, via: str, after: Recovery): bool =
  after.homeEscape != before.homeEscape implies via == "escapeAvailable"
```
