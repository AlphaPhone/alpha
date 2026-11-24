# test/qualified-app-update.test.py
- Lines: 304 | Kind: tooling integration (Python unittest of `scripts/ci/qualified-app-update.py` with real archives, tars, zips and patched transports; reuses `test/cloud-signing-input.test.py` as a fixture by loading it as a module) | Verdict: KEEP (run from `test/tooling/python.test.mjs`); SIMPLIFY the fixture coupling
- Covers: the release bridge restores exactly the reviewed unsigned inputs and signed APK bytes, and refuses substituted voice evidence, CMS/private-QA plans, wrong workflow/fork/attempt/artifact/history, duplicate JSON keys, symlink and tar path escapes, unbounded reads and transport mismatches. Duplicates: none. Callers/importers: `test/qualified-app-update.test.mjs:8` only. `scripts/ci/qualified-app-update.py` is called by `publish-qualified-app-update.yml`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-27, 37-40 | C7/T5 | Loads another test file (`cloud-signing-input.test.py`) by path and instantiates its `TestCase` to build fixtures. Two test files coupled through test internals. | Extract the producer fixture into `test/fixtures/cloud_signing_fixture.py` used by both. | Low |
| 2 | 20-24 | C3 | `importlib.util.spec_from_file_location` loader repeated in 12 Python tests (scripts research 2.10). | One shared loader in the fixture module. | Low |
| 3 | 125-301 | keep | Ten refusal/acceptance cases of a release-gating tool. | Keep. | Low |
| 4 | all | owner | Live only if the Cloud signing / qualified-update release path is live (open owner question). | Delete with that path if retired. | — |

## Proposed end state
Unchanged cases, run once from the Python collector, with fixtures from a shared helper module instead of another test file.
