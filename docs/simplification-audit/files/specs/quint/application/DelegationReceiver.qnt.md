# specs/quint/application/DelegationReceiver.qnt
- Lines: 142 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT test
- Covers: Cloud read-delegation return: native retains callback, panel reads it under a one-step gate; completion at most once per tap, grant only from Cloud. Duplicates: `test/cloud-delegation-callback.test.mjs` (named by the test comment). Callers/importers: `test/quint-delegation-receiver.test.mjs` (no refinement harness), README; 11 symbol pins in cloud-delegation-ui.tsx and AlphaConnectionPlugin.java.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 15-21 | T2/T1 | Slices `cloud-delegation-ui.tsx` between `export function delegationCancelStep(` and `export function CloudDelegationPanel(`, strips types, data-URL import; two `assert.match` regexes on source. | `delegationCancelStep` is already exported: import the module through the esbuild/tsx loader; delete the regexes. | None. |
| 2 | test 12-14 | T10 | Parses scenario and witness names from the .qnt with regex. | Read them from the manifest (`tests`, `witnesses`). | None. |
| 3 | manifest symbols | T10 | 11 pins incl. Java `compareExchange`, `releaseCallback`. | Delete pins. | None. |
| 4 | — | A3/D5 | Panel is reachable only through `HostedDigestPanel` (hosted digest). Whether hosted digest survives D5 is not settled in DECISIONS. | Owner question; if hosted digest goes, DELETE model + test. | — |

## Proposed end state
Model kept while the Cloud reads panel ships; replay imports `delegationCancelStep`.
