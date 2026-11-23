# android/aosp/branding/provision/README.md
- Lines: 78 | Role: Explains first-run preset semantics, the staging command line and a manual test command. | Verdict: SIMPLIFY
- Importers: none (prose). Mentions `scripts/fetch-alpha-os-preset-inputs.py`, `scripts/stage-alpha-os-branding.py`, `test/aosp-fresh-presets.test.py`, `android/app/src/main/res/drawable/app_icon.xml`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 60-65 | A8 | "Historical task-local staging scripts remain evidence; this source-owned entrypoint replaces their branding/Provision preparation for the next producer." Tombstone for scripts not in the repo. | Delete. | None. |
| 2 | 48-58 | D8 / B5 | One 11-line paragraph mixing admission rules, icon geometry provenance and boot-animation ownership; repeats `source-inputs.json:77-99` prose. | Reduce to 3 lines: inputs are hash-pinned; `--apply` writes; receipts are new files. | None. |
| 3 | 67-78 | T9 | Documents `python3 test/aosp-fresh-presets.test.py` as the "focused local check"; no runner (`scripts/run-node-tests.ts`, `test/python-suites.test.mjs`, workflows) runs it. | Either add it to `test/python-suites.test.mjs` with a skip when `ALPHA_FRESH_PRESET_INPUTS` is absent, or delete the test and this section (Quint OSProvisioning already exercises the Java). Cross-file decision. | Low. |
| 4 | 3-31 | - | Behaviour description is accurate and useful. | Keep, tighten. | - |

## Local types and helpers
None.

## Proposed end state
~40 lines: behaviour (first-run only, recovery buttons, preserved choices), staging command, and where verification lives.

## Verification
None (prose).
