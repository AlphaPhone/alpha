# scripts/maps/serve-region.py
- Lines: 99 | Kind: dev service (loopback-only regional Maps HTTP gateway: capabilities, search, place, tiles, route via GraphHopper) | Verdict: KEEP (SIMPLIFY)
- Covers: the provider behind `apps/app/src/maps/regional-provider.ts` in `ELIZA_DEV_ALLOW_TEST_MOCKS` builds: bounded queries, maneuver mapping, sanitised OSM details, and refusal to serve a dataset that drifted from its seal. Duplicates: bounds/provider/path literals (C6). Callers: `scripts/maps/dev.ts:51`; loaded in-process by `test-dataset-manifest.py` (real HTTP) and by `test/maps-navigation.test.mjs:101-116` (with a stubbed `dataset_manifest` module: a transplant-style unit test of `maneuver`/`details`); process identity checked by `test-native-recovery.ts:21`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | D7 | `REV,DATASET=verify(ROOT)` runs at import time, so any importer must have a sealed dataset or stub `dataset_manifest` (which `test/maps-navigation.test.mjs:105` does). | Move to a `serve(root, port)` / `make_handler(root)` factory called from `__main__`; tests then import without stubs. | Low. |
| 2 | 71-72 | D9 | Tile path parsed with `int(parts[2..4])` before `len(parts)!=5` is checked; an IndexError falls to the generic 400. Works, but the order is backwards. | Check length first. | None. |
| 3 | 40-42, 52-54 | keep | Dataset drift check before and after reads is the specified behaviour (tested). | KEEP. | n/a |
| 4 | 5-8 | C6 | Bounds, provider, data path duplicated with `dataset_manifest.py`. | Import. | None. |
| 5 | 97 | B1 | `except Exception` -> 400 "Invalid regional request or unavailable data" hides gateway bugs during development. | Narrow to `ValueError, KeyError, IndexError` (bad input / missing route fields). | Low. |
| 6 | whole | D8 | Dense one-space-indented Python with `;`-joined statements. | Format when touched. | None. |

## Proposed end state
~90 lines with a handler factory taking the verified root, shared region constants, and narrowed exception handling. The
`maneuver`/`details` checks in `test/maps-navigation.test.mjs` move into `test-dataset-manifest.py`'s HTTP flow (search
with a fixture row carrying phone/website/hours tags, and a stubbed GraphHopper response for maneuvers) so the unit-style
inline Python block can be deleted.
