# apps/app/src/runtime/calendar-edit-draft.ts
- Lines: 31 | Role: codec for a saved in-progress *edit* of a device-calendar event or Alpha reminder (`{version:1,id,editable,target}`) | Verdict: MERGE into `apps/app/src/runtime/calendar-form-draft.ts` (one calendar draft codec module)
- Importers: prototype/calendar-edit-draft-adapter.ts only (installed in main.tsx:134). Text/path pins: `scripts/storage-specs.ts`, quint `calendar-adapter-fixture.mjs`, `test/quint-day-anchor.test.mjs`, application manifest sources, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6 | C5/C1 | `type Form=Record<string,any>`, `fail()`, `text()`, `only()` re-declared; calendar-form-draft.ts has its own `Form` and `fail` (different message) and canonical-calendar-draft.ts its own `Bag`. | Merge the three codecs in one module sharing `Form`, `fail(message)`, `only`, `MAX_DRAFT_BYTES = 64000`. Persisted formats unchanged. | Low. |
| 2 | 16 | C3 | `new TextEncoder().encode(raw).length>64000` — also canonical-calendar-draft.ts:11 and calendar-form-draft.ts:22. | One `withinDraftLimit(raw)`. | None. |
| 3 | 10-13, 20-28 | owner | Targets are `native:` device-calendar events and `alpha-reminders`; the device-calendar edit path lives in prototype/calendar-adapter.ts (L76, 374) beside the canonical agent calendar. | Owner question: is the device-calendar edit surface still a product surface (research: legacy calendar authority A1)? If not, this codec goes with it. | Medium. |
| 4 | 11, 27 | D8 | 380-char lines. | Format. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Form` | type | 3 | calendar-form-draft.ts:2, canonical-calendar-draft.ts:2 `Bag` | merged codec module |
| `fail` | helper | 4 | calendar-form-draft.ts:9 | merged (message parameter) |
| `text`, `only` | helper | 5-6 | `only` pattern in canonical-calendar-draft.ts:13 | merged |

## Proposed end state
File removed; its ~25 lines of edit-specific logic live in the merged `calendar-draft-codec.ts`.

## Verification
`test/quint-day-anchor.test.mjs`, `scripts/storage-specs.ts` storage specs, calendar edit Playwright specs; persisted draft JSON must round-trip byte-identically.
