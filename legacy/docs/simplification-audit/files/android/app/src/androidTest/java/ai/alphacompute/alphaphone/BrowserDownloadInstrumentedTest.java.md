# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserDownloadInstrumentedTest.java
- Lines: 137 | Role: WebView attachment → native review dialog → DownloadManager; exact bytes, denial, cancellation, HTTP failure, history cleanup. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `test/ci-emulator-evidence.test.mjs:260-262` splits this file on `@Test` and asserts exactly one method whose body matches `assumeTrue\([^;]*BuildConfig\.ELIZA_DEV_ALLOW_TEST_MOCKS\)` (T1); `test/android-instrumentation-runner.test.mjs:284,505-511` (runner fake treats it as all-skipped); `scripts/android-instrumentation.ts:158,347-349`; `scripts/owner/emulator-campaign-check.ts:45,59`. Preference names `alpha-browser-downloads` / key `owned` mirror the upstream download store.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-33 | C3 | `host/ready/clickHost/address` copies (4th copy of the address-bar typing). | `BrowserTestDriver`. | Low. |
| 2 | 35-45, 46-57, 62-70 | C3 | Three bounded BFS walks over the active accessibility tree (by text, for diagnostics, by content description); AndroidShade:95-106,133-142 has two more. | One `AccessibilityNodes.find(root, limit, predicate)`. | Low. |
| 3 | 72-83 | B5/B1 | `networkState()` diagnostic with two catch-all returns, only used in a failure message. | Keep only if a past failure needed it; otherwise delete (failure message keeps status/reason/bytes). | Low. |
| 4 | 93-105 | C3/C5 | Hand-rolled loopback HTTP server (ServerSocket + executor + header parse + `catch(Exception cancelled){}`); 12 androidTest files open `ServerSocket(0`, 3 of them in BrowserFlow alone. | One `LoopbackHttpFixture` (routes → status/headers/body, slow-release latch, request counters) in androidTest. | Low-medium. |
| 5 | 116, 126, 128 | C3/D8 | Three DownloadManager cursor poll loops, one of them a 700-character line. | `DownloadRows.awaitStatus(manager, id, predicate)`. | None. |
| 6 | 105 | B1 | `catch(Exception cancelled){}` in the fixture server swallows every handler error, which can hide a fixture bug as a product timeout. | Record the first handler exception and rethrow it in `finally`. | Low. |
| 7 | 133-134 | D7 | Cleanup edits the upstream download store's SharedPreferences JSON (`alpha-browser-downloads`/`owned`) directly. | Use the plugin's own remove path, or isolate in `BrowserHostProbe`. | Medium. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host/ready/clickHost/address` | helper | 24-33 | BrowserFlow:23-32, BrowserContinuity:21-32, BrowserDialogLifecycle:16-19 | `BrowserTestDriver` |
| `page()` | helper | 34 | BrowserFlow:74, BrowserContinuity:33 | `BrowserTestDriver.awaitChild` |
| `nativeNode`/`safeButtonDiagnostic`/`nativeClickDescription` | helper | 35-70 | AndroidShade `text`/`holdsRows` | `AccessibilityNodes` |
| `networkState` | helper | 72-83 | none | delete or keep |
| loopback server | inline | 93-105 | BrowserFlow:145-154,173-181,195-203 + 9 more files | `LoopbackHttpFixture` |

## Proposed end state
~105 lines: still exactly one @Test whose body starts with the test-mocks `assumeTrue` (keeps the ci-emulator-evidence pin), using shared driver, node finder and loopback fixture.

## Verification
`--test-mocks --classes BrowserDownload` (both variants). Host: `node --test test/ci-emulator-evidence.test.mjs test/android-instrumentation-runner.test.mjs`.
