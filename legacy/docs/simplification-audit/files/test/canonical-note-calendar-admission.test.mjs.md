# test/canonical-note-calendar-admission.test.mjs
- Lines: 19 | Kind: transplant (slices `scheduleDraft` from `canonical-notes-ui.ts` between `' private async scheduleDraft('` and `' /** Speech recognition'`, strips types, runs it in `new Function` with a stubbed `noteScheduleDraft`) | Verdict: DELETE; carry 2 cases to `journeys/notes.spec.ts`
- Covers: "Make event" from a note goes through Calendar review (never opens the form directly) and keeps the note origin; "Make reminder" opens the reminders form; a retired controller starts neither. Duplicates: `test/quint-canonical-calendar-draft-handoff.test.mjs` (handoff admission and origin) covers the event path. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-6 | T2 | Text-marker slice of a class method plus a doc-comment end marker; any comment edit breaks it. | Delete. | None |
| 2 | 10 | A1 | Stub returns `calendarAuthority:'canonical'`; the legacy authority branch is being deleted (D1), so the guard it implies is moot. | - | None |
| 3 | 7-18 | T3 | The behaviour (event -> review with origin, reminder -> form with `cal:'alpha-reminders'`) is user-visible and worth one journey each. | `journeys/notes.spec.ts`: "Make event from note opens Calendar review with the note linked"; "Make reminder from note opens the reminder form". | Low |

## Proposed end state
Deleted. Two Notes journey steps carry the user-visible handoffs; owner-change fencing stays with the Quint
draft-handoff refinement.
