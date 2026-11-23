# scripts/maps/test-dataset-manifest.py
- Lines: 116 | Kind: integration (real `serve-region.py` handler over HTTP on an ephemeral port + real `dataset_manifest` seal/verify, synthetic dataset) | Verdict: MOVE to `test/maps-regional-gateway.test.py` (run by `test/python-suites.test.mjs`) and absorb the gateway cases from `test/maps-navigation.test.mjs:101-116`
- Covers: the regional gateway serves only a sealed dataset revision, refuses stale manifests at startup, returns 503 on live drift (including WAL-only changes and change-after-read), and resealing is deterministic and changes the revision when graph/tiles/router change. Duplicates: none (the only test of seal/verify). Callers/importers: `test/maps-dataset-manifest.test.mjs:4-7` (Node wrapper that spawns it and regex-matches its PASS line, T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | A test living in `scripts/maps/`, run through a Node wrapper that greps stdout. | Move to `test/`, add one line to `test/python-suites.test.mjs` (with `scripts/maps` on `sys.path`, like `runCi`), delete `test/maps-dataset-manifest.test.mjs`. | None. |
| 2 | 9-18 | T6-ish | Monkey-patches `Handler.answer` to inject a change between read and publish. Acceptable: it is the only way to hit the race deterministically. | KEEP. | n/a |
| 3 | 116 | B5 | Long PASS banner exists only for the wrapper regex. | Drop when the wrapper goes. | None. |
| 4 | new | T4 | `test/maps-navigation.test.mjs:101-116` runs `maneuver`/`details` in an inline Python block with `dataset_manifest` stubbed. | Carry into this file as HTTP cases: a fixture place with phone/website/opening_hours tags (`/place` returns sanitised details; malformed ones omitted) and maneuver mapping (once `serve-region.py` exposes a handler factory, stub the GraphHopper upstream). | Low. |

## Proposed end state
`test/maps-regional-gateway.test.py`, ~130 lines, run by `python-suites.test.mjs`: seal/verify determinism, stale startup
refusal, drift/WAL/change-after-read 503, reseal on graph/tile/router change, place detail sanitisation, maneuver mapping.
Runtime: a few seconds, no network.
