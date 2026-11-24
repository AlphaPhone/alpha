# scripts/maps/test-prepare-region.py
- Lines: 72 | Kind: unit (imports `prepare-region.py`, replaces `urllib.request.urlopen` and the subprocess runner with fakes) | Verdict: DELETE (T3), with its wrapper case in `test/maps-dataset-manifest.test.mjs:8-11`
- Covers: pinned-asset fetch refuses tampered/oversized/mismatched bytes and removes `.partial`; Planetiler output is renamed only after a zero exit and a non-empty integrity-checked tiles table. Duplicates: none. Callers/importers: `test/maps-dataset-manifest.test.mjs:9` (Node wrapper, T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-44 | T3 | Every network and process boundary is faked; it tests ~20 lines of a developer-only data-prep tool that is run by hand and fails loudly on a bad download. | Delete. | Low: the tamper refusal for the dev dataset loses its automated check. |
| 2 | 30 | T1 | `assert all(len(sha256)==64 and size>0 ...)` checks the shape of a constant table. | Delete. | None. |
| 3 | 46-71 | T3 | Atomic tile rename tested with a fake runner. | Delete (or, if the owner wants it kept, merge into the moved gateway test file). | Low. |

## Proposed end state
Deleted. `prepare-region.py` remains a manual developer step (dev:maps prints it). If kept on owner request, it moves
to `test/` and runs from `python-suites.test.mjs` like the gateway test.
