# specs/quint/application/CalendarFormControls.qnt
- Lines: 55 | Kind: Quint model (live, 4 runs) | Verdict: PORT harness (owner question: retire as a unit-test-shaped model)
- Covers: pure Calendar form controls: the 21-day chip window always contains today and the chosen day, start time clamps to 0..1439 in 15-minute steps, end edits keep a positive duration, month grid uses 35 or 42 cells. Duplicates: `prototype/calendar-form-inputs.ts` conversions are imported and exercised by the same harness; Playwright Calendar specs edit the form visibly. Callers/importers: manifest (sources `prototype/model.js`, `prototype/calendar-form-inputs.ts`, `prototype/template.html`); harness `calendar-form-controls.mjs` (96 lines) runs **only** via the application aggregate (index.mjs:3); no per-model wrapper.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness:13-31 | T10 | Slices `prototype/model.js` with `between()` at `'      var dayChips = [];'`…`'      var chosen ='`, `'      var inputChange='`…`'      var dayChips = [];'`, `'    // month panel'`…`'    var calRows ='`, and regex-extracts the `sPlus|sMinus|ePlus|eMinus: function () { fp({ … }); }` handlers, then `new Function` evaluates them. Breaks on any reformat (D9) or `model.js` split (D1). | Move the four pieces into `prototype/calendar-form-inputs.ts` (already the pure home for this form): `calendarDayChips(off, now)`, `calendarFormStep(form, kind)`, `calendarMonthCells(date)`, and `inputChange` already maps to `calendarFormInputPatch`. `model.js` calls them; the harness imports them. | Low |
| 2 | 23 | — | `retiredStart = s' = s` is a stutter labelled as an action. | Delete with its run assertion (it asserts nothing changes). | None |
| 3 | whole | T3 | It is arithmetic on four pure functions; a Quint model adds little over an integration assertion. | Owner question: after the port, replace the model with assertions in the Calendar integration/journey test and delete it. Until decided, KEEP (D11). | — |
| 4 | — | coverage | Only run through the aggregate; if aggregates are removed (T4), add a per-model wrapper. | Add `test/quint-calendar-form-controls.test.mjs` or fold into the area lane. | None |

## Proposed end state
Harness imports pure exported functions from `calendar-form-inputs.ts`; no `model.js`/`template.html` sources; model without the stutter action. Candidate for retirement into a Calendar journey test.
