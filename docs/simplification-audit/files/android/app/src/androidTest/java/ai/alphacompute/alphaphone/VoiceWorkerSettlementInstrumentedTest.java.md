# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VoiceWorkerSettlementInstrumentedTest.java
- Lines: 61 | Role: Reflection-driven test of upstream `ai.eliza.voice.LocalSpeechBridgePlugin` internals (`workers`, `gate`, `capture`, private `submit` and nested `$Work`) through Alpha's subclass `AlphaVoiceCloudPlugin`: settlement ordering, admission release, cancellation drain. | Verdict: MOVE to upstream (`vendor/eliza/plugins/plugin-local-inference/native/android/speech-bridge`) then DELETE here
- Importers: none. Registry `scripts/android-instrumentation.ts:288` `VoiceWorkerSettlement: {}` (runs under `--classes`/`--all`). Text/path pins: only that registry key (cross-checked by `test/android-instrumentation-runner.test.mjs`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-24, 34, 37, 53 | T5 / D7 | Tests upstream package-private machinery by reflection: `LocalSpeechBridgePlugin.class.getDeclaredField(name)`, `Class.forName(...+"$Work")`, `getDeclaredMethod("submit",...)`. Any upstream rename breaks Alpha's test APK while Alpha owns none of the code under test. Upstream already has `speech-bridge/test/failure-settlement.test.mjs`. | Propose this test upstream (as a real Java/Robolectric or instrumentation test of `LocalSpeechBridgePlugin`), advance the submodule, delete the file and the registry key. Per AGENTS.md, upstream change goes through a reviewed commit, not an edit of `vendor/eliza`. | Medium: coverage gap until upstream lands; ask owner. |
| 2 | 33-60 | D8 | Every method is 1-3 physical lines of 300-800 chars. | Formatter pass if kept anywhere. | None. |
| 3 | 37, 47 | C3 | Same continuation lambda (`assertTrue(gate.idle()); submit(p,next,...)`) written twice. | Shared helper if the test survives. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Body` | interface | 18 | none | upstream test |
| `Call extends PluginCall` | class | 25-32 | hand-written `PluginCall` fakes in other androidTest classes (e.g. `HostedResultsLifecycleInstrumentedTest`, research P20) | upstream test |
| `field`, `result`, `submit` | helper | 19-24 | none | upstream test |

## Proposed end state
Deleted from Alpha (0 lines) once an equivalent upstream test exists; registry key `VoiceWorkerSettlement` removed.

## Verification
Upstream: run the speech-bridge suite in `vendor/eliza` at the new pinned commit (`upstream.lock.json`). Here: `node --test test/android-instrumentation-runner.test.mjs` and androidTest compile.
