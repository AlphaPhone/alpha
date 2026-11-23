# specs/lemma/apps/app/src/runtime/canvas-geometry.dfy
- Lines: 72 | Kind: Lemma proof companion (generated + hand-written proof text) | Verdict: KEEP
- Covers: Dafny proof that the phone canvas scale is positive, landscape/wide are decided exactly as stated, desktop never scales above 1 and `canvasTop` never shrinks the banner. Models live product code `apps/app/src/runtime/canvas-geometry.ts` (exists; functions `canvasScale`, `canvasTop` still exported/used). Duplicates: none (Quint models cover neighbouring behaviour, not these function contracts). Callers/importers: listed by `LemmaScript-files.txt`; `scripts/check-lemma.ts:46` requires both `.dfy` and `.dfy.gen` per listed source, `:67` reads the `.dfy`, `lsc gen-check` fails if the `.dfy.gen` would change; run by `npm run lemma:check` (verify chain, `browser.yml` verify job and the duplicate `lemma-check.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-55 | — | Hand-written `ScaleKeepsOrder` lemma and the body of `canvasScale_ensures` are needed: Dafny cannot prove the `wide <==> width >= WIDE_CANVAS * scale` ensures (division by a non-constant real) without them. | Keep. | — |
| 2 | 19 | — | `unscaled := REFERENCE_WIDTH / REFERENCE_WIDTH` is a generated literal 1 from the source expression; it mirrors `canvas-geometry.ts`. | Only if the TS is simplified (product report says KEEP); then regenerate. | Low |

## Proposed end state
Unchanged. Product module stays (KEEP, minor tidy); any edit to the `//@` block or the two functions requires `npm run lemma:regen` and re-applying the two hand-written blocks.
