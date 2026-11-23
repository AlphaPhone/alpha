# apps/app/src/runtime/clock-contract.ts
- Lines: 37 | Role: Alpha binding of upstream Clock handoff policy — re-exports plus ten alias renames and a brand-name wrapper | Verdict: SIMPLIFY (absorb clock-agent-review.ts and clock-handoff-history.ts; rename `clock.ts`)
- Importers: daily.ts (`ClockDay`), prototype/agent-adapter.ts (`isClockOperation`, `assertClockTimeZone`, `currentClockTimeZone`, `validateClockResult`), prototype/clock-adapter.ts (`currentClockTimeZone`, `buildClockRequest`, `describeClockDays`, `ClockDay`), runtime/phone-context.ts (`clockHandoffCapabilities`, `clockTimeZone`). Text/path pins: `test/clock-repeat-days.test.mjs:4` (imports `clockDays`, `describeClockDays`, `isClockOperation`, `validateClockOperation`, `validateClockOutcome`, `describeClockHandoff`, `buildClockRequest`), `test/reminder-lifecycle-pure.test.mjs:7`, `test/browser/agent-clock-handoff.spec.ts:220`, `scripts/test-clock-handoff-flow.ts:7`, `scripts/test-connection-history.ts:28`, `test/fixtures/workflow-clock-admission.mjs:17` (dependencyPaths), feature-parity inventory. No manifest pins.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-21 | A7 | Re-exports with 0 importers anywhere: `CLOCK_CAPABILITY`, `ClockOperation`, `ClockResult` (daily.ts declares its own different `ClockResult` — same name, different type), `ClockHandoffResult`, `CLOCK_DAY_NAMES`, `ClockSetRequest`, `ClockDraftRequest`. | Delete them. | None. |
| 2 | 24-31 | D4 | Alias renames `clockDays`, `isClockOperation`, `validateClockOperation`, `validateClockOutcome`, `validateClockResult`, `buildClockRequest` of upstream names (research P10). | Importers use the upstream names (`isClockHandoffOperation`, `clockHandoffReceipt`, `buildClockHandoffRequest`, …) directly; delete the aliases. | Low (4 importers + 5 test/script files). |
| 3 | 24, 27, 28, 35-37 | D7/T5 | `clockDays`, `validateClockOperation`, `validateClockOutcome` and `describeClockHandoff(op)` (binds the brand 'Alpha') are used only by tests of upstream policy. | Delete; tests of upstream policy go upstream. | Low. |
| 4 | 32-34 | D4 | `assertClockTimeZone` is a pure pass-through wrapper. | Re-export upstream `assertClockHandoffTimeZone` or call it directly in agent-adapter. | None. |
| 5 | 1-6 | A8 | Header restates upstream policy (P-17). | One line. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ClockResult` (re-export) | type | 19 | `ClockResult` in daily.ts:55 (different shape) | delete re-export; keep daily.ts type |
| alias block | const | 24-31 | upstream names | delete |

## Proposed end state
`clock.ts` (~15 lines): re-exports of the upstream names Alpha actually uses (`currentClockTimeZone`, `describeClockDays`, `clockHandoffCapabilities`, `clockTimeZone`, `ClockDay`, handoff request/receipt helpers), the AlphaActionJournal review executor (from clock-agent-review.ts) and the Clock handoff history binding with its installed slot (from clock-handoff-history.ts).

## Verification
`test/clock-repeat-days.test.mjs`, `test/reminder-lifecycle-pure.test.mjs`, `test/clock-native-contract.test.mjs`, `test/browser/agent-clock-handoff.spec.ts`, `scripts/test-clock-handoff-flow.ts`, `test/fixtures/workflow-clock-admission.mjs` dependency paths.
