# scripts/fixtures/cloud-delegation/native.ts
- Lines: 34 | Kind: component-page fixture (Vite alias for `./native-connection`: secure store on `localStorage` and a recording `openConnectionBrowser`) | Verdict: MOVE to `test/fixtures/component-pages/cloud-delegation/`
- Covers: the compare-exchange secure store the delegation panel uses, with injectable race and held clear, and records the authorization URL instead of opening it. Duplicates: in-memory compare-exchange stores in `scripts/fixtures/inbox-memory.ts` and many test files (C4 durable-slot fakes). Callers/importers: aliased in by `scripts/test-cloud-delegation.ts:20`; research/scripts.md also lists `test/browser/browser-voice-registration.spec.ts`, `native-cloud-subscription.spec.ts` and `test/support/feature-parity.mjs` (feature-parity is a D15 delete).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1,4-7 | D7/A7 | Imports `cloudDelegationSlot` from `apps/app/src/runtime/cloud-delegation-ui.tsx:34`. That export is used nowhere in product code (a grep of `apps/app/src` finds only its declaration); this fixture is its only reader (delete-candidates.md B274). | Delete the export from the product file and declare the regex here. | L |
| 2 | 13-28 | C4 | Third JSON-compare compare-exchange fake (see `inbox-memory.ts`). | Build on the shared `test/support/memory-slot-store.ts` proposed in `inbox-memory.ts`, backed by `localStorage` here. | L |

## Proposed end state
Moves with the page. Keeps the race and held-clear hooks, which are what makes this page test something a journey cannot easily reach
(a store conflict between owner switch and clear).
