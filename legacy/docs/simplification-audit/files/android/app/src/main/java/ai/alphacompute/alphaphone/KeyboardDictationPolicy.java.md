# android/app/src/main/java/ai/alphacompute/alphaphone/KeyboardDictationPolicy.java
- Lines: 40 | Role: dictation ticket/state machine (READY→RECORDING→TRANSCRIBING→CLOSED), provider-route choice and secure-field admission | Verdict: SIMPLIFY (small)
- Importers: 2 (`AlphaKeyboardDictationService` uses every instance method; `KeyboardDictationCloud` uses `usesDirect`). Text/path pins: `test/fixtures/KeyboardDictationPolicyTest.java` + `test/keyboard-dictation.test.mjs` (javac), `specs/quint/refinement/native/KeyboardDictationTraces.java`, `keyboard-dictation.mjs`, `keyboard-dictation-cloud.mjs`, `specs/quint/native/manifest.json`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-38 | D7 / D8 | `permitted` uses magic numbers so javac can compile without Android: `inputType & 0xf`, `0xff0`, `0x1000000`, `0x80/0x90/0xe0`, `0x10`. These are `InputType.TYPE_MASK_CLASS`, `TYPE_MASK_VARIATION`, `EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING`, `TYPE_TEXT_VARIATION_(VISIBLE_/WEB_)PASSWORD`, `TYPE_NUMBER_VARIATION_PASSWORD`. | Use the Android constants (or, while the javac test stays, named `private static final int` constants with those names). | Low; the javac test needs an `InputType` stub if real constants are used. |
| 2 | 30-33 | D10 | `usesDirect` returns a boolean but throws for the "else" case — provider routing lives in a dictation state class. | Move to `KeyboardDictationCloud` (its only other caller) as `providerKind`. Keep message text. | Low. |
| 3 | 29 | — | `state()` getter used for 4 comparisons in the service (`state()==RECORDING \|\| state()==TRANSCRIBING` twice). | Add `boolean active()`; minor. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `State` | enum | 5 | no | here |
| `permitted` | helper | 34-39 | secure-field rules exist upstream in the shared keyboard plugin? (not found in `.eliza/client-features`) | here |

## Proposed end state
Same state machine; named input-type constants; `usesDirect` moved to the cloud class. ~40 lines.

## Verification
`test/keyboard-dictation.test.mjs`, `test/fixtures/KeyboardDictationPolicyTest.java`, Quint `keyboard-dictation.mjs` replay.
