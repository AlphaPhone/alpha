# test/fixtures/prepare-local-agent.mjs
- Lines: 73 | Kind: integration fixture (temp git repos, spawns the real `scripts/prepare-local-agent.ts --source-only`) | Verdict: KEEP
- Covers: builds a two-commit fixture SDK and a product copy of `prepare-local-agent.ts`, `local-agent-source.ts`, `copy-file-clone.ts` and two upstream `scripts/lib` modules, runs preparation, then advances the checkout so `--requalify-from <digest> --preserve-stamp` can be tested. Duplicates: none. Callers/importers: `test/prepare-local-agent-requalify.test.mjs:7` (research marks it source-text/A, but it actually spawns the real script and checks exit status and stamp bytes, so it is integration-shaped; its cases overlap the `PreparedSourceStamp` harness), `specs/quint/refinement/services/prepared-source-stamp.mjs:7,106` (registered in `services/index.mjs:51`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | — | Copies vendor `immutable-workspace-source.mjs` / `committed-source.mjs` into the temp product: the script's real dependency closure. If `prepare-local-agent.ts` gains an import, the list must change (fails loudly). | Keep; or derive the list from an esbuild metafile as `boundaries.mjs` does. | Low |
| 2 | 27-33 | C3 | Local `git()` wrapper (one of ~17 copies, helpers.md). | Use the shared `scripts/lib` git helper once it exists. | Low |
| 3 | — | — | Survives the DELETE of `prepare-local-agent-requalify.test.mjs` because the Quint harness imports it. | None. | — |
| 4 | — | cost | Two `spawnSync` runs of a TS script plus several git commands per call (seconds, not minutes). | None. | — |

## Proposed end state
Unchanged apart from the shared git helper; owned by the `PreparedSourceStamp` refinement harness.
