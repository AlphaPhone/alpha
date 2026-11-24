# test/agent-identity.test.mjs
- Lines: 108 | Kind: mixed: constant checks (16-23), source-text over `scripts/start-*.ts` (25-27) and `vendor/eliza` (29-42), tooling integration launches (44-108) | Verdict: MERGE lines 44-108 into `test/tooling/local-agent-launcher.test.mjs`; DELETE the rest
- Covers: host launchers present the product character ("Alpha") to the agent child, route embeddings on-device for new profiles, require local auth for the reviewed-workflow launcher, refuse to run the pinned vendor tree. Duplicates: `agent-model-selection.test.mjs`, `agent-embedding-overrides.test.mjs` (same launcher), `test/fixtures/agent-identity-canonical.test.ts`, `test/product-character-host.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-23 | T1-like | Asserts the value of an exported constant equals another constant. | Delete. | None |
| 2 | 25-27 | T1 | Regex over four launcher sources. | Delete; the launch case proves the child receives the character. | None |
| 3 | 29-42 | T5 | Pins `vendor/eliza` runtime source text (sandbox-character, eliza.ts, presets, system-prompt). | Delete (upstream's tests own this). | None |
| 4 | 59-77 | - | Real launch of `start-local-remote.ts`: character, unchanged profile bytes, on-device embedding route. | Keep (2 cases). | Low |
| 5 | 79-93 | - | Reviewed-workflow launcher requires local auth. | Keep only if that launcher survives the scripts chunk. | - |
| 6 | 95-108 | A7 | `start-combined-agent.ts` is referenced only by specs/tests and a NOT_RUN note (scripts research "owner decision"). Loop also skips paths that do not exist (`base/eliza-app`). | Delete with the launcher, or keep one case if it stays. | - |

## Proposed end state
Gone as a file. Two to three launch cases move to `test/tooling/local-agent-launcher.test.mjs`. The product identity shown
in the shell is covered by the production journey (`journeys/production-gating.spec.ts` checks the visible name).
