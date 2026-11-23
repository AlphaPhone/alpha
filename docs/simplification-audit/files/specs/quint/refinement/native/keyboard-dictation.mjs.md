# specs/quint/refinement/native/keyboard-dictation.mjs
- Lines: 14 | Kind: Quint refinement driver (one whole app class) | Verdict: KEEP (add per-model test)
- Covers: `KeyboardDictationPolicy` open/start/stop/finish/close, ticket/generation fencing (five traces); model `KeyboardDictation` (native manifest, live). Duplicates: none for this model. Callers/importers: only the native aggregate `index.mjs:2,188` — no `test/quint-keyboard-dictation.test.mjs` exists.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / P | Loses its only runner when the aggregate is deleted. | Add `test/quint-keyboard-dictation.test.mjs`. | High if aggregate goes first |
| 2 | 7 | D8 | Two statements on one line. | Formatter. | None |

## Proposed end state
Unchanged campaign with its own test, path-filtered to `KeyboardDictationPolicy.java` and the model.
