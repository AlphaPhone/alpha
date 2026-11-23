# specs/quint/application/DevBridgeSignIn.qnt
- Lines: 114 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP (D20) ; drop symbol pins
- Covers: Browser development bridge Cloud sign-in: key minted, acknowledged with bounded retries, owner-checked, stored via serialized private store; cancel safety. Duplicates: DevelopmentHost covers the same bridge's private-store transactions (with a harness). Callers/importers: Only `specs/quint/application/manifest.json:9259` (git grep). No harness, no test. 11 symbol pins in `scripts/browser-cloud-dev-bridge.ts`, several of which are string literals (`/steward/auth/logout`, `account-changed`, `committing`, `activation-pending`)..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | T10 | Pins string literals of a dev middleware file; the model has no refinement, so pins are its only tie to code. | Delete pins; keep the file path source. | The model then has no code tie at all; acceptable for a design model of dev tooling. |
| 2 | all | D6/D20 | Models development-only code (Vite dev bridge), not product. D20: keep code and model together while the bridge stays. | KEEP; owner question whether design models of dev tooling are wanted at all. | — |
| 3 | — | C5 | Overlaps DevelopmentHost (same file, store transactions). | Optional MERGE into DevelopmentHost. | — |

## Proposed end state
Model kept while the bridge exists, no symbol pins; candidate to merge with DevelopmentHost.
