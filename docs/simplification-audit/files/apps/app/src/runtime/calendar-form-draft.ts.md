# apps/app/src/runtime/calendar-form-draft.ts
- Lines: 48 | Role: codec for saved new-event Calendar forms (`{version:1,date,zone,form}`), shared field snapshot, and the start/end time problem copy | Verdict: SIMPLIFY and absorb `calendar-edit-draft.ts` + `canonical-calendar-draft.ts` (rename `calendar-draft-codec.ts`)
- Importers: prototype/calendar-adapter.ts (`calendarFormTimeProblem`), prototype/calendar-form-draft-adapter.ts, prototype/canonical-calendar-drafts.ts, runtime/calendar-edit-draft.ts, runtime/canonical-calendar-draft.ts. Text/path pins: `scripts/storage-specs.ts`, quint `calendar-adapter-fixture.mjs`, `refinement/application/contracts.mjs`, application manifest sources (1012, 2498); tests `calendar-end-after-start`, `calendar-form-inputs`, `calendar-view-rules`, `note-origin`, `quint-day-anchor`, `scan-all-day-draft`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12, 20 | C3 | Time-zone validity check `try{new Intl.DateTimeFormat('en',{timeZone})}catch{fail();}` written twice in `validate`. | `validZone(zone)` helper. | None. |
| 2 | 28, 33 | C3 | `new Date(day(anchor)+form.off*86400000).toISOString().slice(0,10)` and the zone lookup duplicated in `encodeCalendarForm` and `calendarEditFields`. | `draftDate(anchor, off)` + one payload builder taking a field filter. | None. |
| 3 | 2 | C1 | `type Form=Record<string,any>` (Bag twin; also calendar-edit-draft.ts:3, canonical-calendar-draft.ts:2). | One shared form type for the merged module. | Low. |
| 4 | 9, 22 | C5 | `fail()` and the 64000-byte limit duplicated across the three sibling codecs. | Shared in the merged module. | None. |
| 5 | 11, 15-16 | D8/B3 (keep) | 300-char validators of persisted drafts (storage boundary). | Keep, split by field group. | None. |
| 6 | 44-48 | D11 | `calendarFormTimeProblem` is UI copy logic, not a codec. | Move to prototype/calendar-adapter.ts (its only app caller) or a calendar copy module. | Low (4 tests import it from here). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `fields` | const | 5 | none | merged codec |
| `day` | helper | 8 | agent-calendar-view.ts:6 `civil` | calendar-dates.ts |
| `fail` | helper | 9 | calendar-edit-draft.ts:4 | merged codec |
| `Form` | type | 2 | calendar-edit-draft.ts:3, canonical-calendar-draft.ts:2 | merged codec |

## Proposed end state
`calendar-draft-codec.ts` ≈ 90 lines holding the create, edit and canonical draft codecs (today 48+31+20 = 99 dense lines) with one `Form` type, one `fail`, one size limit, one zone check and one date builder. All three persisted JSON shapes unchanged.

## Verification
`test/calendar-form-inputs.test.mjs`, `test/calendar-end-after-start.test.mjs`, `test/quint-day-anchor.test.mjs`, `test/scan-all-day-draft.test.mjs`, `test/canonical-calendar-draft-ownership.test.mjs`, `test/quint-canonical-calendar-draft*.test.mjs`, `test/browser/calendar-form-draft.spec.ts`; update manifests/feature-parity for the renamed path.
