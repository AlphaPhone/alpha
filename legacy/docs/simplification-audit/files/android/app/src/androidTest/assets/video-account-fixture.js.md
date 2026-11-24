# android/app/src/androidTest/assets/video-account-fixture.js
- Lines: 85 | Role: an in-page script that wraps `Capacitor.nativePromise` so the Camera/Photos instrumentation test can sign in through the production account UI with a synthetic account. The real resident starts first, and only account binding and the bound start are faked. | Verdict: SIMPLIFY (small)
- Importers: `VideoInstrumentedTest.java:65-66` (loads the asset and runs `eval`), campaign `Video` (`scripts/android-instrumentation.ts:287`). Text pins: the test waits on `window.__alphaVideoAccount`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20 | A1 | `if (method === 'savedSignInRecoveryStatus') return { eligible: false };` answers the legacy pre-namespace sign-in recovery probe (`AlphaCloudSignInPlugin.savedSignInRecoveryStatus`, `LegacyCloudRecovery`, research android P5). | Delete this line together with the legacy recovery removal, not before it: the renderer still calls it today, and an unexpected method throws at line 31. | Low |
| 2 | 34 | C6 | `'cloud:production'` slot literal (32 uses in Java, 12+ in the renderer). | No change in a test asset; a shared constant would not reach an eval'd script. | — |
| 3 | 62 | C6 | Model id `'cerebras/qwen-3.8-27b'` is duplicated from `apps/app/src/runtime/local-agent.ts`, `scripts/cloud-resident-host.ts` and `scripts/native-cloud-runtime-config-check.ts`. When the default model changes, this fixture breaks with "Unbound resident account". | Accept any non-empty `input.model`, or inject the expected value from the Java test. | Low |
| 4 | 13-84 | T7 | This is one of 10 hand-written `Capacitor.nativePromise =` fakes in androidTest (`AndroidShade`, `BrowserReadingFixture`, `BrowserShareInstrumentedTest`, `CombinedAgent*`, `PairedAsrLive`, `PairedVoiceLive`, `PhotoEdit`, `ReminderStale`). | Out of scope for this file; it belongs to the androidTest bridge-fake consolidation (research P20). | — |

## Local types and helpers
None. It is an IIFE with local `id`, `session`, `credential`, `binding`, `running`.

## Proposed end state
About 84 lines: line 20 goes with the legacy recovery removal, and the model check is relaxed.

## Verification
The `Video` instrumentation campaign (`VideoInstrumentedTest`), run on a test-mocks build.
