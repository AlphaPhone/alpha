# apps/app/src/browser/scan-draft.ts
- Lines: 3 | Role: binds upstream scan-draft store to Alpha key alpha.browser.scan-draft.v1 | Verdict: KEEP
- Importers: 2 (prototype/scan-document.ts, prototype/scan-searchable-review.ts). Text/path pins: specs/quint/services/manifest.json; refinement services/scan.mjs, scan-source-conformance.mjs; test/scan-document-drafts.test.mjs, scan-review-pdf-errors.test.mjs (reads source); 4 scan specs; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | D4 | Re-export of `copyScanTextLayers` from upstream. | Importers take it from upstream directly. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
2 lines: store bound to the Alpha key. Estimated lines after: 2 (current 3).

## Verification
scan-draft.spec.ts, scan Quint harness.
