# test/fixtures/cloud-voice-view.mjs
- Lines: 87 | Kind: transplant (reads ~15 renderer and projected upstream voice files, strips `import`/`export` by regex, evaluates them in one `vm` realm with a ~40-field fake driver/controller/shell) | Verdict: REWRITE as the voice integration harness (`test/integration/support/voice.mjs`) importing real modules; then DELETE
- Covers: Cloud and on-device voice turns, speech playback, read-aloud, note recording, voice navigation, denied/progress/error copy. Duplicates: Playwright voice specs (`voice-assistant`, `voice-timing`, `live-voice`, ... pairs in research). Callers/importers (18): `scripts/test-cloud-voice-cancellation-flow.ts`, `scripts/test-cloud-voice-flow.ts`, and 16 host tests (app-update-automatic, batch-ack-shell-retirement, cloud-conversation-chunks, cloud-streaming-conversation, cloud-voice-profile, local-speech-playback, pixel-spoken-acks, private-preview-cartesia-route, voice-call-interrupted-capture, voice-calm-cloud-errors, voice-copy-presentation, voice-denied-recovery, voice-entry-timing, voice-owned-capture-cleanup, voice-progress-presentation, voice-replies).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17, 44 | T2 | `load()` deletes `^import .*;` lines and `export` keywords by regex, then `vm.runInNewContext`: any multi-line import or `export default`/`export {}` breaks it; files are evaluated without their real dependencies. | Bundle the real modules with `browser-source.mjs` and a stub map for native plugins only. | High |
| 2 | 41, 52-57 | T10 | Slices `action-message-presentation.ts` at `'/** A chat-started workflow run'` and `local-agent-stream.ts` between `'export function genuineBatchProgress('` and `'export async function readLocalAgentStream('` (both present). | Real imports. | High |
| 3 | 25, 27 | A3/D5 | Fake `getPairedVoiceBinding`, `createPairedVoice`, `pairedFactories`: hosted/paired voice (D5). When the product drops paired voice these fakes and the `pairedFactories` assertions go. | Remove with D5 product deletion. | Low |
| 4 | 83 | A1 | `voiceNoteStorage:()=>({mode:'legacy',...})` and comment "Legacy fixtures exercise batch compatibility" (42): legacy Notes storage mode (D1). | Delete with legacy Notes; scenarios use the current storage mode. | Medium |
| 5 | 47 | A8 | Tombstone comment "Issue #395 native stage bridge". | Drop. | none |
| 6 | 1-5 | C7 | Mixes `tsx` `tsImport` (4 modules) with vm transplants (14 files) in one fixture: two module systems in one realm. | One loader. | - |
| 7 | 96 | C6 | Synthetic UUID `'11111111-1111-4111-8111-111111111111'` repeated across fixtures. | Shared `ids.mjs` if kept. | none |
| 8 | 24-27 | D8 | Single 3-4 kB lines for driver/controller/box. | Reformat in the rewrite. | - |

## Proposed end state
A voice integration harness that loads `voice-adapter.ts`, `cloud-voice.ts`, `voice-selection.ts`, `voice-timing.ts`, `local-speech-playback.ts`, `note-recorder*.ts` for real (shared loader, stubs only for `@capacitor/core` `registerPlugin` and the connection controller), exposing the same steering knobs as a typed object. The 16 host tests collapse into about three integration files (voice turn lifecycle, speech playback/read-aloud, note recording) plus `journeys/voice.spec.ts`; the two `scripts/test-cloud-voice-*` move into `test/`. Then this file and its `.d.mts` are deleted.
