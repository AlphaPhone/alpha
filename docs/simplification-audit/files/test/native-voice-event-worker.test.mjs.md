# test/native-voice-event-worker.test.mjs
- Lines: 49 | Kind: test 1 = transplant (regex-extracts the `voiceWorkers` initializer from `AlphaLocalAgentPlugin.java` and runs it with real `PluginWorkers.java`); test 2 = host-JVM of the real `VoiceEventAdmission.java` | Verdict: DELETE test 1; MERGE test 2 into `test/integration/android-jvm.test.mjs`
- Covers: the voice feed worker refuses (rather than queues) work while busy; the voice feed is fenced by runtime replacement, re-enrollment, owner change, expiry and missing enrollment. Duplicates: `test/plugin-worker-guard.test.mjs` runs `PluginWorkers.submit` refusal on the JVM; `native-live-pcm.test.mjs` test 3 uses `VoiceEventAdmission` too. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | T2 | Regex over a field initializer; also uses relative paths (cwd-dependent) instead of `nativeSource`. | Delete; covered by plugin-worker-guard once the initializer is a named `PluginWorkers` factory. | Low |
| 2 | 32-49 | - | Real class, six-row table. | Keep with the NativeVoiceBinding case. | None |

## Proposed end state
One android-jvm case: `VoiceEventAdmission.current` table (valid, rotated runtime, re-enrolled, owner changed, expired,
unenrolled), in the same fixture as `NativeVoiceBindingTest`.
