# test/fixtures/workflow-clock-admission.mjs
- Lines: 173 | Kind: transplant fixture (bundles real clock modules, slices `agent-adapter.ts` `context()`, `model.js` `leave()`, reads `template.html` click bindings, evals `clock-adapter.ts` in a vm) | Verdict: PORT (move into `specs/quint/refinement/application/`, import the real modules)
- Covers: opening Clock from Automations, review/approve, the opening slot save racing the handoff, back/visibility/mock-mode transitions and selection context, in browser and native modes. Duplicates: `test/browser/agent-clock-handoff.spec.ts`, `dev-clock.spec.ts`, `clock-repeat.production.spec.ts` drive Clock in the browser; `scripts/test-clock-handoff-flow.ts` (listed as a source here) is another flow test. Callers/importers: only the live harness `specs/quint/refinement/application/workflow-clock-admission.mjs` (model `WorkflowClockAdmission.qnt`, manifest line 1245) and its wrapper `test/quint-workflow-clock-admission.test.mjs` (merge into the Quint runner).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 42-52 | T2, T10 | Markers: `clock-adapter.ts` with `^import` removed and `^export ` stripped; `agent-adapter.ts` from `  function context(shell: Shell) {` to `  p.componentDidMount`; `model.js` from `  leave() {` to `\n\n  preset(`. | Export `installClockAdapter` ports properly and import it; extract the selection-context reader from `agent-adapter.ts` into an exported function (it is needed by the D1 split of `agent-adapter.ts` anyway); call the shell's real `leave` through the `model.js` split or pass a `leave` port. | high: three god-module slices; every structural pass breaks the live model |
| 2 | 54-73 | T10 | Parses `template.html` from `<sc-if value="{{is.workflows}}">`, strips `style=` attributes, and reads `onclick` bindings by `aria-label` (`Clock alarms`, `Review Clock request`, `Confirm Clock request`, `Close Clock`). | Have the view model expose named actions (`openClock`, `review`, `approve`, `close`) and drive them; the template-to-action wiring is a browser journey concern. | medium |
| 3 | 29, 112-114 | A1 | Bundles `clockHandoffLegacyKey` (legacy localStorage reader) and stubs `syncPreviousNotesAvailability` ("previous notes"). Both are legacy paths being deleted (DECISIONS D1). | Drop from the harness when the readers go; the model must not depend on them. | medium: the fixture fails to bundle once `clockHandoffLegacyKey` is removed |
| 4 | 20-21 | B5 | `workflowClockSources` lists `main.tsx` and `scripts/test-clock-handoff-flow.ts` as provenance, though neither is read. | Remove; pin only what is imported. | none |
| 5 | 33-40 | B3 | Asserts the bundle's inputs equal the dependency list. | Delete with the import port. | none |

## Proposed end state
A clock-admission driver beside the model that imports the clock adapter and an exported selection-context function,
with explicit `DailyApps`, `secureConnectionStore` and document/window ports. No slicing of `agent-adapter.ts`,
`model.js` or `template.html`, no legacy key. `WorkflowClockAdmission` passes at 100 %.
