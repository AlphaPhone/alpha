# specs/quint/refinement/native/README.md
- Lines: 270 | Kind: documentation of the native refinement campaigns | Verdict: MERGE into `specs/quint/native/README.md` (a short "How native refinement runs" section), then delete
- Covers: how to run the native runner, receipts, and a prose description of roughly 25 campaigns. Duplicates: `specs/quint/native/README.md` (867 lines) already has a per-model "Executed entry points" table with the same rows (e.g. `ResetRecovery`, `SpeechResources`), plus each `.mjs` runner's `assumptions` array repeats the scope text.
- Callers/importers: none. Whole-repo grep for `refinement/native/README` finds no link (specs/quint/README.md links only `native/README.md`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 76-97, 135-148, 160-166, 192-199, 203, 223 | A8 (stale) | Describes "patched shared" classes, "native patch provenance", "authenticated product staging", `indicator-provider-generation.patch` and before/after source probes. `android/upstream-native-sources.json` lists no patches and `patches/eliza` does not exist. | Drop these claims. | None |
| 2 | 9-14 | B5 | Documents receipts under `test-results/quint-refinement` with before/after hashes; the runner rewrite (P6/B5) removes them. | Drop. | None |
| 3 | 35-55 | T4 (doc) | Table duplicates `specs/quint/native/README.md`. | Keep one table there. | None |
| 4 | 3 | — | "Run `node --test test/quint-native-refinement.test.mjs`" will change when per-model wrappers/aggregates collapse to one runner. | Update to the final command in the merged section. | None |
| 5 | 263-270 | — | Navigation paragraph is accurate (whole bridge + service). | Carry one sentence. | None |

## Proposed end state
No README in `refinement/native/`. `specs/quint/native/README.md` gains ~10 lines: requirements (JDK, org.json
jar), the one command, what a harness is (compile real Java, controlled ports, compare observations with model
steps), and the rule that harnesses compile whole files and never slice source text.
