# specs/quint/refinement/native/ComponentTraces.java
- Lines: 224 | Kind: Quint refinement harness (Java, runs real helper classes directly, no stubs) | Verdict: KEEP, with MediaLifecycle section DELETE and upstream-only sections moved to an upstream-lock lane
- Covers: five native models in one JVM run: `ResetRecovery` (upstream `ResetAuthorization`), `SpeechResources` (upstream `LiveCaptureAdmission`, `SpeechPcmQueue`, `SpeechAudioFocusPolicy`), `MediaLifecycle` (app `NativeReadEpoch` + upstream `SelectedPhotoCopy`), `ListenerLeaseRecovery` (upstream sense `IndicatorLease`, `CrashLoopBreaker`), `AlwaysOnListener` (upstream sense `ListenerPolicy`). Duplicates: `PlaybackTraces.java` also exercises `SpeechPcmQueue`/`SpeechAudioFocusPolicy` for SpeechResources (`index.mjs:80`); `test/native-read-epoch.test.mjs` + `test/fixtures/NativeReadEpochTest.java` cover `NativeReadEpoch`.
- Callers/importers: `refinement/native/index.mjs:112-131` (`'ComponentTraces'` campaign via `javaTraces`). Name also used as a label in `test/quint-refinement-campaigns.test.mjs:46,52` (that test fakes the campaign; it does not run this file).

## How it is tied to product code
Imports and calls exported/package methods of the real classes (the robust style, research §"6"). Reflection reads
private fields by name: `ResetAuthorization.{active,confirmed,generation}`, `SpeechAudioFocusPolicy.state`,
`IndicatorLease.{generation,live,acknowledged,expiresAt,surfaceVisible,chipVisible,recordingObserved}`. No text slicing.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 91-123 | A7 | `media()` drives `NativeReadEpoch`, which has no product caller (`NativeReadEpoch.java.md`: DELETE; `git grep NativeReadEpoch android/app/src/main` finds only the file). The MediaLifecycle trace therefore proves a guard nobody uses. | Delete `media()` and the `MediaLifecycle` key with `NativeReadEpoch.java`; drop `app + 'NativeReadEpoch.java'` from `index.mjs:117` and `NativeReadEpoch.java` from the MediaLifecycle manifest `sources`. If MediaLifecycle needs a native refinement, write it against the upstream media plugin's own epoch. | Low: model keeps its other refinements (renderer side); check the manifest's `tests`/witness list still passes. |
| 2 | 18-35, 36-90, 124-219 | P6 / §2.9 | Four of five sections run only `vendor/eliza/**` code. They can change only on an `upstream.lock.json` bump but run on every PR touching `specs/`/`scripts/`. | Keep the traces (models are live), but put this campaign in a lane triggered by `upstream.lock.json`, `patches/eliza/**` or the model files; longer term move upstream with the classes (D14 follow-up). | None |
| 3 | 1-224 | C5 | One class bundles five unrelated models; a failure in one hides the rest and every model re-runs when any source changes. | Optional: split per model if lanes become per-model; otherwise leave. | None |
| 4 | 157-169 | — | `crash-history` loop is 128 cases; cheap (pure functions). | None | None |

## Proposed end state
`ComponentTraces` keeps ResetRecovery, SpeechResources, ListenerLeaseRecovery and AlwaysOnListener traces and loses
`media()` together with `NativeReadEpoch`. The campaign runs in the native lane only when upstream sources, the lock,
the patches or these models change.
