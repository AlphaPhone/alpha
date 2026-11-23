# test/device-plugin-diagnostics.test.mjs
- Lines: 23 | Kind: source-text (regex over `AlphaDevicePlugin.java`; its own header says "Source-shape guard ... shows nothing about Android's behaviour") | Verdict: DELETE
- Covers: problem-log calls go through the helper that rejects when the worker is stopped, and `handleOnDestroy` shuts the worker down. Duplicates: `test/plugin-worker-guard.test.mjs` (the `PluginWorkers.submit` guard). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-22 | T1 | Five regexes pin method shapes and call counts (`>= 4` helper uses). Breaks on any Java reformat (D9 formatter) and passes if a new method bypasses the helper with a different spelling. | Delete. The crash it guards (RejectedExecutionException after destroy) is reproducible in an instrumentation test (`LauncherHomeInstrumentedTest` saw it); cover there if needed. | Low. |

## Proposed end state
Deleted.
