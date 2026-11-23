# scripts/maps/index-region.py
- Lines: 21 | Kind: dev data-prep script (OSM extract -> `places.sqlite` named-place index, PyOsmium) | Verdict: KEEP (SIMPLIFY)
- Covers: builds the regional search index from the same pinned OSM extract. Duplicates: Monaco bounds and data path (C6, see `dataset_manifest.py`). Callers: printed as step 2 in `scripts/maps/dev.ts:15` (manual developer step); no automated caller; no test (needs `osmium`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 10 | C6 | Bounds and data path literal. | Import from `dataset_manifest.py`. | None. |
| 2 | 9 | B4 | `-180<=lon<=180 and -90<=lat<=90` check is subsumed by the Monaco bounds check on the next line. | Delete line 9's range clause. | None. |
| 3 | 3-21 | D8 | Statement soup (`;`-joined lines, one-space indent). | Format when touched. | None. |

## Proposed end state
~18 readable lines using shared region constants. Not run by CI (requires the real extract); stays a documented manual step.
