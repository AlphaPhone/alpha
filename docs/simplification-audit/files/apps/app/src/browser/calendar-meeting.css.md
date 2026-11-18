# apps/app/src/browser/calendar-meeting.css
- Lines: 11 | Role: styles for the local meeting-room preview `<dialog>`. | Verdict: MERGE into a shared dialog stylesheet (with `calendar-response.css`, frame rules of `calendar-editor.css`)
- Importers: 1 (`browser/calendar-meeting.ts:1`). Text/path pins: `test/browser/calendar-accessibility.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | C5 | 9 of 11 rules equal `calendar-response.css` with `meeting`↔`response` renamed (frame, `[open]`, backdrop, content, h2, footer, button, disabled, focus). | One `.alpha-dialog` stylesheet with a width modifier; keep only `.alpha-meeting-controls`. | Low |
| 2 | 1, 7-8 | C4 | `var(--meeting-line,#ccc)` etc. — token copies made by `calendar-meeting.ts:6` because the dialog is body-mounted. | Mount in `.os`, use `--line/--bg/--fg/--s2`. | Low |
| 3 | 9, 11 | C6 | `#0000ff` / `#7777ff` literals. | `--acc` token. | Low |

## Local types and helpers
None.

## Proposed end state
File removed; 1-2 meeting-specific rules move into the shared dialog stylesheet.

## Verification
`test/browser/dev-calendar-meeting.spec.ts`, `dev-calendar-meeting-lifecycle.spec.ts`, `calendar-accessibility.spec.ts`.
