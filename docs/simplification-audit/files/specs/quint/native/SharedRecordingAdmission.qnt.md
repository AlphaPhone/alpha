# specs/quint/native/SharedRecordingAdmission.qnt
- Lines: 136 | Kind: Quint model (live; models upstream Java staged with Alpha patches) | Verdict: KEEP (owner question: run only when the native patch set or pin changes)
- Covers: the shared speech bridge's draft recording admission: permission epochs, requests queued behind a permission prompt, host pause/destroy retiring queued starts, call checks at start and during capture, cancellation barrier with joined waiters, timeout and refused barrier keeping admission closed, failed release fencing stop. Duplicates: none in Quint (`NativeLiveCapture`, `NativeVoiceDraft` cover adjacent paths). Callers/importers: manifest; `refinement/native/shared-recording.mjs` (`checkSharedRecording`, `index.mjs:22,189`; its `currentNativeSource`/`nativePatchInputs` are imported by other native harnesses); README 296-305.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest sources | P6 | Every source is `vendor/eliza/.../voice/*.java` plus `android/upstream-native-sources.json`. It is shipped in the APK after `scripts/prepare-patched-native.ts` applies `patches/eliza/*`, so it is product code for this app, but it changes only with the pin or the patch set. | Keep; in the CI path matrix run it only on changes to `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**` or the harness. Long-term the model belongs upstream with the code (D14 follow-up). | low |
| 2 | harness 1-12 | C3 | `shared-recording.mjs` runs `preparePatchedNative()` at import time (top-level side effect) and exports `currentNativeSource`/`nativePatchInputs` that other harnesses import, so importing it for a helper stages native sources. | Move the two helpers to `refinement/native/java.mjs` (or a `patched-native.mjs`) and call `preparePatchedNative()` lazily. | low |
| 3 | 8-9, 61-63 | B4 | `lastEpoch/lastCurrent/lastForeground/lastDestroyed/lastCall/lastDraining` snapshot the guard inputs of the last `runStart` so `AcceptedInCurrentLiveEpoch` can re-check the guard that produced `accepted`. This restates the action's own condition as an invariant. | Acceptable as a refinement observation point (the harness compares them); keep only those the harness observes. | low |
| 4 | — | — | No text slicing; harness compiles the staged Java with platform ports. | none | — |

## Proposed end state
Model kept. Path-scoped so it does not run on renderer-only or docs changes. Shared helpers in the harness moved out
of the module with the import-time side effect. Revisit moving model + harness upstream when D14 follow-ups are
scheduled.
