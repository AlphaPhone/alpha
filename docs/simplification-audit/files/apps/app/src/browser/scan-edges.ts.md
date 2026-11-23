# apps/app/src/browser/scan-edges.ts
- Lines: 1 | Role: one-line re-export of upstream scan-edges | Verdict: DELETE
- Importers: 1 (prototype/scan-correction-review.ts). Text/path pins: test/browser/scan-edges.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D4 (P10) | `export * from '.../plugin-files/src/documents/scan-edges.ts'`. | Import upstream; delete. | Update scan-edges.spec.ts path. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted. Estimated lines after: 0 (current 1).

## Verification
scan-edges.spec.ts.
