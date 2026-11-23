# specs/quint/refinement/composition/index.mjs
- Lines: 149 | Kind: Quint refinement harness (browser, Vite + Chromium, imports the real `connectionController`) | Verdict: KEEP, SIMPLIFY (drop controllers campaign, narrow input hashing)
- Covers: ApplicationComposition identity/inference campaign: sign-out then replacement, and direct replacement, through the real renderer `connectionController` with `flagOffAndroid` + `residentStub` native fixtures. Duplicates: the same campaign runs in `npm test` (`test/quint-composition-refinement.test.mjs`) and in `browser.yml` production job (`:211-221`, `quint:refinement --families=composition`) — T4/P3. Callers: `scripts/check-quint-refinement.ts:66` (family `composition`), `test/quint-composition-refinement.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 140-147 | A2 | Imports and runs `runControllerCompositionRefinement` (deleted Calendar stack, see `controllers.mjs.md`). | Remove; `runCompositionRefinement` returns the identity receipt (plus moved voice schedules). Update `test/quint-composition-refinement.test.mjs` (asserts 2 receipts, ControllerComposition 9 traces/44 checkpoints). | Low |
| 2 | 18-22 | B5 / P1 | `sources` = every file under `apps/app/src` and `public`, all of `.eliza/client-features`, `package-lock.json`, `vite.config.ts`… hashed before and after; any renderer change invalidates the receipt and the `quint-lib.ts` hand list exists partly for this. `upstream.lock.json` listed twice (lines 19 and 21). | Declare only the harness, fixtures and `connection-ui.tsx`; Vite already proves the code loaded. Remove the duplicate entry. | Low |
| 3 | 36-43 | — | Good: virtual entry imports the real module (`/src/runtime/connection-ui.tsx`), no text slicing. | Keep. | — |
| 4 | 65-77 | T10-lite | Serialises Playwright fixture callbacks (`flagOffAndroid`, `residentStub`) to strings and re-injects them with an esbuild `__name` shim; `controllers.mjs` instead calls them on the page. | Call `flagOffAndroid(page)` / `residentStub(page, …)` directly as `controllers.mjs:38-39` did, add the `__name` init script once. | Low |
| 5 | 24-30, 52-55 | B4 | Saves/restores `ELIZA_DEV_ALLOW_TEST_MOCKS` around `createServer` and also overrides it through `define`. | Keep only the `define`. | Low |
| 6 | — | P3 | Run twice per PR (host `npm test` and production job). | Run once, in the formal lane, path-filtered to `apps/app/src/runtime/connection-ui.tsx`, the fixtures and the composition model. | Low |

## Proposed end state
~90 lines: one Vite server, one Chromium, the two identity schedules (plus voice schedules moved from `controllers.mjs`), one `checkTraces` call against ApplicationComposition.
Declared inputs are the harness, the two fixtures and the controller module.
Run in one lane only.
