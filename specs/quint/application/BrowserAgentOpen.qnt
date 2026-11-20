/// What the agent can do in Browser: open one HTTPS address (a device-action proposal, shown only
/// after its journal and receipt attempt) and send back/forward/reload to the exact visible tab
/// (a view command: claimed, never journaled, never repeated). Custody of the proposal itself is
/// DeviceActionReview; this module adds the Browser-specific admission and presentation rules.
///
/// The tab part covers the reviewed Browser controls (browserControl in browser-adapter.ts) and
/// where an approved open lands: browser_search, browser_tab_new, browser_tab_switch,
/// browser_tab_close, browser_find and stop, the reuse of an untouched or the agent's own tab
/// (approvedOpenTab), the tab limit, and opens made from a private tab. Each control runs with
/// its presentation in one step; the journal and receipt ordering is the open path above.
module BrowserAgentOpen {
  /// DEFAULT_BROWSING_LIMITS.tabs in the shared browsing session.
  pure val MaxTabs = 8
  type Tab = {priv: bool, untouched: bool}
  /// One tab the agent opened in, switched to or closed, and the profile the request came from.
  type Reach = {op: str, fromPrivate: bool, priv: bool}
  type State = {
    // proposed destination and the owner's typed message
    scheme: str, typed: bool, reviewFirst: str, card: bool, authority: str,
    autoUsed: bool, autoOpens: int,
    // executor, journal, receipt attempt and presentation
    tab: bool, journal: str, receiptTried: bool, synced: bool, foreground: bool,
    presented: bool, tabReceipt: bool,
    // view command (back / forward / reload)
    command: str, native: bool, inBrowser: bool, overlay: bool, tabRevision: int,
    claimRevision: int, boundRevision: int, sentRevision: int, commandAsked: bool, claims: int, sends: int, acks: int,
    // Browser tabs and the reviewed controls
    tabs: List[Tab], sel: int, agent: int, loading: bool, reached: List[Reach], refusals: int,
    findOpened: bool, findOnWeb: bool, stopped: bool}
  var s: State
  pure val schemes = Set("https", "http", "userinfo")
  action init = s' = {scheme: "https", typed: false, reviewFirst: "off", card: false, authority: "none",
    autoUsed: false, autoOpens: 0, tab: false, journal: "empty", receiptTried: false, synced: false,
    foreground: true, presented: false, tabReceipt: false,
    command: "none", native: true, inBrowser: true, overlay: false, tabRevision: 0, claimRevision: -1,
    boundRevision: -1, sentRevision: -1, commandAsked: false, claims: 0, sends: 0, acks: 0,
    tabs: [{priv: false, untouched: true}], sel: 0, agent: -1, loading: false, reached: [], refusals: 0,
    findOpened: false, findOnWeb: false, stopped: false}
  val asks = s.reviewFirst != "off"

  // ---- Browser tabs and the reviewed controls ----
  /// A request made from a private page: Browser is the shown view and its selected tab is private.
  pure def fromPrivate(st: State): bool = st.inBrowser and st.tabs[st.sel].priv
  pure def fits(st: State, i: int, priv: bool): bool = i >= 0 and i < st.tabs.length() and st.tabs[i].priv == priv
  pure def firstUntouched(st: State, priv: bool): int = st.tabs.indices().fold(-1, (best, i) =>
    if (st.tabs[i].priv == priv and st.tabs[i].untouched and (best < 0 or i < best)) i else best)
  /// approvedOpenTab: the selected tab if untouched, else the agent's earlier tab unless a new tab
  /// was asked for, else any untouched tab, each only in the request's own profile; -1 opens a new tab.
  pure def reuseTab(st: State, priv: bool, newTab: bool): int =
    if (fits(st, st.sel, priv) and st.tabs[st.sel].untouched) st.sel
    else if (not(newTab) and fits(st, st.agent, priv)) st.agent
    else firstUntouched(st, priv)
  /// Which tab index survives the removal of `gone`, or -1.
  pure def shifted(i: int, gone: int): int = if (i == gone) -1 else if (i > gone) i - 1 else i
  pure def listWithout(tabs: List[Tab], gone: int): List[Tab] =
    range(0, tabs.length()).foldl([], (rest, i) => if (i == gone) rest else rest.append(tabs[i]))
  pure def refused(st: State): State = {...st, refusals: st.refusals + 1}
  val agentIdle = s.reached.length() < 4 and s.refusals < 4

  /// An approved open or search. It navigates a reused tab in place or creates one in the
  /// request's profile; past the tab limit it is refused before any effect. A shown Browser
  /// then selects the tab.
  action agentOpen(op: str, newTab: bool): bool = all {agentIdle, op.in(Set("open", "search")),
    val priv = fromPrivate(s)
    val r = reuseTab(s, priv, newTab)
    val at = if (r >= 0) r else s.tabs.length()
    s' = if (r < 0 and s.tabs.length() >= MaxTabs) refused(s) else {
      val tabs = if (r >= 0) s.tabs.replaceAt(r, {...s.tabs[r], untouched: false})
        else s.tabs.append({priv: priv, untouched: false})
      {...s, tabs: tabs, agent: at, sel: if (s.foreground) at else s.sel,
        reached: s.reached.append({op: op, fromPrivate: priv, priv: tabs[at].priv})}
    }}
  /// browser_tab_new: an empty tab, private only when asked; refused at the tab limit.
  action agentTabNew(priv: bool): bool = all {agentIdle,
    s' = if (s.tabs.length() >= MaxTabs) refused(s) else {...s,
      tabs: s.tabs.append({priv: priv, untouched: true}),
      sel: if (s.foreground) s.tabs.length() else s.sel}}
  /// browser_tab_switch names another tab. A private tab is found only for a request made from a private tab.
  action agentSwitch(target: int): bool = all {agentIdle, target >= 0, target < s.tabs.length(),
    val from = fromPrivate(s)
    s' = if (target == s.sel or (s.tabs[target].priv and not(from))) refused(s)
      else {...s, sel: if (s.foreground) target else s.sel,
        reached: s.reached.append({op: "switch", fromPrivate: from, priv: s.tabs[target].priv})}}
  /// browser_tab_close names a tab, or (-1) the showing one. The showing tab closes only in the
  /// presentation; closing the last tab leaves one new tab.
  action agentClose(target: int): bool = all {agentIdle, target >= -1, target < s.tabs.length(),
    val from = fromPrivate(s)
    val gone = if (target < 0) s.sel else target
    val hiddenPrivate = s.tabs[gone].priv and not(from)
    val closes = gone != s.sel or s.foreground
    s' = if (hiddenPrivate) refused(s) else if (not(closes)) s else {
      val rest = listWithout(s.tabs, gone)
      {...s, tabs: if (rest.length() == 0) [{priv: false, untouched: true}] else rest,
        sel: if (gone == s.sel) 0 else shifted(s.sel, gone), agent: shifted(s.agent, gone),
        reached: s.reached.append({op: "close", fromPrivate: from, priv: s.tabs[gone].priv})}
    }}
  /// browser_find needs the native page; the web build's page is a frame this app cannot search.
  action agentFind = all {agentIdle,
    s' = if (not(s.native)) refused(s) else {...s, findOpened: true, findOnWeb: s.findOnWeb or not(s.native)}}
  /// stop is refused unless the page is loading.
  action agentStop = all {agentIdle,
    s' = if (not(s.loading)) refused(s) else {...s, loading: false, stopped: true}}
  /// The owner's own Browser use: select a tab, open one, load an address in the selected tab.
  action ownerSelect(i: int): bool = all {i >= 0, i < s.tabs.length(), s' = {...s, sel: i}}
  action ownerNewTab(priv: bool): bool = all {s.tabs.length() < MaxTabs,
    s' = {...s, tabs: s.tabs.append({priv: priv, untouched: true}), sel: s.tabs.length()}}
  action ownerLoad = s' = {...s, tabs: s.tabs.replaceAt(s.sel, {...s.tabs[s.sel], untouched: false}), loading: true}
  action pageSettles = s' = {...s, loading: false}
  val idle = s.authority == "none"
  action prefer(value: str): bool = all {value.in(Set("off", "on", "unreadable")),
    s' = {...s, reviewFirst: value}}
  /// A new proposal of the same message. Only HTTPS without credentials parses into a card.
  action propose(scheme: str, typed: bool): bool = all {idle or s.journal == "terminal", scheme.in(schemes),
    s' = {...s, scheme: scheme, typed: typed, card: scheme == "https", authority: "none",
      tab: false, journal: "empty", receiptTried: false, synced: false, presented: false, tabReceipt: false}}
  action newMessage = all {idle or s.journal == "terminal",
    s' = {...s, card: false, authority: "none", autoUsed: false, autoOpens: 0, typed: false}}
  /// The direct pass: the typed address must match, once per message, with the preference off.
  action openDirect = all {s.card, idle, not(asks), s.typed, not(s.autoUsed),
    s' = {...s, card: false, authority: "request", autoUsed: true}}
  action openReviewed = all {s.card, idle, s' = {...s, card: false, authority: "review"}}
  /// The executor re-checks the scheme and creates the new tab without selecting it.
  action execute = all {not(idle), s.journal == "empty", not(s.tab), s.scheme == "https",
    s' = {...s, tab: true,
      autoOpens: s.autoOpens + (if (s.authority == "request") 1 else 0)}}
  /// The terminal journal entry records the receipt summary, which names the created tab
  /// and makes no claim that Browser was shown.
  action journalFinish = all {s.tab, s.journal == "empty", s' = {...s, journal: "terminal", tabReceipt: true}}
  action receipt(ok: bool): bool = all {s.journal == "terminal", not(s.receiptTried),
    s' = {...s, receiptTried: true, synced: ok}}
  action leaveForeground = s' = {...s, foreground: false}
  /// Shown only after the receipt attempt, and only while the same foreground is current.
  action present = all {s.tab, s.receiptTried, not(s.presented), s.foreground,
    s' = {...s, presented: true}}
  action presentSkipped = all {s.tab, s.receiptTried, not(s.presented), not(s.foreground), s' = s}

  action tabNavigates = all {s.tabRevision < 3, s' = {...s, tabRevision: s.tabRevision + 1}}
  action place(native: bool, inBrowser: bool, overlay: bool): bool = all {s.command.in(Set("none", "done")),
    s' = {...s, native: native, inBrowser: inBrowser, overlay: overlay}}
  /// An interact frame for the current view is claimed once.
  action claim = all {s.command.in(Set("none", "done")), s.inBrowser, s.claims < 3,
    s' = {...s, command: "claimed", claims: s.claims + 1, claimRevision: s.tabRevision, boundRevision: -1, sentRevision: -1, commandAsked: false}}
  /// A new navigation invalidates the original renderer context while its server claim waits.
  action claimStale = all {s.command == "claimed", s.claimRevision != s.tabRevision, s' = {...s, command: "refused"}}
  /// "Review phone actions first" (or an unreadable choice) refuses the command after its claim.
  action commandRefused = all {s.command == "claimed", s.claimRevision == s.tabRevision, asks, s' = {...s, command: "refused"}}
  action commandBind = all {s.command == "claimed", s.claimRevision == s.tabRevision, not(asks), s.native, s.inBrowser, not(s.overlay),
    s' = {...s, command: "bound", boundRevision: s.tabRevision, commandAsked: asks}}
  action commandUnavailable = all {s.command == "claimed", s.claimRevision == s.tabRevision, not(asks),
    not(s.native) or not(s.inBrowser) or s.overlay, s' = {...s, command: "refused"}}
  /// The native call names the admitted navigation; a tab that moved on refuses it.
  action commandSend = all {s.command == "bound", s.boundRevision == s.tabRevision,
    s' = {...s, command: "sent", sentRevision: s.tabRevision, sends: s.sends + 1}}
  action commandStale = all {s.command == "bound", s.boundRevision != s.tabRevision,
    s' = {...s, command: "refused"}}
  /// One result per claim, delivered or lost; the command is never sent again for an acknowledgment.
  action acknowledge(delivered: bool): bool = all {s.command.in(Set("sent", "refused")),
    s' = {...s, command: "done", acks: s.acks + (if (delivered) 1 else 0)}}
  action step = any {
    prefer("off"), prefer("on"), prefer("unreadable"),
    propose("https", true), propose("https", false), propose("http", true), propose("userinfo", true),
    newMessage, openDirect, openReviewed, execute, journalFinish, receipt(true), receipt(false),
    leaveForeground, present, presentSkipped, tabNavigates,
    place(true, true, false), place(false, true, false), place(true, false, false), place(true, true, true),
    claim, claimStale, commandRefused, commandBind, commandUnavailable, commandSend, commandStale,
    acknowledge(true), acknowledge(false),
    agentOpen("open", false), agentOpen("open", true), agentOpen("search", false),
    agentTabNew(false), agentTabNew(true), {nondet i = 0.to(MaxTabs - 1).oneOf() any {
      agentSwitch(i), agentClose(i), ownerSelect(i)}},
    agentClose(-1), agentFind, agentStop, ownerNewTab(false), ownerNewTab(true), ownerLoad, pageSettles}

  val HttpsNoUserinfo = (s.card or s.tab) implies s.scheme == "https"
  val AutoOpenMatchesTypedAddress = (s.authority == "request") implies s.typed
  val OneAutoOpenPerMessage = s.autoOpens <= 1
  /// The journaled receipt names tab creation exactly when the effect is terminal, and only
  /// after the tab exists.
  val ReceiptReportsTabCreation = (s.tabReceipt iff s.journal == "terminal") and (s.tabReceipt implies s.tab)
  val PresentationAfterReceiptAttempt = s.presented implies
    (s.tab and s.journal == "terminal" and s.receiptTried)
  val ViewCommandNeedsToggleOff = s.command.in(Set("bound", "sent")) implies not(s.commandAsked)
  val ViewCommandBoundToExactTabRevision = s.command == "sent" implies
    (s.sentRevision == s.boundRevision and s.boundRevision >= 0)
  val ViewCommandNativeForegroundOnly = s.command.in(Set("bound", "sent")) implies
    (s.native and s.inBrowser and not(s.overlay))
  val ViewCommandNeverRepeated = s.sends <= s.claims and s.acks <= s.claims
  /// The agent never opens more tabs than the limit, and Browser always has a tab.
  val TabLimitHeld = s.tabs.length() >= 1 and s.tabs.length() <= MaxTabs and s.sel >= 0 and s.sel < s.tabs.length()
    and s.agent < s.tabs.length()
  /// An open or search made from a private tab stays private; one made elsewhere never lands in a private tab.
  val AgentOpenStaysInProfile = s.reached.foldl(true, (ok, r) =>
    ok and (r.op.in(Set("open", "search")) implies r.priv == r.fromPrivate))
  /// A private tab is switched to or closed only for a request made from a private tab.
  val PrivateTabNeedsPrivateRequest = s.reached.foldl(true, (ok, r) =>
    ok and (r.op.in(Set("switch", "close")) and r.priv implies r.fromPrivate))
  val FindNeedsNativePage = not(s.findOnWeb)
  val safety = HttpsNoUserinfo and AutoOpenMatchesTypedAddress and OneAutoOpenPerMessage and ReceiptReportsTabCreation and
    PresentationAfterReceiptAttempt and ViewCommandNeedsToggleOff and
    ViewCommandBoundToExactTabRevision and ViewCommandNativeForegroundOnly and ViewCommandNeverRepeated and
    TabLimitHeld and AgentOpenStaysInProfile and PrivateTabNeedsPrivateRequest and FindNeedsNativePage

  /// A receipt can report a created tab while presentation is still unavailable.
  val CreatedTabRemainsUnselected = s.tabReceipt and s.receiptTried and not(s.foreground) and not(s.presented)

  run typedAddressOpensOnceTest = init.then(propose("https", true)).then(openDirect).then(execute)
    .then(journalFinish).then(receipt(true)).then(present)
    .then(propose("https", true))
    .expect(safety and s.card and s.autoUsed and s.autoOpens == 1)
  run untypedAddressNeedsReviewTest = init.then(propose("https", false))
    .expect(safety and s.card and not(s.typed)).then(openReviewed).then(execute)
    .expect(safety and s.authority == "review" and s.autoOpens == 0)
  run insecureAddressHasNoCardTest = init.then(propose("http", true))
    .expect(safety and not(s.card)).then(propose("userinfo", true)).expect(safety and not(s.card))
  run reviewFirstKeepsCardTest = init.then(prefer("unreadable")).then(propose("https", true))
    .expect(safety and s.card and asks)
  run presentationWaitsForReceiptTest = init.then(propose("https", true)).then(openDirect).then(execute)
    .then(journalFinish).expect(safety and not(s.receiptTried) and not(s.presented))
    .then(receipt(false)).then(present).expect(safety and s.presented and not(s.synced))
  run hiddenForegroundReportsTabCreationTest = init.then(propose("https", true)).then(openDirect).then(execute)
    .then(journalFinish).then(leaveForeground).then(receipt(true)).then(presentSkipped)
    .expect(safety and CreatedTabRemainsUnselected)
  run commandRefusedUnderReviewFirstTest = init.then(prefer("on")).then(claim).then(commandRefused)
    .then(acknowledge(true)).expect(safety and s.sends == 0 and s.acks == 1)
  run commandBoundToTabTest = init.then(claim).then(commandBind).then(tabNavigates).then(commandStale)
    .then(acknowledge(true)).expect(safety and s.sends == 0)
  run commandSentOnceTest = init.then(claim).then(commandBind).then(commandSend).then(acknowledge(false))
    .expect(safety and s.sends == 1 and s.acks == 0 and s.command == "done")
  run navigationDuringClaimRefusesCommandTest = init.then(claim).then(tabNavigates).then(claimStale)
    .then(acknowledge(true)).expect(safety and s.sends == 0 and s.acks == 1)
  run openReusesUntouchedTabTest = init.then(agentOpen("open", false))
    .expect(safety and s.tabs == [{priv: false, untouched: false}] and s.agent == 0 and s.sel == 0)
  run openReusesAgentTabUnlessNewTabTest = init.then(agentOpen("open", false)).then(agentOpen("search", false))
    .expect(safety and s.tabs.length() == 1).then(agentOpen("open", true))
    .expect(safety and s.tabs.length() == 2 and s.agent == 1 and s.sel == 1)
  run openFromPrivateTabStaysPrivateTest = init.then(ownerNewTab(true)).then(ownerLoad).then(agentOpen("open", false))
    .expect(safety and s.tabs.length() == 3 and s.tabs[2].priv and s.reached[0].fromPrivate)
    .then(place(true, false, false)).then(ownerSelect(2)).then(agentOpen("open", true))
    .expect(safety and s.tabs.length() == 3 and s.agent == 0 and not(s.tabs[0].untouched) and not(s.reached[1].priv))
  run tabLimitRefusesBeforeEffectTest = init.then(ownerLoad).then(ownerNewTab(false)).then(ownerLoad)
    .then(ownerNewTab(false)).then(ownerLoad).then(ownerNewTab(false)).then(ownerLoad)
    .then(ownerNewTab(false)).then(ownerLoad).then(ownerNewTab(false)).then(ownerLoad)
    .then(ownerNewTab(false)).then(ownerLoad).then(ownerNewTab(false)).then(ownerLoad)
    .expect(s.tabs.length() == MaxTabs).then(agentOpen("open", false))
    .expect(safety and s.refusals == 1 and s.tabs.length() == MaxTabs and s.reached.length() == 0)
    .then(agentTabNew(true)).expect(safety and s.refusals == 2 and s.tabs.length() == MaxTabs)
  run privateTabHiddenFromOtherRequestsTest = init.then(ownerNewTab(true)).then(place(true, false, false))
    .then(agentClose(-1)).expect(safety and s.refusals == 1 and s.tabs.length() == 2)
    .then(ownerSelect(0)).then(agentSwitch(1)).expect(safety and s.refusals == 2 and s.sel == 0)
    .then(place(true, true, false)).then(ownerSelect(1)).then(agentClose(-1))
    .expect(safety and s.tabs == [{priv: false, untouched: true}] and s.sel == 0 and s.reached[0].priv)
  run hiddenBrowserKeepsShowingTabTest = init.then(ownerNewTab(false)).then(leaveForeground).then(agentClose(-1))
    .expect(safety and s.tabs.length() == 2 and s.sel == 1).then(agentClose(0))
    .expect(safety and s.tabs.length() == 1 and s.sel == 0)
  run findAndStopNeedTheirPageTest = init.then(agentStop).expect(safety and s.refusals == 1)
    .then(ownerLoad).then(agentStop).expect(safety and s.stopped and not(s.loading))
    .then(place(false, true, false)).then(agentFind).expect(safety and s.refusals == 2 and not(s.findOpened))
  run browserBuildHasNoCommandTest = init.then(place(false, true, false)).then(claim)
    .then(commandUnavailable).then(acknowledge(true)).expect(safety and s.sends == 0)
}
