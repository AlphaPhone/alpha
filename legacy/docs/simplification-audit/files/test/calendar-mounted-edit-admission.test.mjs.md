# test/calendar-mounted-edit-admission.test.mjs
- Lines: 58 | Kind: e2e inside `node:test` (Chromium via `test/fixtures/calendar-mounted-editor.mjs`; `alpha-back` synthetic events; `window.quintCalendar` snapshot/invoke backdoor) | Verdict: DELETE (T4)
- Covers: Edit on the same or a different event keeps a retained draft ("Draft open") until explicit Resume or Discard. Duplicates: `specs/quint/refinement/application/canonical-calendar-editor-close.mjs` schedule "retained edit blocks same and different event entry until explicit discard" (line 179) and "fresh edit Back returns detail, retained Resume keeps the original target" (line 175), same fixture. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4 | Same behaviour replayed by the Quint refinement harness. | Delete. | None |
| 2 | 12 | T6 | Back is a dispatched `alpha-back` event, not a user gesture. | n/a | - |
| 3 | 6 | T8 | 240 s timeout, Chromium per host test. | Gone. | - |

## Proposed end state
Deleted. The Quint replay is the single coverage; a journey step "Edit another event while a draft is open shows
Resume" can be added to `journeys/calendar.spec.ts` if the owner wants a user-visible check too.
