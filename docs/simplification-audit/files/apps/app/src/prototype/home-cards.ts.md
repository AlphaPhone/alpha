# apps/app/src/prototype/home-cards.ts
- Lines: 161 | Role: Binds the upstream daily-overview presenters (`upstream renderer: overview/daily-overview.ts`) to Alpha's locale formatting, re-exports them under `Home*` names, and adds Home agenda candidate selection (`createHomeAgenda`), agent-calendar agenda helpers and a storage-access probe. | Verdict: SIMPLIFY + MOVE (to `apps/app/src/home/` or `runtime/`)
- Importers: `data-adapter.ts:7`, `agent-calendar-adapter.ts`, `automations-adapter.ts`, `inbox-cloud-adapter.ts`, `workflow-adapter.ts`, `home-overview-cards.ts` (comment), `scripts/test-inbox-cloud-flow.ts:8`.
  Text/path pins: `specs/quint/application/manifest.json:569,612,8252-8269` (HomeSurface.qnt pins `createHomeAgenda`, `homeAgendaCandidates`, `createStorageAccessCheck`, `selectHomeAgenda` in this path); `specs/quint/application/README.md`; `specs/quint/refinement/services/automation-request-settlement.mjs`; `test/home-cards.test.mjs` (imports + regex on neighbours), `test/home-overview-cards.test.mjs`, `test/home-views-model.test.mjs`, `test/quint-home-surface.test.mjs`, `test/automations-unified.test.mjs`, `test/fixtures/scheduled-task-controls.mjs`; `test/browser/home-daily-overview.spec.ts:133,349,387` (`page.evaluate` imports `/src/prototype/home-cards.ts` for `overdueDueLabel`/`whenLabel` — path pinned, T6); `android/.../HomeCalendarCardInstrumentedTest.java:78` (comment); `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-49, 56, 61, 65, 158, 160-161 | A7 | Re-exports with no product importer (whole-repo grep): `CalendarCardState`, `HomeAgenda` (0 hits), `briefOutcome`, `presentHomeNext`, `homeAgendaHeader`, `calendarCardState`, `presentHomeCalendar`, `attendeeInitials` (only `test/home-cards.test.mjs`, which thereby tests upstream logic — T5) | Delete the eight aliases and the matching cases in `test/home-cards.test.mjs` | None |
| 2 | 50, 53, 67, 69 | D7 | `selectHomeAgenda` (only Quint manifest/test), `overdueDueLabel` (only `test/browser/home-daily-overview.spec.ts`), `presentHomeInboxStatus` (only `scripts/test-inbox-cloud-flow.ts`) exist for tests; `whenLabel` likewise (only the browser spec and that script import it — `automations-adapter.ts:214` has an unrelated value key of the same name) | Unexport/delete when the browser spec stops importing modules in-page (T6) and the script moves into `test/` (T9); `selectHomeAgenda` stays while HomeSurface.qnt pins it | Low |
| 3 | 7-74 | D4 | 16 one-line wrappers `presentHomeX = (input) => presentOverviewX(input, format)` and aliases `homeCalendarName = overviewCalendarName` — a rename layer over upstream | Keep one binding object: `export const overview = bindOverview(format)` (or import upstream functions and pass `format` at the 6 call sites); delete the `Home*` renames. If upstream offers a factory taking `format`, use it | Low; touches ~6 importers and the tests |
| 4 | 95-104 | A7 | `homeCalendarValues` writes `homeCalendarPeople` and `homeCalendarItemDescription`, which nothing reads (`git grep` → writer only), and `homePeopleVisibility`, which `home-overview-cards.ts:74` reads for the **mail** card's people row — a calendar-derived flag controlling another card | Drop `homeCalendarPeople`/`homeCalendarItemDescription`; rename the visibility flag per card or drop it (the mail card's people list is always `[]` in production, `data-adapter.ts:149`) | Low |
| 5 | 105-121 | C1 | `HomeAgendaItem` and parameters typed `Record<string, any>` | Type `event` as the calendar row type the calendar owner exports | None |
| 6 | 147-157 | NEW (misplaced) | `createStorageAccessCheck` is a TTL-cached boolean probe unrelated to cards | Move to `runtime/` beside storage helpers (only importer `data-adapter.ts:183`); update HomeSurface manifest path | Low |
| 7 | 1-6, 95 | A8 | Header fine; comment at 95 names `home-overview-cards.ts and the Home adapters` — fine | none | — |
| 8 | 38 | D13 | Deep relative import `upstream renderer: overview/daily-overview.ts` | `@eliza/*` alias | None |
| 9 | 1-161 | D11 | Pure presentation/domain module under `prototype/` | Move to `apps/app/src/home/` (with Home values from `data-adapter.ts` and `home-overview-cards.ts`) | Low; browser spec import path and manifests change |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `format` | const | 42 | locale bindings in `locale-time.ts` | stays |
| `Home*` type aliases | type | 45-49, 72 | upstream `Overview*` types | import upstream names directly |
| `presentHome*` wrappers | helper | 53-74, 158-161 | upstream `presentOverview*` | one bound object |
| `overdueAgendaNext`, `agentReminderLead` | helper | 80-94 | none | stays (agent-calendar is the user) |
| `homeCalendarValues` | helper | 96-104 | none | stays |
| `HomeAgendaItem`, `homeAgendaCandidates`, `createHomeAgenda` | type/helper | 106-146 | none | stays |
| `createStorageAccessCheck` | helper | 150-157 | none | `runtime/` |

## Proposed end state
~110 lines in `apps/app/src/home/home-cards.ts`: one bound overview presenter object, `homeCalendarValues` without dead keys, agenda candidate/selection helpers, the two agent-calendar agenda helpers. Eight unused aliases deleted; storage probe moved out.

## Verification
`test/home-cards.test.mjs`, `test/home-overview-cards.test.mjs`, `test/home-views-model.test.mjs`, `test/quint-home-surface.test.mjs` (HomeSurface manifest), `test/automations-unified.test.mjs`, `scripts/test-inbox-cloud-flow.ts`, `test/browser/home-daily-overview.spec.ts`, Android `HomeCalendarCardInstrumentedTest` (device/emulator only), `npm run verify`.
