# specs/quint/refinement/services/lifeops-scheduled-task-route.md
- Lines: 41 | Kind: formal model documentation | Verdict: MERGE into the header comment of `lifeops-scheduled-task-route.mjs` (keep the counterexample paragraph), then delete
- Covers: what the LifeOps scheduled-task route campaign executes (upstream SDK route, schemas, generic runner, in-memory stores) and the recorded occurrence-ABA counterexample. Duplicates: manifest `specs/quint/services/manifest.json:1427+` `abstractions` say the same; harness `assumptions`/`obligations` strings (`.mjs:74-82`). Callers/importers: referenced by name only from `personal-assistant-scheduled-task-custody.md` (prose).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-37 | — | The occurrence-identity counterexample (older held dispatch overwrites a newer fired row) is a real upstream defect report with a minimum fix contract. It is the only valuable part. | Keep as 6-8 lines in the harness header and file it as an upstream follow-up (D14, `cross-file-actions.md` §6). | low |
| 2 | 3-20 | C5 | Restates scenario names already readable in the harness. | Drop. | none |
| 3 | 4 | A8 | Pins prose to SDK `b1817660a`, which goes stale whenever `upstream.lock.json` moves. | Drop the hash; the lock file is the pin. | none |

## Proposed end state
No `.md`. The harness header says: real upstream route/runner/stores execute under controlled clock and dispatch ports; one known gap (occurrence ABA) is recorded as a directed witness and tracked upstream.
