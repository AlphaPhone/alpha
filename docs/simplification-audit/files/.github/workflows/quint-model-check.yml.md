# .github/workflows/quint-model-check.yml
- Lines: 59 | Kind: PR(paths)/nightly/dispatch workflow (Apalache bounded verify + legacy TLC compare/temporal) | Verdict: REWRITE as a sharded nightly `quint-verify` lane (drop the PR trigger and the legacy steps)
- Covers: `quint:verify --steps=6` over all 379 models, plus `quint:compare` (ChatInput, SettingsNav, HomeLayout, GoogleConnect) and `quint:temporal` (SignIn, GoogleConnect, Maps) — all seven are `specs/quint/legacy` models. Duplicates: `browser.yml` `formal` job runs the same `verify` phase for changed models on every PR (`check-changed-models.ts:47-50`). Callers/importers: triggers PR on `specs/quint/**`, `scripts/check-quint.ts`, `scripts/quint-lib.ts`; cron 06:17; dispatch with `models`. `git grep quint-model-check` → only this file. Not in `affected.ts` (it lists `specs/quint/**` as verify-only).
- Health: never completed; every run cancelled at 4-63 min (research §2.5).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-45 | P4/P1 | One serial 240-min job over 379 models with 1,800 s per-model timeout cannot finish; a PR trigger on `specs/quint/**` (including refinement `.mjs` harnesses that do not affect Apalache) cancels the previous run. | Drop `pull_request`. Nightly: a matrix of ~8 shards, each `quint:verify --models=<shard list>` (list from a small `scripts/check-quint.ts --list --shard=i/n`), `timeout-minutes: 120`, `fail-fast: false`. | Medium: needs a shard option in `check-quint.ts`. |
| 2 | 46-54 | P6 | `compare`/`temporal` steps are the only consumers of these runner phases and target historical `legacy` models (design source `ef9fbf7cd7`). | Delete both steps when `specs/quint/legacy` is retired (D11); until then keep them in the nightly lane. | Owner (research §10 Q3). |
| 3 | 36-41 | P5 | `npm ci` + Java + `upstream:prepare-client` repeated (also in `browser.yml` formal). | Use the shared `node-setup` composite. | None. |
| 4 | whole | — | Requirement "Quint models keep passing at 100 %" is met by `quint:check` (scenarios + simulation) in the PR lane; Apalache is additional evidence. | Keep Apalache nightly, not per PR (or per PR only for changed `.qnt` files, already done by `quint:changed`). | Owner decision on PR-time Apalache. |

## Proposed end state
- `quint-verify.yml` (or a `schedule`-only job in the main CI file): nightly + dispatch(`models`), sharded matrix running `quint:verify --steps=6`; uploads `test-results/quint/` per shard.
- No PR trigger; no legacy compare/temporal steps once `specs/quint/legacy` is retired.
