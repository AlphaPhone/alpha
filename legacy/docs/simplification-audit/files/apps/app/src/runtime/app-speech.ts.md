# apps/app/src/runtime/app-speech.ts
- Lines: 33 | Role: speaks reviewed app/workflow text via Cloud/Cartesia or on-device TTS, falling back to the phone when a network voice fails before audio, with retirement sequencing | Verdict: SIMPLIFY
- Importers: browser/workflow-speech.ts, maps/navigation-voice.ts, prototype/agent-adapter.ts. Text/path pins: `test/app-speech-route.test.mjs:6` strips types/imports from this file and evaluates it (T2 — any refactor breaks it); `specs/quint/native/manifest.json` symbol pins `retirement`, `speakAppText`, `confirmSpeechRetirement`; `specs/quint/refinement/native/speech-cleanup-latch.mjs`, `specs/quint/refinement/services/maps-guidance-voice.mjs`; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | D5 | `if(network||testMocksEnabled)` — test-mocks builds always try the Cloud speech path first, a dev branch inside the production speech router. | Let the test-mocks harness select the route through `speechRoute()` (voice-selection) instead of a second flag here. | Low. |
| 2 | 20 | NEW (dev background predicate) | `document.hidden||…||document.documentElement.dataset.devBackground==='true'` — the dev "simulated background" check is re-inlined in 23 places across 21 files (browser/alert-audio.ts:7, clock.ts:39, hosted-results.ts:17, location.ts:11, notice-action.ts:2, notifications.ts:21, password-provider.ts:23, review.ts:10,35, voice.ts:275, …). | One `appInForeground()` helper (dev flag folded in `build-flags.ts`), imported everywhere. | Low. |
| 3 | 23, 32 | C3 | `interrupted` promise + `Promise.race([pending, interrupted])` — another hand-rolled abort race. | Shared `raceAbort`. | Medium: `admitted` flag semantics (reject only before admission) must stay. |
| 4 | 12-33 | D8 | Whole function is statement soup (L21 has 5 statements). | Format. | Breaks the T2 test (delete it, cover via Playwright speak-replies). |
| 5 | 20 | P3 (research) | `current()` fence re-reads `connectionController.getSnapshot().open` and DOM state — one of ~50 hand-rolled fences. | Use the connection scope when it exists. | Medium. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `retirement` | module state | 8 | `confirmSpeechRetirement` in local-speech-playback.ts | keep (manifest-pinned name) |
| foreground/dev-background predicate | helper | 20 | 23 inline copies in 21 files | `lib/foreground.ts` |

## Proposed end state
~30 formatted lines: no `testMocksEnabled` branch, shared foreground predicate and abort race; `retirement` and `speakAppText` names kept for the native manifest.

## Verification
`test/app-speech-route.test.mjs` (T2; replace), `test/browser/speak-replies.spec.ts`, maps navigation voice specs, quint `speech-cleanup-latch` and `maps-guidance-voice` refinements.
