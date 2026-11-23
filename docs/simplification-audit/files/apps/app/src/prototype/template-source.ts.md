# apps/app/src/prototype/template-source.ts
- Lines: 10 | Role: Splices the dev-only `development-rail.html` / `development-system-surfaces.html` into `template.html` at two comment markers when `testMocksEnabled`, so flag-off bundles drop the dev markup. | Verdict: KEEP
- Importers: `apps/app/src/prototype/dc-lite.js:3`. Text/path pins: `test/dc-lite-keys.test.mjs:14` and `test/browser-reading-capability.test.mjs:157` replace the exact import line `import templateHtml from "./template-source";` in dc-lite.js; `test/voice-in-chat-only.test.mjs:33` regex-matches L10 (T1); markers `<!-- alpha-development-rail -->` / `<!-- alpha-development-system-surfaces -->` in `template.html:4564,4591`; `test/support/feature-parity.mjs:39,433` (owner/reason entry naming `dev-surface-gates` and `production-bundle-audit` tests).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | D6 | Dev HTML lives in `prototype/` next to the product template. | When dev assets move to `apps/app/src/dev/`, update the two raw imports here. | Low |
| 2 | — | — | No dead code, no defensive code; the build-time elimination is checked by `scripts/audit-production-bundle.ts`. | Keep. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged (10 lines); only import paths change if dev HTML moves.

## Verification
`test/dc-lite-keys.test.mjs`, `test/dev-surface-gates.test.mjs`, `test/production-bundle-audit.test.mjs`, `npm run test:browser:production` (bundle audit).
