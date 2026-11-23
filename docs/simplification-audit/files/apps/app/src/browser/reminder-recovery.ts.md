# apps/app/src/browser/reminder-recovery.ts
- Lines: 9 | Role: three openDomainRecovery wrappers for reminder documents | Verdict: MERGE into a recovery table
- Importers: 2 (device-controls.tsx, prototype/calendar-adapter.ts:5 — all three used, plus template.html:1039 buttons). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | D4 | Thin wrappers; production shows only "Data kept". | Recovery table keyed by domain. | Low. |
| 2 | 7, 9 | D10 | Heading `'Recovery'` for two different stores (dialogs indistinguishable). | Give distinct headings in the table. | User-visible (test-mocks only). |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted; entries in the recovery table. Estimated lines after: 0 (current 9).

## Verification
calendar-adapter recovery menu specs (browser-reminder-edit-recovery.spec.ts, host-reminder-recovery.spec.ts).
