# android/app/src/main/java/ai/alphacompute/alphaphone/SerialStorageTasks.java
- Lines: 22 | Role: single-thread lane for `AlphaConnectionPlugin` slot work that rejects queued tasks on close | Verdict: KEEP (owner check on ordering)
- Importers: `AlphaConnectionPlugin:128` (submit at 106, 137; close at 387). Text/path pins: `test/fixtures/SerialStorageTasksTest.java` + `test/serial-storage-tasks.test.mjs`, `specs/quint/services/manifest.json`, `specs/quint/refinement/native/credential-coordinator.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-22 | C4 (P10) | Second "rejected after destroy" strategy beside `PluginWorkers`. Unlike `PluginWorkers` it also rejects tasks still queued at close (`shutdownNow()` → `reject`), which `PluginWorkers` cannot. | Keep while the connection plugin needs strict FIFO slot writes; fold into the base-plugin worker (P10) as the "serial lane" option. | Low. |
| 2 | 15 | B4 | Cast `((Task)queued)` relies on only `Task` being submitted — true by construction. | Fine. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Task` | class | 16-21 | — | here |
| `submit` | helper | 10-14 | `PluginWorkers.submit` | base plugin |

## Proposed end state
Unchanged.

## Verification
`test/serial-storage-tasks.test.mjs`, `ConnectionInstrumentedTest`.
