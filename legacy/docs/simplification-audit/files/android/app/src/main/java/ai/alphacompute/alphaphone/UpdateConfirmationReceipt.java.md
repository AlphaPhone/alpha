# android/app/src/main/java/ai/alphacompute/alphaphone/UpdateConfirmationReceipt.java
- Lines: 123 | Role: same-boot durable record (AtomicFile in no-backup dir) of the exact system installer confirmation Intent for a self-update session, so it is launched at most once | Verdict: KEEP (MOVE with the updater split)
- Importers: `AlphaDevicePlugin` (3), `AlphaUpdateStatusReceiver` (3). Text/path pins: `test/app-update.test.mjs`, `test/fixtures/UpdateFlowTest.java`, `test/fixtures/update-confirmation-android/ContinuationActivity.java`, `scripts/test-update-confirmation-platform.ts`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/update-barrier.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D1 (P3) | Part of the ~600-line self-updater that lives in `AlphaDevicePlugin` + nested classes. | Move to an `update/` package with `AppUpdater`, `UpdatePause`, `UpdateActivation`, `UpdateResume`, `AlphaUpdateStatusReceiver` (research §5). | Low (package-private visibility changes). |
| 2 | 59-62 | B5 | Read-back after `AtomicFile.finishWrite` ("AtomicFile reports some rename errors only in Android logs"). Justified: a launch depends on the durable write. | Keep. | — |
| 3 | 83 | B1 | `catch(Exception invalid){return null;}` in `decode` — specified (an unparsable stored URI is "no receipt"). | Narrow to `URISyntaxException \| RuntimeException`. | None. |
| 4 | 28-30 | — | `owner(record)` concatenates 8 record fields. | Fine. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Receipt` | class | 22-26 | — | here |
| `ACTION_CONFIRM_INSTALL` | const | 19 | `PackageInstaller` hidden constant | here |

## Proposed end state
Unchanged content (~120 lines) in `update/UpdateConfirmationReceipt.java`.

## Verification
`test/app-update.test.mjs`, `scripts/test-update-confirmation-platform.ts`, emulator self-update run.
