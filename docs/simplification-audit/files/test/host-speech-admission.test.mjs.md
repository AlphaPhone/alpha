# test/host-speech-admission.test.mjs
- Lines: 68 | Kind: tooling (imports `scripts/host-speech-admission.ts`, `scripts/combined-agent-source.ts`, `scripts/stage-embedding-host.ts`; real files, symlinks and a real git repo fixture) + source-text over vendor TS and `package.json` | Verdict: KEEP, SIMPLIFY (move to `test/tooling/native-inputs.test.ts` with the other native-input admission tests)
- Covers: host speech assets are admitted only with the exact reviewed bytes/digest (no links, no size drift); the host asset manifest equals the shared worker pins; the embedding host qualification is bound to this app id and the reviewed engine gitlink; source snapshots reject unreviewed engine gitlinks. Duplicates: `test/hosted-native-inputs.test.py` (embedding/voice admission on CI artifacts), `embedding-artifact-inputs.test.py`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-19, 51-62 | — | Real admission functions on real fs/git: release gates (T5 exception). | Keep. | — |
| 2 | 20-29 | T1 / T10 | Parses `vendor/eliza/.../host-tts-worker.ts`, `host-asr-worker.ts`, `host-asr-assets.ts` by `split('PARADEE_ASSETS:')` and a regex. Drift check is useful, text parsing is not. | Import the upstream constants (they are exported from the shared worker, or ask upstream to export them, D14) and `deepEqual`. | Low |
| 3 | 28 | A8 / T1 | "No package script names kokoro/whisper": tombstone check on `package.json`. | Delete. | Low |
| 4 | 31-36, 49 | B5 | Hard-codes the engine commit `6337fd4c…` twice and compares to `git ls-tree` of the submodule: every engine bump edits the test. | Read the reviewed pin from `combined-agent-source.ts` exports instead of `source.includes(...)` (line 33 is T1). | Low |
| 5 | 43-46 | A1? | Rejecting the retired app id `ai.elizaresearch.alphaphone` is just "a different identity is refused". | Keep as a generic mismatched-identity case; drop the historical id. | Low |

## Proposed end state
About 45 lines in `test/tooling/native-inputs.test.ts`: verifiedFile bytes/digest/link/size, manifest equals imported
upstream pins, qualification identity/producer-input refusals, gitlink refusal on a temp repo.
