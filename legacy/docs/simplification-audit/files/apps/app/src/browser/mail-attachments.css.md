# apps/app/src/browser/mail-attachments.css
- Lines: 9 | Role: styles for the reviewed-attachment viewer dialog | Verdict: MERGE into a shared dialog stylesheet (with selected-document-viewer.css, review.css)
- Importers: mail-attachments.ts:1 (register.ts also matched only by name). Text/path pins: test/browser/summary-source-note.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-9 | C5 (P4) | 8 of 9 rules identical to selected-document-viewer.css apart from prefix (`--attachment-*` vs `--document-*`). | One `.alpha-viewer-dialog` stylesheet; both dialogs mount in .os and use theme vars. | Low; visual specs (inbox-attachment-layout, selected-document-accessibility). |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Deleted; rules live in dialogs.css. Estimated lines after: 0 (current 9).

## Verification
inbox-attachment-layout.spec.ts, attachment-accessibility.spec.ts.
