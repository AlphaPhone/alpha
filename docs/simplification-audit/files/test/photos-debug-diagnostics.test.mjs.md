# test/photos-debug-diagnostics.test.mjs
- Lines: 49 | Kind: source-text + host-JVM transplant (regexes on `AlphaPhotosPlugin.java` and on patched vendor `PhotosPlugin.java`/`PermittedPhotosPlugin.java` from `preparePatchedNative()`; brace-matches `enum Diagnostic` and `qaMarker` into a generated harness with a fake `android.util.Log`) | Verdict: DELETE
- Covers: Photos QA debug markers are fixed enum names under the `AlphaPhotosQA` tag, failure categories never carry exception text, and release builds log nothing. Duplicates: none. Research verdict (`tests-host.md:947` "keep") is corrected: it is a transplant plus four source regexes. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs`; calls `scripts/prepare-patched-native.ts` (materialises the patched vendor tree: notable cost).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-19 | T1 | Four regexes on Alpha and vendor Java (exact call text such as `}, () -> diagnostic(Diagnostic.READ_SUCCEEDED));`). | Delete. | None |
| 2 | 9, 24-45 | T2 | Copies `enum Diagnostic` and `qaMarker` into a stand-in class; tests the copy. | Delete. | Low |
| 3 | 13 | - | Cost: prepares the patched vendor native tree just to read three files. | Gone. | None |
| 4 | - | A7 | `AlphaPhotosQA` is read by nothing in `scripts/`, `test/` or androidTest (grep: only this test and `AlphaPhotosPlugin.java`). The marker logging may itself be dead debug code. | Owner question: if no manual QA procedure reads the tag, delete `qaMarker` and the `diagnostic` override in `AlphaPhotosPlugin.java`. | Low |

## Proposed end state
File deleted. If the QA markers stay, the "release builds log nothing" rule belongs in the APK/bundle audit (no `AlphaPhotosQA` string reachable when `BuildConfig.DEBUG` is false) or an instrumentation run on a release-like build, not a source transplant.
