# apps/app/src/browser/selected-document-viewer.css
- Lines: 8 | Role: styles for the selected-document viewer dialog | Verdict: MERGE into a shared dialog stylesheet
- Importers: selected-document-viewer.ts:1. Text/path pins: specs/quint/application/manifest.json; refinement selected-document-viewer.mjs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-8 | C5 (P4) | Near-identical to mail-attachments.css (8 of 9 rules). | dialogs.css `.alpha-viewer-dialog`. | Low. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Merged. Estimated lines after: 0 (current 8).

## Verification
selected-document-accessibility.spec.ts.
