# apps/app/src/prototype/calendar-form-draft-adapter.ts
- Lines: 80 | Role: Retains an in-progress *creation* form (new event or reminder) as a transactional text draft (store key `['calendar-creation-form','development'\|'app']`), re-anchors day offsets of all open forms when the date changes, and adds resume/restore/discard/recover controls; exports `calendarFormDayShift` and `calendarFormRetained`. | Verdict: SIMPLIFY + MERGE (becomes `calendar-drafts.ts`, absorbing `calendar-edit-draft-adapter.ts`, later `canonical-calendar-drafts.ts`)
- Importers: `apps/app/src/main.tsx:19,133` (only app importer; `scan-event.ts:4` mentions the file in a comment); `specs/quint/refinement/application/calendar-adapter-fixture.mjs:8` (`installCalendarFormDraftAdapter`, `calendarFormRetained`), `specs/quint/refinement/application/day-anchor.mjs` (`calendarFormRetained`).
- Text/path pins: `specs/quint/application/manifest.json:6496,6512-6528` (6 pins), `specs/quint/application/README.md` (`calendarFormDayShift`), `test/calendar-view-rules.test.mjs:31` (T2 loader of this source; asserts on `calendarFormDayShift`/`calendarFormRetained`), `test/quint-day-anchor.test.mjs:11`, `test/support/feature-parity.mjs:353`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file vs `calendar-edit-draft-adapter.ts` (and `canonical-calendar-drafts.ts`) | C5 | Twin adapters (see the edit-draft report #1); `main.tsx:133-134` installs both with identical `active` predicates. | One parameterised `installCalendarDraft` factory; this file becomes `calendar-drafts.ts`. | Medium (see edit report). |
| 2 | 41-43 | C3 | The file defines `calendarFormDayShift` (11) and then re-implements it inline (`const civil=…;if(civil(today)!==civil(anchor)){…off:form.off+(civil(anchor)-civil(today))/86400000}`). | `const shift=calendarFormDayShift(anchor,today);if(shift){…}`. | None. |
| 3 | 11, 42 | C3 | Two `civil` helpers in one file; 10 copies repo-wide. | `runtime/civil-date.ts`. | None. |
| 4 | 26, 29 | C3 | `open(JSON.stringify(['calendar-creation-form',browserDevProfile?'development':'app']))` twice. | One `bind()`. | None. |
| 5 | 60 | A7 | `out.formDraftAvailable=false;` — constant; dc-lite treats a missing value as false and `canonical-calendar-drafts.ts:128` sets the real value when it is active. Comment 59 explains the product rule ("New event reopens this retained form"). | Delete the assignment, keep the rule in the comment on `newEvent` (77). | None. |
| 6 | 62 | D10 | Controller prose mapped by string comparison (`'Draft saved locally.'`, `.replace('before sending','before saving')`). | Status id from the controller. | Low. |
| 7 | 17, 47, 56-57 | B2 | `options.active?.(shell)??true`; `if(!form\|\|form.id\|\|!this.calendarDraft)`; `!shell\|\|!controller` after owner exists. | Required `active`; trust own fields. | Low. |
| 8 | 19-21, 30-38 | D3/P6 | Module `owner` and 9 shell fields (`calendarDraftText`, `calendarDraft`, `calendarDraftRestore`, `calendarDraftAnchor`, `calendarDraftIdentity`, `calendarDraftBound`, `calendarFormValidationError`, `calendarDraftSuppressed`, `calendarDraftRecovery`, `calendarPlainFormAnchor`). | `CalendarDraftState` per kind in the merged module. | Low. |
| 9 | 14 | D9 | `calendarFormRetained` is a 4-way boolean expression mixing canonical/edit/creation rules in one line. | Split into named predicates (`isCanonicalDraft`, `isRetainedEdit`, `isRetainedCreation`). Quint `day-anchor` imports it — keep the export name. | Low. |
| 10 | 44, 49-51, 65-66 | B1 | Codec `catch{}` blocks as in the edit adapter. | Narrow to codec errors. | Low. |
| 11 | 22, 24, 44, 66, 76 | D8 | 300-540-character lines. | Format. | None. |
| 12 | 8, 16, 19 | C1 | `type Bag`, `any`. | Shared types. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `calendarFormDayShift` | helper (exported) | 11 | inline copies `:42-43`, `calendar-edit-draft-adapter.ts:29-30`, `canonical-calendar-drafts.ts:84` | `calendar-drafts.ts` (or `runtime/civil-date.ts`) |
| `calendarFormRetained` | helper (exported) | 14 | none (used by Quint `day-anchor`, `scan-event.ts`) | `calendar-drafts.ts` |
| `Bag` | type | 8 | ~45 files | `shell-types.ts` |
| `enabled` | helper | 17 | edit-draft:11, calendar-adapter:61 | required option |
| store wrapper / restore / recover / status mapping | inline | 22, 62, 66, 76 | edit-draft twins | `calendar-drafts.ts` |

## Proposed end state
`calendar-drafts.ts` ≈95 lines: exported `calendarFormDayShift`, `calendarFormRetained`, one `installCalendarDraft(config)` and two configurations (creation: key `'calendar-creation-form'`, identity `form.creationId`, plain-form anchoring, `newEvent` reopen, `canDiscardFormDraft`; edit: key `'calendar-inline-edit-form'`, identity `calendarEditIdentity`, `reminderEditSchedule` shift, `ev.edit` replace guard). Replaces 80 + 60 = 140 lines (≈45 removable). Keeping all output keys and copy identical.

## Verification
`test/browser/calendar-form-draft.spec.ts` and `calendar-edit-draft.spec.ts` (chromium + firefox/webkit), Quint application `day-anchor` and calendar fixture bundle (update `calendar-adapter-fixture.mjs` exports and `test/quint-day-anchor.test.mjs` source list), `test/calendar-view-rules.test.mjs` (T2; delete or port), `npm run verify`; Android emulator: create, background, midnight rollover, restore.
