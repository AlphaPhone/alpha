# specs/quint/refinement/application/address-input.mjs
- Lines: 119 | Kind: Quint refinement harness (transplant of a sliced adapter region + real upstream parser) | Verdict: KEEP model, PORT harness
- Covers: Browser address bar decision (open URL / search / refuse with toast / throw for approved destination) for a 48-text corpus and model walks, against `AddressInput.qnt` (128 lines, live). Duplicates: `test/browser-navigation-creation.test.mjs`, `test/browser-receipt-order.test.mjs` mention the same adapter path; Playwright browser specs type addresses. Callers/importers: `test/quint-address-input.test.mjs` only (not in `index.mjs`); exports `corpus`, `describe` used by that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 51-55, 61-65 | T2/T10 | Slices `apps/app/src/prototype/browser-adapter.ts` between `'  async function navigate('` and `'  async function command('`, strips types and evaluates it with 15 stubbed closure variables (`MAX_TABS`, `tabs`, `restored`, `restoreAttempts`, `ensure`, `shell`, `Browser`, `report`…). Breaks on any reorder/rename in the adapter (59 manifest symbols already pinned there). | Extract `navigate` into `prototype/browser-navigation.ts` exporting `createBrowserNavigate(deps)` (same pattern as the existing `prototype/browser-external-handoff.ts`), import it with `bundledSource`, pass the same deps object. | Med |
| 2 | 80-94 | T10 (model text) | Builds a temporary model by slicing the `.qnt` at `lastIndexOf('}')` and appending `run corpusTest`. Fragile but contained to the model file. | Acceptable; alternatively pass submissions through `quint run --init` with a generated scenario module that imports `AddressInput`. | Low |
| 3 | 87 | – | Spawns Quint CLI by `node_modules/@informalsystems/quint/dist/src/cli.js` path; other harnesses use `node_modules/.bin/quint` or `browser-model-traces.mjs`. | Use the shared `modelTraces`/runner helper. | Low |
| 4 | 36-48 | (keep) | `describe()` computes model input properties from the real upstream `parseBrowserAddressInput`; good abstraction function. | Keep. | – |
| 5 | test file | T3 | `test/quint-address-input.test.mjs` second test checks that the corpus contains each class (a property of the fixture list). | Fold into the harness as an assertion, delete the wrapper test (MERGE into single runner). | None |

## Proposed end state
Same corpus and model-walk replay (~100 lines) calling an imported `createBrowserNavigate` instead of a vm-evaluated
slice; run through the single manifest-driven runner. Product prerequisite: extract `navigate` from
`browser-adapter.ts` (also reduces that god module).
