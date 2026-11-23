# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaUpdateStatusReceiver.java
- Lines: 55 | Role: Manifest receiver for PackageInstaller callbacks of Alpha's self-updater; validates the session record and forwards the status. | Verdict: MOVE to update/ package (with the AlphaDevicePlugin updater split)
- Importers: Manifest; `AlphaDevicePlugin` (`sender`, `RECEIPT_REQUIRED`, `UpdatePause`). Text/path pins: `scripts/test-update-confirmation-platform.ts`; `specs/quint/native/manifest.json`; `specs/quint/refinement/native/update-barrier.mjs`; `test/app-update.test.mjs`, `test/fixtures/UpdateFlowTest.java`, `test/fixtures/update-confirmation-android/ContinuationActivity.java`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31, 37, 41 | D3 | Reaches into `AlphaDevicePlugin.UpdatePause.store()`, `AlphaDevicePlugin.appSigner`, `AlphaDevicePlugin.UPDATE_STATUS` - updater state lives in the plugin class. | When `AppUpdater` is extracted from AlphaDevicePlugin (research P3), point these at it and move this receiver beside it. Component name must stay (PendingIntents name it). | medium |
| 2 | 53 | B1 | `catch(Exception unavailable){/* No read or journal receipt means the Android session remains fenced. */}` | Specified fallback; keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
Same logic, references `AppUpdater` instead of `AlphaDevicePlugin`; ~55 lines. Estimated lines after: 55.

## Verification
`test/app-update.test.mjs`, `scripts/test-update-confirmation-platform.ts`, Quint update-barrier.
