# apps/app/src/browser/domain-recovery.ts
- Lines: 61 | Role: recovery dialog (backup download, reset, calendar restore); production shows only the "Data kept" notice | Verdict: SIMPLIFY (owner decision whether test-mocks recovery stays)
- Importers: 17 (calendar-editor-draft, calendar-recovery, development-cloud-ui, digest-delegation-ui, notification-recovery, preference-recovery, reminder-recovery, prototype/{agent-adapter,automations-adapter,calendar-edit-draft-adapter,calendar-form-draft-adapter,camera-adapter,canonical-calendar-drafts,inbox-unsaved}, runtime/{connection-ui,hosted-digest-ui,workflow-request-recovery}). Text/path pins: specs/quint/application/manifest.json; refinement hosted-digest-refresh.mjs, workflow-request-recovery-admission.mjs; test/browser/domain-recovery-lifecycle.spec.ts and 4 migration specs; test/fixtures/{canonical-calendar-draft-owner,scheduled-task-controls}.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | A3/D5 (P8) | `if(!testMocksEnabled){openRetainedDataNotice(heading,signal);return;}` — lines 10-60 (backup/reset/restore UI) are reachable only in test-mocks builds; PRD excludes backup/import/export (A3). | Move lines 10-60 to dev/domain-recovery-dev.ts loaded by dynamic import; product `openDomainRecovery` = retained-data notice. | Medium: owner decision (§7 Q2). |
| 2 | 17, 36, 60 | A1 | "Download old copy" button and `legacyChanged` status ("Conflict in another tab") exist only for the legacy envelope. | Delete with domain-document envelope. | Low. |
| 3 | 40-53 | D10 (P9) | Generic helper hard-codes calendar copy (`Choose calendar backup`, `Recover events`, `Review calendar restore`, 5 MB calendar limit); only calendar-recovery.ts passes restoreOption. | Move the restore UI into calendar-recovery.ts (dev side). | Low. |
| 4 | 8 | D9 | Positional signature `(domain,name,heading,description,signal?,restoreOption?,storage?)`; calendar-recovery passes `undefined` to reach arg 6. | Options object. | 17 call sites change. |
| 5 | 31-33 | C3 | Blob download block (createObjectURL/anchor/revoke after 60 s) duplicated in location-simulation.ts:38-39, simulator-recovery.ts:38, prototype/browser-camera.ts. | `downloadText(raw,name)` in dialog kit. | None. |
| 6 | 54-59 | C4 (P4) | Own focus trap + retire-event lifecycle. | Dialog kit. | Medium. |
| 7 | 27 | B1 | `catch{status='Backup unconfirmed'}` — specified status copy. | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| RestoreOption | type | 6 | calendar-recovery.ts | move to calendar-recovery |
| download | helper | 18-34 | location-simulation.ts:37-40, simulator-recovery.ts:38, prototype/browser-camera.ts | dialog kit downloadText |
| trapFocus | helper | 54 | none in browser/ | dialog kit |

## Proposed end state
Product: ~5 lines delegating to openRetainedDataNotice with an options object. Test-mocks backup/reset dialog (~35 lines) in dev/, calendar restore UI in calendar-recovery dev side, no legacy button. Estimated lines after: 8 (current 61).

## Verification
test/browser/domain-recovery-lifecycle.spec.ts, assistant-draft-storage.spec.ts, cloud-personal-intent-storage.spec.ts, hosted-digest-refresh + workflow-request-recovery-admission Quint harnesses.
