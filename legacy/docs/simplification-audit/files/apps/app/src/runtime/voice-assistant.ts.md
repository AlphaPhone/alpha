# apps/app/src/runtime/voice-assistant.ts
- Lines: 27 | Role: pure re-export of upstream `.eliza/client-features/packages/voice/src/voice-assistant-session.ts` (VoiceAssistantSession and its types); "adds no behavior of its own" (line 5). | Verdict: DELETE (D4) — or KEEP if the owner wants the path stable for the Quint/Android pins
- Importers: product 1 — `prototype/voice-adapter.ts:39` (`VoiceAssistantSession`, `AssistantState`, `AssistantTextFrame`). Others: `test/voice-assistant.test.mjs:8`, `test/voice-turn-routes.test.mjs:13`, `test/browser/chat-dictation-api.spec.ts:25`, `test/browser/voice-stop-speaking.spec.ts:10`, `specs/quint/refinement/composition/ports.mjs:60`, `specs/quint/refinement/native/renderer.mjs:13`.
- Text/path pins: `specs/quint/native/manifest.json:70,541,1353` (source path list), `test/support/feature-parity.mjs:616` (exact inventory), `test/voice-assistant.test.mjs:750` (file list), `scripts/prepare-client-features.ts` and `test/client-feature-preparation.test.mjs` (mention the module name), docs/prd.md (#423 mention), `android/.../NativeVoiceLatencyInstrumentedTest.java` (comment/name only).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-27 | D4 | Re-export shim: 19 names re-exported, one product importer uses 3. | Delete the file; `voice-adapter.ts` imports from the upstream module (via the `@eliza/*` alias once D13 lands). Update the 6 test/spec importers and the three path pins (native manifest, feature-parity, voice-assistant.test:750). | Low code risk; the manifest/feature-parity edits are mandatory or verify fails. |
| 2 | 2-5 | A8 | Comment cites "#423" and explains the history of the module path. | Goes with the file. | — |
| 3 | 7-26 | A7 | 16 of the 19 re-exported names (`ASSISTANT_TIMING_DEFAULTS`, `splitSpokenSentences`, `VoiceAssistantError`, `AssistantPorts`, `Endpoint*` …) have no importer through this path except tests. | If kept, trim to the three names voice-adapter uses. | Low. |

## Local types and helpers
None (re-exports only).

## Proposed end state
File deleted (0 lines); voice-adapter and tests import the upstream module directly. If the owner keeps module paths stable for the native manifest, shrink to a 1-line re-export of the three used names.

## Verification
`node --test test/voice-assistant.test.mjs test/voice-turn-routes.test.mjs test/client-feature-preparation.test.mjs`; Quint native replay (`renderer.mjs`) and composition ports; feature-parity test; Playwright `chat-dictation-api.spec.ts`, `voice-stop-speaking.spec.ts`.
