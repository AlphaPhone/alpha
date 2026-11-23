# android/app/src/androidTest/java/ai/alphacompute/alphaphone/HomeCalendarCardInstrumentedTest.java
- Lines: 102 | Role: Home calendar card over the real CalendarProvider: next event title, calendar name, "Read hh:mm"; with permissions revoked before process start, the access-off state. | Verdict: KEEP (minor)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:300` (campaign note), `scripts/test-calendar-regression.ts:71-72` (class + both method names + gate `homeCalendar`), `test/calendar-regression-runner.test.mjs:75,81` (fully qualified `#method` strings), `test/fixtures/isolated-native-campaign.mjs:18`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32, 48 | D10 | `gate()` helper exists but the first test re-reads the argument inline: `"1".equals(InstrumentationRegistry.getArguments().getString("homeCalendar"))` | Use `"1".equals(gate())` (no runner test pins this text) | None |
| 2 | 33-37 | C3 | Private `eval`/`until` | Shared helpers | None |
| 3 | 54-61, 82-83 | C3 | Local-calendar insert/delete with `CALLER_IS_SYNCADAPTER` builder repeated (insert and cleanup); same fixture in `Calendar*` instrumentation tests | `CalendarFixtures.localCalendar(resolver, account, name)` returning an AutoCloseable | Low |
| 4 | 21-28 | — | Javadoc is accurate and useful | Keep | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CARD` | const | 31 | none | keep |
| `card()`/`home()` | helper | 38-45 | none | keep |
| local calendar builder | helper (inline) | 54-61 | Calendar* instrumentation fixtures (12 classes) | `CalendarFixtures` |

## Proposed end state
Both tests and method names unchanged (pinned). Shared poll helper, a shared local-calendar fixture. Estimated 102 -> ~85 lines.

## Verification
`node scripts/test-calendar-regression.ts --case=HomeCalendarCardInstrumentedTest` (granted and revoked);
`node --test test/calendar-regression-runner.test.mjs`.
