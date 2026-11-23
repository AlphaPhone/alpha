# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaApplication.java
- Lines: 28 | Role: `Application` subclass: reset admission and update-pause configuration in `attachBaseContext`; native source hosts, crash log, Sense owner admission, voice-latency identity, deletion coordinator and Notes Trash backstop in `onCreate`. | Verdict: SIMPLIFY (small)
- Importers: `AndroidManifest.xml:84` (`android:name=".AlphaApplication"`), `android/app/product.gradle`. Text/path pins: `specs/quint/native/manifest.json:320,374,2011`, `specs/quint/refinement/native/{ResetAdmissionRegression.java,ResetOrchestrationTraces.java,native-digest.mjs,reset-orchestration.mjs,runtime-update-pause.md}`, `test/always-on-listener.test.mjs`, `test/connection-routes.test.mjs`, `test/native-voice-latency.test.mjs`, `test/reset-startup.test.mjs`, `test/reset-wiring.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 22, 26 | D3 (P2) | Application reaches into plugin classes for process-wide services: `AlphaDevicePlugin.UpdatePause.configure(base)`, `AlphaLocalAgentPlugin.invocationOwner(this)`, `AlphaNoteAudioPlugin.scheduleTrashBackstop(this)`. | After the cross-file splits, call `AppUpdater.UpdatePause.configure`, `ResidentLifecycle.invocationOwner`, `NotesTrash.scheduleBackstop`. | Low here; the moves are the risk (see AlphaDevicePlugin). |
| 2 | 13, 16 | D4 | `private boolean resetRecoveryProcess()` used once. | Inline `AlphaDataReset.RESET.isRecoveryProcess(this,getProcessName())`. | None; check `test/reset-startup.test.mjs` regex. |
| 3 | 16 | D8 | Four statements on one line (`NativeDigestHost host=...;NativeSourceHost.configure(...);NativeOwnerReminderHost owner=...;...`). | One per line. | Source regex in `specs/quint/refinement/native/native-digest.mjs` may need updating. |
| 4 | 25-26 | B1 | `try{NativeDeletionCoordinator.get(this).start();}catch(RuntimeException unavailable){/* ... */}` and the same for the Trash backstop. Comments state the specified fallback (retried next start / renderer purges). | Keep both catches (allowed by B1) but `Log.w` the class name so failures are visible in the problem log. | None |
| 5 | 24 | C6 | `"alpha-native-voice-timing-v3"` persisted document name literal. | Keep value; optionally a named constant. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `resetRecoveryProcess()` | helper | 13 | `AlphaDataReset.RESET.isRecoveryProcess` (:11 call) | inline |

## Proposed end state
~26 lines, one statement per line, delegating to the application-scoped services that replace the static plugin members once those splits land. Startup order (reset admission first, update pause before providers) unchanged.

## Verification
`test/reset-startup.test.mjs`, `test/reset-wiring.test.mjs`, `test/native-voice-latency.test.mjs`, Quint reset-orchestration and native-digest refinements, `ResetPolicyInstrumentedTest`; cold-start on emulator.
