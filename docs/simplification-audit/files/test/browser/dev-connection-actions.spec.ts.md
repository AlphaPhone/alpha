# test/browser/dev-connection-actions.spec.ts
- Lines: 171 (14 call sites, about 24 tests after loops) | Kind: Playwright `chromium`, dev build; UI chat review cards plus 34 `/src` imports, IDB `put` patches, `BrowserDaily.prototype` surgery, `navigator.locks` barriers | Verdict: **REWRITE** as 4 cases in `journeys/chat.spec.ts` ("agent action approval")
- Covers: the development agent's queued device actions: proposal → chat review card → explicit approval → executes once with a journal receipt that survives reload; rejection; Files move/trash bound to the exact reviewed object; two tabs cannot execute twice; journal write failure never dispatches; Clock handoffs (set/show/dismiss/snooze); reminder completion and creation with recovery after lost responses. Duplicates: Clock handoffs overlap `agent-clock-handoff.spec.ts` and `journey-core-loops.production.spec.ts`; the "executes once" rule is AP-04 "no duplicate effects", whose product path is the resident agent. Callers/importers: `chromium` project; imports `helpers/connection-diagnostics.ts`, `helpers/legacy-notes.ts`, `calendar-draft-readiness.ts` (`guardCalendarFixture`), `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 9, 83 | A1 | `setup()` and the two-tab test open Notes through `openLegacyNotes` (retained legacy Notes source, D1). | Use the current Notes source. | Breaks when D1 lands. |
| 2 | 21 | T6 | `state()` reads `development-execution-document.ts` in-page for every assertion. | Assert on card state ("completed", "Review unavailable") and the created note. | Low |
| 3 | 22-24 | — | Core journey: queue, review in chat, approve once, note created once, reload shows completed. | Carry. | none |
| 4 | 25-59 | P2 | Files review binding: seeds files through `AlphaFiles` plugin calls and swaps the file behind the review. | Carry the "changed move" arm only, seeding through the Files UI; drop the other two arms. | Low |
| 5 | 60-71 | — | Rejection persists without executing; review becomes unavailable. | Carry 63-71 (UI); drop 60-62 (panel-only). | none |
| 6 | 72-74, 78-80, 110-112, 130-135 | P3, T6 | Invalid JSON, IDB `put` patch on journal writes, `navigator.locks` hold before Home, terminal-journal failure recovery. | Delete. | Medium: "journal write failure never dispatches" and "recovery after a failed terminal write does not repeat the effect" lose browser coverage (dev executor only). |
| 7 | 75-77 | D5 | Reads `connectionController.getPairedVoiceBinding()` (paired voice, C4). | Delete. | none |
| 8 | 81-109 | — | Two tabs click the same review while a lock holds the claim; exactly one execution. | Carry (the one AP-04 duplicate-effect case worth an e2e). Move the lock barrier to the shared `holdDocument` helper. | Low |
| 9 | 114-128 | T4 | Four Clock handoff arms seed a ringing alarm via `reminderDocument.edit`. | Delete; covered by `agent-clock-handoff.spec.ts` and the production journey. | Low |
| 10 | 137-155 | A1 | "agent legacy reminder refuses unsupported no-alert intent" and `timingVersion` checks exercise the legacy reminder request shape. | Delete with the legacy reminder path. | none |
| 11 | 157-171 | P3, A1 | Reminder creation loop patches `BrowserDaily.prototype.operateReminder`/`surfaceInfo`; the `old-native` arm models an old native surface. | Delete. | Medium: lost-response recovery without duplicate reminders (dev executor only). |
| 12 | 1, 8 | P2 | Navigation through `openConnectionDiagnostics` and `connectionController.open()` (line 66). | Use the harness route to Agent connection. | none |

## Proposed end state
Four cases in `journeys/chat.spec.ts`, on whichever agent the harness provides (resident stub once Q-DEV-1 decides the development action queue's fate): approve once and see the receipt after reload; decline makes the card unavailable; a file changed after review is not moved; two tabs approving the same proposal execute it once. Everything else is deleted. If the owner deletes the development action queue (Q-DEV-1), rewrite the same four cases against `helpers/resident-agent-plugin.ts`.
