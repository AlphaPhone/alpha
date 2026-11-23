# apps/app/src/browser/reminder-action-document.ts
- Lines: 3 | Role: JSON domain document for reminder action requests (legacy key name reminder-deletions.v1) | Verdict: MERGE into reminder-store.ts
- Importers: 2 (reminder-recovery.ts, runtime/reminder-deletions.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | A1/D11 (P18) | "Keep the installed key": actions stored under `alpha.browser.reminder-deletions.v1`. | Keep the key byte-for-byte (persisted format) unless A1 clears browser stores; then rename to reminder-actions.v1. Move constant into reminder-store.ts. | Owner decision on A1. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted; `reminderActionDocument` exported from reminder-store.ts. Estimated lines after: 0 (current 3).

## Verification
reminder-*-review.spec.ts, durable-delete-undo.spec.ts.
