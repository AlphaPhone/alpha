# apps/app/src/browser/calendar-editor.css
- Lines: 28 | Role: styles for the imperative calendar editor `<dialog>`. | Verdict: SIMPLIFY
- Importers: 1 (`browser/calendar-editor.ts:4`). Text/path pins: `test/support/feature-parity.mjs`; selectors exercised by `test/browser/calendar-accessibility.spec.ts`, `test/browser/review-visual-viewport.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-22 | C4 | `var(--editor-line,#ccc)`, `--editor-bg`, `--editor-s2` … — private token copies that exist only because the dialog is appended to `document.body`, outside `.os` (`calendar-editor.ts:11,48`). | Mount the dialog inside `.os` and use `var(--line)`, `var(--bg)`, `var(--s2)`, `var(--mut)` directly. | Low (visual) |
| 2 | 1-3, 17-22 | C5 | Frame, backdrop, footer, button, disabled and focus rules are near-identical to `calendar-meeting.css` and `calendar-response.css`. | One shared dialog stylesheet (`.alpha-dialog` + modifiers); this file keeps only field/fieldset/checkbox rules. | Low |
| 3 | 20 | C6 | Accent `#0000ff` and focus `#7777ff` hard-coded (also in the two sibling CSS files). | Use the `--acc` token. | Low |

## Local types and helpers
None.

## Proposed end state
~12 lines of editor-specific rules on top of a shared dialog stylesheet.

## Verification
`test/browser/calendar-accessibility.spec.ts`, `test/browser/review-visual-viewport.spec.ts`, `test/browser/dev-calendar-editor.spec.ts`.
