# Browser pages and addresses

The words every Browser spec shares: a tab's profile, the page the native host last reported for
it, the saved-session record, the limits, and how typed text becomes an address to open, words to
search for, or a refusal. Text is never parsed here: the shell reads the facts below from the
trimmed text with `parseBrowserAddressInput`, `isWebAddress` and `isSecureWebAddress` of
`@elizaos/os/browser/address` and a few patterns of its own, and the spec decides what they mean.

## Story: Type an address or search words

> As the owner, I want what I type in the address bar to open the site I named or search for my
> words, and never to send a username, a password or an e-mail address to a search provider.

### Typed text opens an address, opens the local development host, searches, or is refused

The shared parser classifies the text first. Alpha then keeps four exceptions: an all-digit host
with a port such as `10:30` is a search, a short decimal such as `3.16` is a search, an unsupported
scheme without an at sign is a search, and simple at-sign text such as `me@home` is a search. Text
longer than 4,096 units is refused. Text with an at sign that is not simple is never searched. A
bare `localhost` stays an address. An approved destination, which the agent proposed and the owner
approved, opens only as an address and is never searched.

```quint
type UpstreamKind = ParsedUrl | ParsedSearch | ParsedRefusal
type RefusalReason = NoRefusal | RefusedEmpty | RefusedInput | RefusedUrl | RefusedCredentials | RefusedProtocol
type AddressFacts = {
  kind: UpstreamKind, reason: RefusalReason, tooLong: bool, digitPort: bool, typedScheme: bool,
  hasAt: bool, simpleAt: bool, decimal: bool, hasHost: bool, localhost: bool,
}
type AddressOutcome = OpenAddress | OpenLocalhost | SearchWords | RefusedAddress
pure def searchedByAlpha(facts: AddressFacts, approved: bool, kind: UpstreamKind): bool =
  not(approved) and not(facts.typedScheme) and (
    if (kind == ParsedRefusal) (facts.reason == RefusedProtocol and not(facts.hasAt)) or (facts.reason == RefusedCredentials and facts.simpleAt)
    else kind == ParsedUrl and facts.decimal)
pure def classifyAddress(facts: AddressFacts, approved: bool): AddressOutcome = {
  val first = if (facts.kind == ParsedUrl and facts.digitPort) ParsedSearch else facts.kind
  val kind = if (searchedByAlpha(facts, approved, first)) ParsedSearch else first
  if (facts.tooLong) RefusedAddress
  else if (kind == ParsedSearch and (approved or (facts.hasAt and not(facts.simpleAt)))) RefusedAddress
  else if (kind == ParsedRefusal) RefusedAddress
  else if (approved and kind != ParsedUrl) RefusedAddress
  else if (kind == ParsedUrl) (if (facts.hasHost) OpenAddress else RefusedAddress)
  else if (facts.localhost) OpenLocalhost
  else SearchWords
}
pure val typedHost: AddressFacts = {
  kind: ParsedUrl, reason: NoRefusal, tooLong: false, digitPort: false, typedScheme: false,
  hasAt: false, simpleAt: false, decimal: false, hasHost: true, localhost: false,
}
pure val factsValues: Set[AddressFacts] = List(
  typedHost, { ...typedHost, typedScheme: true }, { ...typedHost, digitPort: true }, { ...typedHost, decimal: true },
  { ...typedHost, hasHost: false }, { ...typedHost, tooLong: true },
  { ...typedHost, kind: ParsedSearch }, { ...typedHost, kind: ParsedSearch, localhost: true },
  { ...typedHost, kind: ParsedSearch, hasAt: true, simpleAt: true }, { ...typedHost, kind: ParsedSearch, hasAt: true },
  { ...typedHost, kind: ParsedRefusal, reason: RefusedProtocol }, { ...typedHost, kind: ParsedRefusal, reason: RefusedProtocol, hasAt: true },
  { ...typedHost, kind: ParsedRefusal, reason: RefusedCredentials, hasAt: true, simpleAt: true },
  { ...typedHost, kind: ParsedRefusal, reason: RefusedCredentials, hasAt: true },
  { ...typedHost, kind: ParsedRefusal, reason: RefusedEmpty },
).foldl(Set(), (acc, f) => acc.union(Set(f)))
```

### An approved destination is never searched and opens only a parsed address with a host

```quint
pure def lawApprovedDestinationIsNeverSearched(facts: AddressFacts): bool = {
  val result = classifyAddress(facts, true)
  result == OpenAddress or result == RefusedAddress
}
pure def lawOpenedAddressHasAHost(facts: AddressFacts, approved: bool): bool =
  classifyAddress(facts, approved) == OpenAddress implies facts.hasHost
```

### Credential-like text is never searched, and text over the length limit is never opened

