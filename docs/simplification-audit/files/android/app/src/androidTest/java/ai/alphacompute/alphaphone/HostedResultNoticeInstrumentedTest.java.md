# android/app/src/androidTest/java/ai/alphacompute/alphaphone/HostedResultNoticeInstrumentedTest.java
- Lines: 100 | Role: device test of the hosted-result notice (posted/denied, tap survives recreation, encrypted history) and of the HostedNoticePoster builders. | Verdict: SIMPLIFY (scope depends on D5)
- Importers: none (test class). Text/path pins: `scripts/android-instrumentation.ts:198` registry entry; `scripts/test-native-permissions.ts:99,107` (`notice`/`notice-denied` campaigns name the class and gates `hostedNotice`/`hostedNoticeDenied`); `test/android-instrumentation-runner.test.mjs:170-173,217`; `test/fixtures/isolated-native-campaign.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-22 | C3 | Private bridge-call helper `call(String expression)` with its own `window.__hostedNativeFixture` global and 20 s polling; the same promise-to-global helper is copied in 12+ androidTest files (`NotesSecureFixture.call`, `NoteOriginInstrumentedTest.call`, `InboxOperationJournalInstrumentedTest.call`, `LargeInboxAttachmentInstrumentedTest.call`, `LocalSpeechBridgeInstrumentedTest.call`, `NoteAudioInstrumentedTest.call` ...). | Replace with one shared `WebViewTestDriver.call(expression)` (promoted from `NotesSecureFixture.call`, returning `{error:true}` instead of asserting). | Low |
| 2 | 29-30 | C3 | Reflective plugin lookup by walking `ActivityLifecycleMonitorRegistry` and `getBridge().getPlugin("AlphaHostedResults").getInstance()`; 33 androidTest files repeat this. | Shared `WebViewTestDriver.plugin(Class<T>, String name)`. | Low |
| 3 | 31 | A8 | Tombstone comment `/* The plugin no longer keeps a notices field; it reads the shared delivery's. */`. | Delete comment. | None |
| 4 | 46, 54, 32 | D8 | 300-600 char statement-packed lines (route construction, the granted branch assertions, ledger cleanup). | Split when touched (Java reformat only when the file is edited, D9). | None |
| 5 | 37-41 | C3 | `awaitNotice` polling loop; same shape as ~13 private `waitFor` copies. | Shared `TestWait.until(Supplier<T>, timeout)` helper. | Low |
| 6 | 42-74 | A3/D5 | The test builds a scope from `origin/ownerId/agentId` of a hosted agent (`https://hosted-fixture.invalid`). Whether this result path survives depends on D5 (hosted/remote/cloud agent modes). `AlphaHostedResults` is still registered by product renderer code (`apps/app/src/runtime/hosted-result-notices.ts:19`, `hosted-background.ts:13`, `prototype/workflow-adapter.ts:266`), so the plugin itself stays. | Keep while `publishResult` is product-reachable; delete `run()` + the two gated methods if D5 removes hosted result notices. | Medium (owner) |
| 7 | 78-99 | KEEP | `resultAndRenewalBuildersExpireAndStayRedacted` builds real `Notification`s on device (no stubs) — the only check of redaction/`timeoutAfter`/group alert of the poster. | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call(String)` | helper | 17-22 | `NotesSecureFixture.call`, `NoteOriginInstrumentedTest.call`, `InboxOperationJournalInstrumentedTest.call`, `LargeInboxAttachmentInstrumentedTest.call`, `LocalSpeechBridgeInstrumentedTest.call`, `NoteAudioInstrumentedTest.call`, `InboxDraftInstrumentedTest.call` (+5 more) | `WebViewTestDriver.call` |
| `store()/save()/read()` | helper | 25-27 | `new AlphaCredentialStore(ctx)` read/write in `LocalAgentProviderInstrumentedTest.store`, `NoteAudioInstrumentedTest` cleanup | keep local (3 lines) |
| `notice/awaitNotice` | helper | 34-41 | notification lookups in `Reminder*`/`WorkflowNotice*` tests | `NotificationAccessTestDriver` (exists) |
| plugin lookup (inline) | helper | 30 | 33 files | `WebViewTestDriver.plugin` |

## Proposed end state
Keep the class (until D5 decides hosted result notices). Replace `call`, plugin lookup and `awaitNotice` with shared helpers, drop the tombstone comment, split the packed lines. About 80 lines.

## Verification
`node scripts/test-native-permissions.ts notice|notice-denied APP.apk TEST.apk OUT` (emulator); default instrumentation run covers the builder method; `node --test test/android-instrumentation-runner.test.mjs`.
