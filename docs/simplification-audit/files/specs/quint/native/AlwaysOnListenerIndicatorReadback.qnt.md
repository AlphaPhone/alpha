# specs/quint/native/AlwaysOnListenerIndicatorReadback.qnt
- Lines: 190 | Kind: Quint model (live; headed "Complementary audit scope", §2.11 audit twin) | Verdict: KEEP as the canonical always-on listener model; rename to `AlwaysOnListener` and absorb the `image` gate from the coarse twin
- Covers: per-verdict listener step on SystemUI lease loss (latch on unexplained loss while holding the mic or during an explained pause; display-off sleep lapse does not latch), four explained pauses, per-process consent and crash-breaker visibility after restart, ListeningEpoch ticket invalidation. Duplicates: `AlwaysOnListener.qnt` (coarser, same component); lease verdict boundaries partly also in `ListenerLeaseRecovery.qnt` and `NativeIndicatorProvider.qnt`. Callers/importers: `quint:check` (4 witnesses), `specs/quint/native/conformance.mjs:12,52-271` (`checkAlwaysOnListenerIndicatorReadback`, imported by `refinement/native/index.mjs:71,94`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | A8 / §2.11 | Header "Complementary audit scope; the canonical model ... remain registered separately" and manifest abstraction line 1 say this is a second model of the same component. | After the merge this is the only model: drop the header and the first abstraction sentence, rename module/file/manifest entry to `AlwaysOnListener`. | Low (rename touches `conformance.mjs:12,262`, manifest). |
| 2 | harness | D11 / T10 (mild) | The harness `specs/quint/native/conformance.mjs` lives in the model folder (every other harness is under `refinement/`). It writes a generated Java runner that imports `ai.eliza.sense.ListenerPolicy`, `IndicatorLease`, `CrashLoopBreaker`, plus unrelated `ai.eliza.voice.SpeechAudioFocusPolicy` and `ResetAuthorization`, and the same file also imports Maps client code from `.eliza/client-features/plugins/plugin-maps/...` (lines 235-236). Execution style is good (javac of whole upstream classes, ITF replay), but the file mixes three concerns. | Move the listener part to `refinement/native/always-on-listener.mjs` (+ a checked-in `AlwaysOnListenerTraces.java` instead of a string-generated runner); move the Maps checks to the Maps harness. | Low |
| 3 | conformance.mjs 173-190 | T3 / B5 | The generated runner also hard-codes point checks (`lease.verdict(2499,…)==NONE`, `verdict(3000,…)==EXPIRED`, …). These restate `ListenerLeaseRecovery`'s boundary scenarios. | Drop the point checks; boundary classes are covered by the lease model replay. | Low |
| 4 | 116-121 | — | `processRestart` resets `speechReady: true` and clears call/mic/silenced: an environment simplification, stated in abstractions. Fine. | None. | — |
| 5 | manifest | §2.9 | All executed code is upstream (`vendor/eliza/packages/app/platforms/android/sense`). The Alpha `sources` pins (same four files as the twin) are not executed. | Same as twin: pin what is compiled; consider running this model only when `upstream.lock.json` changes, or moving it upstream (D14 follow-up). | Low |

## Proposed end state
`specs/quint/native/AlwaysOnListener.qnt` (this content, renamed, header removed, `image` gate added if the product
still gates on it). One harness `refinement/native/always-on-listener.mjs` + checked-in Java trace driver. The coarse
twin and its `ComponentTraces.listeners()` projection are deleted.
