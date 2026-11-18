# test/notes-recorder-media-admission.test.mjs
- Lines: 8 | Kind: Quint refinement wrapper (calls `checkNotesRecorderMediaAdmission` from `specs/quint/refinement/application/notes-recorder-media-admission.mjs`) | Verdict: DELETE
- Covers: mounted Notes recorder media admission refines `NotesRecorderMediaAdmission` (5 traces). Duplicates: the same driver is registered in `specs/quint/refinement/application/index.mjs:31,125` and runs again in the aggregate `test/quint-application-refinement.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | T4, P3 | Second execution of a refinement the aggregate runner already runs; driver starts a real browser page (`startMountedCalendar`) so each run is expensive (240 s timeout). | Delete; keep the aggregate/manifest-driven runner. | None |
| 2 | 7 | B5 | `assert.equal(receipt.traces, 5)` exact-count ceremony. | Gone with the file. | None |

## Proposed end state
Deleted. The model stays live through the application refinement runner (and the harness's text slicing is ported per the formal chunk).
