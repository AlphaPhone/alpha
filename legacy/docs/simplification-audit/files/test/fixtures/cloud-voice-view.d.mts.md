# test/fixtures/cloud-voice-view.d.mts
- Lines: 75 | Kind: type declarations for `cloud-voice-view.mjs` | Verdict: DELETE with `cloud-voice-view.mjs` (or with the two scripts that need it)
- Covers: types the vm fixture's return value for `scripts/test-cloud-voice-*.ts` under `typecheck:scripts`. Duplicates: none. Callers/importers: no explicit import; picked up by TypeScript for `scripts/test-cloud-voice-flow.ts` and `scripts/test-cloud-voice-cancellation-flow.ts` (research tests-host §orphans confirms).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | C1 | A hand-written structural type of a transplant harness; drifts from the `.mjs` (e.g. omits `kind`, `sendInputs`, `flushUpdates`, `tick` that the fixture returns). | Delete with the fixture. | none |
| 2 | 5 | - | Imports `voiceFakeClock` from `shared-batch-voice.mjs` (another fixture). | - | - |

## Proposed end state
Gone when the voice transplant harness is replaced by a voice integration harness that imports real modules (then real types come from the modules).
