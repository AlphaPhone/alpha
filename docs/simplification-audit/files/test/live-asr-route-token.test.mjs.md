# test/live-asr-route-token.test.mjs
- Lines: 13 | Kind: source-text (three regexes over `AlphaLocalAgentPlugin.java`) | Verdict: DELETE
- Covers: local speech routes (`/api/asr/local-inference/*`) use the resident's per-boot token; other routes use the owner session. Duplicates: none on the host; the comment itself says "Device evidence only" (resident instrumentation / `LiveAgentInstrumentedTest`, now deleted in this branch, would be the place). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-12 | T1 | Matches whole minified Java lines including whitespace; any reformat breaks it, and it proves nothing about the request actually sent. | Delete. | Low |
| 2 | 5-6 | A8 | Comment cites "upstream defect 1". | Gone. | Low |

## Proposed end state
File deleted. If the token split must be covered off-device, the resident native-voice transport Quint/JVM replay that
already compiles `AlphaLocalAgentPlugin.java` (`specs/quint/refinement/native/resident-coordinator.mjs`) can observe the
`Authorization` header per path; otherwise it is device evidence. Listed as coverage at risk.
