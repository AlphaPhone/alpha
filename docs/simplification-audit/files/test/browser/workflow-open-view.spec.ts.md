# test/browser/workflow-open-view.spec.ts
- Lines: 125 | Kind: Playwright spec, chromium, 3 tests (mode loop); real UI over a paired local-agent fake at the native bridge | Verdict: MERGE into `journeys/chat.spec.ts` (device-action approval section)
- Covers: an agent-proposed `open_view: workflows` device action opens Workflows only after approve → claim, journals reserve/markApplying/finish, uploads one receipt (Verify in diagnostics does not re-upload); wrong-owner and expired proposals show no review. Duplicates: the pairing fixture (auth/status, pair, me, agents, register) is copied in `workflow-run-context.spec.ts` (C5). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-78 | C5/T7 | 70-line hand-written Capacitor bridge (connection, journal, agent HTTP). | Move to `harness/agent.ts` (paired local agent with proposals) and reuse in run-context. | Medium. |
| 2 | 98 | ok | Tap "open view" proposal card, then Workflows appears. Real journey. | Keep. | None. |
| 3 | 104 | T8 | Accepts receipts 0 or 1 because of a race. | Keep the explicit Verify step that makes it deterministic; drop the tolerance comment. | Low. |
| 4 | 7 | T4 | wrong-owner and expired run the full pairing twice for one assertion. | One loop step after a single pairing (re-register a new proposal). | None. |
| 5 | 82-87 | ok | Pairing through Settings diagnostics. | Use `harness/connection.ts`. | None. |

## Proposed end state
Approval section of `journeys/chat.spec.ts`: send a message, agent proposes open-view, approve, Workflows opens, journal
three phases, Verify uploads one receipt; refused proposals render no review. Needs `harness/agent.ts`. File deleted.
