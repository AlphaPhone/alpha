# specs/quint/native/ResidentStartCancel.qnt
- Lines: 208 | Kind: Quint model (live) | Verdict: KEEP
- Covers: `AlphaLocalAgentPlugin` start/attach/cancelStart/stop/getStatus, credential mutation with strict shutdown and commit only after an acknowledged stop, shutdown-retry recheck needing window focus, rearm admission only when no surface is stopping or mutating. Duplicates: coarser versions of start/cancel in `ResidentRuntime.qnt` (renderer-level) and of rearm in `ResidentSchedulingServiceAdmission.qnt`; this is the Java-level contract and is not redundant. Callers/importers: manifest (15 `symbols`); `refinement/native/resident-start-cancel.mjs` + `ResidentStartCancelReplay.java` via `forward-replays.mjs:13,30`; per-model wrapper `test/quint-resident-start-cancel.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 128-134 | — | `lifecycleStep` (no credential mutation) exists so the replay can run without the credential path; documented in the harness (`step: 'lifecycleStep'`). Credential mutation is replayed elsewhere (`NativeCredentialMutation`, per SSA harness obligation). | Keep. | none |
| 2 | harness 10-22 | T10 (ports only) | Harness string-replaces three *platform stub* files (`ElizaAgentService`, `Activity.hasWindowFocus`, `SystemClock`) from `resident-platform.mjs`; product Java compiles unmodified. Text surgery on our own stubs is avoidable. | Make the stubs read `ResidentStartCancelReplay.Ports` directly (shared stub with a port hook) instead of rewriting them per harness. | low |
| 3 | forward-replays.mjs:43 + wrapper | B5 / T4 | Exact count `ResidentStartCancel: 76`; the per-model test re-runs the aggregate campaign. | One runner, `> 0`. | low |
| 4 | manifest symbols | T10 | 15 symbol pins on `AlphaLocalAgentPlugin` (`cancelStart`, `cancelledStarts`…); Stage F splits that class (U-A2). | Pin files only; the compiled replay proves the members. | low |

## Proposed end state
Model unchanged. Product code is live and is compiled and run unmodified. Stub rewrites become shared port hooks,
symbol pins become file pins, one runner.
