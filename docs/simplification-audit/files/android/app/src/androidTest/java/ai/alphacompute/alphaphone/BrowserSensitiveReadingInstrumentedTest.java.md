# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserSensitiveReadingInstrumentedTest.java
- Lines: 108 | Role: sensitive URLs and page content are refused before review, token or outbound speech | Verdict: SIMPLIFY
- Importers: none. Registry `BrowserSensitiveReading` (`scripts/android-instrumentation.ts:205`); CI lane `READING_TEST_MOCKS_CLASSES` (`scripts/ci/emulator-suite.ts:38`). Text/path pins: `test/ci-emulator-evidence.test.mjs:224,279`, `test/browser-reading-capability.test.mjs:126` (comment), `test/browser-tab-host-identity.test.mjs:60-73`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23 | D4 | Forwarders `js/waitFor/result/call` and alias `child=reading.child`. | Use `reading.*` directly. | Low |
| 2 | 44, 66 | C6 (local) | `new String[]{"api_key","api-key","api%20key","apikey","%61pi%5fkey","API+KEY"}` written twice. | `private static final String[] KEY_SPELLINGS`. | Low |
| 3 | 40-43, 76 | C3 | Reflection into `BrowserTabHostPlugin.tabs` (5 files) and `reading`/`dialog` (5 files). | `BrowserTestDriver.tab(id)` / `readingDialog()`. | Low |
| 4 | 100-101 | T3 / T5 | `BrowserPageReading.sensitiveUrl(...)` assertions are a pure-function unit test of upstream code inside an emulator journey. | Move to upstream `plugin-native-browser-surface/test/native-host` (a `BrowserPageReading` host test), delete here. | Low |
| 5 | 103-104 | T4 | Re-installs MARKUP and runs `reading.cancelThenApproveOnce` — already the whole of `BrowserReadingInstrumentedTest.explicitImmutable…` in the same CI lane. | Delete lines 103-104 (and `installed` handling stays for `installBody`). | Low |
| 6 | 96-97 | T8 / C3 | Hand poll `for(int i=0;i<300&&!...)SystemClock.sleep(100)` then repeat the predicate as an assert. | `BrowserTestDriver.childUntil(predicate)` (exists privately in `BrowserWebFeaturesInstrumentedTest:63`). | Low |
| 7 | 87, 92 | A3 / P15 | Uses the paired `remote:` speech slot and loopback server only to prove "0 bodies sent". | With P15, assert "no token issued" only; drop server/slot. | Medium (owner) |
| 8 | 52-56 | KEEP | `UrlFixture` delegating WebViewClient: needed to serve exact synthetic routes; fine. | none | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `navigate(url)` | helper | 24-33 | none (native `AlphaBrowser.navigate` check) | keep |
| `UrlFixture` | class | 35-60 | `BrowserReadingNavigation` intercepting client (62, 131) | keep |
| `urlVariants` | helper | 61-81 | none | keep |
| key spellings | const | 44, 66 | itself | local static array |

## Proposed end state
No forwarders, one key-spelling array, shared reflection/poll helpers, no duplicate approve/cancel tail, upstream
`sensitiveUrl` unit cases moved upstream. Est. ~85 lines (≈75 with P15).

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes BrowserSensitiveReading`; `node --test test/ci-emulator-evidence.test.mjs`.
