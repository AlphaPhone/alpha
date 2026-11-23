# .github/workflows/reproduce-paradee-model.yml
- Lines: 31 | Kind: dispatch-only reproduction workflow (macOS) | Verdict: DELETE (with `scripts/ci/reproduce-paradee-model.py`)
- Covers: on macOS arm64, inits upstream `llama.cpp`, installs torch/numpy, and reconverts the pinned Paradee voice model to check it reproduces. Duplicates: none. Callers/importers: dispatch only; never run (research §1). `git grep reproduce-paradee-model` → only `test/ci-pin-bound-scripts.test.mjs:26` (runs the script with `--print-config`). Not in `affected.ts` (falls to "unknown" and selects every lane when edited).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | P4/A7 | Never run; model conversion is an upstream (`vendor/eliza` paradee-voice) concern, and staged voice outputs are inputs to the build, not produced here. | Delete the workflow and `scripts/ci/reproduce-paradee-model.py`; delete its case in `test/ci-pin-bound-scripts.test.mjs`. | Low; owner confirm nobody plans to use it for model provenance. |

## Proposed end state
File deleted; model reproduction lives upstream with the conversion scripts.
