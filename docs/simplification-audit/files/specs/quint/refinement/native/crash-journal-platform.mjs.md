# specs/quint/refinement/native/crash-journal-platform.mjs
- Lines: 143 | Kind: Quint harness platform (text slices of `AlphaDevicePlugin.java` and Capacitor `PluginCall.java`, Android ActivityManager/AtomicFile/Context stubs) | Verdict: PORT
- Covers: compile environment for model `NativeCrashJournal`: diagnostics members of the device plugin with dummy update-coordinator fields so `handleOnDestroy` compiles; exit-history and atomic-write fault ports. Callers: `crash-journal.mjs:8,26`.

## Text anchors (T10)
- `AlphaDevicePlugin.java`: `' private final java.util.concurrent.ExecutorService diagnosticsWorker='` .. `' /** Non-secret build identity'`; regex for one-line `^ @Override protected void handleOnDestroy(){...`.
- Fake fields `activation`, `updateOwner`, `updateDue`, `updateOpen`, `UpdateActivation`, `retireUpdateBridge`, `updateWorker`, `updateActive`, `updateStatus` mirror private updater names referenced by `handleOnDestroy`.
- `node_modules/@capacitor/android/.../PluginCall.java`: `'    public String getString(String name)'` .. `'    @Nullable\n    public Integer getInt'`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-39 | T10 | Slices diagnostics out of `AlphaDevicePlugin` (D1, being split) and fakes updater internals to make the destructor compile; any updater rename breaks this crash-journal harness. | Extract problem-log members into `ProblemLog.java`/`AlphaDiagnostics.java` (as the `CrashJournalTraces.java` report proposes); the plugin's destroy calls `diagnostics.close()`. Compile whole; drop the fake update fields. | Medium |
| 2 | 49-63 | C5 / T10 | Capacitor `PluginCall` sliced from `node_modules` (twin of `app-info-handoff-platform.mjs`). | Shared stub. | Low |
| 3 | 113-114 | D7 | Shadow `System` in the upstream `crash` package for the clock. | Keep until upstream `CrashLog` takes a clock (D14). | Low |

## Proposed end state
Android/exit-history/AtomicFile ports only; whole `AlphaDiagnostics` class and shared `PluginCall` stub compiled.
