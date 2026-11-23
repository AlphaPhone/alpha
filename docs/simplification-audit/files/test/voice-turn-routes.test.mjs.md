# test/voice-turn-routes.test.mjs
- Lines: 318 | Kind: mixed. Integration of real modules (`voice-turn-routes.ts`, `voice-assistant.ts` `VoiceAssistantSession`, `voice-timing.ts`, `diagnostics-export.ts`) with fake request ports (tests 1-3, 5-7, 9 first half); transplants (lines 94-105, 233-239, 277-318: slices `onHeard` from `voice-adapter.ts`, `turnReplyRow` from `connection-ui.tsx`, `clefEndpointStage` from `voice-selection.ts`); source-text (258-274) | Verdict: REWRITE as `test/integration/voice.test.mjs` (keep the real-module cases)
- Covers: end-of-turn response parsing, the resident endpoint port, heard-prefix reporting (once, retries, 409/404/503/400 handling, staleness), the session not blocking the next turn on heard I/O, enum-only timing/diagnostics, Clef off, the Android route allowlist. Duplicates: `test/browser/voice-assistant.production.spec.ts` (heard flows), `specs/quint/native/manifest.json:75` pins this module, `test/voice-assistant.test.mjs`, `test/voice-selection.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-208 | keep | Real `createHeardReporter`, `residentEndpoint`, `readEndOfTurn` and a real `VoiceAssistantSession` with a fake clock: genuine integration of the voice turn pipeline at its HTTP boundary. | Move to the integration file. | Low |
| 2 | 94-105, 291-318 | T2 | `adapter.indexOf('          onHeard:heard=>{')` … `'          onTurn:'`: indentation-exact slice of `voice-adapter.ts`, evaluated with a fake shell. | Delete; the visible effect (reply text kept on playback failure) goes to `journeys/voice.spec.ts`. | Medium |
| 3 | 233-256 | T2/A4 | Transplants `voice-selection.ts` to read `clefEndpointStage()`, a constant (`CLEF_ENDPOINT_ENABLED`, kept per D7). | Import it; keep only the "local scorer only, path recorded as enum, forged diagnostics fields dropped" assertions. | Low |
| 4 | 258-274 | T1 | Regexes over `voice-adapter.ts` wiring and over the `path.matches(...)` line of `AlphaLocalAgentPlugin.java`. The Java route allowlist is a real security rule. | Delete here; cover the allowlist with a JVM test of the plugin's route policy (Gradle `src/test`) once it is extracted to a function. | Medium |
| 5 | 277-289 | T2 | `turnReplyRow` is already exported (`connection-ui.tsx:1929`) but sliced with `new Function` because importing `connection-ui.tsx` in Node is heavy. | Delete; cover via voice journey (recorded reply recovered for an interrupted stream). | Low |
| 6 | 7-9 | A8 | Comments cite upstream PR numbers (#36546, #36547, #423, #663). | Drop. | None |

## Proposed end state
`test/integration/voice.test.mjs` holds: end-of-turn parsing (one table), endpoint port trimming/limit/error, heard reporter outcomes table (recorded, unchanged, not-needed, nothing-heard, invalid, stale, conflict, not-found retry once, unavailable, rejected), the session drain case (lines 147-208), and enum-only diagnostics. Imports are direct (`await import('../../apps/app/src/runtime/...')`) under tsx. Transplant and regex tests are deleted; the Android allowlist gets a JVM test.
