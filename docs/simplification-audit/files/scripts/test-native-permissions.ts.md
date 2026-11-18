# scripts/test-native-permissions.ts
- Lines: 350 | Kind: Android device campaign library + CLI (sets permission state in a fresh secondary user, runs one instrumentation method; `voice-revoke` revokes RECORD_AUDIO mid-recording and requires Android to kill the process) | Verdict: KEEP as a manual campaign, MOVE to `test/android/campaigns/permissions.ts`, SIMPLIFY
- Covers: camera denied/granted/document scan, Settings permission handoff, blocked notification channels, voice denied/revoked/limit, result notice allowed/denied. Duplicates: none (the instrumented tests need permission state set before process start). Callers/importers: `scripts/android-instrumentation.ts` (names it in notes and the campaign list); `test/native-permission-runner.test.mjs:96` and `test/android-instrumentation-runner.test.mjs:11,218` import `cases`/`revokeWhileRecording`; `test/fixtures/isolated-native-campaign.mjs:7`; Java comments in `CameraFlowInstrumentedTest`, `HostedResultNoticeInstrumentedTest`, `VoicePermission*InstrumentedTest`. No workflow runs it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27, 122 | D7/T5 | `cases` and `revokeWhileRecording` are exported for host tests that drive the runner against a fake `adb` (`native-permission-runner.test.mjs`, `android-instrumentation-runner.test.mjs`). | Delete those runner tests (T5); unexport. | None |
| 2 | 236-238 | C7 | Imports `requireInstrumentationInterruption` from `vendor/eliza/.../instrumentation-result.mjs` while `scripts/instrumentation-result.ts` is the local twin used elsewhere. | One import path (the local module re-exporting upstream, or upstream directly everywhere). | Low |
| 3 | 174-182 | C3 | Local `until` poll helper; `pidof` wrapper duplicated in `test-native-restart.ts:182-189`. | Move `pidof`/`until` into `native-test-fixture.ts`. | None |
| 4 | 299-323, 254-264 | C3 | `pm <op>` + `pm clear-permission-flags` sequence written twice. | `setPermission(run,user,pkg,name,op)` helper. | None |
| 5 | 324-342 | D9 | Two conditional spreads both define `collectVariant`; a case with both would silently lose one. | Put `collect` on the case record. | Low |
| 6 | 280 | - | `runNativeFixture` dynamically imported although `fixtureCommandError` is imported statically from the same module. | Static import. | None |

## Proposed end state
~220 lines under `test/android/campaigns/permissions.ts`, cases carry their own collect step, shared adb helpers in the fixture, no exports for host tests. Listed in the campaigns README; wiring into CI is an owner question.
