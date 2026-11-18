# specs/quint/native/KeyboardDictationCloud.qnt
- Lines: 48 | Kind: Quint model (live) | Verdict: KEEP
- Covers: one native dictation request under the route captured at start (Cloud or Direct): any change of authority, provider, account, password lock, expiry or cancel refuses the result; the audio buffer is wiped and the connection closed on every settle; Direct does not depend on the Cloud account. Duplicates: none (`KeyboardDictation.qnt` is the gate in front). Callers/importers: `quint:check` (6 runs); `refinement/native/keyboard-dictation-cloud.mjs` (javac of `KeyboardDictationCloud.java`, `KeyboardDictationPolicy.java`, `CloudSpeechPolicy.java`, `CloudDeployment.java` with generated ports from `keyboard-dictation-cloud-ports.mjs`) via `refinement/native/index.mjs:197`; comment references in `AlphaKeyboardDictationService.java`, `KeyboardDictationCloud.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | — (good) | Unmodified Alpha Java compiled whole with closed ports; no slicing. | Keep. | — |
| 2 | 4-5, 24 | D8 | `requests` and `sent` are always set together to 1; one is redundant. | Keep one (`sent`) if the Java replay observes only one. | None |
| 3 | 35-36 | — | `safety` has two conjuncts and the manifest has no `invariants` list (only `invariant: safety`). Fine. | Optionally name the conjuncts (`AcceptedWasWiped`, `DoneClosesConnection`) for receipts. | None |
| 4 | 11, 44-45 | owner check | The "direct" route (Direct Cartesia) is modelled as a live product route. DECISIONS D8 removed only the impossible `'agent'` voice route. | Confirm the Direct route ships; no change if so. | Low |
| 5 | — | C5 (optional) | Two tiny keyboard models could live in one file as two modules. | Not worth it; leave separate. | — |

## Proposed end state
Unchanged apart from removing the duplicate `requests`/`sent` field. It stays the proof that a keyboard dictation
result is never inserted after the captured route/credential changed and that audio is always wiped.
