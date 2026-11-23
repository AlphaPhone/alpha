# apps/app/src/runtime/inline-modal.ts
- Lines: 113 | Role: focus/inert ownership for a phone-positioned inline dialog: hides siblings, traps Tab, routes Escape/Back/cancel to `close`, supports sheet drag-to-dismiss, and restores focus after the DOM commit. | Verdict: KEEP (generalise as the single dialog lifecycle, C4)
- Importers: 9 (`browser/clock.ts`, `prototype/calendar-month-focus.ts`, `prototype/camera-adapter.ts`, `prototype/clock-adapter.ts`, `prototype/home-shell.ts`, `prototype/selection-adapter.ts`, `prototype/subview-accessibility.ts`, `prototype/use-in-email-review.ts`, `runtime/image-preview.ts`). Text/path pins: `scripts/test-clock-handoff-flow.ts:6`, `specs/quint/application/manifest.json:95,2779,8515,8531,8535,10001-10033` (13 entries), `test/accessibility-coverage.test.mjs:306`, `test/fixtures/workflow-clock-admission.mjs:18`, `test/quint-inline-modal-focus.test.mjs:12`, `test/support/feature-parity.mjs:537`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | C4 | This is the best existing instance of the "imperative dialog lifecycle" (PATTERNS C4, 21 copies). Hand-rolled twins: `hosted-digest-ui.tsx:355-394`, connection-ui.tsx chooser, google-connection-ui.tsx, `prototype/calendar-approval-review.ts`, `prototype/source-review-dialog.ts`, `prototype/workflow-filters.ts`, `prototype/file-email-review.ts` (all call `holdPhoneInert` directly). | Make this the shared implementation; migrate the twins one by one (each keeps its own `close`). | Medium per migration: focus/Back semantics are Quint-modelled (`quint-inline-modal-focus`). |
| 2 | 64-72, 84-89 | D8 / C3 | Ten add/remove listener pairs written out twice. | Register with `{signal}` of one `AbortController`; dispose becomes `listeners.abort()`. | Low. |
| 3 | 22, (hosted-digest-ui.tsx:376) | C3 | Focusable selector `'button,input,textarea,select,a[href],[tabindex]'` + filters; hosted-digest-ui uses a different selector for the same purpose. | Export `focusableControls(root)` from here and reuse. | Low. |
| 4 | 18, 35 | C6 | `'[data-alpha-layer="pill"],[data-alpha-layer="composer"],[data-alpha-layer="conversation"]'` written twice. | `const ASSISTANT_LAYERS = …` once. | None. |
| 5 | 39 | D10 | Sheet detection by computed style: `(dialog.style.bottom==='0px'||getComputedStyle(dialog).bottom==='0px')&&parseFloat(…borderTopLeftRadius)>0`. Behaviour keyed on presentation. | Add `options.sheet?: boolean` (callers know) and drop the style sniffing. | Low; callers must pass it (camera, clock, selection sheets). |
| 6 | 4, 12, 97 | B2 | `returnFocus?.()` optional — specified (some callers have no anchor). | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `controls` (focusables) | helper | 22 | `hosted-digest-ui.tsx:376`, connection-ui.tsx chooser Tab trap | export `focusableControls` here |
| assistant-layer selector | const | 18, 35 | — | local const |
| ref mount/dispose idiom | helper | 5-8 | `image-preview.ts:6-9` | optional shared `refCallback` |

## Proposed end state
~95 lines: listeners on one AbortController, named selector constants, explicit `sheet` option, exported `focusableControls`. Becomes the single dialog lifecycle that hosted-digest-ui and the other C4 twins call.

## Verification
Quint inline-modal focus model (13 manifest entries) and `test/quint-inline-modal-focus.test.mjs`; `test/accessibility-coverage.test.mjs`; Playwright clock/camera/selection sheet journeys; `scripts/test-clock-handoff-flow.ts`.
