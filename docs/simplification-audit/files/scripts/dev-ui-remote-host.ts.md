# scripts/dev-ui-remote-host.ts
- Lines: 22 | Kind: script (developer tool: local Vite renderer proxied to an already-running host) | Verdict: DELETE (owner question)
- Covers: serves the renderer locally with the dev-bridge plugins removed and proxies `/__alpha-*` routes to an existing loopback host. Callers: none in package.json, workflows, README or docs; only `test/dev-ui-remote-host.test.mjs` (spawns it with a fake `vite` module). Header says "Owner QA uses manual reloads", i.e. a personal workflow.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7 | Undocumented, no npm entry; only its own test keeps it alive. | Delete with `test/dev-ui-remote-host.test.mjs`, unless the owner still uses it; then add an npm script and README line and keep. | Low |
| 2 | 16 | D10 | Removes plugins by name string (`alpha-local-agent-development`, `alpha-browser-cloud-dev-bridge`). | If kept, gate those plugins in `vite.config.ts` by an env flag instead. | Low |

## Proposed end state
Removed (or, if the owner uses it, an `npm run dev:remote-ui` entry with the plugin gate in `vite.config.ts`).
