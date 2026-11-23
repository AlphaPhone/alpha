# test/browser-calendar-series.test.mjs
- Lines: 52 (55 at HEAD; a concurrent edit removed the `syncRecurrence` assertions when `calendar-sync-fields.ts` was deleted) | Kind: integration (real `BrowserCalendar` and `calendar-store` bundled by `test/fixtures/browser-daily-stores.mjs`, with only device edges stubbed: documents port, review dialog, editor, notifications) | Verdict: MERGE into `test/integration/browser-daily.test.mjs`
- Covers: two occurrence deletions in one weekly series both settle whichever Undo window expires first; a pending occurrence deletion blocks editing that series; changing a weekly series with an edited occurrence to Once keeps the moved occurrence as its own event. Duplicates: partly `test/browser/dev-calendar-series.spec.ts` (6 tests: create/edit/delete one occurrence, whole-series move keeps exclusions), which drives the same store through the UI but not the two-timer settle race. Callers/importers: `npm test`. Passes now (3/3, about 5.7 s, mostly the esbuild bundle in the fixture).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T8 | `t.mock.method(performance,'now',...)` drives the Undo window: a deterministic clock, good. | Keep. | — |
| 2 | 15-30 | — | The settle-order race is the case the Playwright spec cannot reach deterministically. | Carry. | — |
| 3 | 32-55 | T4 | Cases 2-3 overlap `dev-calendar-series.spec.ts` "series review detects concurrent occurrence edits" and "moving the whole series keeps deleted dates excluded". | Keep case 2 (one assertion); drop case 3 if the journey asserts the moved occurrence survives a change to Once; otherwise carry it. | Low |
| 4 | fixture | — | `browser-daily-stores.mjs` has 6 importers (this, `browser-clock`, and four others); it bundles real `apps/app/src/browser/*` modules once per process. It survives. | Keep as `test/support/browser-daily.mjs`. | — |

## Proposed end state
`test/integration/browser-daily.test.mjs` holds the Calendar series and Clock cases on one bundled fixture (one esbuild per process instead of one per file).
