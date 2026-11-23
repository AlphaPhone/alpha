# specs/quint/refinement/application/browser-external-handoff.mjs
- Lines: 61 | Kind: Quint refinement harness over a transplant fixture (`test/fixtures/browser-external-handoff.mjs` loads the product module with `sourceContext`) | Verdict: KEEP, PORT the fixture loader
- Covers: "Open in another browser" — private-tab confirmation, single dispatch while busy, page change/navigation/tab switch/hide/lock/dispose retiring admission, chooser refusal and retry, non-HTTPS refusal — against `BrowserExternalHandoff.qnt` (125 lines, live). Duplicates: `test/browser-external-handoff-refinement.test.mjs` (two direct fixture scenarios that are also traces here; reviewer verdict DELETE) and `test/browser/browser-external-handoff.spec.ts` (Playwright). Callers/importers: `index.mjs`, `test/browser-external-handoff-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 (fixture :42) | T2 | The fixture loads `apps/app/src/prototype/browser-external-handoff.ts` and the upstream `tab-host.ts` with `sourceContext` (strip types + delete import/export lines + `vm`). Both are proper ES modules (`createExternalBrowserHandoff` takes an explicit `ExternalHandoffDeps`), so slicing buys nothing. | Load with `bundledSource` (or `tsImport`) and pass deps; delete the `sourceContext` call. | Low |
| 2 | fixture 32-41 | B5 | Fixture re-hashes the prepared `tab-host.ts` and compares `.source.json` + vendor bytes. | Delete; `checkClientFeatures()` once. | None |
| 3 | 11-12 | B5 | `captureInputs`. | Drop. | None |
| 4 | 25-56 | (keep) | 16 scenarios, clear names, bounded. | Keep. | – |
| 5 | – | T4 | The Playwright spec covers the visible confirmation; this harness covers the fences. Not duplicate. Delete only the host wrapper test. | – | – |

## Proposed end state
Unchanged harness (~55 lines). Fixture moves next to it (`specs/quint/refinement/application/browser-external-handoff-ports.mjs`)
and imports the real module. This is a small, low-risk port that can land in stage E.
