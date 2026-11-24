# test/browser/helpers/calendar-review.ts
- Lines: 7 | Kind: Playwright UI helper | Verdict: **MERGE** into `harness/nav.ts`
- Covers: performs an action, accepts or cancels the Calendar operation review dialog, and waits for it to close. Duplicates: none. Callers/importers: `browser-reminder-edit-recovery`, `calendar-creation-recovery`, `calendar-edit-draft`, `calendar-form-draft`, `reminder-create-review` specs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | T7 | Locates by CSS (`dialog.alpha-operation-review`, `footer button` `.last()`) rather than role/name; the accept button is "whatever is last". | `getByRole('dialog',{name:…})` and the named confirm button. | Low. |

## Proposed end state
`harness/nav.ts` exports `reviewCalendarAction(action, {accept})` with role-based locators; this file is deleted.
