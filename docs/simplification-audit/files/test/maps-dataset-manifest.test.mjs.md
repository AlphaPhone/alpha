# test/maps-dataset-manifest.test.mjs
- Lines: 11 | Kind: tooling wrapper (T9) spawning `scripts/maps/test-dataset-manifest.py` and `scripts/maps/test-prepare-region.py` | Verdict: MERGE into one Python test runner for `scripts/maps` (path-scoped CI lane)
- Covers: the Maps gateway binds served data to a reviewed revision; region preparation refuses unpinned bytes. Duplicates: none. Callers/importers: `npm test` glob; the two `.py` files have no other caller.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11 | T9 / C7 | A Node test that only runs Python suites and greps their PASS line. | Run the Python tests directly (`python3 -m unittest discover scripts/maps`) in a lane filtered to `scripts/maps/**`. Fold the inline Python of `maps-navigation.test.mjs` 101-116 into the same runner. | Low |

## Proposed end state
Wrapper deleted; `scripts/maps/test_*.py` run by one Python step that only triggers on `scripts/maps/**` changes.
