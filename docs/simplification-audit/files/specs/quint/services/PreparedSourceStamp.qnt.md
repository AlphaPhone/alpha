# specs/quint/services/PreparedSourceStamp.qnt
- Lines: 84 | Kind: Quint model of build tooling (services family, live; 7 tests) | Verdict: DELETE with the `--requalify-from` path (owner question if the mode stays)
- Covers: `scripts/prepare-local-agent.ts` "source-only requalification" custody: `exact`/`stale`/`candidateRefusal` requests are `--requalify-from <digest> --preserve-stamp <path>` runs (harness `prepared-source-stamp.mjs:49-60`, fixture `test/fixtures/prepare-local-agent.mjs:72`); prior stamp preserved to a backup, lock/candidate sidecars refused, dirty or wrong-commit source refused. Sources exist (`prepare-local-agent.ts`, `local-agent-source.ts`, `copy-file-clone.ts`, upstream `immutable-workspace-source.mjs`, `committed-source.mjs`). Duplicates: `test/prepare-local-agent-requalify.test.mjs` (report: delete with the mode). Callers/importers: manifest; harness `refinement/services/prepared-source-stamp.mjs` (spawns the real script in a two-commit fixture SDK); wrapper `test/quint-prepared-source-stamp.test.mjs` (report: DELETE) + aggregate. Mentioned in `specs/quint/develop-state-review.md` (point-in-time note).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 39-50 | A4 / A7 | The model is the requalification protocol. `scripts/prepare-local-agent.ts` report (#2) finds no workflow, npm script or doc that passes `--requalify-from`; only this model and `test/prepare-local-agent-requalify.test.mjs` exercise it. | Delete model, harness, manifest entry, wrapper and fixture's requalify path together with the script's lines 14-57 (D20: code and proof go together). Lower the services floor in `test/quint-checker.test.mjs`. | Low; owner confirms the mode is not a manual recovery tool. |
| 2 | 16-19, 69-72 | coverage | Dirty-tree and wrong-base-commit refusal (`verifySource` in `local-agent-source.ts`) is checked here; every CI `agent:prepare` run only sees clean trees. | Keep one integration test in `test/` that runs `prepare-local-agent.ts --source-only` on the fixture SDK with a dirty file and with a moved HEAD and expects the two `ConsumerSourceError`s (reuse `test/fixtures/prepare-local-agent.mjs`). | Low |

## Proposed end state
File deleted. Source admission refusal is covered by one fixture-based integration test of `prepare-local-agent.ts`.
