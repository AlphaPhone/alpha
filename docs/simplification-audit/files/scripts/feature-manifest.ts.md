# scripts/feature-manifest.ts
- Lines: 45 | Kind: script (inventory tool for a parity test) | Verdict: DELETE (RECOMMENDATIONS D15)
- Covers: emits Alpha's mobile feature manifest from upstream `mobile-shell/core.ts`, the diff against Eliza's, and a `git ls-files` list of every Alpha source file ("behavioural modules") that `test/support/feature-parity.mjs` must equal. Callers: `test/feature-parity.test.mjs:8` (imports `featureParity`), `test/direct-provider-module-budget.test.mjs:9` (reads this file as text, T1). `scripts/prepare-client-features.ts:125` mentions upstream `upstream renderer: mobile-shell/feature-manifest.ts`, a different (upstream) file, so not a caller. No npm/CI caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 20-25 | T1 / A7 | `alphaBehaviouralModules` is a file list compared to a hand-maintained file list; every file add/move/delete edits the inventory. D15 decides to delete it. | Delete this file, `test/support/feature-parity.mjs`, `test/feature-parity.test.mjs`, and the source-text read in `direct-provider-module-budget.test.mjs`. | Low |
| 2 | 27-37 | — | The manifest diff vs Eliza is the only possibly useful part (detects upstream feature registration drift). | Not worth a tool on its own; if wanted, assert it inside an integration test that boots the product registration. | Low |
| 3 | 6, tests-host | D6 | A production-looking script imports test support (research `tests-host.md:336`). | Resolved by deletion. | — |

## Proposed end state
File removed with its inventory and tests.
