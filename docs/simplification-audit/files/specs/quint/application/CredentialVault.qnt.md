# specs/quint/application/CredentialVault.qnt
- Lines: 99 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; SIMPLIFY (drop transfer); MERGE target for CredentialVaultReadback
- Covers: Password manager UI lifetime: secret clearing on lock/background/leave, native-origin admission, damaged-vault reset review. Duplicates: `CredentialVaultReadback.qnt` is a superset audit twin (P6). Callers/importers: `specs/quint/refinement/application/vault-coordinator.mjs` and `specs/quint/refinement/application/contracts.mjs` (via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)); README.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5,10,50-52,68,71,75-76,87-88 | A3/D3 | `transferred` field, `testMocksInit`, `transfer` action, `TransferGate` invariant and `explicitTestBuildTransferTest` model password import/export, deleted by D3 (cross-file-actions Q-DEV-15, delete-candidates C9). | Delete those members; `testMocksInit` has no other use. | None once the transfer group in password-manager.ts is removed; harness stub `createTransferClient` (vault-coordinator.mjs:58) goes too. |
| 2 | whole file | C5/T4 | Readback twin repeats every action with an extra listing-read fence. | Replace this file's content with CredentialVaultReadback's (minus transfer) and delete the twin. | Harness traces must satisfy the stronger model; check before merge. |
| 3 | harness | — | vault-coordinator.mjs bundles password-manager.ts with esbuild (import). | None. | — |

## Proposed end state
One `CredentialVault` model with listing-read fencing, no transfer; import-based harness; per-model runner.
