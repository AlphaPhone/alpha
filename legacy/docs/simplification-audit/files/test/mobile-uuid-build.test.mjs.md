# test/mobile-uuid-build.test.mjs
- Lines: 57 | Kind: tooling (real `scripts/mobile-uuid-adapter.ts` on `test/fixtures/mobile-uuid-build.mjs` temp trees) + source-text (47-57) | Verdict: DELETE
- Covers: the mobile agent bundle's UUID barrel transform and producer receipt are admitted only for reviewed inputs. Duplicates: Quint `specs/quint/refinement/services/mobile-bundle-admission.mjs` imports the same exports and the same fixture and checks the same refusal classes (`Unreviewed mobile UUID build policy`, `unexpected modules`, `transform exactly the reviewed barrel`, symlink at 181). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-46 | T4 | Same fixture, same functions, same refusals as the refinement. | Delete. | Low |
| 2 | 47-57 | T1 | Regexes over `stage-local-agent-runtime.ts`, `android-build-preflight.ts`, `source-snapshot.ts`, `verify-packaged-runtime.py`, `build-mobile-agent.ts`. | Delete; the preflight itself fails the build if the receipt is missing. | None |
| 3 | fixture | - | `test/fixtures/mobile-uuid-build.mjs` survives: the refinement imports it. | Keep (or move next to the refinement). | None |

## Proposed end state
File deleted; fixture kept for the mobile-bundle-admission refinement.
