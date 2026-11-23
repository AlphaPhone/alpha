# apps/app/src/browser/video-codecs.ts
- Lines: 8 | Role: generator over supported MediaRecorder mime types | Verdict: MERGE into video-edit.ts
- Importers: 1 (video-edit.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-8 | D4 (P10) | 8-line module with one consumer. | Move into video-edit.ts. | None. |
| 2 | 3 | B2 | `typeof MediaRecorder==='undefined'`. | Keep only if video-edit runs where MediaRecorder may be missing; otherwise delete. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted (merged). Estimated lines after: 0 (current 8).

## Verification
video-edit.spec.ts.
