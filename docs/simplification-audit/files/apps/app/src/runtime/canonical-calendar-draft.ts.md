# apps/app/src/runtime/canonical-calendar-draft.ts
- Lines: 20 | Role: codec for saved canonical (agent) Calendar editor drafts: wraps the form codec payload with owner, operation key, event key, provider version, timing, all-day and recurrence scope | Verdict: MERGE into `apps/app/src/runtime/calendar-form-draft.ts` (merged calendar draft codec)
- Importers: prototype/canonical-calendar-drafts.ts only. Text/path pins: quint `canonical-calendar-draft.mjs/.md`, `canonical-calendar-draft-handoff.mjs/.md`, `canonical-calendar-editor-close.mjs`, `refinement/application/index.mjs`, `refinement/legacy/calendar-navigation.mjs`; application and services manifest sources; `test/canonical-calendar-draft-ownership.test.mjs`, `test/quint-canonical-calendar-draft*.test.mjs`, `test/calendar-form-inputs.test.mjs`, fixtures `calendar-mounted-editor.mjs`, `canonical-calendar-draft-owner.mjs`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 10 | C1 | `type Bag=Record<string,any>` and return type `Record<string,any>`. | Shared form type of the merged codec. | None. |
| 2 | 11 | C3 | 64000-byte limit again (also calendar-edit-draft.ts:16, calendar-form-draft.ts:22). | Shared constant/helper. | None. |
| 3 | 12-13 | D8/B3 (keep) | 520-char key-set/type validator for a persisted draft (storage boundary). | Keep; express as `only(value, keys, optional)` shared with calendar-edit-draft's `only`. | None. |
| 4 | 7-8 | B3 | `encodeCanonicalCalendarDraft` decodes what it just encoded (`decodeCanonicalCalendarDraft(raw,anchor)`) as a self-check; calendar-edit-draft.ts:13 does the same. | Keep only if the decode is the specified "never persist what cannot be restored" rule (comment says so in the edit codec); otherwise drop. Owner/author check. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 2 | `Form` in two sibling codecs; 60 `Bag`s app-wide | merged codec form type |
| key list | const | 12 | `only()` key lists in calendar-edit-draft.ts | merged codec |

## Proposed end state
File removed; ~18 lines inside `calendar-draft-codec.ts`, persisted shape `{version:1,owner,key,id,event,providerVersion,timing,allDay,allDayRange,recurrenceScope,payload,guestsReviewed?}` unchanged.

## Verification
`test/quint-canonical-calendar-draft.test.mjs`, `test/quint-canonical-calendar-draft-handoff.test.mjs`, `test/canonical-calendar-draft-ownership.test.mjs`, `test/calendar-form-inputs.test.mjs`; update quint manifest source paths.
