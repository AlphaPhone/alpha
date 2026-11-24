# specs/quint/refinement/native/resident-start-cancel.mjs
- Lines: 65 | Kind: Quint ITF replay on the whole `AlphaLocalAgentPlugin` (one JVM per trace) | Verdict: KEEP; replace stub text rewrites with port hooks
- Covers: Resident start/cancel lifecycle without credential mutation: attached starts, cancellation remembered before start, cancellation stopping own launch or nothing, recheck after ordinary stop continuing into a launch or ending unconfirmed, focus-gated retry, stop released by status read, broadcast rearm. Model `ResidentStartCancel` (`manifest.json:3947`). Duplicates: none. Callers/importers: `native/forward-replays.mjs:13`, `test/quint-resident-start-cancel.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-23, 35-43 | T10 (stubs) | Rewrites `resident-platform.mjs` stub text (`ElizaAgentService` credential methods, `Activity.hasWindowFocus`, `SystemClock`) by exact strings and regexes. | Port hooks in `ResidentTestPorts`; set them from `ResidentStartCancelReplay.java`. | Low |
| 2 | 27-32 | cost | 60 traces + 8 witnesses × 2 seeds ≈ 76 JVM runs, each loading the full plugin closure. | Acceptable for this model; path-filter the lane to `AlphaLocalAgentPlugin.java` and the model. | — |
| 3 | 65 | A7 | CLI entry. | Optional delete. | None |

## Proposed end state
~45 lines: generate traces, `replayJava` over `residentSources` + platform, required actions and reached predicates unchanged.
