# specs/quint/application/AddressInput.qnt
- Lines: 128 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT harness
- Covers: Browser address bar decision: every submission opens, searches or refuses exactly once; credentials and explicit web addresses are never sent to search; time-like text never opens; approved destinations are never reinterpreted. Models: `apps/app/src/prototype/browser-adapter.ts` (`parseBrowserAddressInput` use, `navigate`, `browserNavigateApproved`) plus upstream `.eliza/.../plugin-native-browser-surface/src/address-input.ts` (exist). Duplicates: `test/browser-navigation-creation.test.mjs`, `test/browser-receipt-order.test.mjs` read the same harness; Playwright browser specs cover a few strings. Callers/importers: manifest (6 tests, 4 witnesses, 7 symbol pins incl. two user-copy strings); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/address-input.mjs` via `test/quint-address-input.test.mjs` only (not in the aggregate); `scripts/prepare-client-features.ts` references the harness path.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 52-55 | T10 / T2 | Slices `browser-adapter.ts` between `'  async function navigate('` and `'  async function command('`, strips types, evals in `vm`; `:85` also reads the `.qnt` text. | PORT: export a pure `addressOutcome(text, approved)` (or the `navigate` decision) from a browser-adapter submodule and import it; the upstream parser is already imported directly. | Medium: anchors break on the browser-adapter split. |
| 2 | manifest | T10 | Two symbol pins are user-facing sentences ("Invalid approved browser destination", "Enter search words …"). | Pin files, not text. | Low |
| 3 | 5-95 | — | Stateless decision encoded as a one-step state machine; the value is the exhaustive property-combination check (`possible`). | Keep. | — |

## Proposed end state
Model unchanged. Harness imports an exported decision function; no text anchors.
