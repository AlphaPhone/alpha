# specs/quint/refinement/native/ListenerStoreTraces.java
- Lines: 97 | Kind: Quint refinement harness (vendored `ListenerStore`, `ListeningEpoch`, `CrashLoopBreaker`, `ListenerPolicy`; SharedPreferences memory/disk port; fresh JVM per restart) | Verdict: KEEP (gate on upstream)
- Covers: listener consent/settings persistence: grant/revoke/pause/resume, stale consent ticket, reset with each persistence fault (memory failure, early throw, durable throw), failed session close, crash-loop breaker history (8-entry cap, malformed text), boot/update/unknown-boot windows, permission, clear-errors. Duplicates: none. Callers/importers: `listener-store.mjs`, native aggregate, `test/quint-listener-store.test.mjs`.
- Model live: `NativeListenerStore` (vendored sense only). D7 keeps the feature.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 48-51, 88-90 | C3 | `child()` spawns a fresh JVM both for the per-scenario campaign and for `restart` checkpoints. The restart spawn is essential (new process reads the disk file); the campaign spawn duplicates `javaTraceCampaign`. | Keep `child("restart")`; drive scenarios from `javaTraceCampaign`. | low |
| 2 | 72 | A8 (label) | Stutter label "load malformed legacy entries" — this is the decoder normalising malformed stored text at a storage boundary (valid B3 boundary), not an A1 legacy reader. | Rename label to "load malformed entries". | trivial |
| 3 | 26-31 | T10 | Reads `processConsent` and epoch internals by name. | Keep. | low |

## Proposed end state
Same 26 scenarios, launched by `javaTraceCampaign`, restart checkpoints still in a child JVM. Path filter as for the other sense harnesses.
