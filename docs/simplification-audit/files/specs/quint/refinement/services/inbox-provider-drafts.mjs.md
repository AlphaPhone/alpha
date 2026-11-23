# specs/quint/refinement/services/inbox-provider-drafts.mjs
- Lines: 402 | Kind: Quint refinement harness (imports and runs real modules via `inbox-coordinator-ports.mjs` bundle; not text-sliced) | Verdict: KEEP, SIMPLIFY
- Covers: the Inbox provider-draft lifecycle (create, replace, delete one Gmail draft; adoption of a provider reference; forward parts; owner changes during reads/saves; unknown outcomes and restart) against `InboxProviderDrafts.qnt` with 25 traces. Duplicates: `inbox.mjs` drives the same `InboxOperation` CAS/dispatch/restart in isolation (InboxDelivery); the restart/unknown-outcome cases overlap `inbox-coordinator.mjs` (InboxCoordinator). Callers/importers: `test/quint-inbox-provider-drafts.test.mjs` (spawns a child Node process that imports it), `services/index.mjs:27,86` (aggregate, same campaign again).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 196-210 | A1 | Scenario `legacy-reference-retains-new-edits` hand-writes a "pre-fix saved reference" with a `messageId` readback field and checks that reload canonicalises it. That data shape cannot exist on a fresh install (D1); it tests a legacy reader in the drafts store. | Delete the scenario; delete the matching normaliser in the product draft-retention code (cross-file, renderer owner). Wrapper count drops 25 → 24. | low |
| 2 | 12-23 | C3 | Local `deferred` and `until` re-implement `services/support.mjs:6,12` (imported by its sibling `inbox.mjs`). | Import from `./support.mjs`. | none |
| 3 | 97-104, 392 | B5 | `serviceInputs` + `captureInputs` + `driverHashes` hash ~all driver sources before the run so `checkTraces` can report `driverInputsBound`; nothing consumes the receipt beyond the wrapper asserting `true`. | When `check-traces.mjs` drops input hashing (cross-file), pass only traces. | low |
| 4 | 392-397 | B5 | `assumptions` and `obligations` prose returned in the receipt; duplicated in the `.md` and manifest. | Keep one short header comment; drop prose fields if the receipt shape is simplified. | none |
| 5 | 142,149-154,251 … | D8 | Many statements per line (`fixture.advance();coordinator.provider...;await fixture.settle();`). | Prettier pass (D9). | none |
| 6 | 399-402 | T9 / A7 | Direct-run `process.argv[1]` block; no caller (`grep` finds no script or doc running it besides the `.md`). | Delete. | none |
| 7 | — | T4 / T9 | The wrapper test spawns a child process to import this file, and the same campaign runs again in `quint-services-refinement`. | Wrapper imports and awaits `runInboxProviderDraftsRefinement()` directly; aggregate deleted (see `index.mjs`). | low |

## Proposed end state
~330 lines after Prettier: shared `deferred/until` from `support.mjs`, 24 traces (legacy reference scenario gone), no direct-run block, no input hashing once `check-traces.mjs` is simplified. One test (`test/quint-inbox-provider-drafts.test.mjs`) imports it in-process. Model `InboxProviderDrafts.qnt` stays live (Inbox provider drafts are product code).
