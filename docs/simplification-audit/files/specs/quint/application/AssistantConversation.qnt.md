# specs/quint/application/AssistantConversation.qnt
- Lines: 106 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP (absorb `Application` owner-switch trace; trim draft stub)
- Covers: AlphaClient: one dispatch per session, at most one execution, a sensitive view clears in-flight work and proposals, proposals only while connected and unconsumed, an in-flight send is bound to its epoch and context revision. Models: `runtime/alpha-client.ts`, `assistant-draft-record.ts`, `assistant-draft-store.ts`, `conversation-selection.ts`, `prototype/agent-adapter.ts` (exist; 13 symbol pins present). Duplicates: `ApprovalRoutes` (consumed set), `Application` (owner switch). Callers/importers: manifest (10 tests, 3 witnesses, 13 symbol pins); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `clients.mjs` `assistantConversation()` imports the real `AlphaClient` via `sourceModule` (import-based, good) through `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`); `test/quint-conformance.test.mjs:120` reads `draftConflictTest`; `services/manifest.json:793` cites the model in prose.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 82-86, 106 | — | Draft part (`edit`, `save`, `concurrentSave`, `rejectedSave = s' = s`) has no invariant and `draftConflictTest` asserts only field values; draft CAS has its own adapter per the harness assumptions. | Delete the draft fields/actions and `draftConflictTest` (and its use in `quint-conformance.test.mjs`), or add a real invariant (saved draft never overwritten without matching revision). | Low |
| 2 | harness | — | Harness reads TypeScript private fields after erasure (`client.epoch`, `client.proposals`). | Keep; acceptable observer for refinement. Expose a typed `debugState()` only if the class is refactored. | Low |

## Proposed end state
About 95 lines: send/approve/attach/detach/workflow plus the owner-switch run moved from `Application`; harness unchanged.
