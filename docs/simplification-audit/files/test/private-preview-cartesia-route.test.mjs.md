# test/private-preview-cartesia-route.test.mjs
- Lines: 334 | Kind: transplant (concatenates and evals `build-flags.ts` + `development-cartesia-flag.ts` with `import.meta.env` rewritten; drives the voice adapter through the `cloud-voice-view` vm fixture, which rewrites adapter source) + self-respawn (14 child `node --test` processes, one per case) | Verdict: DELETE; carry 3 production voice behaviours to `journeys/voice.spec.ts`
- Covers: the dev-only Cartesia route flag, and (despite the file name) Cloud voice startup: 12 s startup timeout, phase timing, media-retirement fence, quiet 503 retry, unknown failure recovery, composer captions. Duplicates: `specs/quint/refinement/application/quiet-voice-retry.mjs` (503 quiet retry), `test/voice-calm-cloud-errors.test.mjs`, `test/browser/voice-composer-recovery.spec.ts`, `test/dev-cartesia.test.mjs`, `test/development-cartesia-conversation.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-32 | T2/D5 | Flag test by source concatenation and `vm`; a flag's truth table is a build-flag concern. | Delete; the production project and `audit-production-bundle` prove the dev route is absent in production. | Low |
| 2 | 34-75 | T9/T8 | Each case respawns this file as a child test runner because combined vm contexts "intermittently SIGSEGV'd"; 14 cold starts per run. | Delete with the file. | Low |
| 3 | 77-163 | T2/D5 | Dev Cartesia route cases via `adapterSourceTransform` string replacement of `enter(undefined,'default',chat)`. Dev-only (D6). | Delete. | Low |
| 4 | 169-238 | T2 | Startup timeout at 12 s with its timing record, media-retirement fence, phase timing. Production Cloud voice behaviour, only covered here. | Carry "a stalled Cloud voice start shows Timed out after 12 s and a late preparation never opens the mic" to `journeys/voice.spec.ts` with the voice mock holding preparation. Timing-record internals: drop. | Medium |
| 5 | 279-300 | T2 | Composer captions per phase (Listening/Transcribing/Thinking/Speaking). | One journey case in `journeys/voice.spec.ts`; check `voice-composer-recovery.spec.ts` first. | Low |
| 6 | 301-334 | T4 | 503 quiet retry and unknown-code recovery. Covered by the `QuietVoiceRetry` replay and `voice-calm-cloud-errors`. | Delete. | Low |

## Proposed end state
File deleted. `journeys/voice.spec.ts` gains: Cloud start timeout with a late preparation fenced; captions per phase.
The dev Cartesia flag and route are covered by the dev project only if the owner keeps that surface.
