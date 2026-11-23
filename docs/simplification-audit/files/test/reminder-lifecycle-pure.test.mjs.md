# test/reminder-lifecycle-pure.test.mjs
- Lines: 62 | Kind: transplant (T2) + unit | Verdict: DELETE; move the Clock repeat-days case to `test/integration/calendar.test.ts`
- Covers: Reminder refusal messages, overdue and undated to-do lists, reminder events per time zone; Clock repeat-day validation. Duplicates: File comment says storage/scheduling/reopen cases are in `test/browser/reminder-lifecycle.spec.ts`; `clock-repeat.production.spec.ts` covers repeat days in the UI. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-21 | T2/D7 | Cuts `runtime/reminder-creations.ts` at the `// ---- Reminder presentation` marker comment and vm-runs the rest with shared helpers injected. | Delete. Export the presentation functions (or a `reminder-presentation.ts` module) and keep the time-zone case in integration only if no journey shows it. | Low |
| 2 | 44-52 | keep | Imports real `clock-contract.ts`. | Move to the calendar integration file. | Low |
| 3 | 23-29 | T1-ish | Copy assertions on refusal messages. | Drop; journeys assert visible copy. | Low |

## Proposed end state
- Removed; one Clock validation case survives in integration.
