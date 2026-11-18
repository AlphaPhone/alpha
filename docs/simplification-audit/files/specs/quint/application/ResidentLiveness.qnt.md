# specs/quint/application/ResidentLiveness.qnt
- Lines: 66 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Resident-agent status reads are rate-limited and epoch-owned; a retired read cannot restart a successor; a busy controller queues the rebind. Duplicates: ConnectionController (queued resident rebind) overlaps `busyRecoveryQueuesRebindTest`. Callers/importers: `resident-liveness.mjs` (aggregate) <- `test/quint-resident-liveness.test.mjs` + aggregate (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 | No header comment, unlike its siblings. | Add a two-line doc comment. | - |
| 2 | harness | T2/T10 | `resident-liveness.mjs:105-110` reads `runtime/connection-ui.tsx`, slices from `let residentRestartEpoch` to `/** Test mocks only (the mock-mode exit`, esbuild-transforms the fragment and runs it in `vm` with stubs. Both anchors exist today; the D1 split of `connection-ui.tsx` (4.2k lines) breaks it. | PORT: move the resident restart controller out of `connection-ui.tsx` into `runtime/resident-recovery.ts` as `createResidentLiveness({readStatus, restart, now, busy})`, then import it (the harness already imports `residentBootMessage`, `residentLivenessCheck` from that file). | M |
| 3 | harness | P6 | `resident-liveness.mjs:8` imports `deferred`, `tick` from `specs/quint/legacy/core/source-support.mjs`; blocks retiring `specs/quint/legacy`. | Import from `refinement/application/support.mjs` (which already has `deferred`, `tick`). | L |

## Proposed end state
- Model kept with a header comment.
- Harness imports a real `createResidentLiveness` from `resident-recovery.ts`; no source slicing; no `legacy/` import.
- Run once.
