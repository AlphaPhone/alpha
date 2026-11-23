# specs/quint/refinement/native/StorePorts.java
- Lines: 40 | Kind: harness support (a `SharedPreferences` fake with separately observed memory and disk maps and commit fault modes: early throw, memory-only failure, lost acknowledgement after persistence; boot/install counters) | Verdict: KEEP, gated on `upstream.lock.json`
- Covers: nothing alone. Callers/importers: `ListenerStoreTraces.java`, `ListenerServiceTraces.java`, `ListenerServiceProbe.java`, `ListenerAdmissionProbe.java`, `ListenerInputTraces.java`; drivers `listener-store.mjs`, `listener-store-platform.mjs`, `listener-service*.mjs`, `listener-input.mjs`, `listener-admission-probe.mjs`; described in `README.md:171`. All model upstream `sense` listener code.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-35 | D8 | Whole fake written as one-line methods with several statements per line (`commit()` has 6 statements on 5 lines). | Expand when next touched. | none |
| 2 | 15 | — | Reads the disk JSON at construction to model process restart. Good, keep. | none | none |
| 3 | 1 | P6 | Package `ai.eliza.sense`; only upstream listener code uses it. | Run its harnesses only on upstream/patch changes. | low |

## Proposed end state
Unchanged content; scheduled with the listener lane.
