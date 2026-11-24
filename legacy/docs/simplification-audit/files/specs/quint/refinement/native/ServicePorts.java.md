# specs/quint/refinement/native/ServicePorts.java
- Lines: 18 | Kind: harness support (static framework observations and fault switches for the listener service: permission, indicator, unlock, foreground, start/stop/release faults, timers, held model load, AudioRecord list) | Verdict: KEEP, gated on `upstream.lock.json`
- Covers: nothing alone. Callers/importers: `ListenerAdmissionProbe.java`, `ListenerInputTraces.java`, `ListenerServiceProbe.java`, `ListenerServiceTraces.java`; drivers `listener-admission-probe.mjs`, `listener-input.mjs`, `listener-service.mjs`, `listener-service-platform.mjs`. All model upstream `sense` code (`NativeListenerService`, research §2.9). Survives as long as those harnesses do.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | D8 | Eighteen fields packed into five lines (`public static boolean permission=true,indicator=true,...`). | One field per line when the file is next touched (no Java formatter, D9). | none |
| 2 | 1 | P6 | Package `ai.eliza.sense`: only upstream listener code depends on it. | Run its harnesses only on upstream pin / patch changes; D14 follow-up to move upstream. | low |

## Proposed end state
Unchanged content; scheduled with the listener harnesses on `upstream.lock.json` / `patches/eliza/**` / `android/upstream-native-sources.json` changes.
