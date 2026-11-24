# apps/app/src/prototype/prototype.css
- Lines: 201 | Role: Base stylesheet from the original design export: fallback theme tokens on `.os`, utility classes (`.i`, `.ib`, `.scr`, `.mono`, `.serif`, animations), Denton/Fraunces/Public Sans `@font-face` rules. | Verdict: SIMPLIFY
- Importers: `apps/app/src/main.tsx:91` (before `phone.css`); also imported in-page by `test/browser/helpers/native-cloud-signin.ts:16`, `test/browser/native-cloud-subscription.spec.ts:21`, `test/browser/startup-access.spec.ts:11`. Mentioned in `apps/app/src/prototype/README.md`.
- Text/path pins: `test/font-license.test.mjs:290-310` (path listed among Denton referrers; exact Denton `@font-face{…}` text `font-weight:100 900`; Fraunces `@font-face` blocks parsed with a regex); `test/product-identity.test.mjs:147` (scans the file). Not in `theme-palette.test.mjs` (so its hex literals are unchecked).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-183 | C5 | 15 Public Sans `@font-face` blocks: weights 300/400/500/600/700 × three subsets, each subset pointing at the **same** file for every weight (`/fonts/94593e69…woff2`, `/fonts/3a00a32f…woff2`, `/fonts/5ed4d31c…woff2`). | Replace with 3 blocks using `font-weight:300 700;` (one per unicode-range). Same files, same ranges, no synthesis change. | Low; check `scripts/prototype-capture.ts:156` font check and a Settings/Home screenshot. |
| 2 | 2, 44 | C5 / A7 | `body{margin:0;background:#050505}` and `html,body{margin:0;height:100%;background:#050505;overflow:clip;overscroll-behavior:none}` are entirely overridden by `phone.css:1` `html,body,#root{margin:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none;background:var(--alpha-white)}` (same specificity, imported later in `main.tsx`). The in-page test harnesses that import only `prototype.css` get the dark background, which no product build shows. | Delete lines 2 and 44. | Low: the three browser specs that import only this file render on white instead of #050505 (check their screenshots, if any). |
| 3 | 4 | A7 | `.al{display:inline-block;…}` — no `class="al"`/`'al'` in `apps/app/src` (template, model.js, TS) or `.eliza/client-features`. | Delete. | None. |
| 4 | 45 | A7 | `#stage{…width:960px;height:1020px…}` — no element with id `stage` anywhere (`git grep '"stage"'` / `#stage`: only this line). | Delete. | None. |
| 5 | 200-201 | A7 | `.alpha-note-speech-control{…}` — grep `note-speech-control`: 0 hits outside this file. | Delete with its comment. | None. |
| 6 | 17-18 | D6 | `.rail button{…}`, `.rail button:hover{background:#1a1a1a}` style only `development-rail.html` (dev surface). | Move to a dev stylesheet loaded with the dev rail. | Low. |
| 7 | 3 | C6 | `.os{--shc:…;--bg:#FFFFFF;…;--acc:#0000FF;…}` hard-codes theme tokens that `product/alpha-product.ts` (`mobileShellThemeVariables`) emits from the product record; dark mode cannot use these. File is outside the theme-palette hex check. | Owner: confirm the runtime always sets these on `.os`; then delete line 3 (or reference `var(--alpha-…)` palette tokens) and add the file to `theme-palette.test.mjs` FILES. | Low/medium: first paint before theme variables apply. |
| 8 | 20-34, 170 (phone.css), 936 (phone.css) | C3 | Spinner keyframes exist three times across files (`note-transcribing`, `alpha-voice-connect-spin`, plus `ring`/`blink`). | Keep animations here as the single base; phone.css reuses one `alpha-spin`. | Low. |
| 9 | 11 | A8 | Comment explains Firefox placeholder opacity; product runs only in Android WebView/Chromium — keep the rule, shorten the comment. | Shorten. | None. |
| 10 | 41-43, 46-47 | D8 | Five blank lines and a comment "Bundled equivalents of the prototype Google Fonts stylesheets." | Remove blanks; keep one-line comment. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| Public Sans `@font-face` ×15 | const | 48-183 | none | here, 3 blocks |
| `.os` theme tokens | const | 3 | `product/alpha-product.ts` `mobileShellThemeVariables` | product record only |
| `@keyframes fade` | const | 21 | used by `phone.css:276,992` | here |

## Proposed end state
Fonts: Denton (exact text pinned by font-license test, unchanged), 2 Fraunces, 3 Public Sans range blocks. Utilities `.i .ib .tap .scr .mono .serif`, `button`/`input` resets, keyframes and reduced-motion rules stay. Dead `.al`, `#stage`, `.alpha-note-speech-control`, overridden `body`/`html` rules and the `.rail` dev rules go. About 90 lines (from 201).

## Verification
`node --test test/font-license.test.mjs test/product-identity.test.mjs test/theme-palette.test.mjs`; `npm run test:browser` specs that import the file (`startup-access`, `native-cloud-subscription`); visual check of fonts at weights 300-700 on Home and Settings.
