# specs/quint/refinement/composition/ports.mjs
- Lines: 91 | Kind: Quint harness fixture (synthetic AlphaCalendar native plugin + Cloud Calendar API + virtual browser entry) | Verdict: DELETE (with `controllers.mjs`)
- Covers: closed ports for the client Calendar linked-sync stack and the `compositionEntry` module text that wires `calendarSyncHost`, `saveGoogleCalendarSelection` and `VoiceAssistantSession` for ControllerComposition. Duplicates: Cloud account stub overlaps `test/browser/resident-stub.ts`. Importers: `composition/controllers.mjs:10` only (grep: no other reference).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 57-59 | A2 / D4 | `compositionEntry` imports `/src/runtime/calendar-sync-host.ts` and `/src/runtime/google-calendar-selection.ts`, deleted in this worktree. | Delete the file. | Low |
| 2 | 9-33 | T6 | Monkey-patches `Capacitor.PluginHeaders` / `Capacitor.nativePromise` to fake `AlphaCalendar.sync` and the Cloud `/calendar/sync-v1/` API. | Gone with the file. | — |
| 3 | 70-80 | coverage | `startVoice`/`recheckVoice`/`snapshot` voice wiring is the only reusable part. | If voice schedules move to `composition/index.mjs`, copy just these ~12 lines into that entry. | Low |

## Proposed end state
Deleted. Any voice wiring kept lives inline in the ApplicationComposition entry in `composition/index.mjs`.
