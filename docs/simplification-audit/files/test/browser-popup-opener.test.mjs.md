# test/browser-popup-opener.test.mjs
- Lines: 40 | Kind: transplant (T2; slices the `tabOpened` listener body and `forgetTabs` from `prototype/browser-adapter.ts`, runs in `vm` with the real upstream `BrowserTabSession`) | Verdict: DELETE; carry cases to `test/browser/journeys/browser.spec.ts`
- Covers: a page popup opens as a tab and returns to its opener when it closes; the renderer tab cap closes only the native child; foreign-session and duplicate `tabOpened` events are ignored; a private opener keeps the popup private. Duplicates: `specs/quint/refinement/application/browser-tab-lifecycle.mjs` replays `forgetTabs` and the native `tabOpened`/`tabClosed` listeners against `BrowserTabLifecycle.qnt` (same adapter slices). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-11 | T2, T10 | Anchors `"  void Browser.addListener('tabOpened',"`, `').then((value:any)=>{openedListener=value;})'`, `'  function forgetTabs('`, `'  function savedSnapshot('`. Env knob `ALPHA_BROWSER_ADAPTER_SOURCE` set by nothing (T9). | Delete. | none |
| 2 | 23-40 | T4 | Same transitions as the tab-lifecycle Quint replay. | Delete; the harness PORT keeps formal coverage. | none |

## Proposed end state
Delete. Journey cases with the Browser bridge fake emitting `tabOpened` (native preview): popup closes and the opener is selected again; at 8 tabs a popup shows "Tab limit" and only the popup is closed; a popup from a private tab is private. The `browser-tab-lifecycle.mjs` harness is ported to call an exported tab-lifecycle module once `browser-adapter.ts` is split (F stage).
