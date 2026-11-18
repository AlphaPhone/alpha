# test/reading-capability-probe.test.mjs
- Lines: 29 | Kind: unit of upstream module (T3/T5) | Verdict: DELETE
- Covers: `createReadingSupport` caches an explicit yes/no, retries on failure/malformed answers; the unsupported-reading message text. Duplicates: Upstream `vendor/eliza/plugins/plugin-native-browser-surface/src/page-reading.test.ts` tests the same module; `test/browser-reading-capability.test.mjs` and `test/browser/reading-capability.spec.ts` cover the product use. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5 | T5 | Imports `.eliza/client-features/.../page-reading.ts`, the projected upstream module, and re-tests it. | Delete; upstream owns it. | Low |
| 2 | 27-29 | T1 | Asserts a constant string equals itself. | Delete. | Low |

## Proposed end state
- Removed; the Playwright reading-capability spec is the product check.
