# specs/quint/refinement/native/listener-store.mjs
- Lines: 25 | Kind: Quint refinement driver (real `ListenerStore`, `ListeningEpoch`, `CrashLoopBreaker`, `ListenerPolicy`; 26 scenarios; restart via fresh JVM) | Verdict: KEEP
- Covers: listener settings persistence: consent grant/revoke/pause, stale consent, reset recovery, crash-loop window, reboot/update, write failures before/after durable replacement; model `NativeListenerStore` (native manifest, live; D7). Callers/importers: `test/quint-listener-store.test.mjs`, native aggregate `index.mjs:30,190` (T4); README.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | P6 / T4 | Upstream sense code; aggregate duplicate. | Path filter; aggregate goes. | None |
| 2 | 17-22 | B5 | Assumption prose. | With receipt decision. | None |

## Proposed end state
Unchanged; one runner.
