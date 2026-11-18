# test/browser-presentation-lifecycle.test.mjs
- Lines: 76 | Kind: transplant (T2; slices `const nativeUnderlay =` .. `const openBrowserView =` from `prototype/browser-adapter.ts`, runs in `vm` with a fake DOM and `Browser.present`) | Verdict: DELETE; carry cases to `test/browser/journeys/browser.spec.ts`
- Covers: native page presentation follows foreground state: overlays (modal, review, menu, tab switcher, library, share, shade, lock) withdraw the page; pause keeps the tab but saves and stops reading; assistant sheet keeps a below-host underlay; late/failed presentation receipts cannot corrupt the backdrop attribute; idle poll off-Browser does no DOM work. Duplicates: `specs/quint/refinement/application/browser-surface-presentation.mjs` slices the identical region (`'  const nativeUnderlay ='`..`'  const openBrowserView ='`) and replays `BrowserSurfacePresentation.qnt`; `browser-host-modal.test.mjs` (modal guard); `browser-session-persistence.test.mjs:222-231` (idle poll). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-12 | T2, T10 | Text-anchored slice + `ALPHA_BROWSER_ADAPTER_SOURCE` knob (T9). | Delete. | none |
| 2 | 20-24 | T3 | 25 injected free variables; the slice depends on adapter closure names. | Delete. | none |
| 3 | 43-51 | T7 | 10 generated tests, one per overlay flag. | One journey case iterating 3 representative overlays. | low |
| 4 | 59-68 | — | Late-receipt / failed-presentation / replacement backdrop races: valuable, covered formally by the presentation replay. | Keep in Quint; journey does the failed-present retry only. | low |

## Proposed end state
Delete. Journey (native preview, bridge fake recording `present` payloads): opening the Browser menu, the tab switcher and the shade each send `present({id:null})`, closing them re-presents the same tab; a refused `present` shows the error and the next update re-presents; backgrounding (visibility hidden) keeps the tab presented and saves the session. The Quint harness is PORTed to import a `browser/presentation.ts` module once extracted from the adapter.
