# test/cloud-signing-input.test.py
- Lines: 292 | Kind: tooling (Python unittest of `scripts/ci/admit-cloud-signing-input.py` on synthetic zip archives; second class runs `scripts/ci/verify-cloud-signing-input.sh` in a temp root with fake `git`/`gh`) | Verdict: KEEP (run from the Python collector)
- Covers: the Cloud release-signing admission accepts only the exact reviewed unsigned archive: archive/manifest/commit/version/APK digest pins, update channel identical at every evidence boundary, private channel needs its baseline purpose, producer verification and build-config bound, Cloud profile only, no test-mocks/signing/unpackaged flags, release rows inside the unsigned contract, one row per variant, no duplicate/special/symlink members; the private producer approval must match the plan field by field. Duplicates: Quint `specs/quint/refinement/services/protected-app-update-promotion.mjs` touches the same admission module (different property). Callers/importers: `test/cloud-signing-input.test.mjs` (wrapper). Gates release: used by `.github/workflows/verify-cloud-signing-input.yml` / `release-cloud-app-signing.yml` through the `.sh`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-238 | - | Real admission function against real zip files: tooling that gates a release (T5 exception). | Keep. | None |
| 2 | 241-288 | - | Copies three CI scripts and runs the shell entry with PATH fakes; checks every approval field. Real integration of the release gate. | Keep. | None |
| 3 | 176-198 | T4 | Loops of near-identical refusal rows (12 for profiles, 4 for flags, 13 for row fields); fine as subTests. | Keep; no change needed. | None |
| 4 | 17-21 | C7 | Loads a hyphenated script by path; fine for Python. | - | - |

## Proposed end state
Unchanged content, run by `test/tooling/python.test.mjs` (the Python collector) with `-I`; the JS wrapper goes. If the release Python is ever ported to TypeScript (scripts research C7), this suite ports with it.
