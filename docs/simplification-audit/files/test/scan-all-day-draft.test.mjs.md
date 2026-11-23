# test/scan-all-day-draft.test.mjs
- Lines: 31 | Kind: unit (real imports of `prototype/scan-event.ts` and `runtime/calendar-form-draft.ts`) | Verdict: REWRITE as one case in `journeys/camera-photos.spec.ts` (scan section)
- Covers: an all-day poster suggestion becomes an all-day Calendar draft (never a save); invalid dates/text/repeat are refused; each scan draft has its own `creationId` that survives the retained-form codec. Duplicates: `test/scan-event.test.mjs` (timed drafts); `test/browser/scan-event.spec.ts` (timed scan to Calendar, no all-day case found). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-16 | T3 | Pure draft mapping and validator table. | Journey case for all-day; drop validator table (form validation is visible in the Calendar editor). | Low |
| 2 | 17-31 | T3 | Codec round-trip of `encodeCalendarForm`/`decodeCalendarForm`. | Journey: reload with the draft open keeps it and Save creates one event. | Low |

## Proposed end state
Delete after the scan journey has: scan a poster with only a date → Calendar opens an all-day draft at that date with
the location; reload keeps the draft; one Save creates exactly one event.
