# apps/app/index.html
- Lines: 16 | Role: Vite HTML entry for the renderer: viewport, theme-color, `<div id="root">` and the `/src/main.tsx` module script. | Verdict: KEEP
- Importers: Vite (default entry, root `apps/app`); `apps/app/src/main.tsx:410,422` and `apps/app/src/runtime/error-boundary.tsx:94` look up `#root`. Text/path pins: `scripts/quint-lib.ts:39 runtimeAssetPaths = ['apps/app/index.html']` (hashed as a Quint fixture source, consumed by `test/quint-checker.test.mjs:7,79`); listed as an input path in `specs/quint/refinement/application/account-sheet.mjs:79` and `cloud-connection-notices.mjs:151`; built `index.html` (dist, not this file) is inspected by `scripts/audit-production-bundle.ts`, `scripts/ci/export-browser-proof.ts:73`, `test/production-bundle-audit.test.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8 | D8 (cosmetic) | `<meta\n name="viewport"\n content="width=device-width, initial-scale=1"\n />` split over four lines while every other tag is one line. | Collapse to one line only if a formatter run touches it; no standalone change. | None. |

No dead code, no defensive patterns, no duplication. `theme-color #ffffff` is the only colour; it matches the light launch theme and nothing overrides it at runtime (git grep `theme-color`: only this file) — not a finding.

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `#root` mount id | const (DOM id) | 13 | repeated literal `'root'` in `apps/app/src/main.tsx:410,422`, `runtime/error-boundary.tsx:94` | stays; optional `ROOT_ID` const in main.tsx shared with error-boundary.tsx |

## Proposed end state
Unchanged, 16 lines (13 if the viewport meta is collapsed by the formatter pass).

## Verification
`npm run verify` (quint-checker fixture-source hashing via runtimeAssetPaths; production-bundle-audit); any Playwright journey (app boots). account-sheet.mjs and cloud-connection-notices.mjs list it among the source inputs of their browser builds; a byte change re-triggers those refinement runs (no manifest stores its text).