```quint
pure def lawUnsafeAtSignIsNeverSearched(facts: AddressFacts, approved: bool): bool =
  (facts.hasAt and not(facts.simpleAt)) implies classifyAddress(facts, approved) != SearchWords
pure def lawTooLongIsRefused(facts: AddressFacts, approved: bool): bool =
  facts.tooLong implies classifyAddress(facts, approved) == RefusedAddress
pure def lawDigitsWithAPortAreSearched(facts: AddressFacts): bool =
  (facts.kind == ParsedUrl and facts.digitPort and not(facts.tooLong)) implies classifyAddress(facts, false) == SearchWords
```

## Story: Know what each tab shows

> As the owner, I want each tab to show the page its native WebView last reported, in the profile
> it was opened in, so that a late or foreign report never changes what I see.

### A tab is normal or private for its whole life, and its page is the native host's latest report

`sequence` is the native host's event counter; `problem` is the host's reason for a page it could
not show, which the shell words; `elsewhere` is the address the native host names for another
browser to try when a normal tab's page failed for the network's or the WebView's reason, and
empty otherwise. A report is a web address (`web`) when it is HTTP or
HTTPS with a host, no credentials, clean text and at most 4,096 units; `secure` when it is also
HTTPS. A settled page is committed, not loading, not failed, not a page only another browser can
show, and has an address. The limits are the shared browsing session's.

```quint
type Profile = Normal | Private
type TabPage = {
  url: str, title: str, navigation: str, sequence: int,
  loading: bool, committed: bool, failed: bool, canBack: bool, canForward: bool,
  externalOnly: bool, web: bool, secure: bool, problem: str, elsewhere: str,
}
pure val blankPage: TabPage = {
  url: "", title: "", navigation: "", sequence: 0, loading: false, committed: false, failed: false,
  canBack: false, canForward: false, externalOnly: false, web: false, secure: false, problem: "", elsewhere: "",
}
pure val maxTabs = 8
pure val maxHistory = 100
pure val maxRestoreAttempts = 3
pure def isSettled(p: TabPage): bool = p.committed and not(p.loading) and not(p.failed) and not(p.externalOnly) and p.url != ""
pure def settledSecurely(p: TabPage): bool = isSettled(p) and p.secure
pure def lawASettledSecurePageIsSettled(p: TabPage): bool = settledSecurely(p) implies isSettled(p)
pure val loadedPage: TabPage = { ...blankPage, url: "https://example.test/", title: "Example", navigation: "1", sequence: 2, committed: true, web: true, secure: true }
pure val pValues: Set[TabPage] = List(blankPage, loadedPage, { ...loadedPage, loading: true, committed: false },
  { ...loadedPage, failed: true, committed: false }, { ...loadedPage, secure: false }, { ...loadedPage, externalOnly: true },
  { ...loadedPage, failed: true, committed: false, elsewhere: "https://example.test/" })
  .foldl(Set(), (acc, p) => acc.union(Set(p)))
```

### A page that failed in a normal native tab offers another browser for the address the host named, and nothing else does

The failed page shows Open in browser, which hands only that address to another browser. A private
tab, a page still loading, a page that loaded and a failure the host gave no address for (a refusal,
a certificate it did not accept, a stopped load) offer nothing; the browser build's frame surface
has its own link.

```quint
pure def offersElsewhere(p: TabPage, priv: bool, native: bool): bool =
  native and not(priv) and p.failed and not(p.loading) and p.elsewhere != ""
pure def lawOnlyAFailedNormalNativePageOffersElsewhere(p: TabPage): bool =
  (offersElsewhere(p, false, true) implies (p.failed and p.elsewhere != "")) and not(offersElsewhere(p, true, true))
    and not(offersElsewhere(p, false, false)) and (isSettled(p) implies not(offersElsewhere(p, false, true)))
```

### The saved session holds normal tabs with known addresses, the history and the selected saved tab

Each saved tab is a web address the shell already checked; `cur` is the selected saved tab, or
empty when the selected tab was not saved.

```quint
type SavedTab = { id: str, url: str, title: str }
type SavedSession = { history: List[str], tabs: List[SavedTab], cur: str }
pure val emptySaved: SavedSession = { history: List(), tabs: List(), cur: "" }
pure def lawEmptySavedSessionHasNoTabs(saved: SavedSession): bool =
  saved == emptySaved implies saved.tabs.length() == 0
pure val savedValues: Set[SavedSession] = List(emptySaved,
  { history: List("https://example.test/"), tabs: List({ id: "t8", url: "https://example.test/", title: "Example" }), cur: "t8" },
  { history: List(), tabs: List({ id: "t8", url: "https://example.test/", title: "" }, { id: "t9", url: "https://other.test/", title: "Other" }), cur: "" })
  .foldl(Set(), (acc, x) => acc.union(Set(x)))
```

### A page command is back, forward, reload or stop

```quint
type PageCommand = GoBack | GoForward | Reload | StopLoading
pure def commandAllowedOn(p: TabPage, command: PageCommand): bool = match command {
  | GoBack => p.canBack
  | GoForward => p.canForward
  | Reload => p.url != ""
  | StopLoading => p.loading
}
pure def lawStopNeedsALoadingPage(p: TabPage): bool = commandAllowedOn(p, StopLoading) implies p.loading
```
