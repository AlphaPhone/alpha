# test/quint-copy-receipt.test.mjs
- Lines: 17 | Kind: Quint refinement wrapper (calls `checkCopyReceipt` from `specs/quint/refinement/native/copy-receipt.mjs`) | Verdict: DELETE
- Covers: browser copy transactions (begin, save, commit, render failure, session expiry, external edit, trash) refine CopyReceipt over all 15 state fields; `prototype/browser-camera.ts`. Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | T4, P3 | Second execution of a campaign the native aggregate already runs (Chromium, 240 s). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 8-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | 12-17 | T5 | Two mutation canaries (`checkCopyReceiptCanary('retired'|'replace')`) prove the harness rejects broken source: tests of the harness, 180 s each. | Delete; if wanted, run canaries in the formal lane only (`quint:refinement --canaries`), never in `npm test`. | Low |

## Proposed end state
Deleted. `CopyReceipt` keeps running once through the native campaign list in the manifest runner.
