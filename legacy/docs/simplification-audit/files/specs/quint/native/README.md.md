# specs/quint/native/README.md
- Lines: 867 | Kind: formal-model documentation (narrative + historical validation records) | Verdict: SIMPLIFY (rewrite to ~150 lines)
- Covers: per-model source correspondence for the native family, deliberate abstractions, how to run checks, and long per-model protocol narratives with dated proof sweeps and as-built commit replays. Duplicates: the per-model prose duplicates `manifest.json` `abstractions`/`stateMapping` and the assumption/obligation strings in `refinement/native/index.mjs:200-230`; `refinement/native/README.md` covers harness detail. Callers/importers: none (documentation; referenced from `specs/quint/README.md`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 201-281 | A8 / B5 | "Native validation record", "Initial native bounded proof sweep", "Final review expansion": dated 2026-11-07 runs, checker wall-clock tables, retry anecdotes, receipt paths under `test-results/` that are not committed. Counts are stale ("13 models and 98 scenarios", "17 models and 150 scenarios"; the family now has 86 models / 213 manifest paths entries). | Delete all three sections. CI output is the record. | none |
| 2 | 254 | A8 | "while the legacy Calendar check finished" — tombstone for a deleted feature (D1/D4). | Deleted with finding 1. | none |
| 3 | 495-503, 625-631, 643-646, 684-688, 727-733, 750-757, 787-795, 818-821, 836-845, 857-862 | A8 | "The baseline/as-built replay in commit `<sha>`" paragraphs narrate past bugs and fixes. History belongs in git. | Delete; keep one sentence per model stating the current guarantee. | none |
| 4 | 19-35 | C5 | Source-correspondence table covers 11 of 86 models and names symbols that drift (e.g. `ResidentRuntime` row lists `ResidentScheduleRearm.decide`). Manifest already pins sources per model. | Replace the table with one sentence: "each model's sources and state mapping are in `manifest.json`". | low |
| 5 | 147-199, 283-862 | C5 | ~600 lines of per-model protocol prose. Each paragraph duplicates the model's own header comment, manifest `abstractions` and the harness `assumptions`/`obligations` strings. | Move any sentence not already present into the model's `///` header; delete the rest. | low (doc only) |
| 6 | 117-145 | — | "Running the checks" is useful; `conformance.mjs` paragraph says it replays listener/reset/focus policy — keep but shorten. The 98-scenario count is stale. | Keep, drop counts. | none |
| 7 | 865-867 | A8 | "Complementary audit models" paragraph refers to "November audit models" without naming them; it is the only explanation of audit twins like `ResidentSchedulingServiceAdmission`. | Replace with a named list, or delete once the twins are merged (see `ResidentScheduling.qnt.md`). | none |
| 8 | 549-568, 717-738 | — | Sections on `NativeHostedInbox` / `NativeSourceRenewal`: if D5 (hosted/paired code) removes their product code, these sections go with those models. Not decided in this chunk. | Follow the verdict of those models' reports. | — |

## Proposed end state
About 150 lines: purpose of the native family; manifest is the source of truth for sources, symbols, bounds and
abstractions; how to run one model (typecheck / test / run / verify) and the refinement campaign; the shared
abstraction rules (one process, bounded counters never wrap, external results nondeterministic); the
composition section (`ApplicationComposition`, `NativeUpdateComposition`) in five lines; what the checks do not
prove (APK, emulator, device). No dates, commit SHAs, checker timings or totals.
