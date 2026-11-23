# scripts/agent-embeddings.ts
- Lines: 38 | Kind: script helper (developer agent launchers: embedding environment) | Verdict: MERGE into `scripts/agent-profile.ts` (with `agent-identity.ts`, `agent-model.ts`)
- Covers: names the fused inference library and models directory for host launchers whose `ELIZA_STATE_DIR` moves into a private profile, and warns when a saved profile omits the embeddings route. Duplicates: `LOCAL_EMBEDDING_ROUTE` mirrors upstream `native-runtime-profile.ts` `LOCAL_EMBEDDING_ROUTE` (comment line 4). Callers/importers: `scripts/start-local-remote.ts`, `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts`, `cloud-resident-host.ts`; `specs/quint/refinement/services/reviewed-workflow-launcher{,-probe}.mjs` (file copied by bytes and pinned in `specs/quint/services/manifest.json`); tests `agent-embedding-overrides.test.mjs`, `agent-identity.test.mjs`, `fixtures/product-character-host.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | C6/D14 | Local copy of an upstream constant. | Import it from upstream if exported; otherwise upstream follow-up (D14). | Low |
| 2 | 22 | B3 | `typeof value!=='string'` on `process.env` values (always string or undefined). | Drop that clause; keep the absolute-path check (env is a trust boundary). | None |
| 3 | 17-33, 36-37 | D8 | Single-space indentation, long one-line messages. | Formatter pass (D9). | None |
| 4 | — | C5 | All four launchers import all three of `agent-embeddings`, `agent-identity`, `agent-model`; each is < 70 lines. | One `scripts/agent-profile.ts` exporting the three concerns; update the Quint launcher manifests' file lists in the same change. | Low (manifest file pins move). |

## Proposed end state
Merged into `scripts/agent-profile.ts` (~100 lines with identity and model). Behaviour is covered by the launcher Quint refinement probes, which run the launcher with this code; the unit tests `agent-embedding-overrides.test.mjs` can go (T3).
