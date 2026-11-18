# specs/quint/refinement/services/notes-store/fixture.mjs
- Lines: 83 | Kind: shared harness/test support (controlled encrypted CAS backend + real Notes owners fixture) | Verdict: KEEP (consider MOVE to `test/support/notes-source.mjs` together with `module.mjs`)
- Covers: builds a real upstream `AgentRuntime` + `NotesStore` + `NotesService` + `serverInteract` + `createNotesClient` with only filesystem root, clock, event delivery and host CAS supplied. Duplicates: `deferred()` (lines 5-9) is one of ~18 copies under `specs/quint/refinement` (also `services/support.mjs:6`). Importers: `notes-store/index.mjs:5`; `test/notes-store-lifecycle.test.mjs:5`, `test/notes-logical-revision.test.mjs:7`, `test/notes-replay-identity.test.mjs:8` (all three are MERGE into `test/integration/notes-store.test.mjs`, so this file survives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-9 | C3 | Private `deferred()`. | Import from `refinement/support.mjs` (proposed shared harness helpers). | Low |
| 2 | 48-49 | — | Overrides `runtime.reportError`/`getService` on a real `AgentRuntime` instance: controlled port, acceptable. | Keep. | — |
| 3 | 74 | B1 | `try{...}catch(error){if(error.code!=='ENOENT')throw error;}` is a named-failure catch: fine. | Keep. | — |
| 4 | 1-83 | D8 | Minified style. | Prettier (D9). | — |
| 5 | — | D6 | It is test support used by host integration tests and the harness; living under `specs/` makes the host tests import from the formal tree. | Optional: move `fixture.mjs` + `module.mjs` to `test/support/notes-source.mjs` and import from both sides. | Low |

## Proposed end state
Unchanged behaviour; shared `deferred`; formatted. Stays the single real-Notes fixture for both the Quint campaign and
`test/integration/notes-store.test.mjs`.
