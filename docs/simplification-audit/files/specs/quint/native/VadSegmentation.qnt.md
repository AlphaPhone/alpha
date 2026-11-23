# specs/quint/native/VadSegmentation.qnt
- Lines: 95 | Kind: Quint model (live, `additionalProofInit: counterInit`) | Verdict: KEEP (upstream lane only); de-duplicate its harnesses
- Covers: `LiveVadGate` hysteresis: two windows >= 0.5 open, sixteen < 0.35 close, NaN/Inf as silence, `close` reports prior state. Duplicates: three replays of the same gate: `FinitePolicyTraces.java` group in `refinement/native/index.mjs:96-111`; `specs/quint/native/recovery-vad-conformance.mjs` (+ `test/quint-recovery-vad-conformance.test.mjs`); and `test/quint-refinement-harness.test.mjs:56` uses it as a harness-machinery fixture. Callers/importers: `quint:check`, those three.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest `sources: []` | P6 / §2.9 | Only `sharedSources` (vendor `LiveVadGate.java`, `LiveVoiceCapture.java`). Alpha has no code here; the model is listed in the research as upstream-in-consumer. | Upstream-pin lane (`upstream.lock.json` changes only). Owner/D14 follow-up: move upstream. | Low |
| 2 | – | T4 | The gate is replayed by two independent Java harnesses that compile the same `LiveVadGate.java`: `FinitePolicyTraces` (complete finite projection, in the native aggregate) and `recovery-vad-conformance.mjs` (sampled Quint states). | Keep `FinitePolicyTraces` (exhaustive over the 18 counter states x 11 probability classes). Delete the VAD half of `recovery-vad-conformance.mjs` and its test wrapper (see that file's report). | Low: FinitePolicyTraces is strictly stronger. |
| 3 | – | T5 | `test/quint-refinement-harness.test.mjs:56` uses this model to test the trace-checker itself. | Decided with that test (tests of test machinery are deleted unless they gate a release). | Low |
| 4 | 20-25, 66-95 | – | Model is tight; `counterInit` + witnesses give real coverage. | None. | – |

## Proposed end state
Model unchanged. One harness (`FinitePolicyTraces`) replays it, in an upstream-pin lane. The
`recovery-vad-conformance.mjs` VAD path and the `test/quint-recovery-vad-conformance.test.mjs` wrapper go away.
