# apps/app/src/prototype/photo-viewport.ts
- Lines: 87 | Role: Pure gesture state (pinch, pan, double-tap, swipe, keyboard zoom) for one mounted Photos viewer; publishes a CSS transform. | Verdict: KEEP (tiny cleanup); MOVE to the Photos view folder / `runtime/` (research §5: pure module in `prototype/`)
- Importers: 1 — `camera-adapter.ts` (`createPhotoViewport`). Test: `test/photo-viewport.test.mjs:3` (real import).
- Text/path pins: `test/support/feature-parity.mjs:36,408` (path + owner), `specs/quint/legacy/photos-library/check-photos-library-refinement.mjs`, `test/browser/browser-photo-edit.spec.ts`; `phone.css` and `template.html` mention it in comments/attributes (`data-alpha-photo-viewport`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18 | B4 | `if(!frame)return; const w=frame?.clientWidth||0,h=frame?.clientHeight||0;` — `frame` is known non-null after the guard. | `const w=frame.clientWidth,h=frame.clientHeight;` | None. |
| 2 | 42 | B2 | `(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)` — `setPointerCapture` always exists on Element. Keep the try/catch (InvalidPointerId is a real DOM exception) but drop `?.`. | Drop `?.`. | None (test passes plain objects? check `photo-viewport.test.mjs` fakes — if they omit the method, add it to the fake). |
| 3 | 21, 27, 51 | C3 | `Math.max(lo,Math.min(hi,v))` written four times; same clamp in `scan-correction-review.ts:21`. | Local `const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));` (rename existing `clamp()` to `clampPan()`). | None. |
| 4 | 27, 36, 38, 69, 77-79, 83 | D9 | Magic numbers 1/4 (zoom range), .5 (step), 2.5 (double-tap zoom), 48 (pan/swipe), 350/500 ms, 8/32 px. | Name them in one `const VIEWPORT={min:1,max:4,step:.5,doubleTap:2.5,nudge:48,swipe:48,tapMs:350,…}`. | None. |
| 5 | 1-5 | C1 | Local `Point`, `Binding` types (`Binding` is one of the re-declared names in C1). | Export `PhotoViewportBinding` so camera-adapter types its argument instead of passing an untyped object. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Point` | type | 1 | many `{x,y}` literals (`scan-correction-review.ts`) | here |
| `Binding` | type | 2-5 | name reused in other files with other meaning (C1) | rename `PhotoViewportBinding`, export |
| `center`, `distance` | helper | 14-15 | — | here |
| `clamp` (numeric, proposed) | helper | 21/27/51 | `scan-correction-review.ts:21` | `apps/app/src/lib/math.ts` if a third user appears |

## Proposed end state
Same algorithm, ~84 lines, named constants, exported binding type, no redundant optional chaining. Moves with the rest of Photos presentation when `camera-adapter.ts` is split.

## Verification
`node --test test/photo-viewport.test.mjs`; `npm run test:browser -- browser-photo-edit` (viewer pinch/swipe); update `feature-parity.mjs` path if moved.
