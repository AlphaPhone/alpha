# apps/app/src/runtime/image-preview.ts
- Lines: 70 | Role: full-screen image viewer interaction (pinch/zoom/pan, double-tap, wheel, keyboard) layered on `createInlineModal`. | Verdict: KEEP
- Importers: 1 (`prototype/agent-adapter.ts`). Text/path pins: `test/support/feature-parity.mjs:530`; Playwright specs exercise it through the UI (2 under `test/browser/` mention `image-preview`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 65-68 | D8 / C3 | Nine `addEventListener` and nine matching `removeEventListener` calls on two long lines. | Use one `AbortController` per mount: `const on=new AbortController(); container.addEventListener('pointerdown',down,{signal:on.signal}); … dispose=()=>{on.abort();resize.disconnect();pointers.clear();}`. Same pattern fits inline-modal.ts:64-89. | Low; identical listener set. |
| 2 | 6-9 | C3 | The `mounted`/`dispose` ref-callback idiom (`if(container===mounted)return;dispose?.();…`) is duplicated from inline-modal.ts:5-8. | Fine to keep; or export a `refCallback(setup)` helper from inline-modal.ts used by both. | Low. |
| 3 | 11 | B2 | `querySelector('img')!` / `[role="dialog"]!` non-null assertions on markup produced by the same adapter. | Keep (internal markup). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| pointer record type | type (inline) | 13 | — | local |
| ref-callback mount/dispose idiom | helper (inline) | 6-9 | `inline-modal.ts:5-8` | optional shared `refCallback` |

## Proposed end state
~60 lines: same gestures, listeners registered with one `AbortController` signal so dispose is two lines.

## Verification
Playwright image-preview journeys under `test/browser/` (photos/chat image tap); `test/accessibility-coverage.test.mjs` if it lists the viewer.
