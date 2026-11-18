# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VoicePermissionRevokeInstrumentedTest.java
- Lines: 147 | Role: Four-phase (baseline / record / verify / regrant) campaign: RECORD_AUDIO revoked while the native recorder captures kills the process; the next process removes the partial capture and refuses to save it; re-grant works. | Verdict: SIMPLIFY (small)
- Importers: none. Run by `scripts/test-native-permissions.ts:77` (`voice-revoke`, args `voiceRevokePhase`, `voiceRevokeRunId`). Text/path pins: `scripts/test-native-permissions.ts:77`, `scripts/android-instrumentation.ts` registry campaign string, `test/android-instrumentation-runner.test.mjs:217`, `test/native-permission-runner.test.mjs:91,99` (pins the fully qualified class name in fake instrumentation output), `test/fixtures/isolated-native-campaign.mjs:18`. The marker path `voice-revoke/recording.json` and its JSON keys (`runId`, `pid`, `recordingId`, `bytes`) are read by the runner — keep byte-for-byte. Method name `microphoneRevokedWhileRecordingPhase` pinned by runner selection.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-48 | C3 | `call(expression)` promise-to-global bridge (`window.__voiceRevoke=null;Promise.resolve().then(()=>...`); 12 androidTest files carry the same helper under different global names (`__approvalNotice`, `__workflowNoticeTap`, `__workflowDraftNative`, `__workflowNative`, ...). | Add `WebViewTestDriver.call(String expression, long timeoutMs)` returning `JSONObject` (error → `{error:true,code,message}` as here, the richest variant) and delete the local copy. | Low; each global name is test-private. |
| 2 | 49-56 | C3 | `ready()` poll for plugin presence — another `until` copy. | `WebViewTestDriver.until("...AlphaVoiceCloud&&...AlphaNoteAudio", 60000)`. | Low. |
| 3 | 57-61 | C6 | `"alpha-cloud-voice-"` / `.m4a` capture prefix literal; also in `VoicePermissionDeniedInstrumentedTest:108` and `VoiceWorkerSettlementInstrumentedTest:53`, and in main `AlphaVoiceCloudPlugin`. | Reference the production constant (expose `AlphaVoiceCloudPlugin.CAPTURE_PREFIX` package-private) from all three tests. | Low. |
| 4 | 133 | C6 | Note-audio on-disk suffix list `".audio", ".json", ".json.bak", ".pending"` duplicates `AlphaNoteAudioPlugin` layout knowledge. | Keep (it asserts the on-disk contract) but take the suffixes from the plugin constant if one exists. | Low. |
| 5 | 112-113 | NEW (busy wait) | `while (... < end) SystemClock.sleep(200);` 90 s to be killed — intended (the runner kills the process). | Keep; it is the specified behaviour. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 39-48 | `WorkflowApprovalNoticeInstrumentedTest:41-45`, `WorkflowNoticeTapInstrumentedTest:16-20`, `WorkflowDraftNativeInstrumentedTest:16`, `WorkflowPhoneNativeInstrumentedTest:24`, +7 files | `WebViewTestDriver.call` |
| `ready` | helper | 49-56 | 88 `until`/`ready` copies | `WebViewTestDriver.until` |
| `capture`, `captures` | helper | 57-61 | `VoicePermissionDeniedInstrumentedTest:108` | keep local, constant from production |
| `MARKER` | const | 36 | runner `scripts/test-native-permissions.ts` (same path string) | keep |

## Proposed end state
Same four-phase switch; `call`/`ready` replaced by shared driver calls; capture prefix from production constant. About 125 lines.

## Verification
`node scripts/test-native-permissions.ts voice-revoke APP.apk TEST.apk OUT` (emulator, disposable user) on both variants; `node --test test/native-permission-runner.test.mjs test/android-instrumentation-runner.test.mjs`.
