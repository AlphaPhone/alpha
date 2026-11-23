# apps/app/src/prototype/mock-attention.ts
- Lines: 4 | Role: re-export shim `export { mockAttentionRows } from './model.js';` | Verdict: DELETE
- Importers: `apps/app/src/prototype/data-adapter.ts:2` only (which imports `HOME_DEFAULTS` from `./model.js` on the next line). Text/path pins: `test/support/feature-parity.mjs:387`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-4 | D4 | One-line re-export; misleading name (research §5). | `data-adapter.ts:2-3` → `import {mockAttentionRows, HOME_DEFAULTS} from './model.js';`; delete this file and `feature-parity.mjs:387`. `model.d.ts:6` already declares the export. | None |

## Local types and helpers
None.

## Proposed end state
Deleted (0 lines).

## Verification
`test/feature-parity.test.mjs`, `test/home-cards.test.mjs`, Home browser specs; `npx tsc`.
