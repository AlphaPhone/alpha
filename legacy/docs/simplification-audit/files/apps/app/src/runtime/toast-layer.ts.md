# apps/app/src/runtime/toast-layer.ts
- Lines: 138 | Role: mirrors the page toast into a live region inside the topmost modal dialog so it is seen and announced; Undo forwards to the page's Undo. | Verdict: KEEP (minor; MOVE to `ui/`)
- Importers: `main.tsx:88` (`installToastLayer()` at L403; uninstaller discarded).
- Text/path pins: Quint `specs/quint/refinement/application/modal-toast-forwarding.mjs:11,156` (runs this file text and reads the `installed` variable by name), `specs/quint/application/manifest.json`, `test/accessibility-coverage.test.mjs:251`, `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55, 82, 86, 92 | D12 | inline `style.cssText` for region, body, message and Undo button. | CSS classes in `phone.css` (`[data-alpha-dialog-toast]`, `.alpha-dialog-toast`, …); copy colours from the source toast stays inline. | Low |
| 2 | 105-121 | D8 | three near-identical "move dialog to end of `modalOrder`" blocks. | `const bump=(d)=>{modalOrder.delete(d);modalOrder.add(d);}`. | None |
| 3 | 30-33, 129-137 | B4/D7 | `installed` idempotence and uninstaller: main.tsx installs once and discards the result; Quint harness reads `installed`. | Keep (harness pin) or rewrite harness to import the module. | Low |
| 4 | 1-18 | — | Long comment explains a real accessibility constraint; keep. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `MODALS` selector | const | 21 | modal detection in `runtime/modal-inert.ts` (check) | shared `ui/modals.ts` |

## Proposed end state
~120 lines with CSS classes and a `bump()` helper.

## Verification
Quint `modal-toast-forwarding`, `test/accessibility-coverage.test.mjs`, browser specs with dialog toasts (notes delete Undo inside dialogs).
