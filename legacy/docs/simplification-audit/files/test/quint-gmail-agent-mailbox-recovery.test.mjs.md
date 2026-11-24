# test/quint-gmail-agent-mailbox-recovery.test.mjs
- Lines: 17 | Kind: Quint refinement wrapper (calls `checkGmailAgentMailboxRecovery` from `specs/quint/refinement/services/gmail-agent-mailbox-recovery.mjs`) | Verdict: DELETE
- Covers: upstream `managed-gmail-client.ts` confirms the exact review and only reads back a lost dispatch (45 traces). Duplicates: the same driver is registered in `specs/quint/refinement/services/index.mjs` and runs again in the aggregate `test/quint-services-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | T4, P3 | Second execution of a campaign the services aggregate already runs. | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 9-16 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 12-16 | T5 | Asserts model `expect` values of named traces. | Gone. | None |
| 4 | — | P1 | Upstream-only source. | Select on `upstream.lock.json`. | Low |

## Proposed end state
Deleted. `GmailAgentMailboxRecovery` keeps running once through the services campaign list in the manifest runner.
