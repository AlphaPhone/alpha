# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserShareInstrumentedTest.java
- Lines: 48 | Role: live HTTPS page → Android chooser carries exactly URL/title; stale and hidden tabs cannot share | Verdict: SIMPLIFY
- Importers: none. Registry `BrowserShare` with `browserShareLive=1` (`scripts/android-instrumentation.ts:242`). Text/path pins: `test/browser-tab-host-identity.test.mjs:60-73` (source scan only).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | C3 / NEW | `new BrowserFlowInstrumentedTest()` used only for `child()`. | `BrowserTestDriver.child`. | Low |
| 2 | 15-19 | C3 | `js/ready/click/app/address` — copies of BrowserSignins:32-43, BrowserWebFeatures:50-61 (identical bodies except poll count). | Shared `BrowserTestDriver`. | Low |
| 3 | 20-21 | C3 | `foreground(name)` reads `dumpsys activity activities` with a 2 MB cap; `CameraFlowInstrumentedTest.resumed:129-130` does the same with `shell()`. | One `DeviceShell.topResumed()` helper in androidTest. | Low |
| 4 | 33 | D8 | 15 assertions on one line. | One assertion per line (formatter run). | Low |
| 5 | 38-45 | C3 | Two nested hand-written suppressed-cleanup blocks. | `attemptCleanup` from `BrowserReadingFixture`/`BrowserTestDriver`. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ready/click/app/address` | helpers | 16-19 | BrowserSignins, BrowserWebFeatures, BrowserFlow, BrowserDownload, BrowserContinuity, PasswordBrowserFill | `BrowserTestDriver` |
| `foreground/foregroundWait` | helpers | 20-21 | `CameraFlowInstrumentedTest.resumed` | `DeviceShell` (androidTest) |
| `rejectOld` | helper | 22 | none | keep |

## Proposed end state
The single journey method plus `rejectOld`; navigation/address/foreground/cleanup from shared drivers. Est. ~40 lines (line count is low because of statement soup; real reduction is ~5 helper definitions).

## Verification
`node scripts/android-instrumentation.ts --classes BrowserShare` with network (`browserShareLive=1`).
