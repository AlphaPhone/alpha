# apps/app/src/runtime/cloud-membership-ui.css
- Lines: 76 (15 lines >200 chars, line 30 is 918 chars) | Role: styles for the Account/membership sheet, billing overlay and account links; imported by `cloud-membership-ui.tsx:2`. | Verdict: SIMPLIFY
- Importers: `cloud-membership-ui.tsx:2`. Selectors used by `connection-ui.tsx` (`data-alpha-membership-sheet`, `data-alpha-billing-overlay`, `data-alpha-membership-panel`, `.alpha-account-*`), `google-connection-ui.tsx` (`data-alpha-google-overlay`).
  Text/path pins: none by path. Attribute names are read by `test/agent-always-local.test.mjs` and `specs/quint/refinement/application/account-sheet.mjs` (`data-alpha-membership-panel`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29, 30 (`.alpha-membership-footer`), 34-36 (`.alpha-billing-review` ×5 rules), 61 (`.alpha-account-cancel`), 58, 69 | A7 | Selectors with no element: grep over `apps/app/src` (non-CSS) finds 0 uses of `alpha-membership-actions`, `alpha-membership-footer`, `alpha-billing-review`, `alpha-account-cancel`. | Delete those rules (lines 29, the footer part of 30, 34-36, 61, and the `.alpha-account-cancel` selectors in 58/69). ~8 lines. | Low; confirm no class is assembled at runtime (grep for template-built `alpha-` classes found none). |
| 2 | 30-33 | D8 | Several unrelated rules packed per line (918 chars). | Formatter (one rule per line). | None. |
| 3 | 32 | C5 | `.alpha-connection-scrim[data-alpha-billing-overlay]` repeats the phone-geometry block (`left:var(--phone-left)…transform:scale(var(--phone-scale))…`) already in `connection-ui.css:1` and `:154-164`. | Define one `.alpha-phone-scrim` geometry rule in `connection-ui.css` and drop the repeats. | Medium: visual regression check on billing overlay and resume sheet. |
| 4 | 64 vs `connection-ui.css:140` | C5 | `.alpha-account-sheet .alpha-segmented button[aria-pressed=true]{background:var(--connection-fg…)}` duplicates the general rule in `connection-ui.css:140`. | Delete line 64. | None. |
| 5 | 3, 26, 36, 41, 51 | NEW (specificity war) | `!important` ×12 (`max-width:none!important`, `font-size:28px!important`, `background:…!important`) to beat `connection-ui.css` rules. | After merging the two sheets' button/heading rules, remove `!important`s one by one with a visual check. | Medium. |
| 6 | 10, 19, 25, 32, 71 | C6 | `min-height:max(48px,calc(48px / var(--phone-scale,1)))` repeated 6× here and 4× in `connection-ui.css`. | One custom property `--alpha-touch-min` on `.alpha-connection`. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| phone-scrim geometry | CSS block | 32 | `connection-ui.css:1`, `:154-164` | one rule in `connection-ui.css` |
| touch-target min-height | CSS value | 10,19,25,32,71 | `connection-ui.css:120,139` | custom property |

## Proposed end state
~55 formatted lines (more lines after one-rule-per-line, but ~20 fewer rules): dead selectors removed, scrim geometry and segmented rule taken from `connection-ui.css`, `!important`s reduced.

## Verification
Playwright visual/production specs for the Account sheet: `cloud-account-panel`, `billing-recovery.production.spec.ts`, `settings-truth.production.spec.ts`, `accessibility-*` (48px targets); `specs/quint/refinement/application/account-sheet.mjs`; manual phone-frame check in light and dark.
