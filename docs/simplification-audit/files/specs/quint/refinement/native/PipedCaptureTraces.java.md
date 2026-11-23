# specs/quint/refinement/native/PipedCaptureTraces.java
- Lines: 175 | Kind: Quint refinement harness (upstream `LocalSpeechBridgePlugin`, `LiveCaptureController`, `LiveVoiceCapture`, `LiveSegmentPipe` run together; provider transport and audio are ports) | Verdict: KEEP (upstream-only model lane; simplify runner)
- Covers: live model `specs/quint/native/NativePipedCapture.qnt`: piped live capture with native ASR: warm-up before AudioRecord opens, call during open, owner retirement during warm-up/batch, warm failure, host pause/destroy while warming or live, discard, provider error/ASR failure, unconfirmed close. 14 scenarios. Duplicates: `asr-pipe.mjs`/`AsrPipeTraces` cover the pipe alone; `live-capture.mjs` covers non-piped capture. Runs in `test/quint-piped-capture.test.mjs` and the aggregate (`index.mjs:190`).
- Callers/importers: `piped-capture.mjs` (`checkPipedCapture`); uses `live-capture-platform.mjs`, `live-capture.mjs:liveCaptureSources`.

## How it is tied to product code
- Upstream sources only (no patches in `android/upstream-native-sources.json`). The `Bridge` subclass passes Alpha's prefixes `alpha-cloud-voice-`/`alpha-cloud-tts-`, the only product-specific input.
- Reflection on many private fields: controller `pipes`, `admission.active.{cancelled,discard}`, `current`, `stopWorker`, `worker`, `pipeWorker`; bridge `epoch`, `speechForeground`, `destroyed`, `live`, `workers`; pipe `closed`, `finished`; capture `running`, `thread`, `sink`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | Upstream-only model on every PR. | Upstream lane (see `OnDeviceRecognizerTraces.java.md`). | None |
| 2 | 168-174 | C5 | Per-scenario JVM launcher duplicated. | `javaTraceCampaign`. | Low |
| 3 | 44-56 | T8 | `Thread.sleep(1)` polling loops with 5-8 s deadlines. They wait on conditions, not fixed sleeps. | None. | None |
| 4 | 60-78 | D8 | Dense observation code. | Split when touched. | None |

## Proposed end state
Unchanged scenarios; launcher replaced by `javaTraceCampaign`; executed once in the upstream-change lane.
