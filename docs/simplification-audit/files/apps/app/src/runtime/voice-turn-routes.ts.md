# apps/app/src/runtime/voice-turn-routes.ts
- Lines: 31 | Role: pure re-export of upstream `voice-turn-routes.ts` and `voice-endpoint-chain.ts` (end-of-turn, heard routes, endpoint chain). "adds no behavior of its own" (line 7). | Verdict: DELETE (D4)
- Importers: product 1 — `prototype/voice-adapter.ts:35` (`residentEndpoint`, `createHeardReporter`, `createEndpointChain`). Tests: `test/voice-turn-routes.test.mjs:12`, `test/voice-assistant.test.mjs:145`, `test/live-voice.test.mjs`. `runtime/voice-timing.ts` mentions it in a comment only.
- Text/path pins: `specs/quint/native/manifest.json:75` (source path), `test/support/feature-parity.mjs:621` (exact inventory), `scripts/prepare-client-features.ts` (mentions name), `docs/formal-model-audit-2026-11/02-assistant.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-31 | D4 | Re-export shim of 18 names from two upstream modules; product uses 3. | Delete; voice-adapter imports the two upstream modules directly. Update the 3 test importers, native manifest path and feature-parity inventory. | Low. |
| 2 | 23-30 | A4 (link) | `CLEF_ENDPOINT_TIMEOUT_MS`, `clefEndpointStageEnabled`, `readClefTurn`, `ClefTurnClient` exist only for the disabled Clef stage (`voice-selection.ts:38`). | Goes with the file; tests import upstream. | — |
| 3 | 1-8 | A8 | Comment narrates the #423 history. | Goes with the file. | — |

## Local types and helpers
None.

## Proposed end state
Deleted (0 lines).

## Verification
`node --test test/voice-turn-routes.test.mjs test/voice-assistant.test.mjs test/live-voice.test.mjs`; Quint native manifest check; feature-parity test.
