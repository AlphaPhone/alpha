# apps/app/src/browser/reminder-store.ts
- Lines: 28 | Role: reminder domain document with pending-deletion guard and cross-tab broadcast | Verdict: SIMPLIFY
- Importers: 3 (daily.ts, deleted-note-origins.ts, reminder-recovery.ts). Text/path pins: specs/quint/application/manifest.json; refinement browser-deletion-poll.mjs; test/fixtures/browser-daily-stores.mjs; ~22 browser specs import it; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-28 | C4 (P3) | Copy of the preference-documents facade with an extra guard hook. | `observedDocument(reminderStorageKey,{event:'alpha:reminders-document-changed',guard:guardPendingReminderChanges})`; absorb reminder-action-document and reminder-creation-document. | Low. |
| 2 | 6 | A1 | Legacy localStorage reader. | Drop with envelope. | Coordinated. |
| 3 | 5 | A7 | `reminderStorageKey` export — no importer outside file. | Unexport. | None. |
| 4 | 7 | B2 | `typeof BroadcastChannel` guard. | Gone with observedDocument. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
~8 lines: three observed documents (reminders, actions, creations). Estimated lines after: 8 (current 28).

## Verification
reminder-storage-migration.spec.ts (A1), durable-delete-undo.spec.ts, journey-c-alarms.spec.ts, browser-deletion-poll Quint harness.
