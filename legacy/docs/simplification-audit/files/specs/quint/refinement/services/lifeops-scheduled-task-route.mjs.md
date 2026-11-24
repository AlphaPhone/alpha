# specs/quint/refinement/services/lifeops-scheduled-task-route.mjs
- Lines: 83 | Kind: Quint refinement harness (runs the real upstream route/runner bundled by `test/fixtures/lifeops-scheduled-task-route.mjs`) | Verdict: KEEP (owner question: upstream-only model)
- Covers: `LifeOpsScheduledTaskRoute.qnt` — owner-visible list filtering, request validation, cron edit, snooze/complete/reopen, claim race, completion vs. egress ordering, dispatch failure, global pause, and the occurrence-ABA known gap; 13 traces. Duplicates: `test/quint-lifeops-scheduled-task-route.test.mjs` test 1 replays the known-gap schedule by hand (same as scenario at 68-72); `personal-assistant-scheduled-task-custody.mjs` reuses the same fixture. Callers/importers: `test/quint-lifeops-scheduled-task-route.test.mjs`, `services/index.mjs:63,84`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest sources | P6 | Manifest `sources` are only `vendor/eliza/plugins/plugin-scheduling/**`: this models upstream code, not alphaphone code. Research (ci-and-formal §2.6) lists such models as candidates to move upstream. | Owner question: keep here (D11 "every live model passes") or move upstream with the fixture. Recommend keep until upstream owns it. | low |
| 2 | 5 | C5 | Imports `call/checkpoint/trace` from `../application/support.mjs` while sibling services harnesses use `./support.mjs`. | Use the merged support module. | none |
| 3 | 18-23, 73 | B5 | Driver hashes merged from the fixture's own `f.hashes` per scenario. | Drop with `check-traces.mjs` simplification. | low |
| 4 | 11 | B3 | `fields` asserts every log name is in its own constant list. | Keep (it guards an unexpected upstream log kind) — cheap. | none |
| 5 | test file | T4 | Wrapper test 1 duplicates scenario 68-72 with raw field asserts. | Delete wrapper test 1; the trace already compares those fields against the model. | low |

## Proposed end state
Unchanged logic; imports one shared support module; no input hashing; header comment carries the counterexample note from the `.md`. One wrapper test (the receipt test). Revisit if upstream fixes occurrence fencing: the `occurrenceFenceGapTest` witness then flips and the model changes with it.
