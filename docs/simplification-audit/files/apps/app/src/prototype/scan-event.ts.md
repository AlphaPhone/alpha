# apps/app/src/prototype/scan-event.ts
- Lines: 19 | Role: Re-exports the shared plugin-files poster/flyer suggestion API and maps a reviewed `ScanEventProposal` onto Alpha's local Calendar form draft (`ScanEventDraft`). | Verdict: MERGE into `apps/app/src/prototype/scan-event-review.ts`
- Importers: `scan-event-review.ts:1` (`scanEventDraft`, `scanAllDayEventDraft`, `suggestScanEventDetails`, types), `scan-review.ts:4` (`type ScanEventDraft`). Tests: `test/scan-event.test.mjs:4`, `test/scan-all-day-draft.test.mjs:2` (real imports).
- Text/path pins: `test/support/feature-parity.mjs:413` (path list). Not in Quint manifests.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4 / A7 | `export {suggestScanEvent,suggestScanEventDetails,type ScanEventContext,…} from '…/plugin-files/src/documents/scan-event.ts'` — `ScanEventContext`: 0 importers; `suggestScanEvent`: only `test/scan-event.test.mjs` (which asserts identity with the shared export — a test of the re-export itself, T5). | Delete the re-export; `scan-event-review` imports `suggestScanEventDetails` and types directly. Drop the "Alpha uses the shared rules, not a copy" identity test or point it at the shared module. | None. |
| 2 | 5-19 | — | `ScanEventDraft`, `calendarDraft`, `scanAllDayEventDraft`, `scanEventDraft` are used only by `scan-event-review.ts` (+ two tests). | Move into `scan-event-review.ts`; tests import from there. | Low. |
| 3 | 5, 8 | C6 | Calendar form shape literal (`{id:null,creationId,separateCreation:false,title,off,t,d,where,notes,cal:'native:local',who:[],repeat,alert:null,video:false}`) — the same form object is built in `reminder-adapter.ts:22` (`cal:'alpha-reminders'`) and calendar draft adapters. | Later: one `CalendarFormDraft` type + `blankCalendarForm(overrides)` in the Calendar view module. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ScanEventDraft` | type | 5 | calendar form shape in `reminder-adapter.ts:22`, calendar draft adapters | `scan-event-review.ts` now; Calendar `CalendarFormDraft` later |
| `calendarDraft` | helper | 7-12 | — | `scan-event-review.ts` |

## Proposed end state
File deleted; its 12 functional lines live in `scan-event-review.ts`. Update `test/scan-event.test.mjs`, `test/scan-all-day-draft.test.mjs`, `scan-review.ts:4` and `test/support/feature-parity.mjs:413`.

## Verification
`node --test test/scan-event.test.mjs test/scan-all-day-draft.test.mjs test/feature-parity*.test.mjs`; `npm run test:browser -- scan-event`.
