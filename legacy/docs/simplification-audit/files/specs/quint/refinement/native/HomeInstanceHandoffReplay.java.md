# specs/quint/refinement/native/HomeInstanceHandoffReplay.java
- Lines: 202 | Kind: Quint replay harness (ITF forward replay on real `MainActivity` compiled with `javac` against Android stubs) | Verdict: KEEP, PORT when `MainActivity` hand-off is extracted
- Covers: every `HomeInstanceHandoff.qnt` simulator step (external start, front-start arrival, resume, relaunch, destroy) replayed on the real `MainActivity` hand-off / task-kind logic; observation compared to model state. Duplicates: partly `MainActivityRecoveryTraces.java` `handoff-*` scenarios (same hand-off code, different model `RendererRecovery`); source-text host tests `test/gesture-zones-single-instance.test.mjs`, `test/home-role-recovery-contract.test.mjs` pin the same code by regex. Callers/importers: `home-instance-handoff.mjs` (via `itf-replay.mjs` `replayJava`), registered in `forward-replays.mjs` (native aggregate `index.mjs`) and `test/quint-home-instance-handoff.test.mjs` (runs it twice: per-model wrapper + aggregate, T4).
- Model live: yes, `specs/quint/native/manifest.json` entry `HomeInstanceHandoff` (sources `MainActivity.java`, 10 symbol pins). Product code exists and stays (D7/D17 do not touch it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-42, 72, 101, 159-160 | T10 / D7 | Reflects private statics of `MainActivity` by name: `FRONT_START_TOKEN`, `handOffUnreliable`, `unackedFrontStarts`; uses package-private `liveInstance()`, `wasHandedOff()`, `startedAsHome()`. The MainActivity report (D1) plans extracting a `HomeInstanceHandoff` class; every field rename breaks this harness. | When `HomeInstanceHandoff` is extracted, give it a package-private read-only view (`unacked()`, `unreliable()`, `frontToken()`) and call it; drop reflection. Until then use one shared `Trace.readStatic(Class,String)` instead of the local `staticField`. | medium |
| 2 | 38-42 | C3 | Local `staticField` duplicates `MainActivityRecoveryTraces.staticField/field` and the reflection loop in `Trace.read`. | Add `Trace.readStatic`; delete the local helpers in both harnesses. | low |
| 3 | 23-31 | — | `Page` subclass counting `onNewIntent` deliveries is a legitimate port; fields `taskId`, `loads` come from the stub `BridgeActivity` in `main-activity-platform.mjs`, not product. | Keep. | — |
| 4 | — | T4 | The replay runs from `test/quint-home-instance-handoff.test.mjs` and again from the native aggregate (`forward-replays.mjs` → `index.mjs` → `test/quint-native-refinement.test.mjs`). | Keep one runner (per-model wrapper or aggregate, see chunk summary). | low |
| 5 | — | P1 | Costs a Quint simulator run (64 traces, 30 steps) + `javac` + one JVM per trace. | Path filter: `android/app/src/main/java/**/MainActivity.java`, `RendererRecoveryBudget.java`, `NavigationOpenRequest.java`, `specs/quint/native/HomeInstanceHandoff.qnt`, this directory. | — |

## Proposed end state
Same replay, unchanged scenario logic. After the MainActivity split it compiles `HomeInstanceHandoff.java` (+ the slimmer MainActivity) and reads state through a package-private view instead of reflection.
Reflection helpers come from `Trace.java`. Runs once per CI pass, only when the hand-off sources, the model or the harness change.
