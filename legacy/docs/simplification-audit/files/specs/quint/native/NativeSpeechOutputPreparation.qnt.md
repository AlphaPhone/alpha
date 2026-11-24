# specs/quint/native/NativeSpeechOutputPreparation.qnt
- Lines: 59 | Kind: Quint model of upstream-only code, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles the real upstream Java | Verdict: KEEP (path-gate on upstream pin)
- Covers: Speech output lead trimming (bounded pre-roll, onset at threshold, pass-through after open) and the first-write report firing once before the first write, never retried after a callback failure (3 runs, 4 invariants). Duplicates: none. Callers/importers: manifest; `specs/quint/refinement/native/speech-output-preparation.mjs`; `test/quint-speech-output-preparation.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P1 / upstream (§2.9) | Every source is under `vendor/eliza` (`SpeechLeadTrim`, `FirstWriteSpeechOutput`, plus bridge/engine/probe files for constants); the code ships in the APK through `android/upstream-native-sources.json` module `plugins/plugin-local-inference/native/android`, so the model is live, but it can only change on a pin bump. | Run it only when `upstream.lock.json`, `android/upstream-native-sources.json` or `patches/eliza/**` change (research §2.9); moving it upstream is a D14 follow-up, not this change. | None |
| 2 | harness | C3 / T10 (vendor only) | `speech-output-preparation.mjs` compiles the current patched upstream classes through `current-sources.mjs`; no Alpha product text is sliced. | None. | — |
| 3 | test + `index.mjs` | T4 | Runs in `test/quint-speech-output-preparation.test.mjs` and again in the native aggregate. | One runner. | None |
| 4 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |
| 5 | harness `speech-output-preparation.mjs:15-18` | T10 (vendor) | Regex-reads `STREAM_RATE`, `AUDIBLE_LEVEL` and the `new SpeechLeadTrim(…/N)` divisor from upstream source text to compute the production lead (727). | Read the constants by compiling a one-line Java probe that prints them, or accept as upstream-only text pin. | Low |
| 6 | manifest `sources` | — | Lists nine files, including `android/upstream-native-sources.json`, `StreamingSpeechPlayback`, `SpeechPcmQueue`; the harness compiles six. The source list is wider than the model. | Trim `sources` to what the harness compiles and reads. | None |
| 7 | — | C5 | Shares four manifest sources with `NativeSpeechWarmup.qnt` but models different classes (`SpeechLeadTrim`/`FirstWriteSpeechOutput` vs `SpeechOutputWarmup`). Not a merge. | None. | — |

## Proposed end state
Model unchanged. Runs only when the upstream pin or patch set changes, or its harness/model changes. Listed as an upstream follow-up (D14) to move with its source.
