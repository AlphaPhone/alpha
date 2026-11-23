# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserReadingLiveInstrumentedTest.java
- Lines: 60 | Role: live campaign — pairs a "Local development agent", reviews a page and plays real combined-host speech, then aborts a held response | Verdict: DELETE (if paired agents are removed, P15) / otherwise SIMPLIFY
- Importers: none. Run only by `scripts/android-browser-reading-live.ts:284-285` (manual, needs `ALPHA_COMBINED_OWNER_SESSION` and a combined host); listed in `CAMPAIGN_RUNNERS` (`scripts/android-instrumentation.ts:313`). No package.json script or workflow invokes that runner (grep). Text/path pins: `scripts/android-browser-reading-live.ts` (class name, `browser-reading-fixture.json` file contract), `test/browser-tab-host-identity.test.mjs:60-73`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-59 | A3 / P15 | Whole test drives `.alpha-connection details` "Local development agent" pairing and `remote:<origin>` + `device:<sha>` slots. PRD line 17: "No hosted-agent pairing"; sibling combined-host classes `CombinedAgent`, `CombinedAgentRestart` are already in `NOT_RUN_BY_A_RUNNER`. | Delete with `scripts/android-browser-reading-live.ts` and its `CAMPAIGN_RUNNERS` entry once the owner confirms pairing is out of scope. | Medium (owner) |
| 2 | 20-23, 26 | C3 | `resumedActivity()` and the two-hop reflective `dialog()` are copies of `BrowserReadingFixture:29-32,39`. | Use the fixture/`BrowserTestDriver`. | Low |
| 3 | 26, 46-50 | A7 | `dialog(BoundedActivityScenario<MainActivity> scenario)` never uses `scenario`; line 50 `MainActivity a=resumedActivity();` is unused. | Drop the parameter and the local. | Low |
| 4 | 34 | C3 | Inline SHA-256→hex loop (`MessageDigest ... String.format("%02x")`) — 10× in Java per research C3. | Shared `TestHashes.sha256Hex` (androidTest) or the main-source util once one exists. | Low |
| 5 | 34, 37, 55 | C6 | `'alpha.connection.selection.v1'` literal 4× (renderer has the same key in 12 files). | Named constant in `AppNavigation`. | Low |
| 6 | 42 | C3 | Address entry (`Edit address` + value setter + Enter) — 7th copy. | `BrowserTestDriver.address(url)`. | Low |
| 7 | 49, 51 | T8 | `SystemClock.sleep(300)` "Let the controller retire…" and `sleep(500)` before asserting no late playback. | Wait on an observable (`window.__readingFinished` / proxy `posts`) instead. | Low |
| 8 | 53-57 | C3 | Hand-written suppressed-cleanup chain. | `BrowserReadingFixture.attemptCleanup`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `resumedActivity` | helper | 20-23 | `BrowserReadingFixture:29` | `BrowserTestDriver` |
| `waitFor(expr,timeout)` | helper | 24 | ~13 copies | `WebViewTestDriver.until` |
| `click(label)` | helper | 25 | BrowserShare:17, BrowserSignins:35, BrowserWebFeatures:53, Calendar*:click | `BrowserTestDriver.click` |
| `dialog(scenario)` | helper | 26 | 5 files | `BrowserTestDriver.readingDialog` |
| `proxy(origin)` | helper | 27 | none | keep (if kept) |
| `progress(name)` | helper | 28 | `BrowserReadingNavigation.provider` status bundle (28) | keep |

## Proposed end state
Deleted together with `scripts/android-browser-reading-live.ts` (−60 lines here, runner ~300 lines) if pairing is out.
If kept: shared helpers, no unused parameter/local, condition waits; ~45 lines.

## Verification
None automated. After deletion: `node --test test/android-instrumentation-runner.test.mjs` (reachability check over `CAMPAIGN_RUNNERS`).
