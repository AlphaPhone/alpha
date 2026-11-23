# Page egress

How the selected page leaves its tab by the owner's own action: Android's share sheet, a new e-mail
draft with its address, copying its link, and bookmarking it. Each reads the committed page at the
tap, never the address-bar draft or the render that opened the menu. A private page may be shared,
copied or bookmarked this way and still never enters history; opening it in another browser is the
reviewed path of [handoff](./handoff.md).

## Story: Share or keep the page I am looking at

> As the owner, I want Share, Share by email, Copy link and Bookmark to act on the page I see, to
> say so when no page is loaded, and never to send a page I have since left.

### What the shell reads at each tap is the selected tab's page and whether the Browser view shows it

```quint
type Viewed = { visible: bool, tab: str, url: str, title: str, navigation: str, revision: int, settled: bool, secure: bool }
pure val noViewed: Viewed = { visible: false, tab: "", url: "", title: "", navigation: "", revision: 0, settled: false, secure: false }
pure def mayLeave(v: Viewed): bool = v.visible and v.settled and v.url != "" and v.navigation != ""
pure def mayBookmark(v: Viewed): bool = v.settled and v.secure and v.url != ""
pure def lawOnlyAShownSettledPageLeaves(v: Viewed): bool = mayLeave(v) implies (v.visible and v.settled)
pure def lawOnlyASecureSettledPageIsBookmarked(v: Viewed): bool = mayBookmark(v) implies (v.secure and v.settled)
pure val readyPage: Viewed = { visible: true, tab: "t1", url: "https://example.test/", title: "Example", navigation: "1", revision: 1, settled: true, secure: true }
pure val viewedValues: Set[Viewed] = List(readyPage, { ...readyPage, revision: 2 }, { ...readyPage, visible: false },
  { ...readyPage, settled: false }, { ...readyPage, secure: false }, noViewed).foldl(Set(), (acc, x) => acc.union(Set(x)))
pure val vValues: Set[Viewed] = viewedValues
```

### Share waits for the menu to close, then hands Android only the same document, one share at a time

The menu closes first so the real page is back on screen under the sheet. A share asked for while
another is in progress is ignored.

```quint
type ShareStage = ShareIdle | ShareWaiting | ShareShowing
type Egress = { share: ShareStage, captured: Viewed, shares: int, emails: int, copies: int, marks: int, sawSettled: bool, sawSecure: bool }
pure val initial: Egress = { share: ShareIdle, captured: noViewed, shares: 0, emails: 0, copies: 0, marks: 0, sawSettled: false, sawSecure: false }
type EgressProblem = LoadPageToShare | PageChangedBeforeShare | ShareFailed | LoadPageToCopy | Copied | ClipboardUnavailable | HttpsOnly
type EgressNote = { problem: EgressProblem }
type SharedPage = { tab: str, url: str, navigation: str, title: str }
type MarkToggle = { url: str, title: str, saved: bool }
type EgressEffect = ShareSheet(SharedPage) | ComposeEmail(SharedPage) | CopyLink(SharedPage) | ToggleMark(MarkToggle) | Say(EgressNote)
type EgressChange = { state: Egress, out: List[EgressEffect] }
pure def said(problem: EgressProblem): EgressEffect = Say({ problem: problem })
pure def shared(v: Viewed): SharedPage = { tab: v.tab, url: v.url, navigation: v.navigation, title: v.title }
pure def seen(viewed: Viewed, e: Egress): Egress = { ...e, sawSettled: e.sawSettled or viewed.settled, sawSecure: e.sawSecure or (viewed.settled and viewed.secure) }
pure def startShare(e: Egress, viewed: Viewed): EgressChange =
  if (e.share != ShareIdle) { state: e, out: List() }
  else if (not(mayLeave(viewed))) { state: seen(viewed, e), out: List(said(LoadPageToShare)) }
  else { state: { ...seen(viewed, e), share: ShareWaiting, captured: viewed }, out: List() }
pure def canShareDelayEnded(e: Egress, viewed: Viewed): bool = e.share == ShareWaiting
pure def shareDelayEnded(e: Egress, viewed: Viewed): EgressChange =
  if (mayLeave(viewed) and viewed.tab == e.captured.tab and viewed.navigation == e.captured.navigation and viewed.revision == e.captured.revision and viewed.url == e.captured.url)
    { state: { ...e, share: ShareShowing, shares: e.shares + 1 }, out: List(ShareSheet(shared(e.captured))) }
  else { state: { ...e, share: ShareIdle }, out: List(said(PageChangedBeforeShare)) }
pure def canShareSettled(e: Egress, ok: bool): bool = e.share == ShareShowing
pure def shareSettled(e: Egress, ok: bool): EgressChange =
  { state: { ...e, share: ShareIdle }, out: if (ok) List() else List(said(ShareFailed)) }
pure def alwaysAShareInProgressHoldsASettledPage(e: Egress): bool = e.share != ShareIdle implies mayLeave(e.captured)
pure def stepTheSheetGetsTheCapturedPage(before: Egress, via: str, after: Egress, out: List[EgressEffect]): bool =
  out.every(x => match x { | ShareSheet(p) => p == shared(before.captured) | _ => true })
pure def sometimesShared(e: Egress): bool = e.shares > 0 and e.share == ShareIdle
```

### Share by email opens a draft with the page's address and name, and Copy link copies its address, each only from a shown settled page

```quint
pure def shareByEmail(e: Egress, viewed: Viewed): EgressChange =
  if (mayLeave(viewed)) { state: { ...seen(viewed, e), emails: e.emails + 1 }, out: List(ComposeEmail(shared(viewed))) }
  else { state: seen(viewed, e), out: List(said(LoadPageToShare)) }
pure def copyLink(e: Egress, viewed: Viewed): EgressChange =
  if (mayLeave(viewed)) { state: { ...seen(viewed, e), copies: e.copies + 1 }, out: List(CopyLink(shared(viewed))) }
  else { state: seen(viewed, e), out: List(said(LoadPageToCopy)) }
pure def copied(e: Egress, ok: bool): EgressChange = { state: e, out: List(said(if (ok) Copied else ClipboardUnavailable)) }
pure def alwaysEgressFollowsASettledPage(e: Egress): bool = (e.shares > 0 or e.emails > 0 or e.copies > 0) implies e.sawSettled
```

### Bookmark toggles the mark of a settled HTTPS page, and otherwise says only HTTPS pages can be bookmarked

```quint
pure def toggleBookmark(e: Egress, viewed: Viewed, marked: bool): EgressChange =
  if (mayBookmark(viewed)) { state: { ...seen(viewed, e), marks: e.marks + 1 }, out: List(ToggleMark({ url: viewed.url, title: viewed.title, saved: not(marked) })) }
  else { state: seen(viewed, e), out: List(said(HttpsOnly)) }
pure def alwaysABookmarkFollowsASecurePage(e: Egress): bool = e.marks > 0 implies e.sawSecure
pure def sometimesBookmarked(e: Egress): bool = e.marks > 0
```
