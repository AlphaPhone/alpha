# apps/app/src/browser/review.css
- Lines: 9 | Role: styles for the operation review dialog | Verdict: MERGE into a shared dialog stylesheet
- Importers: review.ts:1 (the other 9 matches import review.ts, not the CSS). Text/path pins: specs/quint/application/manifest.json; refinement browser-reviews.mjs; scan-source-conformance.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-9 | C5 (P4) | Same structure as mail-attachments.css/selected-document-viewer.css with `--review-*` prefixed tokens. | One dialogs.css with modifiers; mount in .os so tokens need no copy. | Low; review-visual-viewport.spec.ts. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Merged into dialogs.css. Estimated lines after: 0 (current 9).

## Verification
operation-review-accessibility.spec.ts, review-visual-viewport.spec.ts.
