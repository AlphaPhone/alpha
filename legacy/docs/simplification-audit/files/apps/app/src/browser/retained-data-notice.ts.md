# apps/app/src/browser/retained-data-notice.ts
- Lines: 15 | Role: production recovery notice dialog ("Data kept") | Verdict: SIMPLIFY
- Importers: 1 (domain-recovery.ts). Text/path pins: inventory only; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 11-14 | C4 (P4) | cssText + its own alpha-back/pagehide/visibilitychange/focus-restore lifecycle and `(document.querySelector('.os')\|\|document.body).append`. | Use dialog kit `openOwnedDialog`; this becomes ~5 lines. | Low. |
| 2 | 2, 5 | B4 | Module-level `current` singleton guard — fine (one notice at a time). | Keep. | - |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Thin notice built on the dialog kit; could live inside domain-recovery.ts once that file is reduced to the product path. Estimated lines after: 6 (current 15).

## Verification
domain-recovery-lifecycle.spec.ts (production path), remaining-dialog-layout.spec.ts.
