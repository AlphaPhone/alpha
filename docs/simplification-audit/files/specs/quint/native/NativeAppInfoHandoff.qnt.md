# specs/quint/native/NativeAppInfoHandoff.qnt
- Lines: 128 | Kind: Quint model (live, `native` manifest; JVM refinement harness) | Verdict: KEEP
- Covers: the launcher's "App info" bridge call validates input, resolves personal vs work-profile package, and launches Settings only after a matching lookup. Duplicates: none (the renderer side is `application` `app-info-handoff-composition`, which imports this harness). Callers/importers: `native/manifest.json` (11 tests, 5 invariants), harness `refinement/native/app-info-handoff.mjs` (+ `app-info-handoff-platform.mjs`), also imported by `refinement/application/app-info-handoff-composition.mjs`; tests `test/quint-native-app-info-handoff.test.mjs` and the native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Good tie: the complete `AlphaSystemPlugin.java` compiles and `openAppInfo` runs. Text slices are only on third-party/upstream files: `SystemLauncherApps.java` (`malformedText(`…`/** Why the current user`) and Capacitor `PluginCall.java` (`getData()`…`getInt`), `app-info-handoff-platform.mjs:28,201`. | Upstream follow-up (D14): ask `plugin-native-system` to expose the validator so the slice can go. No consumer change. | L |
| 2 | 1-128 | - | Small, single-purpose, invariants match the product contract (no launch after a refused lookup). Product file exists and is live. | None. | - |
| 3 | test wrapper | T4, B5 | Run twice (per-model + aggregate); wrapper pins `traces 12`, `checkpoints 79`, `observedFields 15`. | One runner; `> 0`. | L |

## Proposed end state
Unchanged model. Harness stays import-shaped for product code; the two upstream slices are listed as upstream follow-ups.
