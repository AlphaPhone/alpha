# scripts/core-state-preload.ts
- Lines: 25 | Kind: script (Bun `--preload` module) | Verdict: KEEP + SIMPLIFY
- Covers: before any upstream module is evaluated in a host-launched Bun runtime, verifies the source checkout against the pin (or a frozen manifest) and registers the authenticated-core loader plugin. Callers: injected by `coreRuntimeArguments` in `core-state-patch.ts:147` (used by `cloud-resident-host.ts`, `start-local-remote.ts`, `start-cloud-qa.ts`, `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts`; `combinedCoreRuntime` for `start-combined-agent.ts`); listed in `CORE_STATE_INPUTS`, `verify-packaged-runtime.py`, `source-snapshot.ts`, `quint-lib.ts`; test `core-state-patch`; Quint launcher harnesses.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-21 | A7 | Frozen-manifest branch exists only for `start-combined-agent.ts` via `combinedCoreRuntime`. | Delete with that launcher if the owner retires it; then the file is 12 lines. | Low |
| 2 | 11 | B3 | Re-checks `path.isAbsolute(source)` already enforced by `coreRuntimeArguments`. | Keep (env var is the boundary when launched by other hosts) — acceptable. | — |
| 3 | 8 | B2 | `if (!globalThis.Bun) throw` — preload is only ever passed to Bun. | Keep as a clear error; trivial. | — |

## Proposed end state
Verify pinned source, register plugin; ~12 lines if the frozen-snapshot path goes. Follows `core-state-patch.ts` rename.
