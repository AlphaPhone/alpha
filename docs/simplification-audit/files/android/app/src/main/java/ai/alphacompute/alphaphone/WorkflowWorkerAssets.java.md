# android/app/src/main/java/ai/alphacompute/alphaphone/WorkflowWorkerAssets.java
- Lines: 118 | Role: verifies and atomically installs the APK's workflow-worker tree from a SHA-256 index (reuse when the package stamp and installed hashes match) and sets the worker env vars | Verdict: SIMPLIFY
- Importers: `AlphaLocalAgentPlugin:627-628` (install + configureEnvironment). Text/path pins: `test/workflow-worker-assets.test.mjs`, `test/product-character-host.test.mjs`, `specs/quint/refinement/native/resident-platform.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-27 | C3 (P9) | Own `hex()` (via `String.format("%02x")`) and `digest()`; SHA-256-hex has ~10 Java copies (`HostedResultNotices.hash`, `AlphaDevicePlugin` ×4, `AlphaCredentialStore:159`, `CalendarSyncSnapshot:140`, `GoogleWorkspaceReturnFlow:33`, …). | Shared `Digests.sha256()/hex()`. | None. |
| 2 | 30, 68 | B4 | `if(read==0){int one=input.read();…}` zero-length-read handling. `InputStream.read(byte[])` with a non-empty buffer never returns 0 by contract; `validInstalled` (101) already omits it. | Delete both branches. | Low. |
| 3 | 28-32, 66-69, 99-102 | C5 | Three read loops (bounded index, copy+hash with total budget, hash-only with total budget). | One `copyHashed(InputStream, OutputStream /*nullable*/, MessageDigest, long[] total)` helper. | Low. |
| 4 | 36, 53, 79 | B4 (cross-file) | `packageStamp` may be null only when `getPackageInfo(own package)` throws `NameNotFoundException` (`AlphaLocalAgentPlugin:624-626`), which cannot happen for the running package. | Make `packageStamp` required; delete the null branches here and the catch there. | Low. |
| 5 | 33-34 | A8 | Two stacked comments for `PACKAGE_STAMP`. | Keep one. | None. |
| 6 | 17-22 | D11 | `configureEnvironment` (env vars for the resident) sits in an asset installer. | Move into the resident launch-environment builder (`AlphaLocalAgentPlugin.configureEnvironment` / future `ResidentLaunchEnvironment`). | Low (`test/product-character-host.test.mjs` slices it). |
| 7 | 108 | B1 | `catch(IOException invalid){return false;}` — specified (an invalid installed tree means reinstall). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `hex`, `digest` | helper | 26-27 | ~10 SHA-256 copies | `Digests` |
| `bounded` | helper | 28-32 | 7 bounded-read copies (P9) | `BoundedIo.read` |
| `remove` (recursive delete, no-follow) | helper | 114-117 | directory walkers in scripts (TS) only | here |
| `Source` | interface | 23 | — | here |

## Proposed end state
~95 lines: same index format, required files, staging/backup rename protocol and limits (64 MiB, 1 MiB index, 4,096 entries);
shared digest/IO helpers; env configuration moved to the launch-environment builder.

## Verification
`test/workflow-worker-assets.test.mjs`, `test/product-character-host.test.mjs`, resident start instrumentation (`ResidentServiceInstrumentedTest`), APK build with the staged worker.
