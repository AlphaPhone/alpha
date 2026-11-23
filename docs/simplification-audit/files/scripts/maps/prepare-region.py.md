# scripts/maps/prepare-region.py
- Lines: 65 | Kind: dev data-prep script (download pinned assets, run Planetiler into `monaco.mbtiles`, write `source-manifest.json`) | Verdict: KEEP (SIMPLIFY)
- Covers: every downloaded byte is sha256/size-pinned and the tile output is only renamed into place after an integrity check. Duplicates: `digest` duplicates `dataset_manifest.py` hashing; bounds/data path (C6). Callers: printed step 1 in `scripts/maps/dev.ts:15`; imported by `test-prepare-region.py` (via `importlib`), which `test/maps-dataset-manifest.test.mjs` runs in `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18 | C3 | Local `digest` duplicates `dataset_manifest.describe` hashing. | Import shared `sha256_file`. | None. |
| 2 | 44, 51 | C6 | Bounds and data path literals. | Import shared constants. | None. |
| 3 | 58, 63 | B5 | `source-manifest.json` is written twice (before and after tiles). It is read only as a required file by `dataset_manifest.py` and echoed into `test-region.py`'s result JSON. | Write once at the end. | None. |
| 4 | 3 | D8 | Comma-joined imports, one-space indent. | Format. | None. |

## Proposed end state
~55 lines: pinned asset table, `fetch` with size cap and atomic rename, `tiles` with integrity check, one manifest write;
shared hash/region helpers from `dataset_manifest.py`.
