# test/home-inset-layout.test.mjs
- Lines: 24 | Kind: transplant (slices `main.tsx` between `"const INSETS_KEY="` and `'let shell: any;'`, and the geometry block, runs in `vm`) + source-text (regex over `phone.css` and `main.tsx` statement order) | Verdict: DELETE
- Covers: cached native insets are restored before first paint and validated before use/persist; Home keeps its grid height while the keyboard opens and follows rotation. Duplicates: `test/browser/native-insets.spec.ts` (keyboard resizing, rotation, cutouts), `home-landscape.spec.ts`, `canvas-geometry.test.mjs` (imports `canvas-geometry.ts`). Callers/importers: `npm test` glob; `test/support/strip-types.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6, 15 | T2 | Two marker slices of `main.tsx`, including `'let shell: any;'` which the C1/D3 cleanup will change. | Delete. | Low |
| 2 | 9, 22-23 | T1 | Asserts statement order in `main.tsx` and exact CSS rule text in `phone.css`. | Delete. | Low |
| 3 | 11-14 | — | Malformed/out-of-range cached insets cannot move the canvas. | Optional case in `journeys/home-shell.spec.ts` (native-insets project): seed `localStorage` with `{"top":-1}` via `addInitScript`, assert no `--native-top-inset`. | Low |

## Proposed end state
File deleted. Layout under keyboard and rotation stays covered by `native-insets.spec.ts` / `home-landscape.spec.ts`.
