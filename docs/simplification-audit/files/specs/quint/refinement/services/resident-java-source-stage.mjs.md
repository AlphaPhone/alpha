# specs/quint/refinement/services/resident-java-source-stage.mjs
- Lines: 91 | Kind: Quint refinement driver (runs the real product CLI that stages pinned upstream resident Java sources, via `test/fixtures/resident-java-source-stage.mjs`, on disposable committed SDK/product trees) | Verdict: KEEP, SIMPLIFY
- Covers: `ResidentJavaSourceStage` (live, `manifest.json:2754`): initial publish, repeat and replace; committed rewrite-anchor refusal keeps the prior tree; pin/stamp/dirty refusals; candidate manifest, move and publish refusals; refused restore retaining both exact pairs; unexpected output refused until cleared. Duplicates: `test/quint-resident-java-source-stage.test.mjs` contains a standalone test of the same "committed-anchor refusal keeps prior" case before calling this campaign (T4). Callers: `services/index.mjs:60,83`; `test/quint-resident-java-source-stage.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-18 | T10 (error text) | Results classified by regex over stderr messages (`Unexpected native runtime source pin`, `ResidentHostSourceError: Review changed runtime notification presentation`, `AggregateError: Resident Java publication and restore failed…`). | Stable refusal codes in the CLI output. | Medium |
| 2 | 41 | T10 | Success is recognised by the stdout line `Generated N pinned local-agent sources for`. | Use exit status plus the observed tree (already observed). | Low |
| 3 | — | T4 | Host test duplicates `committed-anchor-refusal-keeps-prior`. | Delete the standalone host case; keep this campaign. | Low |
| 4 | — | owner (product) | The "rewrite anchor" is a product-side text rewrite of upstream Java (`ResidentHostSourceError`): the build itself patches upstream source by anchor. That is the product's design (outside this report), but it is why the model exists. | None here. | — |

## Proposed end state
Same nine cases keyed on refusal codes; the only runner is the per-model Quint entry with a path filter on the staging
CLI, its fixture and `upstream.lock.json`.
