# apps/app/src/prototype/video-edit-review.ts
- Lines: 79 | Role: Imperative `<dialog>` video editor (canvas preview, trim slider handles, rotate, centre crop, save-as-copy) used by Photos/Camera. | Verdict: SIMPLIFY
- Importers: 1 — `apps/app/src/prototype/camera-adapter.ts:20` (called at `:282`). Imports `./scan-dialog.css` (which styles `.video-edit-review`, `scan-dialog.css:82-85`).
- Text/path pins: `test/quint-video-edit-review.test.mjs:14-18` (mutation test rewrites the source with **exact substrings** `loaded=false;video.pause();updateControls();` and `busy=true;video.pause();updateControls();status.textContent='Saving video copy…';` — any reformat breaks both tests); `specs/quint/refinement/native/video-edit-review.mjs:1,7` (mounts the source); `specs/quint/native/manifest.json:443,3838-3855` (path + symbols `openVideoEditReview`, `trim`, `commit`, `dispose` — local names pinned, T10); `specs/quint/refinement/application/photos-window.mjs:22` (stubs the module by path); `test/browser/media-polish.spec.ts:21,46,95` (T6: `page.evaluate(import('/src/prototype/video-edit-review.ts'))`); `test/support/feature-parity.mjs:435`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8, 64-65, 74 | C4 | Hand-rolled dialog lifecycle: `previous=document.activeElement`, `alpha-back` capture listener with `stopImmediatePropagation`, `pagehide`, `visibilitychange→dispose`, `dialog.oncancel`, focus return, remove — the same block exists in `workflow-filters.ts:16-17,35-36` and ~40 other files (`git grep -l "addEventListener('alpha-back'"` in apps/app/src: 30+). | Extract one `openOwnedDialog({dialog, onClose, container})` in `runtime/` (generalise `runtime/inline-modal.ts`/`modal-inert.ts`) that wires back/pagehide/hidden/cancel/focus-return and returns `dispose`; use it here. | Medium (shared by many surfaces); Quint symbol `dispose` must still exist or the manifest updated. |
| 2 | 18 | D4 | `const clock=videoClock;` alias. | Call `videoClock` directly. | None. |
| 3 | 44, 68 | D10 | Handles are created through `button(...,()=>{})` (a no-op click handler, then pushed into `controls` so they get disabled), and the close button is created through `button()` then removed again with `controls.pop()` so it is never disabled. | Give `button()` an `{disableWhileBusy=true}` option (or build close/handles with a plain `createElement`) instead of push-then-pop. | Low. |
| 4 | 54 | B1 | `void video.play().catch(()=>{status.textContent='';})` clears status on a refused play with no reason. | Keep the catch (autoplay refusal is expected) but comment it; or show `'Couldn’t play'`. | Low (copy if changed). |
| 5 | 78 | B1 | `.catch(()=>{if(!closed)status.textContent='Couldn’t load';})` collapses fetch/HTTP/blob errors — that is the specified copy; fine. | Keep, comment "every load failure shows one line". | — |
| 6 | 7-78 | D8 | Statement soup: 60+ statements on ~30 lines (line 27 and 64 are 300+ chars). | Format (D9 Prettier commit) **after** `test/quint-video-edit-review.test.mjs` is changed to mutate via a seam (or deleted per T1/T3) — its literal-substring rewrites pin today's formatting. | Low once the pin is gone. |
| 7 | 13, 60, 63 | KEEP | `status` live region text and `aria-*` slider semantics (lines 27, 44) are accessibility behaviour. | Keep exactly. | — |
| 8 | 77-78 | KEEP | Stream vs Blob source split is specified (comment 75-76). | Keep. | — |

No unused exports (single export, one caller).

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `button` | helper | 17 | `workflow-filters.ts:20` `button`, many imperative dialogs build buttons the same way | shared DOM helper `el()/button()` in `runtime/dom.ts` (with #1) |
| `dispose`/`back`/`visibility` | helper | 64-65 | `workflow-filters.ts:16-17` `close/back/visibility`; ~40 dialog modules (C4) | `openOwnedDialog` (#1) |
| `clock` | alias | 18 | `browser/video-edit.ts:26` `videoClock` | delete alias |

## Proposed end state
~65 lines: dialog lifecycle delegated to the shared helper (#1), no alias, explicit "not disabled" option instead of `controls.pop()`. Trim/rotate/crop/save logic, copy and ARIA unchanged. Prerequisite: retire the literal-substring mutation tests in `test/quint-video-edit-review.test.mjs` (or move them to a behavioural seam) and keep the Quint replay `specs/quint/refinement/native/video-edit-review.mjs` mounting `openVideoEditReview`. Est. lines after: 65.

## Verification
`node --test test/quint-video-edit-review.test.mjs`, the native forward replay (`specs/quint/refinement/native/forward-replays.mjs`), Playwright `test/browser/media-polish.spec.ts`; manifest symbol list `specs/quint/native/manifest.json:3838-3855` must still resolve (`trim`, `commit`, `dispose`).
