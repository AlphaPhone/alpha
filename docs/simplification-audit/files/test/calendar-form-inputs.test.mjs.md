# test/calendar-form-inputs.test.mjs
- Lines: 36 | Kind: unit (esbuild CJS bundle of real `prototype/calendar-form-inputs.ts`, `runtime/calendar-form-draft.ts`, `runtime/canonical-calendar-draft.ts`, `calendarIntervalDetail`) | Verdict: MERGE into `test/integration/calendar.test.ts` (2 cases); rest DELETE
- Covers: Calendar form civil dates/minutes round-trip (leap day, multi-day end), next-hour default, guest email literalness, canonical draft encode/decode keeps exact minutes and the guests-reviewed flag, detail labels a changed UTC offset. Duplicates: `test/browser/calendar-form-controls.spec.ts`, `calendar-form-draft.spec.ts`, `calendar-edit-draft.spec.ts`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | D7 | esbuild bundle evaluated via `new Function('module','exports',…)`. | Shared integration loader. | None |
| 2 | 7-14 | T3 | Leap-day and multi-day round trip, invalid inputs refused: real risk. | Carry. | None |
| 3 | 15-19 | T3/T4 | Default next full hour: visible in the form spec. | Drop (journey shows default start). | Low |
| 4 | 20-23 | T3 | Guest email parsing table. | Drop; the form spec types a guest. | Low |
| 5 | 24-29 | A1 | Line 28 decodes a stored draft without `guestsReviewed` (older draft shape); the decoder still accepts it (`canonical-calendar-draft.ts:13`). Package starts with empty data (D1). | Drop the case and the optional-key branch in the decoder (owner of C2 change). | Low |
| 6 | 30-36 | T3 | Offset label across DST via `process.env.TZ`. | Carry into the DST section with the review-text cases. | None |

## Proposed end state
Two cases in calendar integration (form round-trip across leap day/multi-day; detail labels offset change). The
legacy draft shape is removed together with its decoder branch.
