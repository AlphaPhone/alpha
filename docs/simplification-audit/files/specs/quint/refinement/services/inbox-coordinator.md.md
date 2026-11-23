# specs/quint/refinement/services/inbox-coordinator.md
- Lines: 140 | Kind: harness README | Verdict: KEEP, SIMPLIFY (to ~40 lines)
- Covers: source↔model map for InboxCoordinator/InboxDelivery and the cleanup schedules. Duplicates: `assumptions`/`obligations` strings in `inbox-coordinator.mjs` and `inbox-cleanup.mjs`. Referenced by nothing (grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-30 | — | Source and abstraction map table is useful for readers of the model. | Keep. | — |
| 2 | 96-108, 135-140 | A8 / B5 | "Source validation" and the trailing paragraph record dated runs ("2026-11-07 source run checks 18 schedules and 131 observed checkpoints", "1,000 sampled runs of 80 steps with seed 123", "Apalache 0.62.4 ... four transitions", receipt folders `test-results/quint-inbox/final`, `before-callback-fence`). History and counts, not behaviour. | Delete. | Low |
| 3 | 124-128 | A8 | "A source defect was reproduced at the shelf boundary ..." is a changelog entry. | Delete (the scenario itself documents the behaviour). | Low |
| 4 | 16-17 | — | Run command `node specs/quint/refinement/services/inbox-coordinator.mjs` uses the CLI entry proposed for removal. | Keep only the `node --test` command. | Low |

## Proposed end state
Purpose, source map table, checked schedules (bullets), out-of-scope list, one run command.
