# Site prompts and site data

What the native tab host decides per site and the renderer relies on: a normal tab's profile keeps
third-party cookies and the owner's per-origin permission decisions; a private tab's ephemeral
profile keeps neither. A site's camera, microphone or location request is held while its page is
shown, granted only by the owner and then Android, and only for the page that asked. An HTTP sign-in
prompt stays manual. The renderer's part is Clear site data: a confirmation, then the host clears the
site's cookies and decisions in that tab's profile.

## Story: Keep sites apart and ask me before they use my device

> As the owner, I want private tabs to keep nothing, a site to reach my camera, microphone or
> location only when I allow it for the page I see, and a sign-in prompt never to keep my password.

### A tab is built only with the cookie policy its profile asks for, and a private tab never shares cookies or remembers a decision

```quint
type SitePhase = SiteNew | SiteReady | SiteRefused | SiteLoading | SiteCommitted | SiteClosed
type Decision = Unset | Allow | Deny
type Prompt = NoPrompt | SitePrompt | RuntimePrompt | AuthPrompt
type Site = {
  priv: bool, phase: SitePhase, foreground: bool, selected: bool, navigation: int, origin: int, thirdParty: bool,
  normalCookie: bool, privateCookie: bool, decisionOne: Decision, decisionTwo: Decision, prompt: Prompt,
  requestedOrigin: int, requestedNavigation: int, choice: Decision, androidAllowed: bool, granted: bool,
  authAttempts: int, passwordPresent: bool, passwordSubmitted: bool,
}
pure val initial: Site = {
  priv: false, phase: SiteNew, foreground: true, selected: true, navigation: 0, origin: 1, thirdParty: false,
  normalCookie: false, privateCookie: false, decisionOne: Unset, decisionTwo: Unset, prompt: NoPrompt,
  requestedOrigin: 0, requestedNavigation: 0, choice: Unset, androidAllowed: false, granted: false,
  authAttempts: 0, passwordPresent: false, passwordSubmitted: false,
}
pure def decisionFor(s: Site, origin: int): Decision = if (origin == 1) s.decisionOne else s.decisionTwo
pure def decided(origin: int, d: Decision, s: Site): Site = if (origin == 1) { ...s, decisionOne: d } else { ...s, decisionTwo: d }
pure def canTabProfile(s: Site, priv: bool): bool = s.phase == SiteNew
pure def tabProfile(s: Site, priv: bool): Site = { ...s, priv: priv }
pure def canBuild(s: Site, policyAccepted: bool, engine: bool): bool = s.phase == SiteNew
pure def build(s: Site, policyAccepted: bool, engine: bool): Site =
  { ...s, phase: if (policyAccepted and engine) SiteReady else SiteRefused, thirdParty: policyAccepted and engine and not(s.priv) }
pure def canNavigate(s: Site, origin: int): bool = (s.phase == SiteReady or s.phase == SiteCommitted) and s.navigation < 2 and (origin == 1 or origin == 2)
pure def navigate(s: Site, origin: int): Site =
  { ...s, phase: SiteLoading, origin: origin, navigation: s.navigation + 1, prompt: NoPrompt, granted: false, passwordPresent: false, passwordSubmitted: false }
pure def canCommit(s: Site): bool = s.phase == SiteLoading
pure def commit(s: Site): Site = { ...s, phase: SiteCommitted }
pure def canCookie(s: Site): bool = s.phase == SiteCommitted
pure def cookie(s: Site): Site = if (s.priv) { ...s, privateCookie: true } else { ...s, normalCookie: true }
pure def alwaysAPrivateTabSharesNoCookies(s: Site): bool = s.priv implies not(s.thirdParty or s.normalCookie)
pure def alwaysAPrivateTabRemembersNoDecision(s: Site): bool = s.priv implies (s.decisionOne == Unset and s.decisionTwo == Unset)
pure val originValues = Set(1, 2)
pure def sometimesAnEngineRefused(s: Site): bool = s.phase == SiteRefused and not(s.priv)
```

### A site's request is held only while its page is shown and selected, and is granted only by the owner's allow, then Android's, for the page that asked

A normal tab's earlier allow skips to Android's own dialog, and an earlier deny holds nothing.
Hiding the app or showing another tab ends a site or sign-in prompt and leaves Android's dialog to
answer.

