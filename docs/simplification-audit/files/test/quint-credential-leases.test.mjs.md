# test/quint-credential-leases.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper (calls `checkCredentialLeasePolicies` from `specs/quint/refinement/native/credential-leases.mjs`) | Verdict: DELETE
- Covers: native request/shutdown credential leases keep ownership; javac-compiles upstream `CredentialIntentFence.java` (two plugin copies). Duplicates: the same driver is registered in `specs/quint/refinement/native/index.mjs` and runs again in the aggregate `test/quint-native-refinement.test.mjs`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6 | T4, P3 | Second execution of a campaign the native aggregate already runs (javac). | Delete; the model stays live through the family runner (`test/quint-refinement.test.mjs`). | None |
| 2 | 7-10 | B5 | Exact trace/checkpoint/field counts and `passed`/`inputsUnchanged`/`driverInputsBound` flags restate what `checkTraces` already enforces; they break whenever a scenario is added. | Gone with the file. The runner asserts only that each campaign passes. | None |
| 3 | — | P1 | Sources are only `vendor/eliza` Java. | Select on `upstream.lock.json` change. | Low |

## Proposed end state
Deleted. `CredentialLeases` keeps running once through the native campaign list in the manifest runner.
