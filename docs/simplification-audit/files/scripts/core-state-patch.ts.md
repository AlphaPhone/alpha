# scripts/core-state-patch.ts
- Lines: 167 | Kind: script (build/runtime gate: authenticates pinned upstream core modules before bundling or Bun preload) | Verdict: KEEP + SIMPLIFY (rename)
- Covers: binds the mobile bundle, native Google host and Bun runtime to the exact pinned bytes of 13 upstream core/notes/embedding files listed in `scripts/upstream-core-sources.ts`, and writes/verifies a receipt of that. Callers: `build-mobile-agent.ts`, `build-native-google-host.ts`, `mobile-uuid-adapter.ts`, `native-google-host-artifact.ts`, `cloud-resident-host.ts` (`coreRuntimeArguments`), `start-combined-agent.ts` (`combinedCoreRuntime`), `core-state-preload.ts`, plus ~8 more; Python `verify-packaged-runtime.py`; ~12 tests; 16 Quint refinement harnesses import it (task-scheduler, notes-store, embedding identity, launchers, `legacy/core/check-room-handler-queue-refinement.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | name, 69-72, 79 | D11 / A8 | Nothing is patched any more: `patches: []`, `afterSha256 === beforeSha256` always, `coreStatePatch` only reads. "Keep the existing producer receipt fields" is a tombstone. | Rename to `core-source-pin.ts` / `authenticateCoreSources`; collapse `{beforeSha256, afterSha256}` to one digest **only together with** the receipt readers (`native-google-host-artifact.ts`, `verify-packaged-runtime.py`) since receipts are persisted build outputs. | Med |
| 2 | 103 | C6 | 600-char `onLoad` filter regex re-lists the same 13 paths as `CORE_STATE_TARGETS`. | Build the filter from `CORE_STATE_TARGETS` (escape + join), or filter in the callback by `byPath.has`. | Low |
| 3 | 119-123 | B3 | `exact(transform, …)` checked twice in consecutive conditions. | Remove the first block. | Low |
| 4 | 27-28,74 | B5 | `CORE_STATE_INPUTS` hashes the tool's own source files into the receipt. | Owner/packaging call: keep only if `verify-packaged-runtime.py` must detect tool drift; otherwise drop. | Med |
| 5 | 151-167 | A7 | `combinedCoreRuntime` serves only `start-combined-agent.ts` (no npm/CI caller). | Delete with that launcher if retired (owner). | Low |
| 6 | 29 | C3 | Local `sha`. | Shared hash helper. | Low |
| 7 | 46-55 | — | `readRegular` symlink walk is a genuine input boundary (vendor checkout). | Keep. | — |

## Proposed end state
A ~110-line `core-source-pin.ts`: target list, receipt (one digest per file), esbuild/Bun plugin with a derived filter, verify. Quint harnesses importing it keep working because they import functions (good: T10 compliant), but every rename must update those imports in the same change.
