# apps/app/src/runtime/connection-ui.css
- Lines: 231 (19 lines >200 chars; line 4 is 2,429 chars) | Role: connection-family sheets (scrim, sheet, buttons, forms), sign-in page, own-keys/provider settings, Google connections sheet, plan notices, and shared status atoms (`.alpha-sr`, `.alpha-spin`, status dots, chips, code boxes, plan pill, usage bar). | Verdict: SIMPLIFY (and SPLIT shared atoms out)
- Importers: `connection-ui.tsx:78`; dev fixtures `scripts/fixtures/cloud-delegation/entry.tsx:5`, `scripts/fixtures/hosted-live-source/entry.tsx:1`. Classes used across `cloud-sign-in-ui.tsx`, `cloud-membership-ui.tsx`, `cloud-delegation-ui.tsx`, `google-connection-ui.tsx`, `hosted-digest-ui.tsx`, `status-ui.tsx`, `prototype/file-email-review.ts`; `startup-permissions.css:13` comment refers to `.alpha-btn`.
  Text/path pins: `specs/quint/application/manifest.json:2807` (source list), `specs/quint/refinement/application/cloud-connection-notices.mjs:17` (reads this file's text to check plan-notice rules — T10).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 148-149 | NEW (undefined theme token) | `color:var(--connection-muted,#666)` and `border-top:1px solid var(--connection-border,#e5e5e5)`. The palette sets only `--connection-{bg,fg,s2,line,mut,acc}` (`prototype/model.js:5743`), so these always fall back to fixed light colours — wrong in dark theme. | Use `--connection-mut` and `--connection-line`. | Low; visible fix in dark mode (own-keys section headings/dividers). |
| 2 | 125 (`.alpha-auth-body`), 141-142 (`.alpha-provider-confirm`) | A7 | No element uses `alpha-auth-body` or `alpha-provider-confirm` (grep over `apps/app/src` non-CSS: 0). | Delete those selectors/rules. | Low. |
| 3 | 1-4 | D8 | Lines 1, 2, 4 hold dozens of rules each (line 4: 2,429 chars). | Formatter, one rule per line (own commit; update `cloud-connection-notices.mjs` if it slices text). | Low. |
| 4 | 10 vs 178-186; 18 vs 189; 4 (`.alpha-connection h1`) vs 196 | C5 | Rules defined then overridden later in the same file: `.alpha-connection-resume h1` (font-size 30px at 10, 22px at 182), `.alpha-google-connections>header` (sticky at 18, static at 189), `.alpha-connection h1` (46px at 4, 22px for scrim sheets at 196). | Delete the overridden declarations (10, 18-19, parts of 4) and keep the final values. | Medium: confirm via screenshots that no non-scrim `.alpha-connection` relies on the 46px heading (the sign-in page uses `.alpha-auth-page h1`). |
| 5 | 1, 154-164 (+ `cloud-membership-ui.css:32`) | C5 | Phone-frame scrim geometry (`left:var(--phone-left)…transform:scale(var(--phone-scale,1))…`) written three times. | One rule; `:has(.alpha-connection-resume)` keeps only its differing padding. | Medium (visual). |
| 6 | 100-102 vs 204-205 | C5 | Two spinners: `.alpha-spinner` (28px block, used by sign-in, delegation, digest, file-email-review) and `.alpha-spin` (1em inline, `status-ui.tsx Busy`), each with its own reduced-motion rule. | Keep both sizes but one keyframe/reduced-motion rule; `cloud-delegation-ui.tsx:16` inline-styles `.alpha-spinner` down to 16px — use `.alpha-spin` instead. | Low. |
| 7 | 140 vs `cloud-membership-ui.css:64`; 111-112 | C5 | Segmented/pressed button colours declared in two files. | Delete the membership duplicate. | None. |
| 8 | 202-231 | D11 | Shared status atoms (`.alpha-sr`, `.alpha-spin`, `.alpha-status*`, `.alpha-chip`, `.alpha-code-boxes`, `.alpha-plan-pill`, `.alpha-usage-bar`) serve `status-ui.tsx` and other surfaces but live in the connection sheet file. | Move to `status-ui.css` imported by `status-ui.tsx`. | Low; fixtures import this file for those atoms — import both. |
| 9 | 35, 43-46 | C6 | Plan notices use the app palette (`--s2`, `--fg`, `--acct`) while the rest uses `--connection-*`; intentional (notices render outside sheets) — note only. | KEEP. | — |
| 10 | 120, 139 | C6 | `min-height:max(48px,calc(48px / var(--phone-scale,1)))` repeated (also 6× in membership CSS). | One `--alpha-touch-min` custom property. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| scrim geometry | CSS block | 1, 154-164 | `cloud-membership-ui.css:32` | one rule here |
| `.alpha-spinner` / `.alpha-spin` | CSS atom | 100-102, 204-205 | inline-styled spinner in `cloud-delegation-ui.tsx:16` | `status-ui.css` |
| status atoms | CSS | 202-231 | — | `status-ui.css` |

## Proposed end state
Formatted; ~10 dead or overridden declarations removed; tokens fixed (`--connection-mut`/`--connection-line`); scrim geometry single-sourced; status atoms moved to `status-ui.css` (~30 lines). Rule count drops ~15%; physical lines rise after one-rule-per-line formatting, so estimate ~200 rule-lines here + ~30 in `status-ui.css`.

## Verification
`specs/quint/refinement/application/cloud-connection-notices.mjs`, Playwright production lane (sign-in page, provider settings, Google connections, plan notices, accessibility 48px targets), dark-mode visual check of own-keys form, dev fixtures `scripts/fixtures/cloud-delegation` and `hosted-live-source` (via `test/browser/adapters.spec.ts`).
