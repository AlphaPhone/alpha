# scripts/dev-cloud.ts
- Lines: 33 | Kind: script (developer launcher, `npm run dev:cloud`) | Verdict: KEEP + SIMPLIFY
- Covers: starts Vite with the browser Cloud resident (real loopback agent, production or staging Cloud, test mocks off), stripping inherited provider keys. Callers: `package.json` `dev:cloud`; README:45; `quint-lib.ts`; Quint `application/manifest.json` source pin; tests `cloud-resident-host`, `dev-ui-remote-host` (mention).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | C3 | Free-port probe (`createServer().listen().close()`) duplicated in `dev-local.ts:20`. | Shared `scripts/lib/launcher.ts` (`assertPortFree`, `devProfile(name)`, `prepareSource()`). | Low |
| 2 | 10-14 | C3 | `prepareClientFeatures()` + `prepare-local-agent.ts` + `node_modules` check duplicated with `dev-local.ts:12-19`. | Same shared helper. | Low |
| 3 | 23,25 | — | Clears mock flags and strips `CEREBRAS_/OPENAI_/…` env: specified isolation, keep. | Keep. | — |
| 4 | 23 | D8 | 400-char env object line. | Format. | — |

## Proposed end state
~22 lines using a shared launcher helper with `dev-local.ts`.
