# specs/quint/application/FirstSendDraftMigration.qnt
- Lines: 98 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT harness
- Covers: first-send move of a pre-room composer draft into the room slot: the source slot is cleared by CAS only with the exact source receipt and a destination that still holds the same text (`settleFirstSendSlot` in `apps/app/src/prototype/agent-adapter.ts`, CAS from upstream `durable-draft.ts`). Duplicates: `test/first-send-draft-migration.test.mjs` drives the same fixture (T4). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `specs/quint/refinement/application/first-send-draft-migration.mjs` (only in `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`); no per-model wrapper); fixture `test/fixtures/first-send-draft-migration.mjs`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-98 | — | Not a legacy migration (A1): this is the current first-send path, `settleFirstSendSlot` exists and is called from agent-adapter. | Keep the model unchanged. | none |
| 2 | fixture 28-31 | T2/T10 | `test/fixtures/first-send-draft-migration.mjs` slices agent-adapter.ts from `function settleFirstSendSlot(` to `/**\n * A new chat`, strips types, evals in vm. | Export `settleFirstSendSlot` from a small module (e.g. `apps/app/src/runtime/first-send-slot.ts`) and import it in the fixture; delete the slice. | M: agent-adapter split (D1 god module) breaks the anchor today |
| 3 | manifest | T10 | Manifest source lists `vendor/eliza/.../durable-draft.ts` while the fixture imports the `.eliza/client-features` projection. | Pin the file the harness actually imports. | L |
| 4 | test | T4 | `test/first-send-draft-migration.test.mjs` re-runs the same fixture outside the refinement harness. | Delete or fold its unique cases into the harness (owned by the host-test chunk). | L |

## Proposed end state
- Model unchanged; it stays in the application manifest.
- `settleFirstSendSlot` exported from its own runtime module; fixture imports it, no text slicing.
- One harness run (aggregate or one per-model test, not both).
- Manifest pins files only.
