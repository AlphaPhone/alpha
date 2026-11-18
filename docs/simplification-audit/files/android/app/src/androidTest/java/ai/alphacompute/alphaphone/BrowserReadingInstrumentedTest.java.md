# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserReadingInstrumentedTest.java
- Lines: 93 | Role: reading review on a real HTTPS child — paired-speech approve/cancel/replay and resident token binding | Verdict: SIMPLIFY
- Importers: none (test class). Run by `scripts/android-instrumentation.ts:204` registry entry `BrowserReading` (`requiresTestMocksBuild`) and CI lane `READING_TEST_MOCKS_CLASSES` (`scripts/ci/emulator-suite.ts:38`). Text/path pins: `test/ci-emulator-evidence.test.mjs:224,279` (class name list), `test/browser-tab-host-identity.test.mjs:60-73` (scans source).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-19 | D4 | Five one-line forwarders: `private String js(String code)throws Exception{return reading.js(code);}` … `call(...)`. | Call `reading.js/…` (or the shared driver) directly; delete the forwarders. | Low |
| 2 | 20-35 | T4 | `explicitImmutableReviewExcludesSensitiveSubtreesAndRejectsReplay` runs `reading.cancelThenApproveOnce(server,binding)`; the identical call is the tail of `BrowserSensitiveReadingInstrumentedTest:104` and `BrowserIsolatedReadingInstrumentedTest:32`, all three in the same CI lane. | Keep it here only; remove the trailing `cancelThenApproveOnce` from Sensitive and Isolated. | Low |
| 3 | 20-35 | A3 / P15 (owner) | The paired-speech (`remote:` slot) path. | If pairing goes, delete this method; `residentReadingTokenIsSingleUseAndBound` already covers the production (resident) path. | Medium |
| 4 | 37-40 | C3 | `settle()` is a second invoke/result pair beside `reading.invoke/result` with a `{ok,message}` envelope. | Move to `BrowserReadingFixture.settle` (only caller here, but it is the same pattern as `invoke`). | Low |
| 5 | 66, 83, 85 | C6 (local) | `'synthetic-resident-owner'`/`'synthetic-resident-session'` spelled 6×; line 85 rebuilds the whole call string instead of using `with`. | Local constants; build line 85 with the `with` function and an expiry parameter. | Low |
| 6 | 69 | D9 | `BiFunction<String[],String,String> with` taking a positional `String[]` of owner/session/execution. | A small `local(owner,session,execution,token)` method. | Low |
| 7 | 84 | T8 | `SystemClock.sleep(... soon-now ... +500)` fixed wait for expiry — acceptable (waiting on a wall-clock deadline), keep. | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js/waitFor/invoke/result/call` | forwarders | 15-19 | same five in `BrowserSensitiveReadingInstrumentedTest:20-23` | delete |
| `settle` | helper | 37-40 | `CalendarAgentCrud.begin/result`, `CalendarDeletionReview.begin/result` (same promise→window slot pattern) | `BrowserReadingFixture` |
| `EXPIRED` | const | 41 | copy of native message in upstream `BrowserReviewedReading` | keep (asserted copy) |
| `approveDevice` | helper | 43-48 | none | keep |

## Proposed end state
Two methods (or one if P15 removes paired speech), no forwarders, `settle` in the fixture, constants for the
resident owner/session. Est. ~80 lines (≈50 with P15).

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes BrowserReading`; `node --test test/ci-emulator-evidence.test.mjs`.