```quint
pure def canPermissionRequest(s: Site, origin: int): bool =
  s.phase == SiteCommitted and s.foreground and s.selected and s.prompt == NoPrompt and origin == s.origin
pure def permissionRequest(s: Site, origin: int): Site = {
  val remembered = if (s.priv) Unset else decisionFor(s, origin)
  { ...s, requestedOrigin: origin, requestedNavigation: s.navigation, choice: remembered, granted: false,
    prompt: if (remembered == Deny) NoPrompt else if (remembered == Allow) RuntimePrompt else SitePrompt }
}
pure def canPermissionDecision(s: Site, allowSite: bool): bool = s.prompt == SitePrompt
pure def permissionDecision(s: Site, allowSite: bool): Site = {
  val d = if (allowSite) Allow else Deny
  val chosen = { ...s, prompt: if (allowSite) RuntimePrompt else NoPrompt, choice: d }
  if (s.priv) chosen else decided(s.requestedOrigin, d, chosen)
}
pure def canAndroidResult(s: Site, allowed: bool): bool = s.prompt == RuntimePrompt
pure def androidResult(s: Site, allowed: bool): Site =
  { ...s, prompt: NoPrompt, androidAllowed: allowed,
    granted: allowed and s.phase == SiteCommitted and s.requestedOrigin == s.origin and s.requestedNavigation == s.navigation }
pure def hideSite(s: Site): Site = { ...s, foreground: false, prompt: if (s.prompt == RuntimePrompt) RuntimePrompt else NoPrompt, passwordPresent: false }
pure def resume(s: Site): Site = { ...s, foreground: true }
pure def deselect(s: Site): Site = { ...s, selected: false, prompt: if (s.prompt == RuntimePrompt) RuntimePrompt else NoPrompt, passwordPresent: false }
pure def selectTab(s: Site): Site = { ...s, selected: true }
pure def alwaysAGrantIsForThePageThatAsked(s: Site): bool =
  s.granted implies (s.androidAllowed and s.choice == Allow and s.requestedOrigin == s.origin and s.requestedNavigation == s.navigation)
pure def alwaysASitePromptNeedsTheShownTab(s: Site): bool = (s.prompt == SitePrompt or s.prompt == AuthPrompt) implies (s.foreground and s.selected)
pure def sometimesGranted(s: Site): bool = s.granted
pure def sometimesAndroidAsksWhilePaused(s: Site): bool = s.prompt == RuntimePrompt and not(s.foreground)
```

### An HTTP sign-in prompt opens only for a secure challenge of the page's own host, and a typed password lives only while it is open

```quint
pure def canAuthChallenge(s: Site, secureSameHost: bool): bool =
  (s.phase == SiteLoading or s.phase == SiteCommitted) and s.foreground and s.selected and s.prompt == NoPrompt and s.authAttempts < 3
pure def authChallenge(s: Site, secureSameHost: bool): Site =
  { ...s, prompt: if (secureSameHost) AuthPrompt else NoPrompt, authAttempts: if (secureSameHost) s.authAttempts + 1 else s.authAttempts,
    passwordPresent: false, passwordSubmitted: false }
pure def canTypePassword(s: Site): bool = s.prompt == AuthPrompt
pure def typePassword(s: Site): Site = { ...s, passwordPresent: true }
pure def canSubmitPassword(s: Site): bool = s.prompt == AuthPrompt and s.passwordPresent
pure def submitPassword(s: Site): Site = { ...s, prompt: NoPrompt, passwordPresent: false, passwordSubmitted: true }
pure def dismiss(s: Site): Site = { ...s, prompt: NoPrompt, passwordPresent: false }
pure def alwaysAPasswordLivesOnlyInItsPrompt(s: Site): bool = s.passwordPresent implies s.prompt == AuthPrompt
pure def sometimesSignedInManually(s: Site): bool = s.passwordSubmitted
```

## Story: Sign out of one site

> As the owner, I want Clear site data to sign me out of the site I am on after I confirm it, in that
> tab's profile only.

### Clearing a site removes its cookies and decisions in the tab's own profile only

The renderer offers it only on the native host for a committed page with an address, after a
confirmation. Closing a tab drops a private profile's cookies.

```quint
pure def clearSite(s: Site): Site = {
  val cleared = { ...s, prompt: NoPrompt, passwordPresent: false, granted: false }
  if (s.priv) { ...cleared, privateCookie: false } else decided(s.origin, Unset, { ...cleared, normalCookie: false })
}
pure def close(s: Site): Site = { ...s, phase: SiteClosed, privateCookie: false, prompt: NoPrompt, passwordPresent: false, granted: false }
pure def stepClearingASiteNeverTouchesTheOtherProfile(before: Site, via: str, after: Site): bool =
  via == "clearSite" implies (if (before.priv) after.normalCookie == before.normalCookie else after.privateCookie == before.privateCookie)
type ClearSiteFacts = { nativeHost: bool, committed: bool, failed: bool, hasHost: bool }
pure def mayClearSite(facts: ClearSiteFacts): bool = facts.nativeHost and facts.committed and not(facts.failed) and facts.hasHost
pure def lawClearSiteNeedsALoadedSite(facts: ClearSiteFacts): bool = mayClearSite(facts) implies (facts.committed and facts.hasHost)
pure val factsValues: Set[ClearSiteFacts] = Set({ nativeHost: true, committed: true, failed: false, hasHost: true })
  .union(Set({ nativeHost: false, committed: true, failed: false, hasHost: true }))
  .union(Set({ nativeHost: true, committed: false, failed: false, hasHost: true }))
```
