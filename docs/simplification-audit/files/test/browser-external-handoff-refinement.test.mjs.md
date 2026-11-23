# test/browser-external-handoff-refinement.test.mjs
- Lines: 58 | Kind: Quint replay/refinement wrapper + scenario tests over the same fixture (P10/T4) | Verdict: DELETE
- Covers: external-browser handoff never dispatches after recommit, view leave, return-to-tab or lock; and replays 16 traces against `BrowserExternalHandoff.qnt`. Duplicates: `test/quint-application-refinement.test.mjs` runs `checkBrowserExternalHandoff` via `specs/quint/refinement/application/index.mjs:50,129`; the four scenario tests are literally traces in `specs/quint/refinement/application/browser-external-handoff.mjs:33-44` (recommit during confirmation, leave during presentation, preceding Browser visit, lock screen); Playwright `browser-external-handoff.spec.ts` + `.production.spec.ts`; instrumented `BrowserExternalHandoffInstrumentedTest`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54-58 | T4, P3 | Runs the whole refinement (120 s timeout) a second time; the aggregate already runs it. | Delete. | none |
| 2 | 57 | B5/P8 | `traces === 16` magic count: fails when a scenario is added, proves nothing. | Delete. | none |
| 3 | 55 | T10 | Passes its own file path as an extra hashed "source", so editing this test changes the driver hash. | Gone with the file. | none |
| 4 | 7-52 | T4 | Four scenarios duplicate harness traces exactly. | Delete. | none |

## Proposed end state
Delete. `test/fixtures/browser-external-handoff.mjs` survives: it is imported by `specs/quint/refinement/application/browser-external-handoff.mjs` (the live harness). That fixture loads `apps/app/src/prototype/browser-external-handoff.ts` through `sourceContext` and hashes `browser-adapter.ts`: PORT it to a plain import (T10) in the formal stage. The model `specs/quint/application/BrowserExternalHandoff.qnt` stays (live, manifest line 3650).
