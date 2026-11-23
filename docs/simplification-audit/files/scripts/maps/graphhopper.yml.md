# scripts/maps/graphhopper.yml
- Lines: 31 | Kind: config (GraphHopper 10.2 server config for the Monaco regional router) | Verdict: KEEP
- Covers: car/foot/bike profiles with CH, loopback-only ports 47851/47852. Duplicates: none. Callers: `scripts/maps/dev.ts:15,49` (server argument), `dataset_manifest.py:26` (hashed into the runtime manifest as `@config/graphhopper.yml`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22, 26 | C6 | Ports duplicated in `dev.ts` and `serve-region.py:82`. | Name them once (see `dev.ts` report). | None. |

## Proposed end state
Unchanged.
