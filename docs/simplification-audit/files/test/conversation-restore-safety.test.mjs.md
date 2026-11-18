# test/conversation-restore-safety.test.mjs
- Lines: 86 | Kind: transplant (three slices of `connection-ui.tsx`: `createSelectedConversation`, `restoreConversationHistory`, `restoreSavedHistory`; plus `RESTORED_FAILURES`/`restoredMessages`/`calendarRefusalKept` in test 7) | Verdict: DELETE (carry three cases)
- Covers: automatic restore awaits the second selection read; a newer manual choice during lookup prevents fallback creation; failed compare-and-set does not publish; empty fallback clears visible history; quiet routine restore; failed restart-selection save is reported; restored failure rows use Alpha copy. Duplicates: `connection-recovery-state.test.mjs:69-91` (restored rows), `test/browser/conversation-selection-storage.spec.ts`, `agent-conversation-migration.spec.ts` (selection persistence). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | T9 | `ALPHA_RESTORE_SOURCE` knob nothing sets. | Delete. | Low |
| 2 | 9-13, 72 | T2 | Marker slices; `vm.runInNewContext` with ~20 fakes. | Delete. | Low |
| 3 | 17 | A3 | Fixture's active connection is `kind:'remote'` (paired). | Moot after deletion. | Low |
| 4 | 36-50 | — | Selection compare-and-set during restore: newer manual choice wins, failed CAS publishes nothing, empty fallback creates exactly one conversation. Only host coverage of this race. | Integration cases in `test/integration/connection-cloud.test.ts` once restore lives in an importable conversation module (it already depends on the real `conversation-selection.ts`, which can be used unfaked). | Medium |
| 5 | 68-86 | T4 | Restored failure copy: also in `connection-recovery-state`; also visible in `journeys/chat.spec.ts` after reload. | Keep one case only, in the chat journey (reload a conversation with a failed reply). | Low |

## Proposed end state
File deleted. Row 4 becomes three integration cases after the stage-F extraction of conversation restore; row 5 becomes a
chat-journey reload step.
