# specs/quint/refinement/services/embedding-store-pglite.mjs
- Lines: 218 | Kind: Quint refinement support (real upstream `AgentRuntime` + temporary PGlite database; integration-shaped) | Verdict: KEEP
- Covers: three schedules on a real PGlite store (cache read failure, lost commit reply keeps the fence, adapter/cache failures keep the fence). Duplicates: none. Importers: `embedding-store-identity.mjs`, `named-embedding-provenance.mjs`, `test/quint-named-embedding-provenance.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-40 | — | Real database, real runtime, wrapped adapter methods as fault ports: the strongest kind of evidence in this chunk. | Keep. | — |
| 2 | 22-24 | — | Comment explains a shallow-copy workaround in the shared upstream test helper; legitimate "why". | Keep. | — |
| 3 | — | P1 | Upstream-only behaviour. | Same upstream-pin lane as `embedding-store-identity.mjs`. | Low |

## Proposed end state
Unchanged.
