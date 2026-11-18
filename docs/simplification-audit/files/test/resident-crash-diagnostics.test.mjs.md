# test/resident-crash-diagnostics.test.mjs
- Lines: 5 | Kind: tooling wrapper (spawns `python3 scripts/ci/test-resident-uid-crash-audit.py`) | Verdict: DELETE
- Covers: `scripts/ci/resident_uid_crash_audit.py` bounded capture. Duplicates: none; same diagnostic family as `test/resident-crash-diagnostic.test.py`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-5 | T9 | A Node test whose body spawns a Python test that lives in `scripts/ci/`. | Delete wrapper and `scripts/ci/test-resident-uid-crash-audit.py` (its only caller). | Low |
| 2 | - | T5/B5 | Tests a CI diagnostic that gates nothing. | Delete. | Low |

## Proposed end state
File and `scripts/ci/test-resident-uid-crash-audit.py` deleted. If the owner keeps the diagnostic, its test runs once
from `test/python-suites.test.mjs`, not through a wrapper.
