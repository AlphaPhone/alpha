# android/app/src/androidTest/java/ai/alphacompute/alphaphone/InboxDraftInstrumentedTest.java
- Lines: 123 | Role: two-process journey (prepare/restore/cleanup phases) through the real sign-in page, Settings and Inbox with a substituted closed fixture transport; checks the saved draft in the encrypted slot survives a process restart. | Verdict: SIMPLIFY
- Importers: none. Uses `InboxFixtureActivity`, `InboxFixtureConnection`, `InboxFixtureScope`, `InboxFixtureSignIn`. Text/path pins: `scripts/test-native-restart.ts:46` (`testClass: "InboxDraftInstrumentedTest"`, phases `inboxPhase`/`inboxRunId`); `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-48 | C3/D4 | `activity()` + `js(code)` re-implement `WebViewTestDriver.evaluate(Class<? extends MainActivity>, String)` (which already selects the exact Activity type, bounded dispatch, `WebViewTestDriver.java:74-76`). | `js(code)` -> `WebViewTestDriver.evaluate(InboxFixtureActivity.class, code)`; keep `activity()` only for the `@After` finish. | Low |
| 2 | 49-56 | C3 | `until`, `call`, `button`, `click` copies (same shape as LauncherHome/NotesDocument/Maps helpers). | Shared `WebViewTestDriver.until/call` + an `Ui.button(label)` selector helper. | Low |
| 3 | 57-59 | C3 | React value-setter snippet `Object.getOwnPropertyDescriptor(...prototype,'value').set.call(...)` — 50 androidTest files carry a copy. | One `Ui.setValue(selector,text)` JS-snippet builder. | Low |
| 4 | 104 | C3 | Inline SHA-256 hex loop for the slot file name; 30 androidTest files format `%02x` themselves. | `TestDigests.sha256Hex(String)` in androidTest. | Low |
| 5 | 38, 75, 78, 86 | C6 | `"alpha.connection.selection.v1"`, `"alpha.connection.cloud-service.v1"`, `"cloud:production"` literals (selection key appears in 12 renderer files and several tests). | Androidtest constant class `Keys` next to `AppNavigation`. | Low |
| 6 | 92-93, 101, 108-110 | A8 | Comments narrating history: "the old explicit Load Inbox control is gone", "Decision P-43: there is no local-apps choice to keep". | Trim to what the step checks. | None |
| 7 | 65 | B4 | `assertTrue(BuildConfig.DEBUG)` then L94 asserts flag-off; fine, but L23-24 re-validate the runner's own UUID/phase arguments. | Keep the UUID check (CLI boundary); drop nothing else. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js(String)` | helper | 44-48 | `WebViewTestDriver.evaluate(Class,String)` | delete; use driver |
| `until/call/button/click/input/nav` | helper | 49-60 | `LauncherHomeInstrumentedTest`, `NotesDocumentInstrumentedTest`, `MapsInstrumentedTest`, `VoicePermissionDeniedInstrumentedTest` (same Inbox fixture flow lines 56-125) | `WebViewTestDriver` + `Ui` |
| `SELECTION`, `SERVICE` | const | 38 | `NoMockProductInstrumentedTest.SELECTION`, `NoteAudioInstrumentedTest` literals | `Keys` |
| sign-in fixture flow (L91-97) | helper | 91-97 | `VoicePermissionDeniedInstrumentedTest.java:56-74` (same install-interceptor + DRIVE_EMAIL/DRIVE_CODE) | `InboxFixtureSignIn.signIn()` |

## Proposed end state
Phase logic unchanged; interceptor install + fixture sign-in moved to a shared `InboxFixtureSignIn.install()/signIn()` used also by `VoicePermissionDeniedInstrumentedTest`; JS helpers from the shared driver. About 100 lines.

## Verification
`node scripts/test-native-restart.ts inbox ...` (prepare/restore/cleanup across a process restart) on an owned emulator, flag-off build.
