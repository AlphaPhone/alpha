# specs/quint/refinement/services/app-update-candidate.mjs
- Lines: 151 | Kind: Quint refinement harness (imports real `main` of `scripts/app-update-candidate.ts`; real disposable Git checkouts and archive hashing via `test/fixtures/app-update-candidate.mjs`) | Verdict: KEEP (SIMPLIFY)
- Covers: model `AppUpdateCandidate`: version admission above every retained/public floor, a rerun cannot overwrite earlier evidence, a floor advancing between first and final reads refuses the receipt without touching the admitted version, malformed pointer/inventory/wrong workflow epoch refuse, archive byte/freeze/signed/profile changes refuse (13 traces). Duplicates: `test/app-update-candidate.test.mjs` (267 lines, same fixture) has the same floor-advance case (its line 195) and the same mutation refusals (its line 176); `test/qualified-app-update.test.mjs` partly. Importers: `index.mjs`, `protected-app-update-promotion.mjs` (names the script, does not import this harness), `test/quint-app-update-candidate.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19 | B5 / P1 | `.github/workflows/resident-android.yml` is a receipt source and a manifest source of the model; every workflow edit reselects `AppUpdateCandidate` for symbolic checking although the harness never reads the workflow. | Remove the workflow from receipt and manifest sources. | Low |
| 2 | — | T4 | Duplicate coverage with `test/app-update-candidate.test.mjs`. | Keep this harness for the model-linked schedules; the host test keeps only what this does not cover (archive measurement sizes, native input receipt fields, legacy manifest URL), per its own report. | Low |
| 3 | 144 | — | Assumption text has missing spaces ("numbers705/706", "classes1/2/3", "below705"). | Fix spacing. | None |
| 4 | 33-47 | B3 | Asserts receipts carry boolean `signed`/`distributionQualified` - a type check of the script's own output. | Drop; the projection already reads them. | None |

## Proposed end state
Same 13 traces; no workflow file in sources; host-test duplicates removed on the test side.
