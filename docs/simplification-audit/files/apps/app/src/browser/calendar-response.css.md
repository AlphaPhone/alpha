# apps/app/src/browser/calendar-response.css
- Lines: 11 | Role: styles for the local guest-response `<dialog>`. | Verdict: MERGE into a shared dialog stylesheet (with `calendar-meeting.css`)
- Importers: 1 (`browser/calendar-response.ts:1`). Text/path pins: `test/browser/calendar-accessibility.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-11 | C5 | Near-copy of `calendar-meeting.css` (frame, backdrop, content, h2, footer, button, disabled, focus) with `--response-*` instead of `--meeting-*`. | Shared `.alpha-dialog` stylesheet; keep only the `select` rule. | Low |
| 2 | 1, 6-8 | C4 | `--response-*` tokens copied by `calendar-response.ts:6` because the dialog is body-mounted. | Mount in `.os`, use `--line/--bg/--fg/--s2`. | Low |
| 3 | 9 | C6 | `#0000ff`, `#7777ff` literals. | `--acc`. | Low |

## Local types and helpers
None.

## Proposed end state
File removed; one `select` rule moves to the shared stylesheet.

## Verification
`test/browser/dev-calendar-response.spec.ts`, `calendar-accessibility.spec.ts`.
