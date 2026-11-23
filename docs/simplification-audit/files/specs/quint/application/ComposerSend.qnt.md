# specs/quint/application/ComposerSend.qnt
- Lines: 160 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Chat send attempts: composer hold, dispatch decision, bounded wait, restore-or-keep after failure, typing indicator ownership across session changes. Duplicates: Playwright chat journeys cover visible send/restore. Callers/importers: `specs/quint/refinement/application/composer-send.mjs`, `test/quint-composer-send.test.mjs` (not in index.mjs); 12 manifest symbol pins in agent-adapter.ts, maps-chat-adapter.ts, calendar-approval-adapter.ts.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 32-40 | T2/T10 | Research item #10: slices `agent-adapter.ts` with six `between()` anchors (`function createdFromSlot(`, `  p.send = async function`, `this.connectionUnsubscribe = …`, `    // Canonical is the default;` …), strips types, runs in `vm`; also strips upstream durable-draft-controller.ts. | Extract SendAttempt / sendAttempt / dispatch decision into `prototype/chat/send-attempt.ts` during the agent-adapter split; import it. | Largest text-anchored harness; blocks D1 split and Prettier. |
| 2 | manifest symbols | T10 | 12 symbol pins incl. `installMapsChatAdapter`, `installCalendarApprovalAdapter`. | Delete pins. | None. |

## Proposed end state
Model unchanged; harness imports the extracted send-attempt module; no pins.
