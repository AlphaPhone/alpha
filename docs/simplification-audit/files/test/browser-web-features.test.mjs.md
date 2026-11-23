# test/browser-web-features.test.mjs
- Lines: 120 | Kind: source-text (T1: ~63 regexes over upstream `vendor/eliza/plugins/plugin-native-browser-surface` Java and `AlphaBrowserPlugin.java`/`AlphaBrowserStores.java`) | Verdict: DELETE
- Covers (by text only): private downloads not persisted, download cookies only from the requesting tab/origin, blob capture in an isolated world, site permissions origin-bound, HTTP auth only over HTTPS, passkeys disabled, autofill commit on page navigation, third-party cookie policy per profile. Duplicates: instrumented `BrowserWebFeaturesInstrumentedTest`, `BrowserDownloadInstrumentedTest`, `BrowserCookiePolicyInstrumentedTest`, `BrowserSigninsInstrumentedTest`, `PasswordBrowserFillInstrumentedTest`; upstream host tests `BrowserWebPolicyTest`, `BrowserSitePromptTest`, `BrowserHttpAuthOriginTest`, `BrowserProfileCaptureTest`; `browser-site-permissions.test.mjs`, `browser-construction.test.mjs` (same rules). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | T1 | Header: "Behaviour is exercised on Android by BrowserWebFeaturesInstrumentedTest; these keep the privacy invariants from regressing between device runs." A regex cannot keep a behaviour; it only blocks edits. | Delete. | low |
| 2 | 15-22 | T5 | 7 of 9 files read are upstream at the pin; any upstream reformat breaks Alpha's suite. | Delete; rules live in upstream tests (D14 follow-up if any rule is missing there). | low |
| 3 | 77, 109 | P8 | Exact occurrence counts (`setPermission` twice, `commitAutofill(` twice). | Delete. | none |
| 4 | 38, 83, 119 | — | Alpha-owned facts: loopback only in test-mocks builds; installed names `alpha-browser-session`, `alpha_browser_v1`. | Loopback rule: add to `scripts/audit-production-bundle.ts`/`verify-apks` (production APK `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS=false`). Names: G5 review + `BrowserStorageFormatInstrumentedTest`. | low |

## Proposed end state
Delete. Device behaviour: the instrumented browser tests (they are what proves it; an APK build is not that evidence, AGENTS.md). Production-only rule (no loopback downloads) is checked on the built APK by the release audit, not by text.
