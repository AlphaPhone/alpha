# test/paradee-local-adapter.test.mjs
- Lines: 11 | Kind: upstream re-run (javac of vendor `LocalSpeechEngine.java` + vendor `packages/app/scripts/paradee-voice/speech-pipeline/LocalSpeechEngineTest.java`, then runs it) | Verdict: DELETE
- Covers: upstream local speech engine lifecycle (cancel without blocking, reopen, complete PCM validation). Duplicates: upstream runs the same test itself from `vendor/eliza/packages/app/scripts/paradee-voice/speech-pipeline-contract.test.mjs`. Research row (`tests-host.md:932`: "compiles one product Java class") is wrong: both files are in `vendor/eliza`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T5 / T4 | Re-runs an upstream test against upstream code; no Alpha code is compiled. | Delete. | None |
| 2 | 8 | - | Test name says "local speech model ownership" but nothing Alpha-owned is exercised. | Gone. | None |

## Proposed end state
File deleted. The engine is upstream's (D14); its own suite covers it. On-device voice behaviour is the voice journey and the emulator voice campaign's job.
