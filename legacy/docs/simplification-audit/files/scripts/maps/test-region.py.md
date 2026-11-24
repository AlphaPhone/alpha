# scripts/maps/test-region.py
- Lines: 29 | Kind: live smoke against the real running gateway + GraphHopper + real Monaco data (`127.0.0.1:47850`) | Verdict: DELETE (carry two cases into `test/maps-regional-gateway.test.py`)
- Covers: capabilities/search/place/no-result, drive/walk/bicycle routes, 422 for out-of-region and unsupported mode, tile bytes equal the mbtiles row with the TMS y-flip, gateway revision equals the sealed revision. Duplicates: revision and search are covered by `test-dataset-manifest.py` with synthetic data. Callers/importers: **none** (grep for `test-region.py` finds nothing outside the audit docs); imports `dataset_manifest.verify`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | A7/T9 | Orphan; needs a manually prepared multi-hundred-MB dataset and a running router. | Delete. | None today (never run). |
| 2 | 24-26, 20-22 | T4 | Worth keeping as synthetic cases: tile endpoint returns the exact mbtiles blob with the y-flip; out-of-region and unsupported-mode routes return 422 before contacting the router. | Add to the moved gateway test with a synthetic mbtiles row. | None. |
| 3 | 28-29 | B5 | Evidence JSON with the whole source manifest, no reader. | Drop. | None. |

## Proposed end state
Deleted; tile y-flip and 422 refusals covered by the synthetic gateway integration test.
