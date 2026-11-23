# specs/quint/refinement/application/find-in-page.mjs
- Lines: 82 | Kind: Quint trace replay over a source transplant (slices `browser-adapter.ts` between four text anchors, strips types, runs in `vm.runInNewContext`) | Verdict: PORT
- Covers: Browser find bar: debounce across tab switch, switching/navigation/closing clears native search, events for hidden or closed tabs are ignored, close clears the native search. Duplicates: Playwright browser specs touch find-in-page at the UI level (`test/browser/**` find specs; see tests-browser chunk) and `android/.../BrowserWebFeaturesInstrumentedTest.java` covers the native side; neither replays the races. Callers/importers: `test/quint-find-in-page.test.mjs` only.
- Model: `FindInPage.qnt`, live (source `prototype/browser-adapter.ts`; 10 pinned symbols).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-28, 48 | T2/T10 | Anchors: `'  let findTimer = 0;'` … `'  async function sharePage() {'` and `"  void Browser.addListener('findResult',"` … `"  // A page's video fullscreen"` (a comment). All match once today; any reorder, rename or comment edit in the 6-harness-targeted `browser-adapter.ts` breaks it. Free identifiers `session`, `tabs`, `tabInfo`, `state`, `report`, `shell.vset`, `window`, `Browser`, `disposed` are supplied by a hand-built context. | Extract the find bar into `apps/app/src/prototype/browser-find.ts` exporting `createFindBar({session, tabs, state, vset, Browser, timers, report})` returning `{openFind, closeFind, findQuery, onFindResult}`; the adapter calls it; the harness imports it. | Med |
| 2 | 17 | – | Already imports the real upstream `BrowserTabSession`. Good. | Keep. | – |
| 3 | 1-11 | – | Clear header listing controlled ports. | Keep, shorten after port. | – |

## Proposed end state
Harness imports `createFindBar` and `BrowserTabSession`, keeps the native-host stand-in and the five scenarios + four witnesses +
random traces. Manifest symbol pins shrink to the new module's exports. Lane: `browser-find.ts`, `browser-adapter.ts`, model.
