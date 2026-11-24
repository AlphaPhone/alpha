# scripts/ci/test-recovery-ui-guard.py
- Lines: 135 | Kind: tooling (Python script-style test of a CI helper, fake adb transport + captured device transcripts) | Verdict: MOVE to `test/ci/recovery-ui-guard.test.py` and run in ONE place
- Covers: `scripts/ci/recovery_ui_guard.py` (`owned`, `admit_display`, `terminal`) refuses to wake/dismiss the keyguard of a secondary Android user unless the captured window/power state is exactly "owned, insecure, awake", and accepts only an exact single-test instrumentation transcript. Duplicates: partially `scripts/ci/test-pending-recovery-phases.py` (same `Fixture` idea for the same module). Callers/importers: `test/python-suites.test.mjs:25` (`runCi`, part of `npm test`) **and** `.github/workflows/resident-android.yml:569` (direct `python3`) — runs twice per resident lane.
- Fixtures: `scripts/ci/fixtures/recovery-{policy-52ab.txt,idle-52ab.json,dismiss-52ab-v2.json,storage-e4d-pass.txt}` (only this file reads them).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 / C7 | A test body living in `scripts/ci/`, with its four fixtures, and a Node wrapper that injects `sys.path` because `-I` drops the script directory. | Move the file and `scripts/ci/fixtures/recovery-*` to `test/ci/` (or `test/fixtures/recovery/`); import `recovery_ui_guard` by an explicit `sys.path` line at the top of the test so the wrapper becomes a plain `python3 -I test/ci/...`. | Low |
| 2 | wf 569 / python-suites 25 | P3 / T4 | Executed both in `npm test` and in `resident-android.yml`. | Keep the `npm test` (python-suites) run; drop the `resident-android.yml:569` step. | Low |
| 3 | 1-135 | D8 | Statement-soup Python (`;`-joined statements, one-letter names, 300-char lines), five ad-hoc "PASS" sections instead of `unittest` cases. | When moving, convert to `unittest.TestCase` with one method per section (ready flow, captured switch, idle, dismiss, profile transition, transcript). Keep the case set; it is real captured device data. | Low |
| 4 | 47-135 | — | Cases built from real captured hosted-emulator output (API35 user switch, e4d transcript) are the valuable part; synthetic `POLICY` replace-variants overlap heavily. | Keep captured-transcript cases; trim synthetic mutations that hit the same refusal branch (e.g. 17 transcript corruptions → one per refusal class). | Low |

## Proposed end state
`test/ci/recovery-ui-guard.test.py` (unittest, ~80 lines) with fixtures under `test/fixtures/recovery/`, run once by the Python suite runner in `npm test`. Workflow step removed. `scripts/ci/recovery_ui_guard.py` stays where it is (production CI helper).
