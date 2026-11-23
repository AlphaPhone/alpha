# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentAlwaysPresentInstrumentedTest.java
- Lines: 79 | Role: P-43 check on a flag-off build: signed out and offline, a stored legacy "local apps without AI" selection becomes the resident and the undismissable Eliza Cloud sign-in page opens over Home. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:182` (`ResidentAlwaysPresent: { flagOffOnly: true, note: "... a legacy local-apps selection ..." }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 53-54, 60 | A1 | Seeds `{kind:'offline',localApps:true}` ("An older build's 'Use local apps without AI' choice") and asserts it is rewritten to `{kind:'resident'}`. That is a renderer migrate-on-read for a selection this package never wrote. | With P5: delete the seed and the rewrite assertion (and the renderer reader); start from an empty selection instead. Update the registry note. | medium (owner P5; renderer change in `apps/app/src/runtime/connection-ui.tsx` area) |
| 2 | 41 | D11 | Method `signedOutOfflineStartsTheResidentAndSendsNothing` never asserts anything about sending. | Rename to `signedOutOfflineRequiresCloudSignInOverHome`. | none |
| 3 | 37-40, 47, 69 | B1 | `shell("svc wifi disable")` reads and discards output; failures of `svc` are invisible. | Assert the network is actually down (e.g. `ConnectivityManager.getActiveNetwork()==null`) before proceeding. | low |
| 4 | 65 | T8 | Fixed `SystemClock.sleep(500)` before asserting the page stays. | Acceptable (absence check); keep with a comment. | none |
| 5 | 27, 45, 70 | C6 | `"alpha.connection.selection.v1"`, `"cloud:production"` literals (catalogue C6). | Shared constants. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 28-36 | ~40 files | `WebViewTestDriver.until` |
| `shell` | helper | 37-40 | `ReminderHeadsUp :33`, `WebViewTestDriver :40`, `ResetExternalFixture :56` (`executeShellCommand` readers) | `WebViewTestDriver.shell` / a `DeviceShell` helper |

## Proposed end state
Signed-out offline start opens the required sign-in page over Home, starting from no stored selection; legacy seed gone
with P5; network-down asserted. ~65 lines.

## Verification
`--classes ResidentAlwaysPresent` on a flag-off build (refused under `--test-mocks`).
