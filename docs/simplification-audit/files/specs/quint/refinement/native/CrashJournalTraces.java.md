# specs/quint/refinement/native/CrashJournalTraces.java
- Lines: 308 | Kind: Quint refinement harness (Java, real `PluginWorkers` + authenticated upstream `CrashLog` + text-sliced `AlphaDevicePlugin` members) | Verdict: PORT
- Covers: model `NativeCrashJournal` (live): problem-log record/read/clear through two `AlphaDevicePlugin` bridges with real single-thread diagnostics executors, capacity/retention/corrupt/oversize files, atomic-write faults, exit-history import with watermark, held snapshot vs clear, uncaught handler not leaking messages, JS-safe timestamps. Duplicates: `test/device-plugin-diagnostics.test.mjs` (host test of the same diagnostics members; see its report) and `test/quint-native-crash-journal.test.mjs` re-running this campaign; aggregate `index.mjs:196` runs it again.
- Callers/importers: `crash-journal.mjs` (`javaTraceCampaign(harness,…,scenarios)`), stubs from `crash-journal-platform.mjs`.

## How it is tied to product code
- **Text slice (T10)**: `crash-journal-platform.mjs:exact()` cuts `AlphaDevicePlugin.java` from `' private final java.util.concurrent.ExecutorService diagnosticsWorker='` to `' /** Non-secret build identity'`, plus a regex for the one-line `handleOnDestroy`, and adds dummy update-coordinator fields so that destructor compiles. It also slices `node_modules/@capacitor/android/.../PluginCall.java` between `getString` and `@Nullable public Integer getInt`, stripping `@Nullable`.
- Upstream `CrashLog.java` is staged through `prepareNativeFixture` and checked against the lock sha256 and the patch receipt; `android/consumer-host.json` module entry asserted by deep-equal.
- Reflection pin: `AlphaDevicePlugin.diagnosticsWorker`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | platform | T10 | `AlphaDevicePlugin` is SPLIT in its own report (diagnostics 154-231 is one of the pieces). The slice anchors break on that split. | Do the split so problem-log members live in one class (e.g. `ProblemLog.java` / `AlphaDiagnostics.java`) with a small plugin forwarding to it; compile that class whole and drop `exact()`, the destroy regex and the fake update fields. | Medium; must keep "two bridges, one worker each, destroy refuses late work" observable. |
| 2 | platform | T10 | Capacitor `PluginCall.java` sliced from `node_modules`. | Use the shared hand-written `PluginCall` stub every other harness already uses (C5 across harnesses). | Low |
| 3 | crash-journal.mjs | B5 | Driver asserts the consumer-host module JSON, the patch receipt and the lock hash before running. Pins inputs, not behaviour. | Keep the lock hash check only if `checkTraces` does not already record it; drop the `consumer-host.json` deep-equal (build config, not the model). | Low |
| 4 | 80-85, 252, 264-272 | A1 (check) | Seed/scenario named `legacy`/`legacy-bridge` writes rows with a `message` field, string and fractional timestamps. These are malformed-file inputs to the reader at a storage trust boundary, not a migration path. | Keep; rename to `foreign-rows` (with the model's scenario label). | Low |
| 5 | 59-68 | T8 | 20-30 s latch timeouts and a stack dump on hang. Acceptable for a JVM harness. | None | None |

## Proposed end state
Same 12 scenarios, compiled against a whole extracted diagnostics class instead of text cut from `AlphaDevicePlugin`,
with the shared `PluginCall` stub. Rename the `legacy` seed. One runner (native lane), no per-model wrapper.
