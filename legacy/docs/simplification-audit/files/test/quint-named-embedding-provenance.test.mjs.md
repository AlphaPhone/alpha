# test/quint-named-embedding-provenance.test.mjs
- Lines: 152 | Kind: Quint wrapper (services index) + two integration tests on real upstream `AgentRuntime`, PGlite and the local core-state patch (`scripts/core-state-patch.ts`) | Verdict: MERGE cases 2-3 into `test/integration/agent-embeddings.test.mjs`; delete case 1
- Covers: named embedding admission keeps SQL provenance (8 traces); current SQL refuses a delayed unmarked insert before the runtime publishes its named pin; experience reload and metadata flush keep the stored vector without restamping. Duplicates: services index runs case 1; `quint-embedding-store-identity` covers store identity. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21 | T4 | Case 1 duplicates the services aggregate. | Delete. | None |
| 2 | 25-84 | — | Real runtime + PGlite race with a held publication window: genuine integration of the patched core. Not covered elsewhere. | Keep. | Low |
| 3 | 82 | B5 | `captureInputs(loaded.sources)` equals `driverHashes`: receipt bookkeeping inside an integration test. | Drop. | None |
| 4 | 86-152 | — | Bundles upstream `ExperienceService` with the core-state patch plugin, then checks stored vectors survive reload and metadata updates. Lines 99-100 assert the build output has no `file-type` import and the patch transform applied: tooling checks. | Keep the vector behaviour; move lines 99-100 to the core-state-patch tooling test. | Low |
| 5 | — | T5 | Both cases test upstream code as patched locally; when upstream adopts the patch they belong upstream (D14). | Note as follow-up. | Low |

## Proposed end state
Two cases in `test/integration/agent-embeddings.test.mjs` with a shared PGlite setup; the wrapper case and receipt hashing gone.
