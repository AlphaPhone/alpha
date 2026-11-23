# specs/quint/application/CloudConnectionNotices.qnt
- Lines: 36 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; SIMPLIFY harness
- Covers: Simultaneous plan and sign-in notices: exact dismissal, foreground ownership, render order at large text / compact. Duplicates: Playwright `connection-cloud` journey territory; helpers `test/browser/helpers/cloud-connection-notices.ts`, `native-cloud-plan-fixture.ts`. Callers/importers: `specs/quint/refinement/application/cloud-connection-notices.mjs` (+ `.md`), `test/quint-cloud-connection-notices.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 1-12 | — | Starts Vite and Chromium, seeds state via `test/browser/flag-off-android.ts`, drives the real app: a true integration, notable runtime cost. | Keep the technique; run it once (per-model runner only). | — |
| 2 | harness | B5 | Imports `filesWithin`, `sha256` from `scripts/quint-lib.ts` and `checkClientFeatures` to hash `apps/app/src` inputs (evidence ceremony). | Drop input hashing; rely on exit code. | None. |
| 3 | manifest | T4 | Aggregate duplicate (two Chromium launches per verify). | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; browser-driven harness kept, without input hashing, run once.
