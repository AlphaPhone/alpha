# specs/quint/application/PermissionWalkthrough.qnt
- Lines: 143 | Kind: Quint model (live; two harnesses) | Verdict: MERGE into PermissionChoices.qnt
- Covers: Native seven-permission walkthrough coordinator: one prompt per permission, ordered progress, durable completion, stale results retired. Duplicates: specs/quint/application/PermissionChoices.qnt ("Current StartupPermissions component over seven native or four browser flows"): same keys, states, generations, begin/request/result/staleResult/advance/restart; three runs are copied by name (ownerChangeRetiresPendingTest, staleCompletionKeepsNewPendingTest, completedRemountTest) and failedProgressWriteTest has a near twin (failedProgressAdvancesTest). Callers/importers: manifest row (3 sources + shared permission-walkthrough.ts); harnesses specs/quint/refinement/application/startup-permissions-coordinator.mjs (test/quint-permission-coordinator-refinement.test.mjs) and contracts.mjs `permissionWalkthrough` (progress-store projection); application README

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-143 | C5/T4 | Second model of the same React coordinator; PermissionChoices covers native and browser and the skip/review flows. | Delete this model, its row, startup-permissions-coordinator.mjs (+ permission-coordinator-notes.md) and its wrapper test. | L |
| 2 | legacyCompleted, historicalInstall, legacyCompletionTest | A1 | Historical walkthrough versions (B248, D1). | Not carried. | L |
| 3 | contracts.mjs:112-130 | - | Progress-store write/readback projection (`readStartupPermissionProgress`/`writeStartupPermissionProgress`) is real integration of the store; worth one case. | Carry into the PermissionChoices harness as a persistence case. | L |
| 4 | cases worth carrying | - | `failedAttemptWriteRestartTest` (persistedAttempted lost on failed write: second prompt after restart) has no PermissionChoices counterpart (`attempted` is not persisted there). | Add `persistedAttempted` + this run to PermissionChoices if the product persists attempts (check startup-permission-progress.ts). | M |

## Proposed end state
Deleted; one permission model remains (PermissionChoices) with the attempt-persistence case carried over if still true in code.
