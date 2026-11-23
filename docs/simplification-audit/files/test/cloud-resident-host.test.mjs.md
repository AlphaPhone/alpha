# test/cloud-resident-host.test.mjs
- Lines: 187 | Kind: integration of the development Cloud resident host (`scripts/cloud-resident-host.ts` through the vm-transplant fixture `product-character-host.mjs`) with recording launchers and fake Google brokers; case 4 spawns `scripts/dev-cloud.ts` with a loader that replaces `child_process.spawn` | Verdict: REWRITE as `test/tooling/cloud-resident-host.test.mjs` (target of the two sibling merges), importing the script directly
- Covers: the dev host retires old processes before relaunch, strips direct-provider keys, never persists the Cloud token, refuses to relaunch when retirement fails; readiness waits for one running agent and keeps the binding on abort; a queued bind is not retired by first readiness; `dev:cloud` strips inherited provider authority; the managed Gmail/Calendar read broker is bound before launch and revoked on stop/exit/failure; the Cloud realtime relay flag follows Cloud vs Direct; Gmail and embeddings keep their Cloud owner under Direct. Duplicates: `test/browser-cloud-dev-bridge.test.mjs` (bridge side), `test/dev-ui-remote-host.test.mjs` (same launcher for `dev:cloud`). Callers/importers: `npm test` glob; imports `fixtures/product-character-host.mjs`, `fixtures/assert-order.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T2 | vm transplant of a script that exports the function. | Import directly. | Low |
| 2 | 57-69 | T9 / T8 | Spawns the whole `dev-cloud.ts` under a monkey-patching loader, 120 s timeout, two free ports; tests the launcher, not the host. | Move to `test/tooling/local-agent-launcher.test.mjs` as one case, or have `dev-cloud.ts` export its environment builder and test that without spawning. | Low |
| 3 | 72-121 | T4 | Four broker cases (bind-before-launch, exit, log/launch failure, close rejection). | Keep as two: lifecycle (bind/stop/exit) and failure cleanup (stop, close, launch). | Low |
| 4 | 22 | D8 | One 700-character line of chained assertions. | Split when rewriting. | None |
| 5 | 6, 7 | A7 | `spawnSync` and `createServer` are used only by case 4. | Go with case 4. | None |

## Proposed end state
One tooling file (~200 lines including the merged siblings) importing `createCloudResidentHost`: credential custody and retirement, readiness, broker lifecycle, relay/Direct switching, embedding owner, plus the prepared-SDK block from the two siblings. `product-character-host.mjs` keeps only what other importers still need.
