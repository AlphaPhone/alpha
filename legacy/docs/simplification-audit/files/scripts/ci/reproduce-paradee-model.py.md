# scripts/ci/reproduce-paradee-model.py
- Lines: 86 | Kind: one-off reproduction (upstream Paradee GGUF converter) | Verdict: DELETE (with `.github/workflows/reproduce-paradee-model.yml` and its block in `test/ci-pin-bound-scripts.test.mjs`); owner to confirm
- Covers: downloads pinned Paradee PyTorch weights from Hugging Face, runs the upstream converter in `vendor/eliza/.../llama.cpp/tools/paradee`, and records whether the output bytes equal both the upstream pin and `scripts/host-speech-assets.json`. Duplicates: none. Callers/importers: `.github/workflows/reproduce-paradee-model.yml` (dispatch; never run per research); `test/ci-pin-bound-scripts.test.mjs:25-35` runs `--print-config` and cross-checks `host-speech-assets.json` with `android/voice-host/qualified-voice-host.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P4 | Never-run reproduction of an upstream build step; converter and pins live in `vendor/eliza`. | Delete script + workflow; the reproducibility check belongs upstream (D14 follow-up). | Low. |
| 2 | test block | T1 / inventory | The test only checks that two committed JSON records name the same file, digest and version. | Delete with the script. If the owner wants that consistency, `android-stage-voice-models.ts` (which consumes both) should refuse a mismatch at build time. | Low. |
| 3 | 26-27 | C3 | Another local `git()` wrapper. | Moot. | — |

## Proposed end state
Gone; upstream owns converter reproducibility. Owner question: keep only if a model-provenance audit is planned in this repo.
