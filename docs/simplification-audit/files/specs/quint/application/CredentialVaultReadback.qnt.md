# specs/quint/application/CredentialVaultReadback.qnt
- Lines: 131 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: MERGE into CredentialVault.qnt (then DELETE)
- Covers: Superset of CredentialVault adding listing-read fencing, hidden-render closure and reset review rules. Duplicates: `CredentialVault.qnt` (line 1 comment: "Complementary audit scope; the canonical model … registered separately"). Callers/importers: Only `specs/quint/application/manifest.json:405` (git grep). No harness, no test: checked by `quint:check` scenarios/simulation only..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | P6/C5 | Self-described audit twin of CredentialVault; no refinement ties it to code. | Move its content into CredentialVault.qnt (which has the harness), delete this file and its manifest entry. | Readback invariants then need vault-coordinator traces to project the listing counter. |
| 2 | 54,109 + transfer action | A3/D3 | Same transfer/test-mocks members as CredentialVault. | Drop in the merge. | None. |

## Proposed end state
File deleted; its stronger invariants live in CredentialVault.qnt.
