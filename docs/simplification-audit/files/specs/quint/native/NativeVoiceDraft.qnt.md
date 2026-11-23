# specs/quint/native/NativeVoiceDraft.qnt
- Lines: 101 | Kind: Quint model of upstream-only code, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles the real upstream Java | Verdict: KEEP (path-gate on upstream pin)
- Covers: Shared LocalVoiceRecording draft: stale callbacks after replacement, size-category clearing, consumer failure keeps audio, call interruption retires/discards the draft, external segment selection, metrics fenced after failed release (7 runs, 5 invariants). Duplicates: none. Callers/importers: manifest; `specs/quint/refinement/native/voice-draft.mjs`; `test/quint-native-voice-draft.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 / upstream (§2.9) | Every source is under `vendor/eliza` (`LocalVoiceRecording.java`, used by `AlphaVoiceCloudPlugin` and `AlphaKeyboardDictationService`); the code ships in the APK through `android/upstream-native-sources.json` module `plugins/plugin-local-inference/native/android`, so the model is live, but it can only change on a pin bump. | Run it only when `upstream.lock.json`, `android/upstream-native-sources.json` or `patches/eliza/**` change (research §2.9); moving it upstream is a D14 follow-up, not this change. | None |
| 2 | harness | C3 / T10 (vendor only) | `voice-draft.mjs` compiles the current patched upstream classes through `current-sources.mjs`; no Alpha product text is sliced. | None. | — |
| 3 | test + `index.mjs` | T4 | Runs in `test/quint-native-voice-draft.test.mjs` and again in the native aggregate. | One runner. | None |
| 4 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |
| 5 | `voice-draft.mjs:8-12` | C3 | Repeats the `upstream-native-sources.json` read + `preparePatchedNative` block of `note-bridge.mjs` instead of `current-sources.mjs`; also borrows `noteRecordingPlatform`. | Use `current-sources.mjs`. | Low |
| 6 | 23 | — | `constructorFailed` is `s' = s`, the same as the stutter step, but `VoiceDraftTraces.java:57-62` emits a `constructorFailed` trace step for the injected constructor failure, so it is a named correspondence, not dead code. | None. | — |

## Proposed end state
Model unchanged. Runs only when the upstream pin or patch set changes, or its harness/model changes. Listed as an upstream follow-up (D14) to move with its source.
