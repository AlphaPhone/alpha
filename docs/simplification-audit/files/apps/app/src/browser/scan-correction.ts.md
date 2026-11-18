# apps/app/src/browser/scan-correction.ts
- Lines: 1 | Role: one-line re-export of upstream scan-correction | Verdict: DELETE
- Importers: 1 (prototype/scan-correction-review.ts). Text/path pins: test/browser/scan-correction.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 (P10) | `export * from '../../../../.eliza/client-features/plugins/plugin-files/src/documents/scan-correction.ts'`. | Import upstream directly; delete. | Update scan-correction.spec.ts if it imports this path. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted. Estimated lines after: 0 (current 1).

## Verification
scan-correction.spec.ts.
