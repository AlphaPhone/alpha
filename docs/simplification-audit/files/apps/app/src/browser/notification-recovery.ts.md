# apps/app/src/browser/notification-recovery.ts
- Lines: 3 | Role: one-line openDomainRecovery wrapper for the notification document | Verdict: MERGE into a recovery table (domain-recovery.ts or device-controls)
- Importers: 2 (device-controls.tsx, prototype/settings-adapter.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4/A1 | Thin wrapper; copy says "The older saved copy remains available" (legacy envelope). | Table `recoveries.notifications={document,name,heading,description}`; drop the legacy sentence with A1. | Low; recovery copy is user-visible only in test-mocks builds (domain-recovery.ts:9). |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted; entry in a recovery table. Estimated lines after: 0 (current 3).

## Verification
device-controls specs; settings-adapter notification recovery path.
