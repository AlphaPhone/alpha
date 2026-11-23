# scripts/maps/dev.ts
- Lines: 56 | Kind: developer launcher (`npm run dev:maps`: GraphHopper + Python gateway + Vite in test-mocks mode) | Verdict: KEEP (SIMPLIFY)
- Covers: one command that verifies the sealed regional dataset, starts router, gateway and a test-mocks Vite app with `VITE_MAPS_BASE_URL`, and tears them down together. Duplicates: child-process supervision + readiness polling (`start`, `stop`, `ready`, `free`) re-implemented in the five `start-*` launchers and `dev-local.ts` / `dev-cloud.ts` (C5, research `scripts.md`). Callers/importers: `package.json:12` (`dev:maps`), `predev:maps` hook (`package.json:58`); comment ref in `test-renderer.ts:6`. Grep for `maps/dev` also matched `maps/device...` names (false positives).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-38 | C5/C3 | Process supervision, port-free probe and readiness poll duplicated with other launchers. | Use the shared launcher helper (`scripts/lib/launch.ts` or `launcher-child.ts`) once it exists. | Low. |
| 2 | 11, 49-53 | C6 | Ports 47850/47851/47852, data path and provider id duplicated with `graphhopper.yml`, `serve-region.py`, `dataset_manifest.py`. | Read the ports from one place (e.g. a `region.json` beside `graphhopper.yml`) or at least name them once here. | None. |
| 3 | 40-41 | B3 | Pre-checks of four files and graph-cache duplicate what `dataset_manifest.py verify` (line 46) already checks, only to print the prepare steps. | Keep only the `verify` call and print `prepareSteps` on its failure. | None. |
| 4 | 42-43 | keep | Java 21 discovery across Homebrew paths is real developer ergonomics. | KEEP. | n/a |

## Proposed end state
~35 lines: parse `--port`, run `dataset_manifest.py verify` (print prepare steps on failure), find Java 21, and launch the
three children through the shared launcher helper. Developer-only (test-mocks build); not run by CI.
