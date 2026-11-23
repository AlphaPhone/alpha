# specs/quint/native/VoiceSession.qnt
- Lines: 251 | Kind: Quint model (live; component of `ApplicationComposition` and `ControllerComposition`) | Verdict: KEEP; trim manifest sources
- Covers: voice conversation generations: explicit start/opening, cloud only after disclosure, semantic/long-gap endpoint submits once, input-close barrier before send, busy turn holds capture, streamed early speech, owner-review pause speaks nothing, mute, stop rejects late callbacks, dictation never submits. Duplicates: none at model level. Product voice journeys are in Playwright voice specs (target `journeys/voice.spec.ts`). Callers/importers: `quint:check`; `refinement/native/index.mjs:162-168` (`voiceTraces` via `refinement/native/renderer.mjs`, esbuild bundle of `apps/app/src/runtime/voice-assistant.ts`); imported by `native/ApplicationComposition.qnt` and `native/ControllerComposition.qnt` (`refinement/composition/controllers.mjs`); referenced by `application/manifest.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | – (good) | `renderer.mjs` bundles `voice-assistant.ts` with esbuild and drives `VoiceAssistantSession` with controlled ports. That is import-based and survives refactors as long as the export names stay. | Keep. | – |
| 2 | manifest `sources` | T10 | 12 sources, incl. `cloud-voice.ts`, `live-segment-stream.ts`, `voice-turn-routes.ts`, `app-speech.ts`, two Android Java files and `scripts/prepare-client-features.ts`. The harness already hashes the bundle's real input graph (`metafile.inputs`). The hand list re-runs `quint:changed` for files the replay may not even load (the Java files are never executed here). | Replace hand-listed `sources` with the two entry modules the harness imports (`voice-assistant.ts`, `native-live-voice.ts`) and drop the Java/script entries; changed-model selection can use the receipt's input graph. | Low |
| 3 | 1-251 | – | Model is the biggest in this chunk but every action is used by scenarios or composition. `start` vs `beginStart`+`captureOpened` and `submit` vs `beginSubmission`+`inputClosed` are deliberate (atomic and split variants); both are referenced by compositions' expectations, so keep. | None. | – |
| 4 | – | cross-file | `ControllerComposition` imports VoiceSession together with `services/CalendarLinkedSync` (vendor linked-sync sources). D4 deletes only the renderer linked-sync stack; check that `controllers.mjs` does not drive deleted renderer modules before the deletion lands. | Flag to the `ControllerComposition` reviewer. | Medium for that composition, none for this model. |
| 5 | – | A4 | `route: "cloud"` / `discloseCloud` models cloud voice; `cloud-voice.ts` is still in the product. Keep. | None. | – |

## Proposed end state
Model text unchanged. Manifest `sources` reduced to the imported entry modules. Replayed once per voice-lane
change by `voiceTraces` (import-based), and used as a component by the two composition models.
