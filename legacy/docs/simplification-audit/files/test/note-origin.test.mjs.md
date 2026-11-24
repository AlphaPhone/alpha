# test/note-origin.test.mjs
- Lines: 163 | Kind: mostly unit with real imports (`runtime/note-origin.ts`, `prototype/summary-source.ts`, `runtime/maps-event-return.ts`, `runtime/calendar-form-draft.ts`); last test is a transplant (slices `note-origin-adapter.ts` from `/** A canonical Notes record link` and evals it with `new Function`) | Verdict: MERGE tests 1-5 and 7 into `test/integration/notes.test.ts`, test 6 Calendar-draft case into `test/integration/calendar.test.ts`; DELETE test 6 Maps half and test 8
- Covers: a saved reminder/event keeps a back-link to the voice note it came from (id, recording, revision; never the title), the stored index is bounded and refused when malformed, the link fails closed on a deleted/replaced/duplicated note, Calendar drafts carry a valid link, Maps offers "Back to event" only from its originating event, and an edit is detected only when note content changed. Duplicates: `test/browser/maps-event-return.spec.ts`, `maps-event-return-ownership.spec.ts`, `journey-j04-*.spec.ts` (Back to event); `test/browser/note-calendar-handoff.spec.ts`; Quint `refinement/application/maps-event-return.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 136-163 | A1, T2 | Opens an agent note "while Previous notes is selected" (`notesSourceMode:'legacy'`): legacy Notes authority (D1), via a sliced adapter. | Delete with the legacy source mode. | None |
| 2 | 31, 130-133 | A1 | "a title in an older stored link is dropped on read" and "a link made before content revisions hashed the whole record": readers for data that cannot exist (D1). | Delete those assertions and the matching branches in `note-origin.ts`. | Low |
| 3 | 96-119 | T4 | Maps "Back to event" gating duplicated by four browser specs and a Quint refinement. | Delete here. | None |
| 4 | 17-82, 121-129 | B3 | Storage-boundary validation of a persisted index (fail closed, bound, series key). | Keep as integration cases. | None |

## Proposed end state
Notes integration: origin shape and no title, keyed links and no relink, series key, bound and malformed index refused,
resolve fails closed, content-change detection. Calendar integration: draft round-trips a valid origin and refuses
extra fields/title.
