# Alpha parity audit: Browser and Maps

Slice: `browser` (tabs, private sessions, find in page, bookmarks, agent browsing, page context, close-all-tabs review, Google return links) and `maps` (search, routes, navigation, raster/tile performance, chat cards, agent controls, saved places, coverage and credits, "where am I").
Legacy: `alpha-develop` dd63c6bc (through #1454). Port: `alpha-vs` 3d7ca972. Upstream: `eliza-vs` `vibestack-dp`.
Read-only audit: nothing was built, generated or run. Paths below are relative to those trees.

## Summary

| Class | Count |
| --- | --- |
| OK | 32 |
| CHANGED | 13 |
| MISSING | 3 |
| UNIMPLEMENTED | 4 |
| UNMODELED | 1 |
| KNOWN | 6 |
| UNVERIFIED | 3 |
| RETIRED | 0 |

Verdict: **not at parity.** The port's Browser and Maps are real rewrites with broad spec coverage (every `###` rule in both areas has a Quint block), and the core of #1443 (itemized close-all) and #1444 (page context model, native script, setting) is present. Three groups of loss remain:

1. **#1453 never reached the port.** The port merged develop "through #1449". #1453's Browser fixes (honest close-all receipt, private-tabs-kept count, retitle-tolerant listing, correction when a deferred change did not run) are absent from spec and code.
2. **Maps rendering regressed against the measured #1315 work.** Tiles now travel through upstream `ElizaCloudPlugin` (4 workers), a single failed tile can fail the whole map, the viewport copyright is asked on every settle, and on the Google raster the camera no longer zooms to a place or fits result pins. The spec models none of the camera behaviour.
3. **Agent-side wiring is thin.** The owner's tab pick for ambiguous switch/close is gone, the chat history guard compares the current tab with itself, the review preference never reaches `BrowserAgent`, and the `agent.md` open model is never driven. Page context and view commands are unwired end to end, which the open-items doc already lists.

Maps hand-offs, chat-card flows, agent surface admission, saved places, connection/account fencing, guidance and "where am I" look faithfully ported.

## Gaps

### 1. MISSING — a Browser change that did not run after its receipt is never corrected (#1453)
- Behaviour: a tab switch, closing the showing tab, and page history run after the receipt; when that step is skipped (screen off, context or session changed, request superseded, throw) the owner gets a correction instead of an unretracted success.
- Legacy: `apps/app/src/prototype/browser-adapter.ts:700` (`deferred`), `:718-728`, `:748-775`; `apps/app/src/runtime/action-message-presentation.ts:62-82` (`browserControlNotDone`, `runBrowserPresentation`); `apps/app/src/prototype/agent-adapter.ts:1478`; test `test/browser-chat-controls.test.mjs:269`.
- Port: `apps/app/src/assistant/review.vibe:352-356` calls `ports.present` unconditionally after `Applied`; `apps/app/src/browser/operations.vibe:219-224` forks the held effect and returns nothing. No readiness check, no result, no correction text anywhere in `src/browser`, `src/assistant/presentation.vibe` or `spec/browser`.
- Impact: "Switched tabs" / "Closed the tab" / "Went back a page" stays in chat when nothing happened. The presentation also runs (and opens Browser) after the owner moved elsewhere.
- Smallest fix: rule in `spec/browser/session.md` (story "Let the agent open and drive my tabs") giving presentations an outcome; `present` in `src/browser/operations.vibe` returns whether the dispatch was accepted; `src/assistant/review.vibe` says the correction.

### 2. CHANGED — closing every tab reports "Closed all tabs." even when private tabs were left open (#1453)
- Legacy: `action-message-presentation.ts:43-57` ("Closed 1 tab. Private tabs were left open." / "Closed 2 tabs."); test `browser-chat-controls.test.mjs:217`.
- Port: `src/browser/operations.vibe:209` returns the fixed `"Closed all tabs."`; `agentCloseAll` settles no count (`spec/browser/session.md:814-824`).
- Impact: owner and agent are told all tabs closed while private tabs remain; this is the exact defect #1453 fixed.
- Smallest fix: `spec/browser/session.md` close-all rule carries `{count, privateKept}` on the settle; `summarize` in `src/browser/operations.vibe` words it.

### 3. MISSING — the close-all card and notice do not say how many private tabs stay open (#1453)
- Legacy: `browser-adapter.ts:339` (`privateKept`), `apps/app/src/ui/device-actions/client-coordinator.ts:265` (`closeAllTabsNotice`: "No other tabs are open to close. 1 private tab stays open. Ask from a private tab to close it."), card suffix "2 private tabs stay open. Ask from a private tab to close them."; test `browser-chat-controls.test.mjs:250`.
- Port: `src/browser/operations.vibe:100-127` knows only the listed set; with only private tabs open from outside one it says `NO_TABS_TO_CLOSE_NOTICE` ("No tabs are open to close").
- Impact: a false statement with private tabs open, and no hint how to close them.
- Smallest fix: same rule as gap 2; `closingSet`/`closingCard` in `src/browser/operations.vibe` take the kept count.

### 4. CHANGED — a tab that only retitles itself refuses an approved close-all (#1453)
- Legacy: `browser-adapter.ts:346` keys the listing on id, page address, private flag and kept count, not title; test `browser-chat-controls.test.mjs:302`.
- Port: `spec/browser/session.md:771-779` puts `title` in `ListedTab` and `listingCurrent` compares whole records.
- Impact: unread-count titles or a page finishing its load between card and approval give "Browser's tabs changed… Nothing was closed."
- Smallest fix: compare `id`, `url`, `priv` (and kept count) in `listingCurrent`; keep the title only for display.

### 5. CHANGED — map tiles go through a 4-worker native queue again (#1315 measured fix lost on the tile path)
- Legacy: tiles use `CloudProtocol.mapsTile` with one credential read (`apps/app/src/runtime/cloud-protocol.ts:560`), through `AlphaConnectionPlugin` raised to 16 workers because "four workers queued them four deep… a screen of one-second tile reads took over four seconds" (`android/.../AlphaConnectionPlugin.java:123-125`); MapLibre's abort signal cancels a tile (`apps/app/src/maps/map-plane.ts` ≈309-333, `maps/cloud-maps.ts` `tileRequest`).
- Port: `src/maps/cloud.vibe:154-163` fetches a tile with `cloud.json("GET", …)`, which is `native.request` of upstream `ElizaCloudPlugin` (`src/platform/cloud-live.vibe:32-48`); that plugin has `WORKERS = 4` (`eliza-vs/packages/os/android/sign-in/src/main/java/ai/eliza/plugins/signin/ElizaCloudPlugin.java:34-36`). The 16-worker `AlphaConnectionPlugin` is still in the tree but no longer carries tiles. `src/web/maps/MapPlane.tsx:131-136` drops the abort signal, so superseded tiles keep their worker. No `Idempotency-Key`.
- Impact: expected return of the ~4 s per-zoom-step tile wait measured on the Pixel. Not measured here (nothing was built). Credential reads per tile on the new path: UNVERIFIED.
- Smallest fix: upstream `ElizaCloudPlugin` worker count (or a tile route outside the 4-worker pool); pass MapLibre's `AbortController` through `ask` in `src/web/maps/MapPlane.tsx` to `MapsPlane.tile`; state the bound in `spec/maps/plane.md`.

### 6. CHANGED — one failed tile can put the whole map in the failed state; zooming below the provider's minimum fails every tile
- Legacy: "A failed tile does not retire the already usable map", gated on the one-shot `styleReady`, with `AbortError` ignored (`map-plane.ts` ≈449-457, comment at ≈690); map `minZoom` and source `minzoom` come from the provider (`≈172-176`, `≈199-208`).
- Port: `MapPlane.tsx:149` reports `PlaneFailed` on any error while `!instance.loaded()`. MapLibre's `loaded()` is false whenever tiles are in flight, so a tile error during a pan or zoom fails the plane and shows "Map rendering is unavailable. Retry the map…" (`MapsScreen.tsx:64`, `:91`). `MapPlane.tsx:49`, `:137-140` set no `minZoom`/`minzoom`, while `cloud.vibe:157` throws for `z < tiles.minZoom`.
- Impact: transient tile failures (rate limit, network) blank the map behind a Retry button; pinching out past the provider minimum does it deterministically.
- Smallest fix: track first load in `MapPlane.tsx` and ignore tile errors after it; pass `coverage.tiles.minZoom`; add the rule to `spec/maps/plane.md` ("a failed tile never fails a ready plane").

### 7. UNIMPLEMENTED — the viewport copyright is requested on every camera settle
- Spec says: "Moving outside the covered area hides the shown copyright and forgets the request; within it, nothing changes" (`spec/maps/plane.md:107-112`).
- Legacy: `covers(attributed, view) || covers(asked, view)` skips the read; one viewport of margin "so short pans and GPS follow animations ask nothing" (`map-plane.ts` ≈470-545).
- Port: `MapPlane.tsx:151-154` calls `onSettled` on every MapLibre `idle`; `src/maps/plane.vibe:115-129` always sends `moveView` + `requestCopyright` and a Cloud `/maps/tiles/viewport` request. The 3× area is requested but never compared with the next view.
- Impact: one Cloud request per pan, zoom and guidance-follow step; credits blink off and on; counts against the Maps rate limit that pauses search and routing (`spec/maps/connection.md` pause rule).
- Smallest fix: keep the covered area in `src/maps/plane.vibe` (or as a `covered` fact in `spec/maps/plane.md` `moveView`) and return early inside it.

### 8. CHANGED — on the Google map the camera no longer goes to what the owner picked
- Legacy treats the Cloud raster as a worldwide basemap (`map-plane.ts:141-142`): a new selection eases to zoom 14 offset for the open sheets (`≈630-663`, wrapper `selectionPadding` ≈840-848), new result pins are fitted into view (`≈664-680`, `≈721-729`), a route fits up to zoom 17 (`≈753-766`), and leaving guidance turns the map north up (`≈694-697`).
- Port: `MapPlane.tsx:90` fits pins only when `basemap === "WorldMap"`; `:106` keeps the current zoom unless `WorldMap` and applies no sheet offset; `:81` caps the route fit at zoom 14 with fixed padding; north-up after guidance only when no route is drawn.
- Impact: in production (Google raster, opening at zoom 2.6) a search does not move the map to its results, a picked place is centred at continent zoom behind the place sheet, short walking routes are drawn small. No spec rule covers the camera at all.
- Smallest fix: `MapPlane.tsx` uses "worldwide = WorldMap or raster" as legacy did; add a camera rule to `spec/maps/plane.md`.

### 9. MISSING — the owner's pick when a switch or close matches several tabs
- Legacy: the action's own card lists the matching tabs and the owner picks one (`agent-adapter.ts:1469-1472` `choose` → `askTelephonyReview({kind:'tab'})`; `browser-adapter.ts` `browserTabNeedsChoice`); tests `browser-chat-controls.test.mjs:139`, "a bound switch whose words match several tabs is left for its card, where the owner picks".
- Port: `src/browser/operations.vibe:154` passes `() => succeed(null)`, so `src/browser/agent.vibe:127-132` always refuses with "More than one tab matches … and none was chosen." `BrowserAgent.tabNeedsChoice` (`agent.vibe:242`) has no caller. `spec/assistant/review.md:247` only says such a switch never runs directly; no rule or UI lists the tabs.
- Impact: "switch to the shop tab" with two shop tabs can never succeed from chat.
- Smallest fix: rule in `spec/browser/session.md` (agent switch/close); a choice port in `src/browser/operations.vibe` filled by the assistant's review card.

### 10. CHANGED — chat page-history is bound to the tab at execution, not the tab the request was made on
- Legacy: `observed` is the turn's selected `browser-tab` and revision (`agent-adapter.ts:1469-1470`); test `browser-chat-controls.test.mjs:368` "page history refuses when the tab the request was made from is no longer the page shown".
- Port: `src/browser/operations.vibe:153` reads `browser.selection()` when the executor runs, so `observedCurrent` (`spec/browser/session.md:673-674`) compares the current tab with itself. `ExecutorCall` carries no observation and `BrowserCallFacts` (`src/browser/ports.vibe`) exposes only `reviewed`/`ownerText`. The rule's Quint block states no property.
- Impact: "go back" asked on page A and approved after switching to B acts on B. The assistant's own card invalidation on context change may still catch it: UNVERIFIED (assistant slice).
- Smallest fix: add the observed tab/revision to `BrowserCallFacts.of(call)` from the assistant's recorded turn; add a `step…` property to the rule.

### 11. UNIMPLEMENTED — "Review phone actions first" never reaches Browser's agent machine
- Spec: "A view command … is bound only with reviews off" (`spec/browser/agent.md:81`), "An unreadable review preference counts as on" (`:19`).
- Legacy: `test/native-browser-view-binding.test.mjs` ("review off still runs the agent browser command").
- Port: `BrowserAgent.prefer` (`src/browser/agent.vibe:237`) has no caller (`rg "\.prefer\("` finds only Notes'), and the machine starts at `ReviewOff` (`agent.md:33`). Once `BrowserViews` is filled (see gap 17) back/forward/reload from the agent's view run unreviewed with review on.
- Smallest fix: follow `Preferences` in `src/browser/layer.vibe` and call `agent.prefer`; make the initial preference the "on" value.

### 12. UNIMPLEMENTED — the `agent.md` open model is never driven
- Spec: `spec/browser/agent.md:17-74` (HTTPS-only card, one direct open per message, receipt names the tab, tab shown only after the receipt attempt and while the same foreground is current).
- Port: the shell sends only `executed`, `presentOpened`, `claim`, `claimSettled`, `commandSent`, `acknowledged`, `prefer` (`src/browser/agent.vibe:107-172`). `propose`, `newMessage`, `openDirect`, `openReviewed`, `journalFinished`, `receiptSent` are never sent, so `canExecuted` (`not(idle(a))`) and `canPresentOpened` always refuse and the sends are swallowed by `catch () => undefined`. The tab is presented by `tabs.dispatch({type:"agentPresent"})` on line 111 before, and regardless of, the foreground check on line 112.
- Legacy: `specs/quint/application/BrowserAgentOpen.qnt`, `test/browser-approved-open.test.mjs`, `test/direct-browser-grounding.test.mjs` ("one current authored command cannot auto-open duplicate proposals").
- Impact: the modelled once-per-message and foreground guarantees are enforced, if at all, only by the assistant's review (UNVERIFIED there). An approved open brings Browser forward even after the owner left.
- Smallest fix: drive the machine from `src/browser/operations.vibe` (`propose`/`openReviewed` at execute, `journalFinished`/`receiptSent` from `present`), or delete the dead half of the model and state where the rule lives.

### 13. CHANGED — Maps share skips Alpha's share panel
- Legacy: `apps/app/src/maps/share.ts` opens the share panel with Android share, Email draft in Inbox and Copy link/Copy text; `test/cloud-maps-session.test.mjs` ("Copy link resolves copied only after the copy settles").
- Port: `src/maps/handoff.vibe:212-214` calls `AlphaDevice.shareText` directly for place and route.
- Impact: no Email or Copy link choice from Maps. Smallest fix: reuse Browser's `ShareSheet` pattern; rule in `spec/maps/cards.md` or `screen.md`.

### 14. UNIMPLEMENTED — bookmarks are not re-read when the bookmark document changes
- Spec: `spec/browser/bookmarks.md:50` ("…and a changed bookmark document each ask for one refresh"). Legacy: `test/browser/browser-navigation.spec.ts` "simultaneous bookmark edits from two tabs retain every change and survive reload".
- Port: `src/browser/layer.vibe:26-41` refreshes on start, on entering Browser and on a visible return only. Browser build only.
- Smallest fix: a storage-change stream on the web `TabHost` feeding `marks.refresh(true)`.

### 15. UNMODELED — recent searches
- Legacy: `test/maps-place-route-sheets.test.mjs` ("recent searches list what the owner searched, newest first, kept in memory only", "a Maps provider change drops the recent searches").
- Port: implemented (`src/maps/screen.vibe:160`, `:406`, `:411`; `src/web/maps/MapsScreen.tsx` `ResultsSheet recent`), but `rg -i recent spec/maps` finds no rule.
- Smallest fix: one rule in `spec/maps/screen.md` ("Story: Find a place").

### 16. KNOWN — the Browser page is never sent with a message (#1444 not delivered end to end)
- Open-items: "Shell (integration)" bullets 1 and 2 (`BrowserPages` unfilled; `AssistantHost.peer()` must set `browserPage`: "Until it does, no Browser page is ever sent"), and "Upstream › agent/client: there is no `clientDevice.browserPage` (eliza#40067/#40193)".
- Verified: `BrowserPages` is not a `PortCells` slot (`src/shell/compose/slots.vibe:15-29`) and `browserPagesFromBrowser` (`src/assistant/fills.vibe:10`) has no caller. Browser's side is present: `spec/browser/pageContext.md`, `src/browser/pageContext.vibe`, `page-context.ts`, identical `android/.../browser/AlphaPageContext.java`, setting row `src/web/settings/PrivacyPages.tsx:71`.
- Consequence for this slice: `BrowserPageContext.carried` is always false, so the "link of the carried page keeps its card" rule (`operations.vibe:157-161`) is never exercised.

### 17. KNOWN — the agent's Browser view commands and Maps views are unreachable
- Open-items: "Shell (integration)" bullet 1 (`BrowserViews` with `browserViewsFromBrowser`, `MapsViews` with `mapsViewsFromMaps`); "Tooling": `scripts/resident` must call `registerMapsViews`/`registerMapsSavedPlaces`.
- Verified: neither fill is called outside `src/assistant/fills.vibe`.

### 18. KNOWN — Google return links
- Open-items: "OWNER: Browser's `GoogleLink` (`src/browser/googleReturn.vibe`) and `CloudRequests` (`src/browser/cloudCustody.vibe`) have no consumer…"; "Android / native: The Google App Link `appReturn` has no native source"; "Java-side host models are missing: … GoogleBrowserReturnClaim".
- Legacy models affected: `specs/quint/services/BrowserGoogleReturn.qnt`, `specs/quint/native/GoogleBrowserReturnClaim.qnt`, `services/BrowserCloudRequestCustody.qnt`. Spec exists (`spec/browser/googleReturn.md`, `cloudCustody.md`); code is unconsumed.

### 19. KNOWN — capability negotiation for Browser controls and Maps selected read
- Open-items: "Shell (integration)": `AdvertisedCapabilities.names()` unfilled, "Until then no `x-eliza-device-capabilities` header is sent"; "Android / native": "The `BROWSER_*` sub-action names are guessed"; "Upstream › agent/client": `encodeTurnContext` must accept `map-place`/`map-route`/`map-search`.
- Port side present: `browserDeviceCapabilities` (`src/browser/operations.vibe:69-75`), `mapsDeviceCapabilities` (`src/maps/agent.vibe`). `fills.vibe` fills a `deviceCapabilities` cell; whether that closes the bullet was not checked.

### 20. KNOWN — developer-only Browser pieces and browser-build stores
- Open-items: "OWNER: These developer-only test-mock pieces are not ported: Browser's simulated agent Clock handoff and its exact-byte bookmark backup/reset dialog" (port `recover()` only shows a toast, `src/browser/bookmarks.vibe:58`); "OWNER: The browser build has no reminder, notification or deletion store".
- Legacy models with no counterpart as a result: `BrowserDeletionPoll.qnt`, `BrowserJournalRetention.qnt` (+ `browser-journal-retention.md` refinement), `test/browser-notification-clear.test.mjs`, `test/browser-deletion-recovery.test.mjs`.

### 21. KNOWN — missing `.meta.tsx` (partly)
- Open-items "No meta file" lists MapsScreen and MapPlane. Not listed there: `src/web/browser/BrowserScreen.tsx` and `src/web/maps/NavigationChip.tsx` also have no `.meta.tsx`.

### 22. CHANGED (minor) — long press on the map
- Legacy times only a one-finger press (`map-plane.ts` ≈386-391) and suppresses the `contextmenu` that follows a timed press within 1 s (`≈409-416`).
- Port: `MapPlane.tsx:155` starts the press for any `touchstart`; `:159` drops a pin on `contextmenu` in addition to the 500 ms press in `src/maps/plane.vibe`. A two-finger hold can drop a pin; one long press can drop twice.

### 23. CHANGED (minor) — history day grouping
- Legacy groups by local day, then by month after 30 days (`apps/app/src/ui/mobile-shell/photos-view.ts:28-52`, used at `browser-adapter.ts:569`).
- Port: `src/web/browser/LibrarySheet.tsx:24-30` divides epoch milliseconds by 86 400 000 (UTC day), so "Today" flips at UTC midnight; no month grouping.

### 24. CHANGED (minor) — smaller items
- Find bar text is local state seeded once (`src/web/browser/FindBar.tsx:23`); an agent find into an already open bar leaves the old text showing while the session holds the new query.
- Non-Google credits are plain text (`src/web/maps/MapCredits.tsx:49`) though `spec/maps/plane.md:9` says they "keep their credit links".
- Legacy pinned every world-style resource to the style's origin (`map-plane.ts` ≈178-190 `transformRequest`); `MapPlane.tsx` has no `transformRequest`.
- Raster style has no land background layer (legacy ≈209-214), so unloaded tiles show the page background.

### 25. UNVERIFIED
- MapLibre worker: legacy sets a bundled worker URL and one worker (`map-plane.ts` `setWorkerUrl`/`setWorkerCount(1)`; test `map-plane.spec.ts` "loads its real worker"). The port imports `maplibre-gl` defaults; whether the production CSP allows its blob worker cannot be told without a build.
- Focus retention when a list changes (`test/browser/browser-list-focus.spec.ts`, `maps-list-focus.spec.ts`): the port keys rows by URL/id, not run.
- Credential reads per tile on the `ElizaCloud` path (gap 5).

### Vibestack usage in this slice
- **No conformance drivers.** `apps/app/test/drivers/` has 10 drivers, none `browser__*` or `maps__*`; all 16 test files under `test/browser` and `test/maps` are scenario tests over fakes and never run generated cases (upstream `eliza-vs/packages/maps/test/drivers` has ten for its own specs).
- **Rules with no property** (Quint block defines functions only; no `always`/`step`/`law`/`sometimes`): 14 in `spec/browser/session.md` (among them "The agent's find, back, forward, reload and stop need the page they name, still the one the turn observed", "An agent's tab is shown only after its action settled…", "The agent opens a new tab, private only when asked…", both find rules, the restore-on-first-show rule), 4 in `handoff.md`, 7 in `spec/maps/screen.md` (quiet fix, outside-coverage, swap ends, Back layers, leave/hide), 2 in `eventReturn.md`, plus the domain blocks. `spec/browser/page.md` and `spec/maps/vocabulary.md` have no witness.
- **Shell logic the model should decide:** all MapLibre camera, tile-error and long-press handling lives in `src/web/maps/MapPlane.tsx` with no rule (gaps 6, 8, 22); close-all card wording and counts in `src/browser/operations.vibe` (gaps 2, 3).
- **Dead model:** `spec/browser/agent.md` open half (gap 12).
- **Proofs:** there is no `*.proof.dfy` under `apps/app/spec`. Legacy `specs/lemma/apps/app/src/browser/browser-poll.dfy` (`surfaceIdleForView`: Browser's surface poll idles only off Browser once hidden geometry was sent) is still in the port tree, but its source `apps/app/src/browser/browser-poll.ts` is gone, so it proves nothing about the port. The property now lives as Quint in `spec/browser/presentation.md` ("A request is sent only when it differs from the last one…").
- **Test coverage gap:** no port test exercises `BrowserAgent.control` for switch, named close, new tab, find or history (legacy `test/browser-chat-controls.test.mjs` has 27 cases).

## Confirmed OK

Spec rule and code were both read unless marked (h): header/spec read and wiring confirmed, body not line-audited.

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Tabs: one tab at start, eight max, new normal/private tab | `prototype/browser-adapter.ts`, `BrowserTabLifecycle.qnt` | `browser/session.md` "A started Browser always has a tab…", "A new tab, normal or private…" | `src/browser/session.vibe` `dispatch`/`perform`; `web/browser/TabSwitcher.tsx`, `BrowserMenu.tsx` |
| Private tab never saved, never in history, own profile | `test/browser/browser-signins.spec.ts` | `session.md` "Only a normal tab's committed web page enters history…", `site.md` "A tab is built only with the cookie policy…" | `session.vibe` `CreateNative {private}`, `snapshotOf`; `AddressEditor.tsx` (no history suggestions in private) |
| Cold-start restore, saved-session writer with backoff | `BrowserSession*.qnt`, `browser-signins.spec.ts` | `session.md` "The saved session is read once…", `persistence.md` all | `session.vibe` `restore`, `write`, `retryLater` |
| Clear browsing data keeps private tabs and bookmarks, confirmed first | `browser-signins.spec.ts` | `session.md` "Clearing closes every normal tab…", `reviews.md` | `session.vibe` `clearBrowsingData` |
| Clear site data | `BrowserSiteState.qnt` | `site.md` "Clearing a site removes…" | `session.vibe` `clearSiteData`; `BrowserMenu.tsx` |
| Find in page, native host only, debounced, fenced to its tab | `test/quint-find-in-page.test.mjs`, `browser-web-find.production.spec.ts` | `session.md` "Story: Find text in a page" (4 rules) | `session.vibe` `typeFind`, find effects; `FindBar.tsx`; menu item only `onDevice` |
| Bookmarks: read-before-write queue, names kept, damaged list recovery | `BookmarksHydration.qnt`, `test/browser-toolbar.test.mjs` | `bookmarks.md` rules 1, 3, 4, 5 | `src/browser/bookmarks.vibe`; `LibrarySheet.tsx` |
| Library: history and bookmarks filterable, history by day | `test/browser/browser-library.spec.ts` | `session.md` history rule | `LibrarySheet.tsx` (see gap 23 for day boundary) |
| Address field: local suggestions only, typed address vs search, credentials never searched | `browser-copy-link.spec.ts`, `test/browser-toolbar.test.mjs` | `page.md` "Typed text opens…", "Credential-like text is never searched…" | `src/browser/address.ts`, `session.vibe` `enter`; `AddressEditor.tsx` |
| Toolbar back/forward/reload/stop, loading indicator | `browser-copy-link.spec.ts` | `session.md` "The toolbar's back, forward, reload and stop…" | `BrowserToolbar.tsx`, `PageViewport.tsx` |
| Pop-ups and native tab closes | `browser-signins.spec.ts` | `session.md` "A pop-up the native host opened…" | `session.vibe` `tabOpened`/`tabClosed` listeners |
| Page hidden under layers, shade and assistant; no reload on return | `BrowserSurfacePresentation.qnt`, `browser-chat-overlay.spec.ts` | `presentation.md` all | `BrowserScreen.tsx` `measure`; `src/browser/presentation.vibe` (h) |
| Close-all core (#1443): list once per proposal, close exactly the listed tabs, review-only, negotiated beside tabs, one state change, never leave a private tab showing | `browser-adapter.ts` `closeTabs`/`browserTabsClosing`, `phone-context.ts:163-167` | `session.md:756-850` | `src/browser/agent.vibe` `tabsClosing`/`closingListed`/`closeAll`; `operations.vibe` `parseBrowserCloseAll`, `browserDeviceCapabilities`, `itemize`/`stillListed`; `assistant/review.vibe:333-383` |
| Approved open reuses untouched/agent tab, stays in profile, refused when full | `test/browser-approved-open.test.mjs` | `session.md` "An approved open reuses…" | `agent.vibe` `open`; `operations.vibe` `run` |
| Agent new tab, switch, close: private only from a private tab | `browser-chat-controls.test.mjs` | `session.md` "The agent switches to or closes a private tab only…" | `agent.vibe` `control`, `chosen` |
| View command: claimed once, typed refusals, dispatched never finished | `test/native-browser-view-binding.test.mjs` | `agent.md` rules 3-4; `session.md` "A command from the agent's view…" | `agent.vibe` `viewCommand` (unreachable until gap 17) |
| No separate page-text read | `native-browser-view-binding.test.mjs` | `pageContext.md` "The agent has no separate page read…" | `agent.vibe` `interact` |
| Page context read rules, 1.2 s wait, withheld/sensitive, bounds (#1444) | `runtime/browser-page-context.ts`, `test/browser-page-context.test.mjs` | `pageContext.md` rules 1-5 | `src/browser/pageContext.vibe`, `page-context.ts` (unsent: gap 16) |
| Native page script and tab host | `android/.../browser/*`, `AlphaBrowserPlugin.java` | n/a (native) | byte-identical in both trees |
| External browser handoff, private page confirmed | `BrowserExternalHandoff.qnt` | `handoff.md` | `src/browser/handoff.vibe` (h) |
| Share, copy link, share by email | `BrowserPageEgress.qnt` | `egress.md` | `src/browser/egress.vibe` (h); `ShareSheet.tsx`; `shell/compose/fills.vibe` `pageMail` |
| Read aloud and Ask about page | `BrowserReadingState.qnt`, `WebReadingReview.qnt` | `reading.md` | `src/browser/reading.vibe` (h); `ReadingReview.tsx` |
| Maps chat-card Map button flows (#1315): search near phone, directions from phone, closest match, A-to-B route, search near a named point | `prototype/maps-adapter.ts`, `test/maps-chat-near-handoff.test.mjs`, `test/browser/maps-chat-cards.spec.ts` | `maps/cards.md` "A card's Map button runs one flow…" | `src/maps/handoff.vibe` `runFlow`; `web/assistant/ChatPanel.tsx:130` |
| Card and share choice only on the newest agent message | `maps-chat-cards.spec.ts` | `cards.md` rules 3-4 | `handoff.vibe` `openCard`, `answerChoice` |
| Agent brings Maps forward over any app, not over a ringing call (#1386, #1394) | `maps/agent-present.ts`, `MapsAgentSurfaceAdmission.qnt` | `agentSurface.md` | `src/maps/agent.vibe` `present` |
| Agent relay, claim-once delivery, selected read | `ResidentMapsRelayOffer.qnt`, `MapsSelectedRead.qnt` | `delivery.md`, `selectedRead.md` | `agent.vibe` `withRelay`, `deliver`, `readSelected`; `fills.vibe` `mapsRelay` |
| Connection bound to account, coverage read, rate-limit pause | `maps/cloud-maps.ts`, `MapsConnection.qnt` | `connection.md` | `src/maps/cloud.vibe` |
| Google-only raster, badge-only credit, full copyright panel (#1311, #1270) | `MapPlaneOwnership.qnt` | `plane.md` "Google content is drawn only…", credits rule | `plane.vibe` `currentBasemap`; `MapCredits.tsx` |
| Tiles draw as they arrive; failed copyright never fails the map (#1315) | `map-plane.ts` ≈470-545 | `plane.md` "Only the reply to the latest copyright request…" | `plane.vibe` `settled` (request frequency: gap 7) |
| Search bias: visible map, phone for chips, hand-off point once | `maps-chat-near-handoff.test.mjs` | `screen.md` "Story: Find a place" | `src/maps/screen.vibe:147-160`, `:381-386` |
| Guidance, arrival notice once, voice held while hidden | `MapsNavigation.qnt`, `MapsGuidanceVoice.qnt`, `test/navigation-voice-pause.test.mjs` | `guidance.md`; upstream `eliza-vs/spec/maps/guidanceVoice.md`, `navigation.md` | `src/maps/navigation.vibe:184-202`, `voice.vibe`; `@elizaos/plugin-maps/client/guidance` |
| "Where am I": location with each message (#1418), network position when GPS has none (#1441) | `test/phone-location-context.test.mjs` | `assistant/context.md:31`; `maps/location.md` "When GPS gives no fix for 4 seconds…" | `src/assistant/location.vibe`, `src/maps/networkLocation.vibe`; `AlphaNetworkLocationPlugin.java` identical |

Also unchanged natively: `AlphaMapsTransportPlugin.java`, `NavigationOpenRequest.java`, `NetworkLocationQuery.java`, `PreparedViewNavigation.java`, `AlphaQuickSettingsTile.java`. `AlphaNavigationService.java` differs by one added `StoreChanges.changed(NOTIFICATIONS)` line.

## Not covered

- `apps/app/src/browser/{egress,handoff,reading,reviews,presentation,autofill,tabHost}.vibe` and `web-surface.ts`: bodies not line-audited against legacy (rows marked (h)); downloads (`spec/browser/downloads.md` vs `AlphaBrowserDownloads.java` flows), site prompts and HTTP auth (`site.md`), autofill.
- Legacy `test/browser-request-refusal.test.mjs` and `test/direct-browser-grounding.test.mjs` against the assistant's review and upstream `eliza-vs/packages/browser/src/grounding.vibe` + `spec/browser/requestGrounding.proof.dfy` (13 + 9 cases, including proof retirement and the 128-proof bound).
- Web summary note / web source on a note (`test/browser/web-summary-note.spec.ts`, `journey-j05-web-research-note.spec.ts`): belongs with Notes.
- Maps: `src/maps/{screen,navigation,location,saved,failure,geometry}.vibe` bodies and `spec/maps/{screen,guidance,location,savedPlaces,eventReturn,notificationOpen}.md` rule by rule; saved-place Google restrictions (`test/google-maps-content.test.mjs`), reroute freshness, route distance (`test/maps-route-distance.test.mjs`), route alternatives, origin choice and swap, event return (`journey-j04`), notification open.
- Upstream `eliza-vs/packages/maps` internals (device navigation, relay, routing, saved places) and `eliza-vs/spec/maps/*`; legacy `NativeNavigationOwnership.qnt`, `NavigationProgress.qnt`, `NativeMapsLocation.qnt` against `AlphaNavigationService.java` and upstream `navigationService.md`.
- Legacy `specs/quint/legacy/Maps.qnt` and `MapsScreenModes.qnt` invariant-by-invariant against `spec/maps/screen.md`.
- Browser-build location simulation and location settings recovery (`test/browser/dev-location.spec.ts`, `location-settings-recovery.spec.ts`); `maps-legacy-provenance`, `managed-maps-unavailable`, `owner-maps-attribution-refusals`, `global-basemap`, `map-label-contrast` specs.
- The rest of the coarse `browser.tests.txt` list that is browser-build voice, audio, video, speech, Cloud bootstrap, credentials, startup permissions and proof export (`browser-audio`, `browser-speech`, `browser-video`, `browser-cloud-*`, `browser-credential-cas`, `browser-proof-export`, …): these are other areas' behaviour on the browser build.
- `scripts/legacy-retirement.json` entries for these areas, `AndroidBrowserModuleStage.qnt` (build staging), `BrowserUnderlay.qnt` against the native tab layer, `BrowserHostedResultNotice.qnt`.
- `VoiceOwnedNavigation.qnt`, `ShellNavigation.qnt`, `SettingsNavigation.qnt`, `BrowserSurfaceNavigation.qnt` and the `*-navigation*` tests in `maps.tests.txt`: shell/voice navigation, not Maps.

## Skeptic verdicts

Each gap was re-read in legacy (`alpha-develop` dd63c6bc), the port (`alpha-vs` 3d7ca972), the author's working tree (`vibemig/alpha`: its Browser and Maps changes are parameter renames only, no behaviour) and upstream `eliza-vs`. Nothing was built or run. Paths are relative to those trees.

| Gap | Verdict | Severity | Evidence |
| --- | --- | --- | --- |
| 5a (new, found while checking gap 5). Every Maps data request is sent without `Idempotency-Key`, and a tile is decoded as base64 JSON | confirmed | high | Port `src/maps/cloud.vibe:92-104` sends search, details, routes and tiles through `cloud.json`, which passes no headers (`src/platform/cloud-live.vibe:38-46`; `Cloud.json` has no header parameter). Upstream Cloud refuses every Maps operation except capabilities and viewport without the key: `eliza-vs/spec/cloud/services/maps.md:71-86` (`400 invalid_request`), `packages/cloud/src/services/maps.vibe:160-163`. Legacy Cloud does the same (`eliza-develop/packages/cloud/api/src/lib/maps-request-admission.ts:106-116`) and legacy sent the key (`runtime/cloud-protocol.ts:557`, `:566`). The tile route in `eliza-vs` always answers raw image bytes (`maps.vibe:119`), while the port decodes `TileAnswer {encoding: "base64"}` (`maps.schema.vibe:22-26`, `cloud.vibe:159`); legacy got JSON only because `AlphaConnectionPlugin.java:226` sent `Accept: application/json`, which `ElizaCloudPlugin` does not. No port test fetches a tile. Result as written: no search, no place details, no routes, no Google tiles. |
| 1. A deferred Browser change that did not run is never corrected (#1453) | confirmed | medium | Legacy `action-message-presentation.ts:62-82`, `browser-adapter.ts:700-775`, `agent-adapter.ts:1472-1480`. Port `assistant/review.vibe:352-357` and `browser/operations.vibe:219-224` fork the presentation and drop its result; `canAgentPresent` (`spec/browser/session.md:625`) refuses silently. No correction text anywhere in `src` or `spec`. #1453 is after the port's merge point and is not in the open-items doc. |
| 2. "Closed all tabs." although private tabs stay open (#1453) | confirmed | medium | Legacy `action-message-presentation.ts:46-57`. Port `operations.vibe:209` fixed string; `agentCloseAll` settles no count (`session.md:814-824`). |
| 3. Close-all card and notice do not count private tabs kept (#1453) | confirmed | medium | Legacy `client-coordinator.ts:265-269`, `browser-adapter.ts:339`, `:787`. Port `operations.vibe:123-127`: only private tabs open, asked from outside one, gives "No tabs are open to close." |
| 4. A retitled tab refuses an approved close-all (#1453) | confirmed | medium | Legacy key is id, address, private flag, kept count (`browser-adapter.ts:346`). Port `listedOf` includes `title` and `listingCurrent` compares whole records (`session.md:771-779`). |
| 5. Tiles go through the 4-worker native queue; abort signal dropped | confirmed (understated, see 5a) | high | `eliza-vs/.../ElizaCloudPlugin.java:34-36` `WORKERS = 4`; legacy `AlphaConnectionPlugin.java:123-125` 16 workers. `web/maps/MapPlane.tsx:131-136` ignores MapLibre's abort controller. Also: tiles pass `admitted()`/`mayRequest` and a tile 429 calls `rateLimited` (`cloud.vibe:92-98`), so a pause stops tiles too. |
| 6. One failed tile fails the plane; zoom below provider minimum fails every tile | confirmed | high | `MapPlane.tsx:149` reports `PlaneFailed` on any error while `!loaded()`; `canPlaneReports` lets a ready plane fail (`spec/maps/plane.md:74-75`); no `minZoom`/`minzoom` (`MapPlane.tsx:49`, `:137-140`) while `cloud.vibe:157` throws below `tiles.minZoom`. Legacy `map-plane.ts:172-176`, `:205`, `:449-457`. |
| 7. Viewport copyright asked on every camera settle | confirmed | high | `MapPlane.tsx:151-154` (every `idle`) to `maps/plane.vibe:115-129` (always `moveView` + `requestCopyright` + Cloud request). Legacy skipped inside the covered area (`map-plane.ts:499-512`). Understated: viewport spends the 60-per-minute Maps operations limit (`eliza-vs/spec/cloud/services/maps.md:92-101`) and a 429 pauses search, routes and tiles (`failure.vibe:14-17`, `cloud.vibe:94-97`). Request rate during guidance follow not measured. |
| 8. On the Google raster the camera does not go to the pick, pins or route | confirmed | high | `MapPlane.tsx:81` (route max zoom 14, fixed padding), `:90` (pins fitted only on `WorldMap`), `:106` (keeps zoom unless `WorldMap`, no sheet offset). Legacy treats the raster as worldwide: `map-plane.ts:141-142`, `:630-680`, `:753-766`. No camera rule in `spec/maps/plane.md`. |
| 9. Owner's pick when several tabs match | confirmed | medium | `operations.vibe:154` passes `() => succeed(null)`; `agent.vibe:127-132` then always refuses; `tabNeedsChoice` (`agent.vibe:242`) has no caller; no `ambiguousTab` use in `src`. Legacy `agent-adapter.ts:1472`, `browser-adapter.ts:738-745`. |
| 10. Chat page history bound to the tab at execution | confirmed | medium | `operations.vibe:153` reads `browser.selection()` in the executor. `ExecutorCall` is `{proposalId, operationId, attemptId}` (`eliza-vs/packages/agent/src/client/device-execution.vibe:38-42`). The assistant does not catch it: `screenCheck` sends `exact: true` as a constant (`assistant/review.vibe:350`, `:439`). Legacy `agent-adapter.ts:1469-1470`, `browser-adapter.ts:771`. |
| 11. "Review phone actions first" never reaches Browser's agent machine | refuted | low | The gate runs before Browser is called: `assistant/views.vibe:169-175` reads `preferences.asksBeforeActions()` (unreadable counts as on) and answers `review-required`; rule `spec/assistant/views.md:73-96` (`lawReviewFirstRunsNoCommand`). Same answer as legacy `test/native-browser-view-binding.test.mjs:91`. What remains is a dead duplicate: `BrowserAgent.prefer` has no caller and `agent.md:33` starts at `ReviewOff`. |
| 12. `agent.md` open model is never driven | confirmed | medium | Only `executed`, `presentOpened`, `claim`, `claimSettled`, `commandSent`, `acknowledged`, `prefer` are sent (`agent.vibe:107-172`); the first two are always refused and swallowed. One direct open per message is held by the assistant instead (`spec/assistant/review.md:128` `c.pass < directPerMessage`, `review.vibe:456-464`). Lost for real: the foreground check. `agent.vibe:111` dispatches `agentPresent`, which emits `ShowBrowser` (`session.vibe:121` `apps.open("browser")`) whatever the owner is looking at; legacy `agent-adapter.ts:1480-1481` required `ready()`. |
| 13. Maps share skips the share panel | confirmed | medium | Legacy `maps/share.ts:4-7` (Android share, Email draft, Copy link/text), kept by #1422. Port `maps/handoff.vibe:212-214` calls `AlphaDevice.shareText` only. No share rule in `spec/maps`. |
| 14. Bookmarks not re-read when the bookmark document changes | confirmed | low | Spec `browser/bookmarks.md:50`; port `browser/layer.vibe:26-41` has no such trigger. Browser build only: legacy signal is a `BroadcastChannel` between tabs (`browser/preference-documents.ts:3-18`). |
| 15. Recent searches have no rule | confirmed | low | Code present (`maps/content.vibe:97-101`, `screen.vibe:160`, `:406`, `:411`); no "recent" in `spec/maps` in either port tree. |
| 16. Browser page never sent with a message (#1444) | known_open_item | high | "Shell (integration)" bullets 1-2. `browserPagesFromBrowser` has no caller. The "Upstream: no `clientDevice.browserPage`" bullet is stale for the new pin: `eliza-vs/packages/agent/src/conversation/turns.vibe:99-110` reads `browserPage`. |
| 17. Agent Browser view commands and Maps views unreachable | known_open_item | high | "Shell (integration)" bullet 1; "Tooling": `scripts/resident` `registerMapsViews`. `browserViewsFromBrowser`/`mapsViewsFromMaps` have no caller outside `assistant/fills.vibe`. |
| 18. Google return links | known_open_item | medium | "OWNER: Browser's `GoogleLink`… no consumer"; "Android / native: `appReturn` has no native source"; "Java-side host models are missing". |
| 19. Capability negotiation for Browser controls and Maps selected read | known_open_item | high | "Shell (integration)": `AdvertisedCapabilities.names()` unfilled; nothing provides it in `src`. `eliza-vs` `SelectedObject.kind` is any name (`turn-context.schema.vibe:17-25`), so the `map-*` kinds bullet is settled upstream. |
| 20. Developer-only Browser pieces and browser-build stores | known_open_item | low | Two OWNER bullets. Bookmark recovery is browser build only: legacy `browser-adapter.ts:68-72` returns false on the phone. |
| 21. Missing `.meta.tsx` | confirmed (doc understates) | low | Doc lists MapsScreen and MapPlane; `web/browser/BrowserScreen.tsx` and `web/maps/NavigationChip.tsx` also have none. |
| 22. Long press on the map | confirmed | low | `MapPlane.tsx:155` (any touch count), `:159` (`contextmenu` also drops). Legacy `map-plane.ts:388-416`. |
| 23. History grouped by UTC day, no month grouping | confirmed | low | `web/browser/LibrarySheet.tsx:24-30`. Legacy `ui/mobile-shell/photos-view.ts:28-52`. |
| 24a. Find bar text seeded once | confirmed | low | `web/browser/FindBar.tsx:23`; mounted without a key (`BrowserScreen.tsx:90`). |
| 24b. Non-Google credits are plain text | confirmed | low | `web/maps/MapCredits.tsx:49`; legacy links in `prototype/template.html:2464-2466`; spec `maps/plane.md:9`. |
| 24c. No `transformRequest` origin pin for the world style | confirmed | low | Legacy `map-plane.ts:183-193`; none in `MapPlane.tsx`. |
| 24d. Raster style has no land background | confirmed | low | Legacy `map-plane.ts:208-214`; port `MapPlane.tsx:46-51`. |
| 25a. MapLibre worker under the production CSP | refuted | low | The port has no production CSP: `apps/app/src/web/index.html` has no meta and `apps/app/vite.config.ts` injects none, so the default blob worker is not blocked (legacy `vite.config.ts:48` allowed `blob:` too). The missing CSP itself is a separate gap outside this slice; the open-items doc mentions it only for the delegation-return route. |
| 25b. Focus kept when a list changes | uncertain | low | Needs a run of `browser-list-focus`/`maps-list-focus` against the port; rows are keyed by URL/id, which says nothing about focus after removal. |
| 25c. Credential reads per tile on the `ElizaCloud` path | refuted | low | One `store.current()` per request (`eliza-vs/.../CloudRequests.java` `sent`, first lines); the session token is read only after a reauth refusal. Same count as legacy's tile path. |
| V1. No `browser__*` or `maps__*` conformance drivers | confirmed | medium | `apps/app/test/drivers` holds 10 files, none for these areas; upstream `eliza-vs/packages/maps/test/drivers` has 10. Not in the open-items doc. |
| V2. Rules whose Quint block states no property | confirmed | low | Checked `session.md:622-628` (agent present), `:663-693` (find/history), `:629-636` (new tab): definitions only. |
| V3. Camera, tile-error, long-press and close-all wording decided in shell code | confirmed | low | Same code as gaps 2, 3, 6, 8, 22; no rule in `spec/maps/plane.md` or `spec/browser/session.md`. |
| V5. Stale Dafny proof for a deleted source | confirmed | low | `specs/lemma/apps/app/src/browser/browser-poll.dfy` present; `apps/app/src/browser/browser-poll.ts` absent; no `.dfy` under `apps/app/spec`. |
| V6. No port test of `BrowserAgent.control` | confirmed | medium | No `control(` or `browser_tab_switch`/`browser_history`/`browser_find` in `test/browser` or `test/assistant`; legacy `test/browser-chat-controls.test.mjs` has 25 tests. |
