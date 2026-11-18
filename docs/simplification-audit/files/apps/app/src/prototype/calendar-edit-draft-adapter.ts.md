# apps/app/src/prototype/calendar-edit-draft-adapter.ts
- Lines: 60 | Role: Retains an in-progress edit of an existing Calendar item (device calendar or Alpha reminder) as a transactional text draft (`AssistantDraftController` over `assistantDraftStore`, key `['calendar-inline-edit-form', 'development'\|'app']`), re-anchors its day offset at midnight, and adds resume/restore/discard/recover controls to the Calendar view. | Verdict: MERGE into `calendar-form-draft-adapter.ts` (→ one `calendar-drafts.ts`, together with `canonical-calendar-drafts.ts`)
- Importers: 1 — `apps/app/src/main.tsx:18,134` (installed right after the form-draft adapter with an identical `active` predicate). Referenced in a comment of `calendar-form-draft-adapter.ts:13`.
- Text/path pins: `specs/quint/application/manifest.json:6497,6532,6536`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:9,40` (bundles it; installs it without `options`), `test/quint-day-anchor.test.mjs:12` (asserts the source path is in the replay sources), `test/support/feature-parity.mjs:352`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file vs `calendar-form-draft-adapter.ts` | C5 | Line-for-line twin of the creation-draft adapter: same mount (controller with decode-validating `read`/`save`), same update (bind, identity anchor, civil-day shift, encode with validation-error flag, suppression), same `…Committed`, same unmount, same render outputs (`…DraftStatus/Conflict/Error/ListError/SavedTitle`, `resume/restore/replace/retry/recover…`). Only the codec (`encodeCalendarEdit` vs `encodeCalendarForm`), the store key, the identity function, the field-name prefix and two small behaviours differ. | One `installCalendarDraft({key:'calendar-inline-edit-form', codec, identity, prefix:'edit', isActiveForm, decorateRender})` factory used twice. Persisted store keys and outputs stay byte-identical. | Medium: the two installs share `calendarFormCommitted` chaining (#5) and template keys; Quint day-anchor replay pins both files. |
| 2 | 29-30 | C3 | Inline `civil` + shift arithmetic duplicates `calendarFormDayShift` (`calendar-form-draft-adapter.ts:11`). | Use `calendarFormDayShift(anchor,today)` (or the shared `runtime/civil-date.ts`). | None. |
| 3 | 20, 23 | C3 | `open(JSON.stringify(['calendar-inline-edit-form',browserDevProfile?'development':'app']))` written twice (mount and update). | One `bind()` closure. | None. |
| 4 | 49 | D10 | `draft.message==='Draft saved locally.'?'Saved':draft.message.replace('before sending','before saving')` — maps controller prose by string match (same expression in the form-draft adapter:62). | Controller exposes a status id; the calendar owner maps ids to its copy. | Low (copy must stay identical). |
| 5 | 40-41 | D2 | Re-wraps `p.calendarFormCommitted` installed by the form-draft adapter (`if(form?.id)…else creationCommitted?.call(…)`): an install-order dependency between the twins. | Disappears with the merge (one `committed(form)` dispatching by `form.id`). | Low. |
| 6 | 11, 34, 42, 45-46 | B2 | `options.active?.(shell)??true` (both production installs pass `active`), `this.calendarEditDraft?.edit`, `!shell\|\|!controller` after `owner` is known. | Required `active`; direct calls. Quint fixture passes `()=>true`. | Low. |
| 7 | 13, 15-31 | D3/P6 | Module `owner` capture plus 8 shell fields: `calendarEditDraftText`, `calendarEditDraft`, `calendarEditDraftRestore`, `calendarEditDraftAnchor`, `calendarEditDraftIdentity`, `calendarEditDraftBound`, `calendarEditFormValidationError`, `calendarEditDraftSuppressed`, `calendarEditDraftRecovery`. | One `CalendarDraftState` object per draft kind owned by the merged module (`shell.calendarDrafts.edit`). | Low. |
| 8 | 31, 38, 52, 53 | B1 | `catch{…}` around encode/decode turns any exception into "Can't keep edits"/"Unavailable"/"Can't restore". These are specified fallbacks for invalid forms; keep, but catch only codec errors. | Narrow the catch to the codec's error type. | Low. |
| 9 | 16, 30, 53-57 | D8 | 300-560-character lines. | Format after the merge. | None. |
| 10 | 8, 10, 13 | C1 | `type Bag`, `Component:any`, `owner:any`. | Shared types. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 8 | ~45 files | `shell-types.ts` |
| `enabled` | helper | 11 | `calendar-form-draft-adapter.ts:17`, `calendar-adapter.ts:61` | required option |
| `civil` | helper | 29 | 10 copies (see calendar-adapter report) | `runtime/civil-date.ts` |
| store wrapper (decode-validating read/save) | inline helper | 16 | `calendar-form-draft-adapter.ts:22`, `canonical-calendar-drafts.ts` | `calendar-drafts.ts` |
| status copy mapping | inline | 49 | `calendar-form-draft-adapter.ts:62`, `canonical-calendar-drafts.ts` | `calendar-drafts.ts` |
| restore closure | inline | 53 | `calendar-form-draft-adapter.ts:66` | `calendar-drafts.ts` |
| recovery capture | inline | 56 | `calendar-form-draft-adapter.ts:76` | `calendar-drafts.ts` |

## Proposed end state
File deleted; its specifics (codec, key `'calendar-inline-edit-form'`, identity = `calendarEditIdentity(form)`, `reminderEditSchedule` shift, `ev.edit` "Replace edits?" guard, `editDraftAvailable`) become ~20 lines of configuration in `calendar-drafts.ts`. 0 lines here; ≈40 net removed across the pair.

## Verification
`test/browser/calendar-edit-draft.spec.ts` (chromium + firefox/webkit), Quint `day-anchor` (`test/quint-day-anchor.test.mjs` asserts this path is among the replay sources — update the list), calendar fixture bundle, `npm run verify`; Android emulator: edit an Android calendar event, background the app, reopen, restore.
