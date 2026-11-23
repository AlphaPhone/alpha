# apps/app/src/prototype/scan-dialog.css
- Lines: 105 | Role: Shared stylesheet for the imperative scan, OCR, PDF, native page capture, browser camera fallback and video-edit dialogs. | Verdict: SPLIT (video editor rules out) + SIMPLIFY
- Importers: 7 side-effect imports — `scan-correction-review.ts:2`, `scan-document.ts:3`, `scan-page-camera.ts:1`, `scan-review.ts:1`, `scan-searchable-review.ts:2`, `browser-camera.ts:1`, `video-edit-review.ts:2`.
- Text/path pins: `test/theme-palette.test.mjs:10` (no hex), `test/font-license.test.mjs:290` (listed Denton referrer — keep `Denton,Fraunces,Georgia,serif` stack text), `test/browser-camera-storage.test.mjs`, `specs/quint/services/scan-source-conformance.mjs` (imports bundle stubbed `.css`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 81-105 | D11 | 25 lines of `.video-edit-review`, `.video-editor-*` rules (only `video-edit-review.ts` uses them) live in the scan stylesheet. | Move to `video-edit-review.css` imported by `video-edit-review.ts` (it would still import the scan base for `.scan-dialog`). | None. |
| 2 | 57 | D11 / C3 | `.media-review-icon{…mask-*…}` belongs to `media-review-controls.ts` (`mediaToolIcon`) and duplicates the mask-icon utility repeated in `phone.css` (589, 676, 905, 980). | Move to the shared `.alpha-mask-icon` utility (see phone.css report) and have `mediaToolIcon` add that class. | Low. |
| 3 | 49, 66, 79 | C5 | Three `@media (max-height:480px)` blocks for the same dialogs. | One block at the end. | None. |
| 4 | 38, 44, 51 | C5 | Focus rings declared three times: `.scan-dialog :is(button,input):focus-visible`, `.scan-dialog textarea:focus-visible`, `.scan-dialog-content:focus-visible`. | `.scan-dialog :is(button,input,textarea):focus-visible` + content rule. | None. |
| 5 | 61 | B4 | `.scan-dialog button[hidden],.scan-dialog [hidden]{display:none!important}` — the first selector is a subset of the second. | `.scan-dialog [hidden]{display:none!important}`. | None. |
| 6 | 23-27, 43 | C5 | `.scan-dialog-fields input` and `.scan-dialog-text` repeat the same field skin (`min-height:44px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--s1);color:inherit;font:inherit`). Inline-styled inputs in `scan-event-review.ts:13` re-declare it a third time with `var(--s2,#eee)`/`var(--bd,#aaa)`. | One `.scan-dialog-field` class used by all three. | Low. |
| 7 | 1-16 | C4 | Dialog base (box-sizing, width/max-height min(), radius, `[open]{display:flex;flex-direction:column;gap}`, `::backdrop`) is the same as `.note-source-dialog`, `.alpha-browser-dialog`, `.content-question-dialog` in `phone.css`. | Extract `.alpha-dialog` base (see phone.css #22); `.scan-dialog` keeps typography and button skin. | Medium (visual). |
| 8 | 17 | — | Denton stack `font-family:Denton,Fraunces,Georgia,serif` is counted by `font-license.test.mjs` stack-shape assertion. | Keep exact text. | Pin. |
| 9 | 78 | D12 | `.scan-native-captured{background:var(--alpha-black)!important}` — `!important` because `scan-page-camera.ts:12` relies on `.scan-native-capture{background:transparent}` at higher specificity. | Use `.scan-dialog.scan-native-capture.scan-native-captured{background:…}` without `!important`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `.media-review-icon` | const | 57 | `phone.css` 589/676/905/980/48 | shared `.alpha-mask-icon` |
| `.scan-dialog` base | const | 1-16 | `phone.css` 173, 213, 779 | shared `.alpha-dialog` |
| field skin | const | 23-27, 43 | `scan-event-review.ts:13` inline | `.scan-dialog-field` |

## Proposed end state
Scan dialog skin only (~70 lines): dialog base (or the shared base), header/content/tools/actions, field and button skins, native capture overlay, one max-height media block. Video editor rules move to `video-edit-review.css` (25 lines). Icon mask moves to the shared utility.

## Verification
`node --test test/theme-palette.test.mjs test/font-license.test.mjs test/browser-camera-storage.test.mjs`; `npm run test:browser` scan specs (`scan-document`, `scan-correction`, `scan-page-camera`, `scan-searchable`, `scan-review-keyboard`, `media-polish`) and the video edit spec (`browser-photo-edit`), with screenshots at 100%/200% text and landscape.
