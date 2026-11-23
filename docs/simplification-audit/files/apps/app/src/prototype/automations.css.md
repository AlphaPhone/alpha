# apps/app/src/prototype/automations.css
- Lines: 130 | Role: Styles for the Workflows list, automation detail/editor, run details, filter sheet, schedule clock editor. | Verdict: SIMPLIFY
- Importers: 1 — `apps/app/src/prototype/automations-adapter.ts:15` (`import './automations.css'`). Classes are used by `template.html` (Workflows section ~3541-3770) and `workflow-filters.ts`; every class selector in the file has at least one user (word-grep over `*.html/*.ts/*.tsx/*.js`).
- Text/path pins: `test/fixtures/scheduled-task-controls.mjs` (reads class names), `specs/quint/ui-return-review-20261109.md` (doc). No manifest pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 29, 32, 45, 82, 87, 105, 130 | C6/D12 | Eight separate `:focus-visible` rules with three different tokens and offsets: `var(--acc)` offset -2/3px, `var(--acct)` offset 2/3px, `var(--fg)` offset 2/3px. `--acct` equals `--acc` in `prototype.css:3` but maps to `linkColor` in `product/alpha-product-registration.ts:58`. | One focus rule for the Workflows surface (`.workflow-list :focus-visible, .automation-detail :focus-visible, .workflow-filter-sheet :focus-visible{outline:2px solid var(--acc);outline-offset:3px}`), keeping the inset `-2px` only for `.workflow-row-open`. | Visual: ring colour/offset changes slightly on some controls; check screenshots. |
| 2 | 22, 27, 99 | C3 | Three near-identical text-field blocks (`box-sizing;min-height:48px;padding:12px 14px;border:1px solid var(--line);border-radius:12px\|14px;background:var(--s1)\|var(--s2);…font-size:16px`). | One `.automation-input` class (or grouped selector) with the two real differences as modifiers. | Low (radius 12 vs 14, s1 vs s2 must be kept or consciously unified). |
| 3 | 73, 78 | D12 | `width:18px!important;height:18px!important` on `[data-alpha-icon]` fights inline icon styles from the template engine. | Remove once icons are sized by class (P16 / D12 work); until then keep. | Low. |
| 4 | 54-57 | D12 | One-property rules split by blank lines (`.workflow-run-title{overflow-wrap:anywhere}`, `.workflow-run-summary{flex-wrap:wrap}`, `.workflow-run-actions{flex-wrap:wrap}`) patching template inline `style="display:flex…"` on the same elements (`template.html:3713,3768`). | Move the whole layout of those elements into these classes and drop the inline styles, or merge the three rules into one grouped rule. | Low. |
| 5 | 36-37, 59, 85, 111 | A8 | Comments narrate history/plan names: `(#701)`, `Workflows A: one quiet filter… Existing detail/editor styles stay above.`, `Simple automation authoring uses the existing Alpha type…`. | Keep the one-line *why* of `flex-shrink:0` (without `#701`); delete the plan-name comments. | None. |
| 6 | 60-83 | D11 | The filter-sheet block styles the `<dialog>` built by `workflow-filters.ts`, not the automations adapter. | Move to a `workflow-filters.css` imported by `workflow-filters.ts` (or keep, once Workflows has one owner folder). | None. |
| 7 | 66 | B4/C4 | `background:var(--bg,#fff);color:var(--fg,#111)` fallbacks. The sheet is appended to `document.body` (`workflow-filters.ts:37`), outside `.os`, and `workflow-filters.ts:14` copies `bg,fg,mut,line,s2,acc,acct` from `.os` onto the dialog — the same theme-token copy as the review dialogs (P12). The fallbacks only matter when `.os` is absent, which cannot happen while Workflows is open. | Drop the fallbacks; longer term define the tokens on `:root`/`html` (or a shared `.alpha-theme` class) so no dialog copies tokens by hand. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| focus ring rule | CSS rule | 9, 29, 32, 45, 82, 87, 105, 130 | `phone.css` focus rules, `scan-dialog.css` | one shared focus rule per surface |
| text-field block | CSS rule | 22, 27, 99 | `.note-source-dialog` inputs in `phone.css` | `.automation-input` here |

## Proposed end state
One focus rule, one text-field rule, no plan-name comments, filter-sheet block moved next to `workflow-filters.ts`. ~110 lines (≈20 removable). Formatting (one declaration per line) is a separate D9 Prettier commit and will increase the line count.

## Verification
Visual comparison of the Workflows list, detail, editor, schedule clock and filter sheet in light and dark (`test/browser/unified-automations.spec.ts`, workflows specs, accessibility sweep focus checks), `npm run test:browser` and production variant; `test/fixtures/scheduled-task-controls.mjs` if it greps class names.
