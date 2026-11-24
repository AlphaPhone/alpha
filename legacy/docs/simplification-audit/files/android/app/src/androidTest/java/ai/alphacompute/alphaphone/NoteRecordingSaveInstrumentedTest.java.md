# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NoteRecordingSaveInstrumentedTest.java
- Lines: 50 | Role: transcript prefix bound keeps surrogate pairs; a 4-hour transcript still saves the audio and a retried save into the same note succeeds. | Verdict: SIMPLIFY (candidate MERGE into NoteAudioInstrumentedTest)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:248` (`secondaryUser: true`); `test/android-instrumentation-runner.test.mjs:177`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-30 | T3 | `transcriptPrefixIsBoundedAndKeepsSurrogatePairs` is a pure static check of `AlphaNoteAudioPlugin.transcriptPrefix` with no device dependency. The 4-hour test (L32-49) already proves the bound end to end (`maxTranscript` length). | Delete the pure method; add one surrogate-pair character at the cut point of the long transcript if that edge matters. | Low |
| 2 | 23-24 | C3 | `wav()` and `plugin()` are verbatim copies of `NoteAudioInstrumentedTest.java:26-27`. | Shared helpers. | None |
| 3 | 48 | C3 | Note-audio file suffix cleanup loop (also 6x in `NoteAudioInstrumentedTest`). | `NoteAudioFiles.delete`. | None |
| 4 | 42, 46 | C3 | `AtomicReference` + `BoundedActivityScenario.main` + wrap-in-RuntimeException pattern. | Value-returning `BoundedActivityScenario.call`. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `wav()` | helper | 23 | `NoteAudioInstrumentedTest:26` (+5) | `TestAudio` |
| `plugin()` | helper | 24 | `NoteAudioInstrumentedTest:27` (+31) | `WebViewTestDriver.plugin` |

## Proposed end state
One method (long transcript + retry) on shared helpers; about 25 lines. It could become a method of `NoteAudioInstrumentedTest`, but this class runs in a disposable secondary user (`secondaryUser: true`) while `NoteAudio` does not, so merging changes its isolation — keep separate unless the owner accepts that.

## Verification
`npm run test:android:instrumentation -- --owned-emulator ... --classes NoteRecordingSave`.
