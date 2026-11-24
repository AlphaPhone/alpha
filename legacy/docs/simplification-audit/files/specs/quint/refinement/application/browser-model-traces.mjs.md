# specs/quint/refinement/application/browser-model-traces.mjs
- Lines: 267 | Kind: shared harness library (Quint ITF generation from `run`/witness/random walks, generic replay loop, esbuild loader, jsdom installer, listener counter) | Verdict: KEEP; MERGE `calendar-itf.mjs` into it
- Covers: no behaviour itself; drives the "replay model traces against real code" harnesses. Duplicates: `calendar-itf.mjs` (same `plain()`, same Quint CLI spawn, same ITF read; different trace shape); `support.mjs` `bundledSource` / `services/support.mjs` `sourceModule` (≈`loadBundled`); `test/fixtures/browser-daily-stores.mjs` jsdom setup (≈`installDocument`). Callers/importers: `browser-reviews`, `browser-session-persistence`, `browser-surface-navigation`, `browser-surface-presentation`, `browser-tab-lifecycle`, `address-input`, `find-in-page`, `password-provider-dialog`, `bookmarks-hydration`, `selected-document-viewer` (application) and `services/web-reading-review.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-113 | T10 (model side) | Parses **Quint model text** (`action step = any {…}`, `run X = init.then(…)`) with a hand-written bracket scanner to recover action arguments. This reads model text, not product text, so it is not a product pin, but it breaks on model formatting (e.g. a comment containing `(`, or nested `then`). | Prefer `mbt::actionTaken` + `mbt::nondetPicks` for all traces (already used for walks); for scenarios, emit ITF with `--mbt` so picks are present and drop `scenarioSteps`/`stepCalls`. | M |
| 2 | 20-29 vs `calendar-itf.mjs:12-20` | C5 | Two copies of `plain()` (they differ: numeric set sort here, JSON sort there) and two Quint spawners (sync `spawnSync` 180 s vs async `execFile` 120 s with caching). | One module `refinement/model-traces.mjs`: `plain`, `quint`, `modelTraces({scenarios,witnesses,goals,random})`, `replayTraces`, `sameState`. Port calendar/reminder/day-anchor callers. | M |
| 3 | 221-234 | C5 | `loadBundled` is the third esbuild→data-URL loader. | Single loader in `refinement/support.mjs`. | L |
| 4 | 211-213 | C3 | `settle` duplicates `tick`/`idle` in four files. | Shared. | L |
| 5 | 115-118, 161 | T8 | Each witness spawns a Quint process with up to 2,000 samples × 60 steps, serially. | Run witnesses in parallel like `calendar-itf.mjs:76`, or cache ITF per model revision. | L |

## Proposed end state
One `refinement/model-traces.mjs` (~180 lines) used by every replay harness (browser and calendar/reminder), one loader, one jsdom installer, one `settle`. No parsing of `step` bodies once scenario ITF carries picks.
