# specs/quint/refinement/native/KeyboardDictationTraces.java
- Lines: 30 | Kind: Quint refinement harness (real `KeyboardDictationPolicy` state machine, five fixed traces) | Verdict: KEEP
- Covers: dictation ticket state machine (open/start/stop/finish/close), repeated completion, cancel, replaced capture, wrong ticket, changed editor/account. Duplicates: `test/fixtures/KeyboardDictationPolicyTest.java` via `test/keyboard-dictation.test.mjs` (javac unit test of the same class, T3/T4). Callers/importers: `keyboard-dictation.mjs` `checkKeyboardDictation`, only from the native aggregate `index.mjs` (no per-model test wrapper).
- Model live: `KeyboardDictation` (sources `KeyboardDictationPolicy.java`, `KeyboardDictationCloud.java`, `AlphaKeyboardDictationService.java`, launcher XML).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | T10 | Reads private `generation` by reflection. | Keep. | low |
| 2 | — | T4 | Javac unit test of the same policy duplicates this. | Delete the host unit test; keep this. | low |
| 3 | — | — | Driver hashes only `KeyboardDictationPolicy.java` while the manifest lists three classes; fine because only the policy executes. | None. | — |

## Proposed end state
Unchanged 30-line harness. Path filter: `KeyboardDictationPolicy.java`, the model, this directory.
