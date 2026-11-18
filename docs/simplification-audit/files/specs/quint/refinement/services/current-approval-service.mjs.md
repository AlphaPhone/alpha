# specs/quint/refinement/services/current-approval-service.mjs
- Lines: 220 | Kind: Quint refinement harness (bundles upstream `vendor/eliza/packages/core/src/services/approval.ts` + `runtime/retirement.ts` and drives it) | Verdict: KEEP (upstream-only model; run on upstream-pin lane), PORT helper imports off `legacy/`
- Covers: upstream `ApprovalService` selection/timeout/cancel/stop settlement ordering against `CoreApprovalServiceCurrent.qnt` (15 schedules). Duplicates: `specs/quint/legacy/CoreApprovalService.qnt` (historical twin, research §2.9). Callers: `services/index.mjs`, `test/quint-current-approval-service.test.mjs` (T4: runs twice).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | P6 | Imports `bundleVendorCore`, `deferred`, `observeFile`, `tick` from `specs/quint/legacy/core/source-support.mjs`; retiring `specs/quint/legacy` breaks this live harness. | Move those four helpers to `specs/quint/refinement/support.mjs` (shared target named in research) and re-point the import. | Low |
| 2 | 10-15 | T10 | `observeFile` text-replaces the line `import { logger } from "../logger.ts";` in upstream `approval.ts` to inject `__quint` timers. An upstream import reformat breaks the replay. | Replace by an esbuild `inject`/`define` of `setTimeout`/`clearTimeout` for that module, or use `node:test` mock timers; long term ask upstream for a timer port (D14 follow-up). | Medium |
| 3 | — | P1 / §2.9 | Sources are only `vendor/eliza/**`: the model can change only on a pin bump yet runs on every PR. | Gate on `upstream.lock.json` / `vendor/eliza` changes. | Low |
| 4 | 207-210 | — | `if (process.argv[1] === driver)` CLI entry with `--vendor-dir` parsing; no caller passes it (grep). | Delete the CLI entry and the `vendorDir` parameter. | Low |
| 5 | — | T4 | Run by both the aggregate and the per-model test. | Keep the per-model test only. | Low |

## Proposed end state
Same scenarios, helpers imported from `refinement/support.mjs`, timer injection without text edits, executed only by `test/quint-current-approval-service.test.mjs` on the upstream-pin lane.
