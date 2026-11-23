# specs/quint/refinement/native/LiveCaptureTraces.java
- Lines: 208 | Kind: Quint refinement harness (vendored `LocalSpeechBridgePlugin` parent, `LiveCaptureController`, `LiveVoiceCapture`, `LiveCaptureResource`, `LiveCaptureAdmission`, staged/patched where applicable; AudioRecord/VAD ports) | Verdict: KEEP (gate on upstream)
- Covers: live voice capture admission and cleanup: permission prompt (granted, denied, replaced, host pause/resume/destroy, call during prompt), late physical open, call during opening (with release failure), stop/discard while opening, replacement, open failure, active call/pause/destroy, stop tail frames, replace active. Duplicates: `LiveCaptureProbe.java` (unused subset, DELETE); renderer side `test/live-voice.test.mjs`, `test/native-live-start-cancellation.test.mjs` (source text, different layer). Callers/importers: `live-capture.mjs` `checkLiveCapture`, native aggregate, `test/quint-live-capture.test.mjs`.
- Model live: `NativeLiveCapture` (sources all `vendor/eliza/plugins/plugin-local-inference/...`). Product-reachable via the voice plugin.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 80 | T10 (JDK) | `Trace.read(worker(),"e")` reads the private delegate field of the JDK's `Executors` wrapper to inspect the queue; needs `--add-opens=java.base/java.util.concurrent=ALL-UNNAMED` (line 203) and may break on a JDK update. | Observe queued tickets through a port (e.g. upstream exposes the `ThreadPoolExecutor`, or the harness wraps `execute` via the platform stub) instead of JDK internals. | medium |
| 2 | 199-207 | C3 | Self-spawning campaign duplicates `javaTraceCampaign` (here also to pass `--add-opens`). | Let `javaTraceCampaign` accept JVM options; delete the branch. | low |
| 3 | 37-55 | — | `workers()` retries a rejected barrier submit with 1 ms sleeps up to 5 s; the comment explains the one-slot production queue. Condition-based, not a fixed sleep. | Keep. | low |
| 4 | 33 | C3 | `captured(lambda,type)` duplicates `ListenerInputTraces.captured`. | Shared `Trace.captured`. | low |

## Proposed end state
Same 20 scenarios via `javaTraceCampaign`, no JDK-internal reflection, shared helpers; runs only on upstream pin/patch, model or harness changes.
