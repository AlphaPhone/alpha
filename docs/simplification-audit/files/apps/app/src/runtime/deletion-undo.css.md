# apps/app/src/runtime/deletion-undo.css
- Lines: 1 (one 1,100-character line) | Role: styles for the shared deferred-deletion Undo notice. | Verdict: SIMPLIFY
- Importers: `runtime/deletion-undo.tsx` (side-effect import). Text/path pins: none found (no test reads this file; `test/support/feature-parity.mjs` lists `.tsx`, not `.css`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | D8 | Whole stylesheet minified onto one line. | Format (one declaration per line) as part of the formatter commit. | None |
| 2 | 1 | C3 | The top offset `max(calc(48px * var(--phone-scale,1)),calc((var(--alpha-header-clearance,0px) + 8px) * var(--phone-scale,1)),calc(max(var(--native-top-inset,0px),env(safe-area-inset-top,0px)) + 12px))` is written twice (in `top` and inside `max-height`). | Declare it once as `--alpha-deletion-undo-top` on `.alpha-deletion-undo` and reference it in both. | None (same computed values) |
| 3 | 1 | D12 | `background:Canvas;color:CanvasText` system colours while other notices use theme tokens. | Owner/design question only; no change. | — |

## Local types and helpers
None.

## Proposed end state
~20 formatted lines, one custom property for the top offset, identical computed layout.

## Verification
`test/browser/durable-delete-undo.spec.ts`, accessibility-states screenshots in `test/browser/accessibility-states.ts`.
