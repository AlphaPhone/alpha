# test/browser-construction.test.mjs
- Lines: 72 | Kind: transplant (T2) of upstream Java + host-JVM unit (P6) | Verdict: DELETE
- Covers: fresh WebView tab settings (no WebAuthn compat converter, isolated profile, private cookie policy, autofill, file/content access off, mixed content never) for `BrowserTabHostPlugin.build`. Duplicates: upstream `vendor/eliza/plugins/plugin-native-browser-surface/test/native-host/BrowserTabHostConfigTest.java`, `BrowserSessionPolicyTest.java` (profile rules); `android/app/src/androidTest/.../BrowserCookiePolicyInstrumentedTest.java` (real profile/cookie policy); `browser-web-features.test.mjs:99-120` (same passkey/profile rules as regexes). Callers/importers: none. Imports `test/fixtures/jvm-tools.mjs` (146 importers, survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-18, 46 | T2, T10 | Slices `vendor/eliza/.../BrowserTabHostPlugin.java` between `' private Tab build(String id, boolean priv, String profileName)'` and `'   t.readingWorld='` and pastes it into a generated Java class with hand-written Android fakes (`WebSettings`, `CookieManager`, `WebViewCompat`, ...). | Delete. | low |
| 2 | 12 | T5 | The code under test is upstream (`vendor/eliza`). Alpha only supplies profile names (line 28). A regression belongs to the upstream suite. | Upstream follow-up (D14) if the rule is not already pinned there. | low |
| 3 | 69-70 | P6 runtime | Spawns `javac --release 11` + `java` per run (~3-6 s). | Gone with the file. | none |
| 4 | 28 | A1 | Exercises `legacyEphemeralPrefix("alpha_public_")` refusal: a legacy-profile rule. | Note for the Android legacy cleanup (D17 scope). | none |

## Proposed end state
Delete. Real coverage is the instrumented `BrowserCookiePolicyInstrumentedTest` (profiles + cookies on a real WebView) and upstream host tests. If the owner wants a WebAuthn-converter guard on device, add one assertion to `BrowserWebFeaturesInstrumentedTest` (construct a tab on API levels without the feature).
