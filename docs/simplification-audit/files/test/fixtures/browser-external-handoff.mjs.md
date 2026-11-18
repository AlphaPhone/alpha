# test/fixtures/browser-external-handoff.mjs
- Lines: 157 | Kind: Quint refinement harness (loads real `browser-external-handoff.ts` + upstream `tab-host.ts` via `sourceContext`, ports held by gates) | Verdict: MERGE into `specs/quint/refinement/application/browser-external-handoff.mjs` (move out of test/fixtures)
- Covers: "Open in another browser" from a (private) tab: review dialog, page-binding revision, hide/leave/lock/dispose retirement, chooser refusal messages. Duplicates: `test/browser/browser-external-handoff.spec.ts` (Playwright), `test/browser-external-handoff-refinement.test.mjs` (wrapper). Callers/importers: `specs/quint/refinement/application/browser-external-handoff.mjs` (live, in `application/index.mjs` and `specs/quint/application/manifest.json`), `test/browser-external-handoff-refinement.test.mjs`. (`apps/app/src/prototype/browser-adapter.ts:16` matches the grep only because it imports the product module of the same name.)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | - | Imports `sourceContext`/`deferred`/`tick` from `specs/quint/refinement/application/support.mjs`: a Quint harness living in `test/fixtures`. | Move next to its driver. | none |
| 2 | 33-40 | B5 | Re-hashes the prepared `.eliza` tab-host against `.source.json` and the lock before every run. | Rely on the prepare step's own verification. | Low |
| 3 | 42-43 | T10 | `sourceContext` evaluates the product file and the upstream tab host in a context rather than importing them. | PORT: `import {createExternalBrowserHandoff} from 'apps/app/src/prototype/browser-external-handoff.ts'` (already exported) and `BrowserTabSession` via the `@eliza/*` alias. | Low |
| 4 | 26-30 | - | Pins three user-visible refusal strings. | Keep in the Playwright journey. | - |

## Proposed end state
Moves into the Quint driver file, imports both modules for real, no hash ceremony. The host wrapper test is replaced by the one manifest-driven Quint runner; the Playwright spec becomes part of `journeys/browser.spec.ts`.
