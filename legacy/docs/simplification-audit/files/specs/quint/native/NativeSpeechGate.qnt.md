# specs/quint/native/NativeSpeechGate.qnt
- Lines: 78 | Kind: Quint model of upstream-only code, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles the real upstream Java | Verdict: KEEP (path-gate on upstream pin)
- Covers: Always-on listener SpeechGate: adaptive noise floor (±2 tolerance), 15-frame pre-roll ring, three-frame opening, 35-frame silence close, 400-frame cap (4 runs, 5 invariants). Duplicates: none. Callers/importers: manifest; `specs/quint/refinement/native/speech-gate.mjs`; `test/quint-speech-gate.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 / upstream (§2.9) | Every source is under `vendor/eliza` (`vendor/eliza/packages/app/platforms/android/sense/.../SpeechGate.java`); the code ships in the APK through `android/upstream-native-sources.json` module `plugins/plugin-local-inference/native/android`, so the model is live, but it can only change on a pin bump. | Run it only when `upstream.lock.json`, `android/upstream-native-sources.json` or `patches/eliza/**` change (research §2.9); moving it upstream is a D14 follow-up, not this change. | None |
| 2 | harness | C3 / T10 (vendor only) | `speech-gate.mjs` compiles the current patched upstream classes through `current-sources.mjs`; no Alpha product text is sliced. | None. | — |
| 3 | test + `index.mjs` | T4 | Runs in `test/quint-speech-gate.test.mjs` and again in the native aggregate. | One runner. | None |
| 4 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |
| 5 | — | D7 | Models always-on listening, which the PRD still plans (DECISIONS D7). Keep even though no production entry enables it today. | None. | — |

## Proposed end state
Model unchanged. Runs only when the upstream pin or patch set changes, or its harness/model changes. Listed as an upstream follow-up (D14) to move with its source.
