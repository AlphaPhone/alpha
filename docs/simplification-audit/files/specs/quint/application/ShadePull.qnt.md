# specs/quint/application/ShadePull.qnt
- Lines: 85 | Kind: Quint model, live (in `application/manifest.json`, run by `quint:check`) | Verdict: KEEP model / PORT harness
- Covers: Downward pull on empty Home reaches exactly one surface (Android shade, dev stand-in, or fallback); Android's answer is awaited for a bounded time; locked Home shows nothing. Duplicates: none. Callers/importers: No refinement harness; `test/quint-shade-pull.test.mjs` (89 lines) uses `refinement/application/shell-core-fixture.mjs` (reads `model.js` as text, `:14`) plus esbuild for `system-shade.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test | T2/T10 | Shell side comes from the `model.js` text fixture; `system-shade.ts` side is bundled (good). | PORT shell part with the Stage F `model.js` split; until then keep. | M |
| 2 | manifest | T10 | `model.js` symbol pin `simulatedShade` refers to the dev stand-in. | File pins only. | L |

## Proposed end state
- Keep; Android surface is production. Harness loses the `model.js` text fixture after the split.
