# android/app/src/androidTest/java/ai/alphacompute/alphaphone/NoteRecorderInstrumentedTest.java
- Lines: 115 | Role: native Notes recorder: notification shows paused/recording state; real mic recording across 3+ segments with pause, crash recovery by a fresh recorder, joined playable file matching the journal, canonical-save claim. | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:247` (`secondaryUser: true`); `test/android-instrumentation-runner.test.mjs:177-181`. Production hooks: `AlphaNoteRecorder` private constructor (via reflection), `segment`, `joined`, `totalMs`, `claimCanonicalSave`, `AlphaNoteRecordingService.notification` — all have production callers (`AlphaNoteAudioPlugin.java:241`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37 | T6 | `fresh()` opens the private `AlphaNoteRecorder(Context)` constructor by reflection to simulate a new process. | Acceptable; alternatively a package-private constructor (same package). | Low |
| 2 | 31-35 | C3 | `main(Callable)` returning a value; `BoundedActivityScenario.main(Runnable)` exists but returns nothing. | Add a value-returning overload to `BoundedActivityScenario` and use it here and in `NoteAudio*`/`NoteRecordingSave` (which use `AtomicReference` + `main`). | Low |
| 3 | 42-54 | T3 | `theNotificationShowsPausedWithResumeAndTheRecordingLength` builds a notification from a `JSObject` — pure builder check, but on the real Notification API. | Keep. | - |
| 4 | 67-68 | T8 | Fixed `SystemClock.sleep(3000)`/`(2000)` — intentional (measuring pause). | Keep. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `main(Callable)` | helper | 31-35 | `AtomicReference`+`BoundedActivityScenario.main` pattern in `NoteAudioInstrumentedTest`, `NoteRecordingSaveInstrumentedTest`, `HostedResultNoticeInstrumentedTest` | `BoundedActivityScenario.call` |
| `copyTree`, `mediaMs` | helper | 39-40 | `MediaExtractor` duration read in `LocalSpeechBridgeInstrumentedTest:41` | keep |

## Proposed end state
Unchanged except using a shared value-returning main-thread helper. About 110 lines.

## Verification
`npm run test:android:instrumentation -- --owned-emulator ... --classes NoteRecorder` (disposable secondary user; ~90 s).
