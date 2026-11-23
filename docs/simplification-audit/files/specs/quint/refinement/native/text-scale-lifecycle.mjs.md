# specs/quint/refinement/native/text-scale-lifecycle.mjs
- Lines: 37 | Kind: Quint refinement harness (Java) — whole `MainActivity` + sliced `AlphaDevicePlugin` via platform | Verdict: KEEP (depends on platform PORT)
- Covers: model `NativeTextScaleLifecycle` (live) — text scale applied across two Activity instances, configuration changes, queued writes, failed commit + restart, WebView unavailable, stateless timeout readback. Duplicates: `test/quint-native-text-scale-lifecycle.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19 | – | Compiles `MainActivity.java`, `RendererRecoveryBudget.java` and the navigation request source whole: good. | Keep. | – |
| 2 | 20-23 | B5 | Hashes `navigationActionSource`, `deviceSource`, Capacitor `PluginCall.java` and `AndroidManifest.xml`; the first two/three are only read as text by the platforms, the manifest not at all. | Drop the manifest; the others disappear after the platform PORT. | L |
| 3 | 25 | – | 8 scenarios, campaign runner. | Keep. | – |

## Proposed end state
Compiles `MainActivity`, `RendererRecoveryBudget`, the extracted `TextScale` class and stubs; inputs = compiled files.
Lane: those classes + `main-activity-platform.mjs`, `MainActivityPorts.java`, `TextScaleLifecycleTraces.java`.
