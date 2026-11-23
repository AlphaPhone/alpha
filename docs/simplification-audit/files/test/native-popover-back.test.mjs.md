# test/native-popover-back.test.mjs
- Lines: 77 | Kind: transplant (slices `this.backHandler = ...`, `function modalPanels(){`, `function updateBackAvailability(` from `apps/app/src/prototype/agent-adapter.ts` and regex-extracts the Back script string from `MainActivity.java`; runs them in `vm` with a fake DOM) | Verdict: DELETE
- Covers: native Back closes an open popover (then a dialog) before navigating, a toast mirror never consumes Back, the mail-folder fallback menu closes first on WebViews without the Popover API, and Back reaches the renderer with the app drawer or digest panel open while root Home lets the standalone activity finish. Duplicates: `test/quint-back-dispatch.test.mjs` (native Back flag and renderer layers, `alphaCanGoBack`); many browser specs dispatch `alpha-back`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12 | T2 | Three marker slices of `agent-adapter.ts` (D1 god module) and type stripping. | Delete. | Low |
| 2 | 50-51 | T1 | Regex over a Java string literal to rebuild the Back script. | Delete. | Low |
| 3 | 19-22 | T6-like | Fake `document.querySelectorAll` that answers per selector string. | Gone. | None |

## Proposed end state
File deleted. `journeys/home-shell.spec.ts` covers: popover open → Back closes it and keeps the view; drawer open →
Back closes the drawer; nothing open at root → `alphaCanGoBack` is `false`.
