# specs/quint/refinement/application/resident-liveness.mjs
- Lines: 150 | Kind: Quint refinement harness, **source transplant** (slices `connection-ui.tsx`, transforms TS, runs in `vm` with stub closure) + direct import of `resident-recovery.ts` | Verdict: KEEP model; PORT (extract the sliced functions) and MOVE its legacy import
- Covers: resident liveness check — rate-limited native boot-status reads, duplicate check suppression, dead/restarting/booting status retires the epoch and restarts once, busy owner queues a rebind, stale reads cannot restart a successor, typed refusal owns recovery copy, status read error does not restart (live model `ResidentLiveness.qnt`, manifest ~l.1891). Duplicates: none in host/browser tests (Android resident instrumentation covers installed behaviour separately). Callers/importers: `index.mjs:106`, `test/quint-resident-liveness.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 13 | P6 | Imports `deferred, tick` from `specs/quint/legacy/core/source-support.mjs` (and lists it as a source). Blocks retiring `specs/quint/legacy` (ci-and-formal §3 lists this file). `./support.mjs` already exports both. | Import from `./support.mjs`; drop the legacy path from `sources`. | None |
| 2 | 106-110 | T2, T10 | Slices `apps/app/src/runtime/connection-ui.tsx` from `let residentRestartEpoch` (l.839) to `/** Test mocks only (the mock-mode exit` (l.863) — `residentLost`, `residentAlive`, `checkResidentAlive` — and supplies the closure: `epoch, active, operation, state, retire, update, ensureResident, queueResidentRebind, localAgentBootStatus, residentBootMessage, residentLivenessCheck`. The end anchor is a comment on an unrelated test-mocks function; the D1 split of `connection-ui.tsx` breaks this. | PORT: move these into `runtime/resident-recovery.ts` as `createResidentLiveness({epoch, active, busy, retire, update, ensureResident, queueRebind, bootStatus, now})` returning `{check(generation), lost(generation, reason)}`; `connection-ui.tsx` instantiates it; the harness imports it. | Medium |
| 3 | 22, 52 | — | `residentLivenessCheck(load, () => clock*5000)` — injects the clock through the real helper's second parameter; good. | Keep. | — |
| 4 | 146-149 | B5 | Returns a hand-written `obligations` list nobody reads except the wrapper. | Drop if `test/quint-resident-liveness.test.mjs` does not assert it. | None |
| 5 | 6 | — | Imports product `.ts` directly (Node type stripping) while siblings bundle with esbuild; two mechanisms (C7). | After the port, use `bundledSource` like siblings, or standardise on direct `.ts` import for dependency-free modules. | Low |

## Proposed end state
~110 lines importing `createResidentLiveness` and `residentBootMessage` from `resident-recovery.ts`, ports as plain functions, `tick/deferred` from `support.mjs`; no `vm`, no text slice, no legacy import.
