# test/live-capture-resource.test.mjs
- Lines: 31 | Kind: upstream test re-run (`vendor/eliza/.../LiveCaptureResourceTest.java`, `LiveCaptureAdmissionTest.java` on the host JVM) plus source-text regexes over vendor `LiveVoiceCapture.java`, `LiveCaptureController.java`, `LocalSpeechBridgePlugin.java` | Verdict: DELETE
- Covers: shared capture resource release ordering and admission/stop ordering in the upstream `ai.eliza.voice` pipeline. Duplicates: the fixtures are upstream's own tests (`vendor/eliza/packages/app/scripts/paradee-voice/speech-pipeline`); `specs/quint/refinement/native/live-capture.mjs` + `LiveCaptureTraces.java` (and `test/quint-live-capture.test.mjs`) replay the live-capture model against these classes. Callers/importers: `npm test` glob; uses `test/fixtures/jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 17 | T5 | Re-runs `vendor/eliza` host tests; upstream owns them (R6 / D14). | Delete; list as an upstream follow-up that upstream CI runs them. | Low |
| 2 | 9-13, 20-30 | T1 | Regexes and `indexOf` ordering checks on vendor source text (statement order inside `stop()`). | Delete. | Low |

## Proposed end state
File deleted. Alpha's coverage of live capture is the LiveCapture Quint replay; upstream keeps its own JVM tests.
