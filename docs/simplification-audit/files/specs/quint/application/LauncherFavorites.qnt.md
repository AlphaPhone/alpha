# specs/quint/application/LauncherFavorites.qnt
- Lines: 164 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP here; owner question: move upstream (P6/D14)
- Covers: shared launcher favourites: canonical unique order, OldWorkflows→Automations rename migration, v1/bare-v2 defaults, rollback record, write refusals (`upstream renderer: mobile-shell/mobile-launcher.ts`, `view-id-migration.ts`, upstream `launcher.ts`; Alpha only supplies `alpha-product.ts` navigation). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); harness `launcher-favorites.mjs` (+ `.md`) via `test/quint-launcher-favorites.test.mjs` and `test/quint-application-refinement.test.mjs` (via `specs/quint/refinement/application/index.mjs`)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-164 | P6 | Models upstream-owned code. The v1 / bare-v2 / `OldWorkflows` paths are upstream legacy readers (A1) that this repo cannot delete (D14). | Keep passing; list as upstream follow-up to move model + harness to vendor/eliza. | L |
| 2 | harness 32-42 | T10 | Injects `__port.inspect` at `  let generation = 0;` in the generated `.eliza` file. | Upstream should expose a snapshot; until then keep the marker (it targets generated code, not ours). | M: any upstream bump can break it |
| 3 | — | T4 | Runs twice. | Keep one runner. | L |

## Proposed end state
- Upstream code (`.eliza/client-features` is generated from `vendor/eliza`); model stays until upstream adopts it.
- Only change here: one runner and path-scoped CI (run when `upstream.lock.json`/`.eliza` launcher or `alpha-product.ts` change).
