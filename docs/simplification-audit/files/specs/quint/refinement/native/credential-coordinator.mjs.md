# specs/quint/refinement/native/credential-coordinator.mjs
- Lines: 77 | Kind: Quint refinement driver (compiles whole real Java plugins + stubs, runs `CredentialCoordinatorTraces`/`CredentialResidentTraces`) | Verdict: KEEP (add per-model test; trim exports)
- Covers: credential write/remove/bind/clear must retire the resident runtime first and commit through `AlphaCredentialStore` (32 scenarios), plus resident retirement traces; models `NativeCredentialMutation` (services manifest) and `ResidentRuntime` (native manifest), both live. Duplicates: `credential-leases.mjs` checks the same model on upstream lease classes only. Callers/importers: only the native aggregate `index.mjs:15,187` — **no per-model `test/quint-*.test.mjs` wrapper** (grep for `checkCredentialCoordinator` in `test/` finds none).

## How it is tied to product code
Compiles whole files (no slicing): `AlphaCredentialStore`, `AlphaConnectionPlugin`, `SerialStorageTasks`, `RendererCredentialSlots`,
`ConnectionRoutes`, `GoogleWorkspaceReturn(Flow)`, `OwnerRoutes`, `CalendarSyncConsent` (all exist), `residentSources` from
`resident-coordinator.mjs`, six upstream `plugin-native-agent/.../connection/*.java`. Owner routes come from the imported TS table.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / P | Only reachable through the 20-40 min native aggregate (`test/quint-native-refinement.test.mjs`). When the aggregate is deleted (see `index.mjs` report) this campaign loses its runner. | Add `test/quint-native-credential-coordinator.test.mjs` calling `checkCredentialCoordinator()` and asserting `passed` per receipt. | High if aggregate is deleted first |
| 2 | 8, 16 | A7 | `credentialCoordinatorSources` and `credentialScenarios` are exported but have no importer outside this file. | Drop `export`. | None |
| 3 | 25-51, 74-77 | A7 / T9 | `generateCredentialCoordinatorTraces(scenario)` single-scenario mode and the CLI block exist only for manual debugging; no caller passes a scenario. | Keep the one-scenario CLI only if owners use it; otherwise collapse to the `campaign` call. | Low |
| 4 | 2, 47, 60 | B5 / C3 | `fixtureSha256` (local `createHash`) is hashed only to be interpolated into an assumption string; `captureInputs` hashes ~30 inputs before the run. | Drop the fixture hash; keep `captureInputs` only if receipts survive the formal-receipt decision (ci-and-formal §2.8). | Low |
| 5 | 59-64, 66-71 | B5 | Prose assumptions/obligations returned in receipts; nothing consumes them. | Delete with the receipt decision. | None |

## Proposed end state
A ~30-line driver: build the platform, compile `credentialCoordinatorSources` + ports once, run the `campaign` mode, check
both models. Its own `test/quint-native-credential-coordinator.test.mjs` runs it; the aggregate no longer does.
