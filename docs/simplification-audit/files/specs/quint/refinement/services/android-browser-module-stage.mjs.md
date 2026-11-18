# specs/quint/refinement/services/android-browser-module-stage.mjs
- Lines: 81 | Kind: Quint refinement harness (imports real `scripts/android-host.ts`, `prepare-patched-native.ts`, `upstream-native-source.ts` through `test/fixtures/android-browser-module-stage.mjs`; scratch Git/Gradle host generation) | Verdict: KEEP (owner question: models of build scripts)
- Covers: model `AndroidBrowserModuleStage`: the browser native module is staged from authenticated upstream source, a refused source/publication/route/settings write keeps the previous host and cache byte for byte, a drifted cache is refused, an unowned `settings.gradle` is left alone, and the packaged receipt accepts only its own generation (8 traces, 43 checkpoints). Duplicates: `test/prepare-patched-native*.test.mjs` / `test/upstream-native-source.test.mjs` exercise the same stager on similar fixtures; the real proof is `npm run android:build:local`. Importers: `index.mjs`, `test/quint-android-browser-module-stage.test.mjs` (wrapper, MERGE per its report).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16, 34-36 | D10 | Outcome classification by regex on error message text (`/^Upstream source checkout is dirty$/` ...). A wording change in the script breaks the harness. | Have the stager throw errors with a `code` property and match codes. | Low |
| 2 | 55-57 | B5 | `captureInputs` over the full browser module file list from `git ls-tree` of the pin (hundreds of upstream files) for the receipt. | Hash only the Alpha scripts and the model; the pin is already identified by `upstream.lock.json`. | Low |
| 3 | — | §2.11 | Models build tooling (research proposes dropping such models: "their e2e test is the build"). The owner brief says live models stay. | Owner question; until answered KEEP and run only when `scripts/android-host.ts`, `prepare-patched-native.ts`, `upstream-native-source.ts`, `android/consumer-host.json` or the pin change. | — |
| 4 | 77-80 | — | Assumptions prose is long but is receipt content; fine. | None. | — |

## Proposed end state
Unchanged traces; error-code matching instead of message regexes; smaller hashed input set. Path-filtered to the stager scripts in CI.
