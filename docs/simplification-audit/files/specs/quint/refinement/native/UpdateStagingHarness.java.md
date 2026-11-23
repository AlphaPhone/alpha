# specs/quint/refinement/native/UpdateStagingHarness.java
- Lines: 404 | Kind: Quint refinement driver (host JVM; text-sliced `AlphaDevicePlugin` updater members, synthetic HTTPS/archive/installer ports from `UpdateFlowTest` and `app-update-jvm`) | Verdict: KEEP; PORT with the updater extraction
- Covers: model `NativeUpdateStaging` (live): APK download and staging. Exact URL, byte count and SHA-256 before archive readback; archive version/package/flavor/signer refusal; busy peer is quiet; owner destroy during download or archive read; verified-cache reuse vs corrupt refetch vs restart sweep; stale cache sweep; cache-delete refusal; boot/uptime/consent admission for automatic updates (`starting`, `unsupported`, `permission-required`); plus `manifest` (feed parsing over the native check, 8 inputs) and `deadline` (`copyVerified` expiry). Duplicates: `test/app-update.test.mjs` test 2 and `UpdateFlowTest.java` scenarios (download admitted only at declared size/digest, TLS cache retry) overlap heavily; `update-staging.mjs` also slices `apps/app/src/prototype/settings-adapter.ts` for the renderer parser. Callers: `update-staging.mjs` (`javaTraceCampaign`, 20 modes plus manifest/deadline runs); `index.mjs:45`; wrappers `test/quint-native-update-staging.test.mjs` (DELETE, T4) and the native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver | T10 | Same `exactUpdateMembers` marker slice of `AlphaDevicePlugin.java` as `UpdateCompositionHarness`; `update-staging.mjs:53-60` additionally slices `settings-adapter.ts` between `'export const UPDATE_SCHEMA'` / `'/** Field updates wait for Home'` and `'const UPDATE_KEY'` / `'/** Keep the reference settings components'`, strips types and runs it in `vm`. | Java: compile the extracted `AppUpdater` class. Renderer: export `parseUpdateManifest` and the cache helpers from a small `runtime/app-update.ts` module and `tsImport` it. | High (shared with composition and barrier harnesses) |
| 2 | 114-116, 123, 129, 138, 176 | T10 (reflection) | Reads private statics `updating`, `updateVerified`, and instance fields `updateActive`, `updateWorker`. | Same snapshot accessor as the composition harness. | Medium |
| 3 | 117-119 | C3 | Local `sha()` over `AlphaDevicePlugin.hex` + `MessageDigest`. | Use the shared Java hash helper once it exists (R3 `AlphaUtil`). | Low |
| 4 | 41-55, 113, 385-389 | C5 | `Gate`, `require`, `erase` duplicated with `UpdateCompositionHarness`/`UpdateBarrierHarness`. | One support class. | Low |
| 5 | 94 | D8 | Fully-qualified `java.util.concurrent.atomic.AtomicInteger` inline although the package's `AtomicBoolean` is imported. | Import it. | None |
| 6 | 326-337 | B1 (accepted) | `cache-delete-refused` skips when the host bypasses POSIX denial. Specified fallback. | Keep. | — |
| 7 | 357-379 | T8 | `deadline` mode parks for 500 ms twice in real time. | Acceptable (1 s total). | — |

## Proposed end state
Same 20 staging modes plus manifest and deadline runs, compiled against a whole `AppUpdater` class and a TS-imported manifest parser.
Shared harness helpers in one place. `test/app-update.test.mjs` test 2 and the duplicated `UpdateFlowTest` download scenarios can then go (this campaign covers them).
