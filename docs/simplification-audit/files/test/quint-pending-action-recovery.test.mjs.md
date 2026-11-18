# test/quint-pending-action-recovery.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (`runPendingActionRecoveryReplay`; driver slices `prototype/agent-adapter.ts` and bundles with esbuild) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: `recoverPendingActions` (sync, binding change, block/unblock, read settle, expiry timer, continuation) follows 89 PendingActionRecovery traces. Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14 | T4 (none) | Only execution. | Register in the application index. | Low |
| 2 | 10-13 | B5 | Count pins and action list. | Drop. | None |
| 3 | — | T10 | Driver slices `agent-adapter.ts`, which C1/C4 shrink heavily. | PORT: export `recoverPendingActions` from the adapter split. | High |

## Proposed end state
Deleted; PendingActionRecovery registered in the application index on an exported function.
