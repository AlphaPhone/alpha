# test/fixtures/KeyboardDictationPolicyTest.java
- Lines: 15 | Kind: Java fixture, single-class unit (`KeyboardDictationPolicy`) | Verdict: MERGE into the Gradle JVM voice suite
- Covers: a dictation session finishes once, a cancelled or replaced session cannot commit, recording ownership follows the latest bind, direct providers are refused in test-mock-off builds, and dictation is never offered for password/sensitive input types. Duplicates: none. Callers/importers: `test/keyboard-dictation.test.mjs:10` (whose other cases are inline Java in JS).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11 | ok | Sensitive-field refusal (input variations 0x81, 0x91, 0xe1, 0x12; `IME_FLAG_NO_PERSONALIZED_LEARNING`) is a privacy rule with no other host coverage. | Carry. | High if deleted |
| 2 | 6-8 | D8 | Dense one-line state sequences with message-less `check`. | Split into named methods. | Low |

## Proposed end state
Two methods in the voice suite (`sessionsFinishOnce`, `sensitiveFieldsNeverDictate`). Fixture deleted from `test/`.
