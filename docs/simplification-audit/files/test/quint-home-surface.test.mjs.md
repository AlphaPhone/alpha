# test/quint-home-surface.test.mjs
- Lines: 50 | Kind: Quint replay on a real import (`apps/app/src/prototype/home-cards.ts` imported directly; traces from `shell-model-traces.mjs`) | Verdict: MOVE to `specs/quint/refinement/application/home-surface.mjs` and register in the runner
- Covers: Home's remembered agenda choice (`createHomeAgenda`) and its storage probe (`createStorageAccessCheck`) follow 80 HomeSurface traces across day ticks and clock-back. Duplicates: `test/home-overview-cards.test.mjs` (node -e transplant of the same cards) and Home Playwright specs. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | — | Already imports the module: no port needed. | Keep the replay body as is. | None |
| 2 | 16-50 | T4 | Lives in `test/` while every other replay lives in `specs/quint/refinement`; the runner cannot select it by model. | Move to a driver exporting `checkHomeSurface()`. | Low |

## Proposed end state
Driver `home-surface.mjs` listed in the application index; this file deleted. `test/home-overview-cards.test.mjs` can then go (T2).
