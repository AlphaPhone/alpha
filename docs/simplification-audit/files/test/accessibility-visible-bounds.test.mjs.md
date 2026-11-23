# test/accessibility-visible-bounds.test.mjs
- Lines: 16 | Kind: unit (host javac of `android/app/src/androidTest/.../AccessibilityBounds.java` plus `test/fixtures/AccessibilityBoundsTest.java`, run on the host JVM) | Verdict: DELETE
- Covers: clipped descendants excluded from accessibility bounds. Duplicates: the emulator classes that use `AccessibilityBounds` (`TalkBackOrder.java`, `AccessibilityViewsInstrumentedTest`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | T5 | Tests a helper of the instrumentation test source set (test machinery), on a host JVM. | Delete with its fixture. | Low |
| 2 | 11 | B2 | Resolves `JAVA_HOME` itself and bypasses `jvmSkip`/`runJvm` from `fixtures/jvm-tools.mjs` (one of 7 such files). | Moot once deleted. | - |
| 3 | 13 | - | Spawns javac (seconds per run). | Removed cost. | - |

## Proposed end state
File deleted together with `test/fixtures/AccessibilityBoundsTest.java` (23 lines; its only importer is this test, checked
with grep). The helper is exercised wherever the emulator accessibility classes run.
