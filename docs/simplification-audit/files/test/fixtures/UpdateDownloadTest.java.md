# test/fixtures/UpdateDownloadTest.java
- Lines: 75 | Kind: transplant consumer (compiled against `AlphaDevicePlugin` members that `test/app-update.test.mjs:18-28` slices out of the plugin source between ` static final long UPDATE_MAX_BYTES=` and ` static final String UPDATE_STATUS=`) | Verdict: DELETE with `app-update.test.mjs` test 1, after carrying the admission cases into the proposed `AppUpdateInstallerTest` (test-02 review)
- Covers: one-tap update download admission (`copyVerified`): exact declared size and SHA-256, lowercase 64-hex digest, empty APK refused, sizes outside 1..2 GiB refused before any byte is read, six-hour deadline stops a trickle mid-download, interrupted worker stops, `hex` keeps leading zeros. Duplicates: partly `specs/quint/refinement/native/UpdateStagingHarness.java:374` (real `copyVerified`, deadline behaviour) and `test/fixtures/UpdateFlowTest.java` (digest use in the flow). Neither checks the size bounds, the uppercase/short/missing digest refusals or the empty APK (`grep UPDATE_MAX_BYTES|toUpperCase` in both: 0 hits in the harness). Callers/importers: only `test/app-update.test.mjs:26`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17 | T2 | Depends on a text slice of `AlphaDevicePlugin.java`; any member reorder breaks it. | Delete with test 1. | — |
| 2 | 41-61 | — | Size-bound, digest-format and empty-APK refusals are unique coverage of an install-security gate. | Carry them into `AppUpdateInstallerTest` when the update flow is extracted from `AlphaDevicePlugin` (test-02's plan). | Medium if dropped without carrying |
| 3 | 57, 62 | T1-like | `UPDATE_MAX_BYTES==2 GiB` and `UPDATE_DEADLINE_NANOS==6 h` assert constants. | Drop; the boundary case at line 61 already proves the bound. | — |
| 4 | 64-67 | T8 | `Trickle` sleeps 20 ms per byte against a 100 ms deadline. | Use an injected clock in the extracted class. | Low |

## Proposed end state
File deleted. `AppUpdateInstallerTest` (Gradle JVM) owns: size mismatch both ways, changed bytes, digest
format (case, length, null), empty APK, out-of-range size refused before reading, deadline, interrupted worker.
