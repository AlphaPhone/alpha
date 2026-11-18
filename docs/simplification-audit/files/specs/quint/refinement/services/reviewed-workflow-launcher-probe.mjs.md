# specs/quint/refinement/services/reviewed-workflow-launcher-probe.mjs
- Lines: 338 | Kind: Quint refinement driver (copies the real launcher and helpers into a synthetic repo, imports it with `node:fs`/`node:child_process` redirected to observing ports via a resolve hook) | Verdict: KEEP or DELETE with the launcher (follows `reviewed-workflow-launcher.mjs`)
- Covers: 16 default + 3 Bun scenarios over `start-reviewed-workflow-agent.ts`: refusals (relative source dir, missing deps, invalid port, key file mode, ambiguous profile, missing entry, unsupported routing, relative `MODELS_DIR`, revision read failure, receipt write failure), fresh vs existing profile settings, spawn env isolation (no unrelated env, loopback bind, local auth, token, key), signal forwarding, child exit, receipt-failure cleanup. Callers: spawned by `reviewed-workflow-launcher.mjs:43` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 302-306 | — | Import-level port substitution of `node:fs`/`node:child_process` for the launcher module only: no text slicing. | Keep if kept. | — |
| 2 | 87-97 | T10 (error text) | Refusals matched by message regex (`Invalid port`, `Provider key must be owner-only`, …). | Codes, if kept. | Low |
| 3 | 75-79 | — | Sets `OPENAI_API_KEY: 'synthetic-unrelated-value'` and checks the child env excludes it: synthetic value, no real credential. | Keep. | — |
| 4 | 233-296 | D9 | 60-line `spawn` port with nested event handlers and monkey-patched `child.on`/`child.kill`. | Split into named observers if kept. | Low |
| 5 | — | A7 / D20 | Same fate as the wrapper. | Owner. | Medium |

## Proposed end state
Deleted with the developer launcher, or kept unchanged apart from refusal codes.
