# test/hosted-native-inputs.test.py
- Lines: 224 | Kind: tooling (Python unittest of `scripts/ci/hosted-native-inputs.py`; builds synthetic zip artifacts, patches `subprocess` and `urllib` transport) + one source-text case over `.github/workflows/resident-android.yml` | Verdict: KEEP (run from the Python collector), SIMPLIFY
- Covers: the automatic-candidate native input admission (embedding + voice artifacts) refuses stale package/SDK/engine pins, unreviewed shared engines, uncommitted manifest changes and archives whose hash matches but whose members differ, before any network transport. Duplicates: `test/embedding-artifact-inputs.test.py` (shares `scripts/ci/embedding-artifacts.py`), `host-speech-admission.test.mjs` (local side). Callers/importers: `.github/workflows/resident-android.yml:198` only (`python3 -B test/hosted-native-inputs.test.py`); not in `npm test` (`test/python-suites.test.mjs` does not list it). Script under test is called by `resident-android.yml:113,234`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54-200 (approx.) | — | Real admission code on real archives; transport mocked only to prove it is never reached. Release gate. | Keep. | — |
| 2 | 206-219 | T1 | `test_automatic_workflow_admits_inputs_before_prepare_and_keeps_diagnostics` asserts step names, order, `if:` strings and `GH_TOKEN` placement in the workflow YAML. | Delete (P1: workflow structure is reviewed in the workflow, not by a text test). | Low |
| 3 | — | T9 / C7 | Third naming/launch scheme for Python tests (`test/*.test.py` run directly by a workflow; others via `python-suites.test.mjs`; others in `scripts/ci/test-*.py`). | One Python collector (`python3 -m unittest discover -s test -p '*.test.py'` or `python-suites.test.mjs`) run once, in the lane whose paths (`scripts/ci/**`, `android/*-host/**`) changed. | Low |

## Proposed end state
Keep minus the workflow-text case; run from the single Python collector in a path-filtered lane instead of a bespoke
step in `resident-android.yml`.
