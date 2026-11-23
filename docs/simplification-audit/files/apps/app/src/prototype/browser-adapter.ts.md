# apps/app/src/prototype/browser-adapter.ts
- Lines: 669 | Role: Binds the shared native tab host (`BrowserTabSession`, `AlphaBrowser` plugin) to the prototype `browser` view: navigation, tabs, bookmarks, history persistence, find-in-page, reading/asking about a page, sharing, clear data, native surface geometry/underlay, and the agent's browser command/navigation entry points. | Verdict: SPLIT (+ SIMPLIFY)
- Importers: 2 — `apps/app/src/main.tsx:67,154` (return value ignored), `apps/app/src/prototype/selection-adapter.ts` (comment/reference). `scripts/prepare-client-features.ts` lists it (upstream import set). Imports `./browser-external-handoff`, `./agent-calendar-adapter` (`browserCalendarScope`), `./summary-source`.
- Text/path pins (heavy): T2 source transplants that slice this file: `test/browser-host-modal.test.mjs:2-5` (slices between `// host-modal:begin` and `// host-modal:end`), `test/browser-bookmark-startup`, `browser-calendar-open-source`, `browser-command-refusals`, `browser-navigation-creation`, `browser-popup-opener`, `browser-presentation-lifecycle`, `browser-reading-capability`, `browser-receipt-order`, `browser-session-persistence`, `files-browser`, `login-surfaces`, `theme-palette`, `client-feature-preparation` `.test.mjs`; `test/browser/browser-list-focus.spec.ts`; `specs/quint/application/manifest.json` (70 path/text pins, e.g. `:5052-5358`); Quint refinement harnesses `specs/quint/refinement/application/{address-input,bookmarks-hydration,browser-session-persistence,browser-surface-presentation,browser-tab-lifecycle,find-in-page,files-*}.mjs` and `specs/quint/legacy/files-browser/*`; `specs/quint/services/manifest.json`; `test/support/feature-parity.mjs:342`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 668, 43 + 47 uses | A7/B4 | The installer returns a disposer (`return ()=>{…disposed=true;…}`) that nobody calls: `main.tsx:154` discards it and `git grep installPrototypeBrowserAdapter` finds no caller in test/specs/scripts. So `disposed` is always `false`; its 47 reads (`if(disposed)return`, `!disposed&&…`, `flags.disposed` in browser-external-handoff) are dead. | Delete the returned disposer and the `disposed` flag with every guard; drop `flags.disposed` from `ExternalHandoffFlags`. Keep listener handles only if a real teardown is added later (it would then be one AbortController). | Low in product; T2 tests that transplant `disposed` logic break (D10 delete set). |
| 2 | 424 | A6 | `definition.reply = () => null;` — `agent-adapter.ts:1939` replaces `p.reply` globally, the only caller of view replies (research §3, confirmed). | Delete. | None. |
| 3 | 471, 473 | A5 | Constant fixture flags returned every render: `isNews:false,isEnc:false,isBook:false,isSearch:false,isGeneric:false`, `recents:[]`, `people:[]`, `agOn:false`, `confirm:false`. dc-lite treats an absent value as false/[] (`dc-lite.js:118,136`). They only switch off model-fixture template sections. | Delete the keys (or delete those template sections with the fixture-only browser view, P8). | Low; check `sc-for` on `browser.recents/people` renders empty. |
| 4 | 401 | NEW (identical-branch ternary) | `shell.toast(Capacitor.isNativePlatform() ? 'Cleared' : 'Cleared');` | `shell.toast('Cleared')`. | None. |
| 5 | 491-542 | D3/NEW | `renderVals` wrapper re-creates `this.browserCommand`, `this.browserNavigateApproved`, `this.browserSelection` closures on every render (100 ms poll + every state change) and assigns `shell=this` each time. | Assign the three members once (mount wrapper or prototype methods using `shell`), and set `shell` in `componentDidMount`. | Low; agent-adapter reads them as shell fields. |
| 6 | 576-581 | D7/T2 | `// host-modal:begin` / `// host-modal:end` markers exist only so `test/browser-host-modal.test.mjs` can slice `hostModalOpen`; its `nativeSurface` parameter exists for the test (`hostModalOpen(document, Capacitor.isNativePlatform())`). | Delete the markers with the test (D10); inline as `Capacitor.isNativePlatform()&&!!document.querySelector('dialog:modal, .alpha-connection-scrim')`. | Low. |
| 7 | 121, 133, 150, 249, 275, 288, 297, 409, 476, 483, 485 | C3 | The "page is loaded" predicate `info?.committed && !info.loading && !info.error (&& !info.externalOnly)` is written ~11 times with small variations. | `const pageReady=(info,{external=false}={})=>…` once; call sites name the variant. | Low (keep each variant's exact conditions). |
| 8 | 221, 312, 365, 418, 435, 486, 572 | C3 | New tab row literal `{id, hist:['newtab'], pos:0, ...(priv?{priv:true}:{})}` 7×. | `newTabRow(id, priv?, opener?)`. | None. |
| 9 | 213, 217, 218, 220, 235, 569 | C3 | "forget and close native tab" sequence `tabs.forget([id]);void Browser.close({session,id}).catch(report)` repeated. | `discardTab(id, onError)`. | None. |
| 10 | 225, 529, 572 | C3 | Overlay reset patch `{editing:false,tabsOpen:false,menu:false,lib:null,share:false}` repeated; `back` (427) iterates the same keys. | `const CLOSED_OVERLAYS={…}` used everywhere. | None. |
| 11 | 138, 157, 280 | C3 | `await new Promise(resolve=>setTimeout(resolve,150))` "let the menu close" pause 3×. | `menuSettled()` helper (or abortable `delay` from the shared helper set, C3). | None. |
| 12 | 123, 135, 152, 281, 288, 296 | C3/B4 | Six hand-written staleness closures (`valid`, `current`) each re-checking `document.hidden`, `S().view==='browser'`, `state()?.cur===id`, `tabs.revision(id)===revision`, `connectionController.getSnapshot().open`. | One `pageStillShown(id,revision,{screenHome?,devBackground?})` factory. | Low; each closure's exact extras must be preserved (e.g. `data-dev-background`, `voice.isCurrent()`). |
| 13 | 176 | D10 | `error.message===PROFILE_UNSUPPORTED_NATIVE_MESSAGE` — behaviour keyed on the native error text `'This Android WebView does not support isolated browser profiles'`. | Native plugin rejects with a code (`PROFILE_UNSUPPORTED`); compare `error.code`. Coordinated Java change (upstream tab host or Alpha plugin). | Medium (cross-repo). |
| 14 | 23, 543-575 | C2/B1 | `registerPlugin<any>('AlphaBrowser')`; seven `addListener(...).then(v=>{x=v;}).catch(()=>{})` with `any` handles; `catch {}` at 408; `.catch(()=>{})` on `cancelReading/clearFind/close` (114, 142, 256, 569, 668). | One typed plugin interface module (`browser/alpha-browser-plugin.ts`) shared with `browser/register.ts`; listener handles only if teardown is kept (see #1); swallowed cancels get a one-word reason comment ("best effort"). | Low. |
| 15 | 650-655 | D5/D6 | `openBrowserView` passes `{calendarAuthority:'browser-local'}` only when `browserCalendarScope(shell)` — `testMocksEnabled`-only per `agent-calendar-adapter.ts:50` and the comment "this scope is test-only". Importing agent-calendar-adapter here only for that. | Move the scope decision to the calendar owner (it can read the current authority itself) or behind the dev module; drop the import. | Low. |
| 16 | 52-80, 485 | D6 | Bookmark-recovery path (`checkBookmarkRecovery`, `openBookmarkRecovery`, `bookmarkRecovery` row) is web-only (`if(Capacitor.isNativePlatform())return false`); the web build is a development preview (README:50). | Move behind the dev boundary with `browser/preference-recovery`; owner question whether web recovery is kept. | Low. |
| 17 | 37 | D4 | `const tabInfo=(id)=>tabs.info(id)` — wrapper only re-types to `Bag`. | Call `tabs.info` directly with its real type. | None. |
| 18 | 522, 626 | B2 | `shell.S?.()` (S always exists); `document.getAnimations?.()` (Chromium WebView ships it). | Plain calls. | None. |
| 19 | 582 vs 107, 119… | P19 | Two predicates for "on the phone": `nativeUnderlay=()=>Capacitor.getPlatform()==='android'` and `Capacitor.isNativePlatform()` (15 uses). Alpha ships only Android. | One `isAndroid` from `build-flags.ts`. | Low. |
| 20 | 443-444, 482, 486 | D12 | Inline CSS strings in render values (`'background:var(--acc);color:var(--alpha-white)'`, `box-shadow:inset…`, `hostCss`). | Classes in CSS; render returns booleans. | Visual. |
| 21 | 483-486, 504, 542, 668 | D8 | Lines of 600-2,000 characters (render object, `bound()`, renderVals tail, disposer). | Format; split render values into groups (address bar, find, library, tabs, menu). | None. |
| 22 | 20, 33, 43 | C1 | `type Bag`, `Component:any`, `shell:any`. | `ShellHost`, `ViewApi`, a `BrowserViewState` type. | None. |
| 23 | 182, 190, 191, 193 | NEW (exceptions as goto) | Address parsing throws bare `new Error()` to jump to the shared catch. | Return a parse result (`{ok:false}`) from a small `parseAddress(raw, approved)` function; navigate() reports. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 20 | ~45 prototype files | `prototype/shell-types.ts` |
| `Browser` (`registerPlugin<any>('AlphaBrowser')`) | const | 23 | `browser/register.ts` registers the web implementation under the same name | `browser/alpha-browser-plugin.ts` typed module |
| `PROFILE_UNSUPPORTED_*` | const | 24-25 | native message text in the plugin | error code in plugin contract |
| `tabInfo` | helper | 37 | `tabs.info` | delete |
| `unimplemented` | helper | 81 | Capacitor unimplemented checks in `daily.ts`, others | shared `isUnimplemented(error)` in `platform-plugins.ts` |
| `findIdle` | const | 246 | none | keep |
| `hostModalOpen` | helper | 580 | modal checks in `chat-overlay-motion-adapter.ts` | keep inline |
| `browserChromeSelector` | const | 594 | none | keep |
| `focusedAddresses` | const | 431 | autofocus helpers elsewhere | keep |
| page-loaded predicate | inline | ~11 sites | `browser-external-handoff.ts` (`tabs.pageBinding`) | local `pageReady` |
| staleness closures | inline | 6 sites | ~84 in prototype (research P15) | local factory |

## Proposed end state
Split into a `views/browser/` folder (or keep the file name for the adapter):
- `browser-adapter.ts` (~250): installer, view state/back/render wiring, agent entry points assigned once.
- `browser-session.ts` (~90): `savedSnapshot/saveSession/restoreSession/clearBrowsingData` (session persistence, already modelled by Quint `browser-session-persistence`).
- `browser-presentation.ts` (~110): geometry, underlay backdrop, host rects, `presentBrowser/blockPageInput/schedulePresentation/update` and the observers.
- `browser-reading.ts` (~80): `readPage/askPage/stopReading`.
- bookmarks (~45) with the web recovery moved to dev.
Deleted: disposer + `disposed` guards, `reply=null`, fixture constant flags, identical toast ternary, test markers, `tabInfo` alias, `browserCalendarScope` import. Total ≈600 lines across files before formatting (≈70 removable).

## Verification
- `npm run verify` (the T2 transplant tests listed above will break on any move; they are D10 deletions — port their scenarios to `test/browser/browser-*.spec.ts` journeys first).
- Quint: application manifest browser models (`browser-session-persistence`, `browser-surface-presentation`, `browser-tab-lifecycle`, `find-in-page`, `address-input`, `bookmarks-hydration`) — 70 text pins must be re-anchored or ported to imports (T10).
- Browser e2e: `test/browser/browser-*.spec.ts` (chromium + production).
- Android: APK build and emulator check of tabs restore, private tab, find, read aloud, open externally, clear site data (native-only paths cannot be proven by web tests).
