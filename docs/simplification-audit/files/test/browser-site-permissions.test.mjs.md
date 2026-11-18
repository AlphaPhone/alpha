# test/browser-site-permissions.test.mjs
- Lines: 33 | Kind: test of upstream (T5: compiles and runs `vendor/eliza/.../test/native-host/BrowserSitePermissionRecordTest.java` on the host JVM) + source-text (T1: regexes over `AlphaBrowserStores.java`, upstream `BrowserSessionStore.java`, `BrowserTabHostPlugin.java`) | Verdict: DELETE
- Covers: site-permission records (allow/deny/damaged/200-origin bound) parse under upstream rules; Alpha keeps its preference file names and key aliases; prompts are planned only for the shown page and chained to Android runtime permissions. Duplicates: upstream `BrowserSitePermissionRecordTest.java`, `BrowserSitePromptTest.java` (run upstream); `browser-web-features.test.mjs:74-84` (same prompt/store regexes); instrumented `BrowserWebFeaturesInstrumentedTest`, `BrowserStorageFormatInstrumentedTest` (installed store names). Callers/importers: none; imports `test/fixtures/jvm-tools.mjs` (survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-17 | T5, P6 | Re-runs an upstream test file at the pin on every host-test run (javac + org.json jar; skipped when the jar is absent: `jsonJarSkip`, P14-style conditional). | Delete; upstream follow-up (D14) to keep it in upstream CI. | none |
| 2 | 15 | A1 | "old-format records" naming: legacy-format reading is upstream's; Alpha has no old records (D1). | Note only. | none |
| 3 | 19-33 | T1, T4 | Regexes over Java, partly duplicated in `browser-web-features.test.mjs`. Installed names (`alpha-browser-bookmarks`, key alias `-v1`) are persisted identities (G5): the instrumented storage-format test is where a rename would show. | Delete. | low |

## Proposed end state
Delete. Persisted store names stay byte-identical by review (G5) and are exercised by `BrowserStorageFormatInstrumentedTest`. Prompt behaviour is device-only: instrumented `BrowserWebFeaturesInstrumentedTest`.
