# apps/app/src/runtime/workflow-local-time.ts
- Lines: 79 | Role: workflow/automation clock helpers — daily/weekly cron parse and build, schedule labels, next occurrence in a foreign zone (DST-aware), snooze/instant display, datetime-local input conversion and strict local-date parse. | Verdict: SIMPLIFY (small)
- Importers: `prototype/automations-adapter.ts`, `prototype/workflow-authoring.ts`, `runtime/automations-protocol.ts`, `runtime/phone-workflow-authoring.ts`. Scripts: `scripts/workflow-renderer-fixture.ts` (injects `workflowDeviceTimeZone`, `workflowLocalInstant`, `workflowClockContext`, `automationLocalDateInput`, `localDate` into a vm scope). Tests: `automations-unified.test.mjs`, `polish-automation-when.test.mjs`, `workflow-draft-reopen.test.mjs`. Specs: `quint/refinement/application/scheduled-snooze-admission.mjs`, `services/automation-request-settlement.mjs`, `services/workflow-local-source.mjs`.
- Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/services/manifest.json` (path); `test/support/feature-parity.mjs:626`. All exports have a product importer (verified per symbol).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-38 | A7 / A8 | `workflowLocalInstant(stamp, _locale?)` ignores `_locale`; the comment explains "callers that still pass the older optional locale argument". The only such caller is `automations-protocol.ts:33 automationWhen(stamp,_zone?,locale?)`, which itself ignores `_zone`. | Drop the parameter here and both ignored parameters of `automationWhen` (and its callers' extra args). | Low. |
| 2 | 43-45 | C3 (local) | `cadence = formatSchedule(canonical)` then, inside the branch, `const label = formatSchedule(canonical)` recomputes the same value. | Use `cadence`. | None. |
| 3 | 45 | D8 / D9 | One 330-char line holding a branch with an inline `names` array and nested formatting. | Split into `localClockLabel(canonical)`; hoist `const DAY_NAMES = ['Sun',…]`. | None; labels are user-visible — keep exact text (`'Repeating schedule'`, `', '`, `' at '`). |
| 4 | 6 | C6 | `OWNER_LOCAL_TZ = 'owner_local'` (upstream sentinel the SDK does not export); the same literal is inline in `automations-protocol.ts:67` (`trigger?.tz==='owner_local'`). | Export `OWNER_LOCAL_TZ` here and use it there; better, ask upstream to export the sentinel (comment 4-5). | Low. |
| 5 | 29, 52 | C3 (local) | "zone is empty or owner-local → device zone" decided twice with slightly different tests (29 also treats device zone as local). | `const resolveZone = (zone) => !zone || zone === OWNER_LOCAL_TZ ? workflowDeviceTimeZone() : zone;` | Low. |
| 6 | 33, 62 | B1 | `catch{return 'Time and repeat days use the original saved time zone.';}` (invalid zone name in Intl) and `catch{/* Invalid source zones do not invent an occurrence. */}` — specified fallbacks with comments. | Keep. | — |
| 7 | 10, 74-77 | D8 | Dense validation one-liners. | Format when touching. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OWNER_LOCAL_TZ` | const | 6 | `automations-protocol.ts:67` literal; upstream plugin-scheduling `trigger-tz.ts` | export here (or upstream) |
| `workflowDeviceTimeZone` | helper | 26 | other `Intl.DateTimeFormat().resolvedOptions().timeZone` reads in calendar/reminder code (not verified exhaustively) | stays; reuse |
| day-name array | const | 45 | `prototype/locale-time` formatters | `DAY_NAMES` here, or locale-aware formatter |

## Proposed end state
~80 formatted lines (same exports): no ignored parameters, single `formatSchedule` call, `resolveZone` helper, exported `OWNER_LOCAL_TZ`, `localClockLabel` extracted. Behaviour and copy unchanged.

## Verification
`node --test test/automations-unified.test.mjs test/polish-automation-when.test.mjs test/workflow-draft-reopen.test.mjs`; Quint `scheduled-snooze-admission`, `automation-request-settlement`, `workflow-local-source`; workflow renderer fixture.
