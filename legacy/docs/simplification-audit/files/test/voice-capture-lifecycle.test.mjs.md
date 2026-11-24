# test/voice-capture-lifecycle.test.mjs
- Lines: 47 | Kind: transplant of upstream code (type-stripped `.eliza/client-features/packages/ui/src/voice/voice-session-mic-capture.ts`, imports and exports regex-removed, run in `vm` with fake AudioContext/track) | Verdict: DELETE
- Covers: `startVoiceMicCapture` releases the microphone on failed resume, track end, context close, visibility resume after Stop. Duplicates: upstream module's own tests in `vendor/eliza/packages/ui/src/voice/__tests__`. Alpha uses this module only through `apps/app/src/runtime/development-cartesia-conversation.ts` (development realtime path). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T2 | Regex strips imports/exports of a generated upstream file and evaluates it. | Delete. | Low |
| 2 | 1-47 | T5 | Tests upstream code (`.eliza/` is generated from `vendor/eliza`). | Delete; if a case is missing upstream, record it as an upstream follow-up (D14). | Low |

## Proposed end state
File deleted. Microphone release on failure is upstream's to test; Alpha's visible consequence (voice shows an error and
the mic is off) is a `journeys/voice.spec.ts` concern.
