# apps/app/src/browser/reading-review.ts
- Lines: 53 | Role: dialog to review/edit a public page excerpt and read it with local speech | Verdict: SIMPLIFY (MOVE to prototype/ per research §5)
- Importers: 1 (prototype/browser-adapter.ts). Text/path pins: specs/quint/services/manifest.json; refinement services/web-reading-review.mjs; test/browser/reading-review.spec.ts, reading-sensitive.spec.ts, reading-source.spec.ts, remaining-dialog-layout.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14 | C4 (P4) | cssText + theme copy (`--bg,--fg,--s2` + `--line`→`--bd`). | Dialog kit. | Low. |
| 2 | 22 | D12 | Inline button styles. | CSS class. | None. |
| 3 | 31 | B4 | `field.disabled=false;...field.disabled=blocked;` assigns twice in one statement. | Keep the second assignment only. | None. |
| 4 | 3 | D11 | `readPublicPageSource as browserReadingSource` rename alias. | Use upstream name. | None. |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Same flow using the dialog kit; lives next to its only importer in prototype/. Estimated lines after: 45 (current 53).

## Verification
reading-review.spec.ts, reading-sensitive.spec.ts, reading-source.spec.ts, web-reading-review Quint harness (path pin).
