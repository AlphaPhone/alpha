# test/fixtures/android-browser-module-stage.mjs
- Lines: 189 | Kind: Quint refinement fixture/driver support. It builds a temporary git-backed SDK copy of the browser-surface module and runs the real `generateAlphaAndroidHost` (`scripts/android-host.ts`), `preparePatchedNative` / `verifyNativePatchReceipt` (`scripts/prepare-patched-native.ts`) and `upstreamNativeSource`. It injects faults by monkey-patching `fs.renameSync` and `fs.writeFileSync`. | Verdict: KEEP, MOVE to `specs/quint/refinement/services/android-browser-module-stage-fixture.mjs`, SIMPLIFY
- Covers: the browser module gets staged from the exact pinned upstream bytes into a content-addressed cache. The Android host is generated only from a reviewed route and fresh inputs. Publication and host-write faults leave a consistent state, and drift is detected.
- Duplicates: none for the behaviour. Partial overlap with `test/android-host.test.mjs` and `test/prepare-patched-native*.test.mjs` (see their reports).
- Callers/importers: `specs/quint/refinement/services/android-browser-module-stage.mjs:6,55` is its only importer. That harness is registered in `specs/quint/refinement/services/index.mjs:61`, run by `test/quint-android-browser-module-stage.test.mjs`, and models the live `specs/quint/services/AndroidBrowserModuleStage.qnt` (listed in `specs/quint/services/manifest.json`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | path | D11 | A Quint harness fixture lives in `test/fixtures/` while its only consumer is under `specs/`. | Move it next to the harness. | None |
| 2 | 23-27 | C3 | Local `write`, `read` and `git()` helpers with a sanitised git env duplicate the scripts' `git()` wrappers (17×). | Import the shared `scripts/lib` git helper once it exists. | Low |
| 3 | 32-41 | B3 | `inputs()` asserts the shape of the repo's own host descriptor and native manifest on every call, as preconditions. | Keep one assertion: the browser module has no patches, which is the fixture's stated assumption. Drop the rest. | Low |
| 4 | 127-130 | T1-lite | Regex over generated `build.gradle` / `app/build.gradle` text for `findAll { it.relocateBuild }`. These are upstream generator templates. | Drop it. The `settings.gradle` byte equality and the profile assertions already prove the generated output. | Low |
| 5 | 143-154 | - | The fault injection monkey-patches the global `fs` in-process. This works because the generator uses the same `fs` module. | Keep it. Say in a comment that it requires the generator to use `node:fs` default import. | Low |
| 6 | 57-62 | - | `androidBrowserModuleStageInputs` enumerates every file of the module at the pin through `git ls-tree`. This is input binding for the receipt (B5 territory). | Keep while the harness binds inputs. Revisit with the Quint harness port. | - |

## Proposed end state
About 160 lines beside `android-browser-module-stage.mjs` in `specs/quint/refinement/services/`. It uses the shared git helper, makes one precondition assertion and has no regex on generated Gradle. The model stays live and passing.
