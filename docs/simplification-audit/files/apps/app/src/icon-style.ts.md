# apps/app/src/icon-style.ts
- Lines: 10 | Role: returns the CSS mask style for a published lucide icon (optionally the `-filled` variant) | Verdict: KEEP
- Importers: 12 app files (`browser/browser-surface.ts`, `browser/calendar-editor.ts`, `browser/device-controls.tsx`, `prototype/dc-lite.js`, `prototype/workflow-filters.ts`, `runtime/cloud-*-ui.tsx`, `runtime/connection-ui.tsx`, `runtime/hosted-*-ui.tsx`, `startup-permissions.tsx`). Text/path pins: `test/automations-unified.test.mjs:69` (path + export `iconStyle`), `test/browser-reading-capability.test.mjs:156` and `test/dc-lite-keys.test.mjs:13` replace the literal import line `import {iconStyle} from '../icon-style';` in other files (pins the specifier), `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | B3 (research n–z P14) | `if(!names.has(name))throw Error('Unknown published icon: '+name)` — runtime check of compile-time constants | Optional: generate `type IconName` from icon-catalog.json and type `asset`; keep the throw for `prototype/dc-lite.js` (untyped JS caller) | low |
| 2 | 3 | C3 | `new Set([...Object.values(catalog.ic),...catalog.extra])` also in `scripts/vendor-lucide-icons.ts:29` | none needed (2 sites, different runtimes) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `names` | const | 3 | scripts/vendor-lucide-icons.ts:29 | keep |

## Proposed end state
Unchanged (10 lines).

## Verification
`test/canonical-icons.test.mjs`, `test/automations-unified.test.mjs`; any visual spec.
