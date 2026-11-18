# android/app/src/main/java/ai/alphacompute/alphaphone/PluginWorkers.java
- Lines: 20 | Role: submit work to a plugin executor, running a refusal callback instead of throwing when the executor is shut down/full | Verdict: KEEP (fold into base plugin with P10)
- Importers: 13 main files, 47 call sites (`AlphaLocalAgentPlugin` 19, `AlphaDevicePlugin` 9, …). Text/path pins: `test/fixtures/PluginWorkersTest.java` + `test/plugin-worker-guard.test.mjs` (javac), 14 other tests that slice plugin sources around `PluginWorkers.submit(` (e.g. `test/native-plugin-teardown.test.mjs`, `test/app-update.test.mjs`, `test/resident-credential-shutdown-retry.test.mjs`), 13 Quint refinement `.mjs` files, `specs/quint/native/manifest.json`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-19 | C4 (P10) | One of three "rejected after destroy" strategies (`PluginWorkers`, `SerialStorageTasks`, raw `catch(RejectedExecutionException ignored){}` in 7 files: `AlphaGmailPlugin:33-34`, `AlphaDeletionsPlugin` ×4, `CalendarScopedDeletionReview` ×2, `AlphaCalendarPlugin`, `CalendarSyncBridge`, `AlphaMapsTransportPlugin`). | Make this the only one now: replace the raw catches with `PluginWorkers.submit(..., () -> call.reject(...))`. Later move into an Alpha base plugin `background(call, work)` (P10) together with `LateLaunch`. | Low. |
| 2 | 10-11 | A8 / D7 | "AlphaDevicePlugin, round 8, a326b8dd" history and "host-tested by javac". | Trim to what the code does. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `submit` | helper | 16-19 | `SerialStorageTasks.submit`, raw catches (7 files), per-plugin `submit(call, work)` wrappers (`AlphaGmailPlugin.Work`, `AlphaDeletionsPlugin.Task`, `AlphaFilesPlugin.StorageWork`) | here → base plugin |

## Proposed end state
Unchanged (~15 lines with trimmed comment) and used by every plugin; disappears into the base plugin later.

## Verification
`test/plugin-worker-guard.test.mjs`, `test/native-plugin-teardown.test.mjs`, activity-destroy instrumentation.
