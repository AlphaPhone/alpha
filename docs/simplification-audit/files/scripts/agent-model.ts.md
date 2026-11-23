# scripts/agent-model.ts
- Lines: 15 | Kind: script helper (developer agent launchers: Cerebras model env) | Verdict: MERGE into `scripts/agent-profile.ts`
- Covers: default Cerebras model and the env that pins small/large model from a saved profile's direct Cerebras routing. Duplicates: none. Callers/importers: `start-combined-agent.ts`, `start-local-remote.ts`, `start-local-voice-agent.ts`, `start-reviewed-workflow-agent.ts`, `eval-device-action-clarification.ts`; Quint launcher models (file pins); test `agent-model-selection.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-8 | B3 | Regex-validates the default constant at import; only `CEREBRAS_MODEL` from env needs it. | Validate only the env value. | None |
| 2 | — | C5/D4 | 15-line module with five importers that also import `agent-identity.ts`. | Merge into `agent-profile.ts`. | Low |

## Proposed end state
Two exports inside `agent-profile.ts`. `test/agent-model-selection.test.mjs` (unit) is deleted; the launcher Quint probes exercise it.
