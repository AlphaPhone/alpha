# specs/quint/application/BrowserSurfacePresentation.qnt
- Lines: 109 | Kind: Quint model (live, 6 runs, invariants + 3 witnesses, symbol pins) | Verdict: KEEP model; PORT harness
- Covers: how the renderer shows and withdraws the native browser page: request sent only when it differs, only the latest request's answer counts, a failure is reported once per episode and retried, the page is left alone while the app is hidden. Duplicates: none (Playwright cannot see the native layer). Callers/importers: manifest (sources `prototype/browser-adapter.ts`, `browser/browser-poll.ts`; sharedSources `BelowHostLayer.kt`); harness `browser-surface-presentation.mjs` (76 lines); only `test/quint-browser-surface-presentation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness:26-43 | T10 | Slices `browser-adapter.ts` at `'  function hide() {'`…`'  function ensure('` and `'  const nativeUnderlay ='`…`'  const openBrowserView ='`, strips types, runs `update`/`hide` in `vm`. Imports `surfacePollIdle` from `browser-poll.ts` properly. | Extract `hide`/`update` (presentation state: `lastGeometry`, `hiddenGeometry`, `lastPresented`, `presentationFailed`, `blockPageInput`) into an exported `createBrowserPresentation({Browser, document, …})` beside the session factory proposed in `BrowserSessionPersistence.qnt.md`; harness imports it. | Medium |
| 2 | manifest | T10 | Symbol pins on adapter closure names (`presentBrowser`, `lastGeometry`, `hide`, `update`, …). | Replace with the exported factory name. | Low |

## Proposed end state
Model unchanged. Harness imports the extracted presentation function; `surfacePollIdle` stays imported (also LemmaScript-verified).
