# test/fixtures/mobile-uuid-build.mjs
- Lines: 65 | Kind: tooling fixture (builds a private tree of mobile-bundle inputs, either synthetic or copied byte-exact from the repo) | Verdict: KEEP; MERGE its single host-test importer into the release-tooling suite
- Covers: inputs for the mobile agent bundle admission (`scripts/mobile-uuid-adapter.ts` policy, core-state patch receipt, `uuid` package files) so the admission/refusal of a mobile bundle can be checked without a real build. Duplicates: `test/fixtures/core-state-root.mjs` (it builds on it). Callers/importers: `test/mobile-uuid-build.test.mjs`, `specs/quint/refinement/services/mobile-bundle-admission.mjs` (+ `.md`), live via `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | C3 | Exports its own `hash` (SHA-256 hex); the harness imports it. | Import from `scripts/lib` hash helper. | None. |
| 2 | 14-16 | T10 | Hard-codes the `uuid` package's dist barrel export list (`MAX`, `NIL`, `parse`, … `version`) and version `14.0.2` for the synthetic mode. Tied to an upstream dependency layout. | Acceptable for the synthetic tree; derive from `policy.package.files` where possible. | Low. |
| 3 | 31-52 | D9 | `reviewed` flag switches every write between repo bytes and synthetic bytes inline (6 ternaries). | Two small builders (`reviewedTree`, `syntheticTree`) sharing `write`. | None. |
| 4 | 56-59 | B5 | Derives `coreTransforms` from the core-state receipt for the caller. The receipt is real build evidence consumed by the admission script, so this is fixture plumbing, not ceremony. | Keep. | None. |
| 5 | 31, 34, 44 | — | Reviewed mode reads `vendor/eliza/bun.lock` and `node_modules/uuid/*`: requires installed deps; fine for CI. | Keep. | None. |

## Proposed end state
Stays (live Quint model + release tooling). Imports the shared hash helper, splits the reviewed/synthetic builders,
and `test/mobile-uuid-build.test.mjs` merges into the release-tooling suite (tests-host.md row: "merge-into
release-tooling suite per tool family"). Could move under `specs/quint/refinement/services/fixtures/` if the host test
merges away.
