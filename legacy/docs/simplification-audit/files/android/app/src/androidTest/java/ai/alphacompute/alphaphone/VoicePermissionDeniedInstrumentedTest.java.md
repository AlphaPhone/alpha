# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VoicePermissionDeniedInstrumentedTest.java
- Lines: 131 | Role: With RECORD_AUDIO revoked before start, the Notes recorder shows the denied state with "Open app settings", records nothing, and typing still works; flag-off builds first sign in through the Inbox fixture. | Verdict: SIMPLIFY
- Importers: none. Run by `scripts/test-native-permissions.ts:69` (`testClass: "VoicePermissionDeniedInstrumentedTest"`, gate `voicePermissionDenied=1`). Text/path pins: `scripts/test-native-permissions.ts:69`, `scripts/android-instrumentation.ts` registry `VoicePermissionDenied` campaign string, `test/android-instrumentation-runner.test.mjs:217` (class list), `test/fixtures/isolated-native-campaign.mjs:18` (class map). Method name `deniedMicrophoneShowsSettingsRecoveryAndKeyboard` may be selected by the runner — keep it.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 32-44 | C3 / C4 | Private `activity()` lifecycle-stage scan and `eval()` re-implement `WebViewTestDriver.evaluate` (which already scans the same four stages). The local copy exists only because the driver matches the exact class and this test runs `InboxFixtureActivity` on flag-off builds. `getActivitiesInStage` scan is copied in 27 androidTest files. | Call `WebViewTestDriver.evaluate(cloudOnly ? InboxFixtureActivity.class : MainActivity.class, script)` (the public typed overload already exists; `InboxFixtureActivity extends MainActivity`). Add `WebViewTestDriver.liveActivity(Class)` for `appFocused()` and the final `finish`. Delete lines 32-44. | Low; the driver also waits on a bounded dispatch. Note the 20 s "wait for activity" loop at line 39 must become a `until` on activity presence. |
| 2 | 29-31 | C3 | Private `until`, `button`, `click`. | Shared `WebViewTestDriver.until/click`; `button(label)` (aria-label or text, visible, enabled) is the most complete variant — promote it as the shared selector. | Low. |
| 3 | 65, 77, 78, 111 | C3 | `eval(AppNavigation.request(X));until(AppNavigation.selected(X),30000);until("window.__alphaTestNavigation?.status==='complete'",30000);` repeated 4×. | `AppNavigation.go(view)` helper. | Low. |
| 4 | 114, 117 | C3 | Native textarea value setter + `input` event dance written twice. | `AppNavigation.setComposer(String)` helper. | None. |
| 5 | 53-61, 120-129 | NEW (dual-build branch) | Flag-off vs test-mocks fork with activity interception and fixture credential cleanup (`store.removeCredentialSlot("cloud:production")`). | Keep behaviour; move interception set-up/tear-down into an `InboxFixtureScope.install()` AutoCloseable shared with other Inbox-fixture classes. `"cloud:production"` literal → the C6 constant (32× Java per PATTERNS). | Medium: cleanup ordering must stay (remove credential before restoring the factory). |
| 6 | 14-26 | A8 | Tracker id "journeys-12" in doc comment. | Drop the id. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 29 | 88 copies (see `VideoInstrumentedTest.java.md`) | `WebViewTestDriver.until` |
| `button` / `click` | helper | 30-31 | `VideoInstrumentedTest:31-34` | `WebViewTestDriver.click` |
| `activity()` | helper | 33-37 | `WebViewTestDriver:21-27,83-89`, `WorkflowNoticeTapInstrumentedTest:27-31,51,137`, 27 files total | `WebViewTestDriver.liveActivity` |
| `eval` | helper | 38-44 | `WebViewTestDriver.evaluate` | delete |
| `appFocused` | helper | 45 | none found | keep, built on `liveActivity` |

## Proposed end state
One test method; activity lookup/eval/until/click/navigation/composer helpers removed in favour of `WebViewTestDriver`/`AppNavigation`; Inbox-fixture interception via a shared scope. About 85-90 lines.

## Verification
`node scripts/test-native-permissions.ts voice APP.apk TEST.apk OUT` on both a flag-off and a test-mocks build; `node --test test/native-permission-runner.test.mjs test/android-instrumentation-runner.test.mjs`.
