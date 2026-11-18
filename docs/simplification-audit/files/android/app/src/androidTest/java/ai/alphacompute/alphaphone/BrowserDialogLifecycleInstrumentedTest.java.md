# android/app/src/androidTest/java/ai/alphacompute/alphaphone/BrowserDialogLifecycleInstrumentedTest.java
- Lines: 50 | Role: the native Downloads dialog is dismissed when the privileged host document is replaced (reload, mock entry/exit). | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:223` (`requiresTestMocksBuild`) — runner test requires `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` in source (line 35 satisfies it).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-19 | C3 | `host/ready/click/app` copies (see BrowserContinuity #1). | `BrowserTestDriver` + `AppNavigation.open`. | Low. |
| 2 | 20-26 | NEW (reflection into upstream internals) | Reads `BrowserTabHostPlugin.downloads` then its private `listing` AlertDialog by reflection. | `BrowserHostProbe.downloadsDialog()`. | Medium (upstream rename). |
| 3 | 42-46 | C3 | Mock-mode enter/exit sequence identical to BrowserContinuity:147-152. | `AppNavigation.enterMockMode()/exitMockMode()`. | Low. |
| 4 | 17 | — | `fail("Browser lifecycle control missing")` drops the predicate from the message. | Shared `until` reports the predicate. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host/ready/click/app` | helper | 16-19 | BrowserContinuity:21-25, BrowserFlow:23-25, BrowserDownload:24-26 | `BrowserTestDriver` |
| `listing()` | helper | 20-26 | BrowserPageQuestion `currentDialog` (:92-104, same reflection-to-AlertDialog shape) | `BrowserHostProbe` |
| `openDownloads`/`dismissed` | helper | 27-33 | none | keep |

## Proposed end state
~40 lines: one @Test using shared driver, probe and mock-mode helpers.

## Verification
`--test-mocks --classes BrowserDialogLifecycle` on both variants.
