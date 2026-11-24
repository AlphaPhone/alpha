# test/device-record-presentation.test.mjs
- Lines: 20 | Kind: unit (real pure `presentDeviceRecordOperation`) | Verdict: MERGE into `journeys/chat.spec.ts` (agent delete review card) or DELETE
- Covers: the review-card copy for agent-proposed Calendar delete and Notes move-to-Trash, and that it never says "cannot be undone". Duplicates: the same strings appear in Playwright assistant specs (`dev-calendar-assistant.spec.ts`, `reminder-v2-assistant.spec.ts` assert other operation cards). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-20 | T3 | Asserts exact copy strings of a pure formatter; a copy edit means editing the test. The user-visible point (the review card tells the truth about Undo) belongs in the journey where the card is shown. | Add one assertion to the chat/assistant journey that proposes a note delete and checks the card text; delete this file. | Low. |

## Proposed end state
Deleted; one "agent delete proposal shows Undo-truthful card" assertion in `journeys/chat.spec.ts`.
