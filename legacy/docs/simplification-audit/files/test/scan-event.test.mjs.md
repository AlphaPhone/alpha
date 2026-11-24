# test/scan-event.test.mjs
- Lines: 28 | Kind: unit (real imports of `prototype/scan-event.ts` and upstream `plugin-files/documents/scan-event.ts`) | Verdict: DELETE
- Covers: Alpha re-exports the shared poster rules; reviewed timed drafts keep the civil date; invalid fields are refused; all-day needs a start time; repeat only when confirmed. Duplicates: `test/browser/scan-event.spec.ts` (scan → Calendar draft); upstream scan-event tests (file comment 2-3). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | T1/T5 | Identity check that a re-export is the upstream function, plus one upstream rule. | Delete. | Low |
| 2 | 12-28 | T3/T4 | Validator table for a mapping the browser spec drives. | Delete. | Low |

## Proposed end state
File deleted. Month/year boundary date handling: add to `journeys/camera-photos.spec.ts` only if `scan-event.spec.ts`
does not carry a boundary date.
