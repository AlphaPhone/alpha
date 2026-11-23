# specs/quint/refinement/native/RuntimeUpdatePauseTraces.java
- Lines: 297 | Kind: Quint refinement harness (members **text-extracted** from product `AlphaDevicePlugin.java` (`UpdatePause`, `hex`, `appSigner`) + pinned upstream `RuntimeUpdatePause.java` over `test/fixtures/app-update-jvm` stubs; fresh JVMs reopen the same journal path) | Verdict: KEEP harness; driver PORT (compile a real class instead of a slice)
- Covers: the app-update pause journal: acquire/commit/reconcile by the owning session, foreign owner refused, package evidence (sealed/bound/foreign session, SDK, boot, digest, signer) decides release vs hold, corrupt/symlink/oversize journal, refused directory sync, reopen by a new process on old/new APK. Duplicates: `UpdateBarrierHarness.java` (model `NativeUpdateActivation`) drives the same `UpdatePause` from the outer install flow; `test/app-update.test.mjs` runs `test/fixtures/UpdateFlowTest.java` over the same extracted members. Different properties, keep both models. Callers/importers: `runtime-update-pause.mjs` (`checkRuntimeUpdatePause`) <- `index.mjs`, `test/quint-runtime-update-pause-refinement.test.mjs`.
- Model live: `specs/quint/native/RuntimeUpdatePause.qnt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `runtime-update-pause.mjs:12-30` | T10 | `extractWrapper` slices `AlphaDevicePlugin.java` between `' static final class UpdatePause {'` and `' private static final class UpdateActivation'`, regex-grabs `' static String hex(byte[] digest){...'`, and slices `' static String appSigner('` up to the **comment** `" /**\n  * A session's binding:"`. Editing that Javadoc breaks the model run. | PORT: split the updater region of `AlphaDevicePlugin.java` (currently lines 234-843: `UPDATE_MAX_BYTES` ... `// End of updater methods for host replay.`) into its own package-private class (e.g. `AppUpdater.java` with nested `UpdatePause`), and compile it whole. Harness references change from `AlphaDevicePlugin.UpdatePause`/`AlphaDevicePlugin.hex`/`appSigner` to the new class. | medium |
| 2 | driver | C5 | Second, independent slice of the same file region that `update-barrier.mjs` `exactUpdateMembers` already extracts (234-843 covers 302-370). | Until the split lands, reuse `exactUpdateMembers` here; after it, both compile `AppUpdater.java`. | low |
| 3 | 79-82, 99-100 | — | Mutates statics of fixture stubs (`BuildConfig.VERSION_CODE`, `Build.VERSION.SDK_INT`, `Settings.Global.bootCount`, `AlphaLocalAgentPlugin.confirmed`). Fixture-only; fine with one JVM per mode. | none | none |
| 4 | 256-262 | — | `denySync` probes whether the host honours POSIX mode bits and skips two modes otherwise (`skip` result). Root CI runners skip them silently. | Keep; make the test print skipped modes (it already passes them as assumptions). | low |
| 5 | test `:10-11` | B5 | `traces + skipped === 12`, `checkpoints === 106` when nothing skipped. | Assert `passed`, `traces > 0`. | low |
| 6 | driver `:41-42` | — | Asserts the compiled upstream journal hash equals the pinned blob. Real guard against an unpinned vendor checkout. | Keep. | none |

## Proposed end state
Harness unchanged apart from class references; driver compiles the split updater class and the pinned journal with the stubs, no slicing. Runtime: one `javac`, 14 JVM launches.
Path filter: `AlphaDevicePlugin.java` (or the split `AppUpdater.java`), `upstream.lock.json`, `test/fixtures/app-update-jvm/**`, `RuntimeUpdatePause.qnt`, `Trace.java`, `java.mjs`, `scripts/upstream-native-source.ts`.
