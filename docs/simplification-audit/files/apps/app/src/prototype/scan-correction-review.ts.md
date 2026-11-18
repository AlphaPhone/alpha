# apps/app/src/prototype/scan-correction-review.ts
- Lines: 31 (very long lines; ~6 KB) | Role: Modal dialog to adjust four page corners (number fields + draggable SVG handles), detect edges, preview the perspective-corrected page and adopt it. | Verdict: SIMPLIFY (reformat + shared scan dialog shell); MOVE to `views/camera/scan/`
- Importers: 1 — `scan-document.ts:6` (`reviewScanCorrection`).
- Text/path pins: `specs/quint/services/manifest.json:4597,4642-4754` symbols `visibilitychange, clearPreview, corrected, busy`; `specs/quint/refinement/services/scan.mjs`, `scan-source-conformance.mjs` (bundles it); `test/scan-document-drafts.test.mjs`; `test/browser/scan-review-keyboard.spec.ts`, `scan-correction.spec.ts`; `test/support/feature-parity.mjs:410`. `scan-document.ts:106` looks this dialog up by its aria-label `"Correct document page"`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-29 | D8 | Each line holds 5-25 statements (line 29 ≈ 900 chars). | Run the formatter (own commit). | None. |
| 2 | 8, 23, 29 | C4 | Dialog lifecycle hand-written again: create `<dialog>`, remember `previous` focus, `finish()` removing `abort`/`alpha-back`/`pagehide`/`visibilitychange` listeners, `dialog.remove()`, refocus, `oncancel`, append to `.os` + `showModal()`. Same code in `scan-searchable-review.ts`, `scan-page-camera.ts` (×2), `scan-document.ts`, `scan-review.ts`, `video-edit-review.ts`, `browser-camera.ts`; generic version exists as `source-review-dialog.ts` `openReview()`. | Extract `openScanDialog({label, className, signal, keepWhilePicker?, build})` in `scan-dialog.ts` (header with close icon, `scan-dialog-content` region, tools, actions) and use it in all six scan dialogs. | Medium: focus and Back semantics are covered by `scan-review-keyboard.spec.ts`; Quint symbols `visibilitychange` must remain present in each listed file (manifest) — keep the listener registration text or update the manifest. |
| 3 | 14 | C3 | `const button=(label,action)=>{…}` — same helper in `scan-document.ts:38`, `scan-page-camera.ts:24,59`, `scan-searchable-review.ts:15`, `video-edit-review.ts:17`, `browser/calendar-editor-draft.ts:20`. | Export `scanButton(text, action, {label?, icon?, primary?})` from the shared scan dialog module; it also absorbs the repeated "`setAttribute('aria-label',long);textContent=short`" pairs (line 28). | Low. |
| 4 | 9, 29 | A7 | `help` paragraph is created `hidden=true`, appended, and never shown or filled. | Delete. | None. |
| 5 | 10-11, 13, 20 | D12 | Inline `style.cssText` for frame, image, overlay, preview, handles; `fill:var(--acc,#0000ff)` hex fallback (3×) bypasses the palette test (which only checks CSS/HTML). | Move to `.scan-correction-*` classes in `scan-dialog.css`; SVG `fill="currentColor"` with `color:var(--acc)`. | Low (visual). |
| 6 | 21, 25-26 | C3 | `Math.max(0,Math.min(1,…))` clamp; corner→input sync `inputs.forEach((input,i)=>input.value=…(corners[Math.floor(i/2)][i%2?'y':'x']*100)…)` written twice (25 uses `toFixed(1)`, 26 uses `String`). | One `syncInputs()` (with `toFixed(1)`). | None. |
| 7 | 25, 27 | C3 | `error instanceof Error?error.message:'…'` (2×; ~15× across scan files). | Shared `errorText(error,fallback)`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `button` | helper | 14 | `scan-document.ts:38`, `scan-page-camera.ts:24,59`, `scan-searchable-review.ts:15`, `video-edit-review.ts:17`, `browser/calendar-editor-draft.ts:20` | `prototype/scan-dialog.ts` (or `runtime/dom-button.ts`) |
| `finish` / listener lifecycle | helper | 23 | 6 scan/media dialogs, `source-review-dialog.ts:4` | `openScanDialog` |
| `labels` | const | 17 | — | here |

## Proposed end state
~25 formatted functional lines (more physical lines after formatting) built on `openScanDialog` + `scanButton`; styles in CSS; dead `help` gone. Behaviour (busy lock, preview invalidation on edit, adoption only on "Use corrected page") unchanged.

## Verification
`npm run test:browser -- scan-correction scan-review-keyboard scan-edges`; `node --test test/scan-document-drafts.test.mjs`; Quint services scan replay (`specs/quint/refinement/services/scan.mjs`) and manifest symbol check.
