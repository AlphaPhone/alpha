# apps/app/src/prototype/calendar-approval-fields.ts
- Lines: 67 | Role: Pure presenter: validates an agent's Calendar approval payload (network data) and turns it into labelled fields, heading, reason and completeness note for the review dialog. | Verdict: KEEP (minor SIMPLIFY; candidate to MOVE to `runtime/` as pure domain code)
- Importers: 1 — `apps/app/src/prototype/calendar-approval-review.ts:3`. Test: `test/calendar-approval-ui.test.mjs:7` imports it directly.
- Text/path pins: `test/support/feature-parity.mjs:33` (owner mapping to calendar-approval-adapter) and `:347`. No manifest pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | C3 | `const object=(value)=>!!value&&typeof value==='object'&&!Array.isArray(value)` — one of ~14 named copies (`runtime/calendar-approval.ts:34`, `runtime/agent-calendar.ts:25`, `runtime/cloud-protocol.ts:124`, `browser/simulator-recovery.ts:9`, `browser/workflow-history.ts:5`, …). | Import the shared `isRecord` (proposed `runtime/parse.ts`). | None. |
| 2 | 6 | C3 | `text=(v)=>typeof v==='string'` (twin `native-adapter.ts:84`). | Shared `isString` / inline `typeof`. | None. |
| 3 | 8 | C3/NEW (locale) | `localTime` builds its own `Intl.DateTimeFormat` with `localePreferences()`; `locale-time.ts` already has `formatDateTime` (no seconds/zone name). | Add `formatDateTimeWithZone(date,{seconds})` to `locale-time.ts` and use it. | Low (output must stay identical: seconds only when non-zero, short zone name). |
| 4 | 9, 46 | C3 | Civil-date parse/validate (`/^\d{4}-\d{2}-\d{2}$/`, `T12:00:00Z`, round-trip check) duplicates `calendar-form-inputs.ts:7 readDate`. | Shared `parseCivilDate` in `runtime/civil-date.ts`. | Low. |
| 5 | 14 | C6 | RRULE word table (`FREQ:'Frequency'…SU:'Sun'`) — a fourth recurrence vocabulary next to the three repeat→RRULE maps (calendar-adapter:36, agent-calendar-adapter:200, browser/calendar-sync-fields). | Keep here but co-locate with the shared recurrence module (`runtime/calendar-recurrence.ts`). | None. |
| 6 | 65 | B1 | `catch{complete=false;}` — any validation failure marks the review incomplete. This *is* the specified fallback (Approve disabled, explanatory note), so it stays; but it also hides programmer errors. | Keep with a one-line comment; throw a named `ApprovalFieldError` from the validators and rethrow anything else. | Low. |
| 7 | 25, 57 | D8 | 330- and 420-character lines (allowed key lists, guest formatting). | Format; name `ALLOWED_KEYS` per action. | None. |
| — | 27-64 | B3 (not applicable) | The validation is at a real trust boundary: `runtime/calendar-approval.ts:40` only checks action/side/payload shape before this presenter. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CalendarApprovalLabels` | type | 3 | built by `calendar-approval-adapter.ts:27-35` | keep (exported, used by review) |
| `Field` | type | 4 | `{label,value}` rows in other review presenters | keep |
| `object` | helper | 5 | ~14 copies (see #1) | `runtime/parse.ts` `isRecord` |
| `text` | helper | 6 | `native-adapter.ts:84` | shared or inline |
| `instant` | helper | 7 | finite-timestamp checks in `runtime/calendar-approval.ts` | `runtime/parse.ts` |
| `localTime` | helper | 8 | `locale-time.ts formatDateTime` | `locale-time.ts` |
| `dateText` | helper | 9 | `calendar-form-inputs.ts:7 readDate` | `runtime/civil-date.ts` |
| `repeatText` words | const/helper | 11-16 | recurrence maps (calendar-adapter:36, agent-calendar-adapter:200, browser/calendar-sync-fields:4-8) | `runtime/calendar-recurrence.ts` |

## Proposed end state
≈60 lines: shared guards and date helpers imported, named per-action allow-lists, formatted. Optionally moved to `runtime/calendar-approval-fields.ts` next to `calendar-approval.ts` (pure, no DOM).

## Verification
`test/calendar-approval-ui.test.mjs` (imports it directly; keep as an integration-style test or fold into the calendar integration file), `test/browser/calendar-approval-queue.spec.ts`, `npm run verify`.
