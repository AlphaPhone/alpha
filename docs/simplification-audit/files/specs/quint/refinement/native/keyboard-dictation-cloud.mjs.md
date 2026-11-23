# specs/quint/refinement/native/keyboard-dictation-cloud.mjs
- Lines: 33 | Kind: Quint refinement driver (whole app Java: `KeyboardDictationCloud`, `KeyboardDictationPolicy`, `CloudSpeechPolicy`, `CloudDeployment`) | Verdict: KEEP
- Covers: keyboard dictation route choice (Direct vs Cloud), environment change before/during request, HTTP failure, malformed text, wrong provider; model `KeyboardDictationCloud` (native manifest, live). Duplicates: `keyboard-dictation.mjs` covers the policy alone (different model). Callers/importers: `test/quint-keyboard-dictation-cloud.test.mjs`, native aggregate `index.mjs:1,197` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | C6 | Redefines `app` instead of importing from `java.mjs`. | Import. | None |
| 2 | 8, 23 | C3 | `jsonJar` from `test/fixtures/jvm-tools.mjs` only to hash it. | Drop with receipt decision. | None |
| 3 | 14-19 | C3 | Temp stub-tree writer duplicated. | Shared helper or static stub folder. | None |
| 4 | 20 | follow-up | `CloudDeployment.java` compiled; keep in step with C4. | — | Low |

## Proposed end state
Compile the four product files against a static stub folder; one runner.
