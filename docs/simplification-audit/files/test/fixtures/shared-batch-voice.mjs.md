# test/fixtures/shared-batch-voice.mjs
- Lines: 19 | Kind: transplant fixture (bundles upstream voice modules from `.eliza/client-features`, hash-checks every input, evals into a vm box) plus a fake clock | Verdict: DELETE (with the voice transplant family)
- Covers: gives voice-view tests the prepared `@elizaos/core/speech`, `@elizaos/voice/turn`, `upstream renderer package/voice/batch-conversation`, `tts-playback-activity` and `voice-activity` exports inside a closed vm, and a deterministic `voiceFakeClock`. Duplicates: `voice-assistant.test.mjs:11-27` has its own fake clock (research `tests-host.md:299`); `node:test` `mock.timers` does the same. Callers/importers: `test/batch-ack-shell-retirement`, `cloud-conversation-chunks`, `cloud-streaming-conversation`, `cloud-voice-profile`, `pixel-spoken-acks`, `private-preview-cartesia-route`, `voice-call-interrupted-capture`, `voice-calm-cloud-errors` (all research verdict DELETE: voice transplant family), `test/fixtures/cloud-voice-view.mjs` (+ `.d.mts`), `scripts/test-cloud-voice-cancellation-flow.ts`. No `specs/` importer.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-17 | T2, B5 | Re-authenticates upstream source bytes against `.eliza/client-features/.source.json` and the pin on every test process, then evals the bundle in a vm. The producer already enforces this. | Delete. Voice behaviour is covered by one voice-speech integration (real imports under tsx) and the voice Playwright journey. | medium: about 40 tests use this; their few distinct cases need carrying (see the voice chunk reports) |
| 2 | 11-12 | B3 | Re-validates the project's own `tsconfig.json` aliases. | Gone with the file. | none |
| 3 | 19 | C3, T8 | Hand-written fake clock (30 microtask flushes per step). | Replace with `mock.timers` in whatever survives. | none |

## Proposed end state
Deleted together with `cloud-voice-view.mjs` and the voice transplant tests; `scripts/test-cloud-voice-cancellation-flow.ts`
moves to `test/` as part of the voice integration and imports the real modules.
