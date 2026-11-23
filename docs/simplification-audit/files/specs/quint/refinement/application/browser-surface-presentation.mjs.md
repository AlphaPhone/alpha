# specs/quint/refinement/application/browser-surface-presentation.mjs
- Lines: 76 | Kind: Quint ITF replay driver, **source transplant** (two slices of `prototype/browser-adapter.ts` run in `vm`; `browser/browser-poll.ts` loaded by stripping types into a data URL) | Verdict: PORT
- Covers: native Browser page presentation: stale `present` answers ignored, menu overlay withdraws, failure reported once, hidden app keeps page, same geometry not resent, against `BrowserSurfacePresentation.qnt`. Duplicates: none. Callers/importers: `test/quint-browser-surface-presentation.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-27, 43 | T2 / T10 | Anchors in `browser-adapter.ts`: `'  function hide() {'` → `'  function ensure('` and `'  const nativeUnderlay ='` → `'  const openBrowserView ='` (all present today). The region needs ~25 free variables (`hiddenGeometry`, `lastGeometry`, `lastPresented`, `presentationFailed`, `presentationFrame`, `questionReview`, `confirming`, `clearingData`, `reading`, `hostModalOpen`, `shell.S`, `tabs.has`, `saveSession`, `stopReading` …). The driver also writes `context.lastGeometry = ''` and reads `context.lastPresented`/`presentationFailed` directly. | Extract presentation into `apps/app/src/browser/browser-presentation.ts`: `createBrowserPresentation({Browser, document, getComputedStyle, view, state, tabs, report, isBlocked})` → `{update, hide, forget, dispose, status(): {lastRequest, acknowledged, failed}}`; adapter delegates; driver bundles it. | M |
| 2 | 23-24 | T10 | `load()` strips types from `browser-poll.ts` and imports it as a data URL; works only while that file has no imports. | Use the shared bundling loader. | L |
| 3 | 34-35 | — | Fake `document` object instead of jsdom. | Use `installDocument()` after the port. | L |

## Proposed end state
~45-line driver importing the extracted presentation module; observation via its `status()`; no `vm`, no anchors.
