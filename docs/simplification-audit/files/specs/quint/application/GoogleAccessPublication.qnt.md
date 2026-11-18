# specs/quint/application/GoogleAccessPublication.qnt
- Lines: 85 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; PORT harness (legacy import)
- Covers: serialised publication of Gmail/Calendar agent-access choices to the host with rollback/correction and guarded (revision-checked) choices (`apps/app/src/runtime/google-agent-access.ts`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `specs/quint/refinement/application/google-access-publication.mjs` run by `test/quint-google-access-publication.test.mjs` and again by `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`) (T4)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 5 | P6 | Harness imports `deferred` from `specs/quint/legacy/core/source-support.mjs`; blocks retiring `specs/quint/legacy`. | Use `deferred` from `refinement/application/support.mjs` (already exported there). | L |
| 2 | harness 23-32 | T10-lite | Bundles the real module with esbuild (good) but evaluates the CJS output with `new Function` and fake globals. | Switch to `bundledSource`/`sourceModule` from support.mjs (ESM import). | L |
| 3 | — | T4 | Campaign runs twice (per-model test + aggregate). | Keep one runner. | L |

## Proposed end state
- Model unchanged.
- Harness imports the bundled module via the shared `sourceModule` helper; no legacy import.
- One runner.
