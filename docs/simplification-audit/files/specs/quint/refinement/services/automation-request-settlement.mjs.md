# specs/quint/refinement/services/automation-request-settlement.mjs
- Lines: 188 | Kind: Quint refinement harness (source transplant: slices a fixture out of a **test file** and patches an observer into product source) | Verdict: PORT (blocking: its text source is being deleted)
- Covers: model `AutomationRequestSettlement`: a reviewed delete/enable/run is journaled before dispatch; a lost reply stays "unknown" until a complete list proves it (a partial list cannot), a complete list cannot prove a run so the owner must release it without a resend; a replacement connection cannot mutate an unread row; a delayed enable can override a newer choice and readback reflects that (6 traces). Duplicates: `test/automations-unified.test.mjs` adapter cases (same fixture, same journal behaviour; its report: REWRITE as `journeys/workflows.spec.ts`). Importers: `index.mjs`, `test/quint-automation-request-settlement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 20-25 | T2 / T10 | Reads `test/automations-unified.test.mjs` as text and slices from `'function adapterFixture('` to `'\nconst wait='`, then rewrites `'return {window:context.window'`. That test is being split (adapter cases -> Playwright journey); deleting it breaks this model. | Move `adapterFixture` into `test/fixtures/automations-adapter.mjs` as an exported function **before** the test is rewritten; better, mount the imported `automations-adapter.ts` under `tsx` as in the `authorization.mjs` pattern. | High (ordering dependency with the test rewrite) |
| 2 | 31-33 | T10 / D7 | Injects `globalThis.inspectSettlement=()=>({state,busy:!!controller,loadedSession,session,rows,uncertain:[...]})` at the literal anchor `' const mount=p.componentDidMount,unmount=p.componentWillUnmount;'` in `apps/app/src/prototype/automations-adapter.ts`. Reformatting the adapter (D9 Prettier) breaks it. | Observe through what the user sees: the rendered automation view (`busy`, row list, the "unknown/allow another" state) plus the journal slot bytes the harness already reads. If a field is not rendered, it is not a user-visible state and should leave the projection. | Medium: may require a model projection change (Quint edit) |
| 3 | 35 | T2 | `source.replace(/^import .*;\n/gm, '').replace(/export /g, '')` + `stripTypeScriptTypes` + `vm.runInNewContext`. | Gone with the port. | — |
| 4 | 48-58 | B5 | Initial hash set plus a `capture` re-hash sandwich that asserts nothing changed between discovery and execution; hashes `upstream.lock.json`, `scripts/prepare-client-features.ts`, `.eliza/client-features/.source.json`. | Drop; declare product sources once. | Low |
| 5 | 148-180 | — | The six schedules are the valuable part; keep them verbatim. | Keep. | — |

## Proposed end state
~140 lines: imports the adapter (or a shared fixture module that does), drives the same six schedules through rendered controls, observes rendered state + journal bytes.
No read of any test file or product file as text. Must land before `test/automations-unified.test.mjs` is rewritten.
