# test/fixtures/workflow-execution-markup.mjs
- Lines: 15 | Kind: transplant fixture (slices `template.html` from `{{workflows.runOpen}}` to `{{workflows.builder}}` and renders it through `DCLogic`) | Verdict: DELETE
- Covers: static markup of the run detail. Duplicates: `voice-markup.mjs` (same esbuild plugin and DCLogic subclass), `dev-workflow-execution.spec.ts`. Callers/importers: only `test/workflow-execution-presentation.test.mjs` (DELETE).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | T2, T10 | Template markers `<sc-if value="{{workflows.runOpen}}">` and `<sc-if value="{{workflows.builder}}">`. | Delete. | none |
| 2 | 9 | C5 | Copy of the `voice-markup.mjs` build plugin. | Both go. | none |

## Proposed end state
Gone.
