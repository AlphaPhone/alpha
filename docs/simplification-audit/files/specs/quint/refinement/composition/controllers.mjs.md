# specs/quint/refinement/composition/controllers.mjs
- Lines: 118 | Kind: Quint refinement harness (browser, Vite + Chromium, real renderer modules) | Verdict: DELETE (models the deleted client Calendar linked-sync stack); carry the three voice schedules into `composition/index.mjs` or `journeys/voice.spec.ts`
- Covers: nine ControllerComposition schedules through the real `connectionController`, `calendarSyncHost`, `saveGoogleCalendarSelection` and `VoiceAssistantSession` (account replacement while a Calendar write is in flight; voice retirement on sign-in/visibility). Duplicates: identity part overlaps `composition/index.mjs` identity campaign. Callers: `composition/index.mjs:1,142` only; run by `test/quint-composition-refinement.test.mjs` (asserts 9 traces/44 checkpoints) and `browser.yml` production job (`quint:refinement --families=composition`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, entry via `ports.mjs:57-59` | A2 / D4 | The virtual entry imports `/src/runtime/calendar-sync-host.ts` and `/src/runtime/google-calendar-selection.ts`; both are deleted in this worktree (`git status`: `D apps/app/src/runtime/calendar-sync-host.ts`, `D .../google-calendar-selection.ts`). The campaign cannot load. Six of nine schedules (`calendar-success`, `replacement-after-dispatch`, `stale-calendar-review`, `cancelled-sign-in`, `sign-out-after-dispatch`, `hidden-after-dispatch`) exist only for that stack. | Delete the file, `ports.mjs`, and the `ControllerComposition` model entry (`specs/quint/native/manifest.json:1338`, `ControllerComposition.qnt`), per D20: a model of deleted code is not live. | Medium: `ControllerComposition.qnt` imports `services/CalendarLinkedSync`; check that model's other importers before deleting it. |
| 2 | 45-66 | coverage | `voice-open-signin`, `voice-pending-replacement`, `voice-hidden` check real `VoiceAssistantSession` retirement when identity controls open, an account is replaced mid-request, or the document hides. No other test drives these through the real controller. | Move them into the identity campaign in `composition/index.mjs` against `ApplicationComposition` (which imports `VoiceSession`) if its action names fit; otherwise as `journeys/voice.spec.ts` cases ("opening sign-in retires voice", "hidden page retires voice"). | Medium |
| 3 | 18-19 | B5 | Hashes every renderer source (`sourcePaths()`) into the receipt. | Gone with the file. | — |
| 4 | 43, 209 | D8 | 1,000-character lines. | Gone with the file. | — |

## Proposed end state
File deleted with `ports.mjs` and the ControllerComposition model/manifest entry.
`runCompositionRefinement` returns only the ApplicationComposition receipt; `test/quint-composition-refinement.test.mjs` asserts one receipt.
Voice-retirement schedules survive in the ApplicationComposition campaign or the voice journey.
