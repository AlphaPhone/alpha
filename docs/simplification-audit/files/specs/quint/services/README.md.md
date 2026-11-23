# specs/quint/services/README.md
- Lines: 266 | Kind: formal-family documentation (narrative + validation records) | Verdict: REWRITE (to ~30 lines)
- Covers: describes "these fourteen modules" of the services family, their state and safety properties, reproduction commands, dated validation records (2026-11-07, Nov 8), Apalache runs, scan counterexample, embedding provenance history and "complementary audit models". Duplicates: `specs/quint/services/manifest.json` (authoritative list, sources, invariants, tests), `specs/quint/README.md` / parent guide (commands). Callers/importers: none executable; `git grep` finds no script reading it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 85, 191, 215 | stale | Says the family has fourteen modules / 90 scenarios; the manifest registers ~78 models (ci-and-formal §1). | Replace the per-module tables with "see `manifest.json`". | None |
| 2 | 139-169 | stale | Scan section claims `ExplicitlySavedDraftPreserved` is outside `safety` and names `explicitSaveAfterAutosaveCounterexampleTest`; the model now has the property in `safety` and no such run. | Delete the section (model comments carry the meaning). | None |
| 3 | 83-137, 186-236 | B5 / A8 | Dated "validation record" and "symbolic checks" paragraphs with revisions (`5a672102dd`, `99b49439ce9`), Apalache retry anecdotes and references to `test-results/quint-native/producer-validation.json` receipts. Evidence ceremony; CI exit codes are the record. | Delete. | None |
| 4 | 152, 238-262 | A8 | "historical native implementation removed during the upstream migration", "on product revision … a held update could …" narrate history. | Delete. | None |
| 5 | 53 | owner | "Legacy server admission and production schedules have separate contracts" (WorkflowExecution) — check nothing legacy survives D1. | Drop with the rewrite. | None |

## Proposed end state
~30 lines: what the services family is (product service boundaries and build/release tooling), that `manifest.json` lists models, sources and scenarios, the three commands (`quint typecheck/test/run`) and how the refinement campaigns are run (`npm run quint:check`). No dated records.
