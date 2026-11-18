# test/fixtures/google-browser-auth/native-sign-in.test.mjs
- Lines: 783 | Kind: fork of upstream host suite (mixed: plain-JVM unit runs of upstream Java, transplant harnesses, source-text regex of upstream and of the Eliza app) | Verdict: DELETE (fork); MERGE the one Alpha-only test upstream
- Covers: upstream's Eliza Cloud native sign-in client (`vendor/eliza/packages/auth/android`) plus Eliza's own Android host (`packages/app/platforms/android`, `ai.elizaos.app`); it is copied over the staged upstream `test/` dir by `test/google-browser-auth.test.mjs` and run there.
- Duplicates: `vendor/eliza/packages/auth/android/test/native-sign-in.test.mjs` (diff is 160 lines: import of `chain-methods.mjs`, chain count 38 -> 64, one added test "browser Google persists native proof before launching..." at 213-242 of the diff, two cosmetic `.compareExchange` anchor edits). The pinned upstream suite is also run first by the same host test, so ~12 tests run twice per invocation (T4).
- Callers: only `test/google-browser-auth.test.mjs` (copies the overlay dir; `runSuite('Alpha browser',13)`). Nothing in package.json/.github names it directly.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-901 | T5 | Tests upstream code, not Alpha code: `android/upstream-native-sources.json` has `"patches": []`, so the staged `packages/auth/android` is byte-identical to the pin. Alpha's own host is `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInPlugin.java`, which this suite never compiles. | Delete the fork. Upstream's suite belongs to upstream CI. | Low |
| 2 | 362-547, 590-607, 790-901 | T1 | Three tests are pure regex/`indexOf` ordering checks on upstream Java, Gradle, AndroidManifest, the Eliza app's MainActivity, a TS template and a renderer file. | Delete (no Alpha replacement needed; release rules for Alpha's APK live in `verify-apks`). | Low |
| 3 | 609-901 | T5 / identity | Tests the other product's host (`ai.elizaos.app`, "Eliza" names, `eliza.app` hosts). AGENTS.md: do not import the other product's identity; the host test copies `vendor/eliza/packages/app/platforms/android`, templates and `ui/src/android-cloud` into a temp tree only to feed these. | Delete with the fork; the host test then needs none of those copies. | Low |
| 4 | 283-293, 295-329, 331-360, 549-588, 738-788 | T2 | Transplant harnesses: method bodies sliced by literal anchors and injected into `.java.txt` templates with fake Android classes. | Delete here; the behaviour (esp. browser mode, row 5) goes upstream. | Medium (row 5) |
| 5 | 331-360 | coverage | The only Alpha-specific addition: runs `CloudSignInBrowserTest.java.txt` (browser start, Custom Tabs vs default browser, persistence before launch, cancel/supersede, resume grace). Alpha ships `googleSignInMode("browser")` (`AlphaCloudSignInPlugin.java:31`), so this is product-relevant coverage that upstream lacks. | MERGE this test (and its template) into upstream `packages/auth/android/test/native-sign-in.test.mjs`; advance the pin. | Medium |
| 6 | 287 | B5 | Exact scenario counts (`64 scenarios`) make every added case a two-file edit. | Upstream should match `^PASS native sign-in chain` only. | Low |
| 7 | whole | cost | Each run javac-compiles the upstream package ~10 times; the host test that drives it has a 360 s timeout and runs the suite twice. | Gone with deletion. | - |

## Proposed end state
- File deleted together with `upstream-base.json`, the Flow/Readiness forks and the overlay half of `test/google-browser-auth.test.mjs`.
- Upstream follow-up (D14, `cross-file-actions.md` §6): upstream gains the browser-start test and the extra chain scenarios; Alpha advances the pin.
- Alpha keeps behavioural coverage of its own host via the Quint `GoogleBrowserReturnClaim` refinement and Android instrumentation of `AlphaCloudSignInPlugin` (owner to confirm the latter exists).
