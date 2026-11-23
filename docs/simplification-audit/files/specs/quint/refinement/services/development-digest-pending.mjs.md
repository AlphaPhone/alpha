# specs/quint/refinement/services/development-digest-pending.mjs
- Lines: 31 | Kind: Quint refinement runner (spawns the probe under tsx, feeds JSON traces to `checkTraces`) | Verdict: KEEP, SIMPLIFY
- Covers: runner for `DevelopmentDigestPending.qnt`. Duplicates: the same spawn-probe-and-parse runner shape as `gmail-agent-mailbox-recovery.mjs` (C5). Callers: `services/index.mjs`, `test/quint-development-digest-pending.test.mjs` (T4: twice).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-20 | B5 | Runs an esbuild metafile build only to list source paths for hashing, and adds `hosted-digest-ui.tsx`, `hosted-digests.ts` and lock files that the probe never executes. | Drop the esbuild graph pass and the unexecuted sources once receipts are simplified; the probe's import already fails on drift. | Low |
| 2 | 20-26 | C5 | `spawnSync(process.execPath, ['--import=tsx', probe])` + status assert + `JSON.parse(stdout)` duplicated in `gmail-agent-mailbox-recovery.mjs`. | One `runProbe(path, args)` in `refinement/services/support.mjs`. | Low |
| 3 | — | T4 | Runs in the aggregate and its own test. | Per-model test only. | Low |

## Proposed end state
~12 lines: `runProbe(probe, ['current'])` then `checkTraces`.
