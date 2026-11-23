# test/browser/workflow-run-context.spec.ts
- Lines: 42 | Kind: Playwright spec, chromium, 1 test; real UI over a paired local-agent bridge fake | Verdict: MERGE into `journeys/workflows.spec.ts` (run receipt → chat step)
- Covers: with an execution receipt selected, a chat message carries only `{kind:'workflow-run', id, revision}` and the "data, not an instruction" framing, never the run output; the receipt shows the final output but not intermediate step text; typed-only rows show no checkboxes. Duplicates: the pairing bridge is a copy of `workflow-open-view.spec.ts` (C5). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-34 | C5/T7 | Inline Capacitor bridge with pairing routes. | Use `harness/agent.ts` (shared with open-view). | Low. |
| 2 | 41 | ok | Privacy assertion on the outgoing message body. | Keep; high value. | None. |
| 3 | 37 | D8 | One long line of UI steps. | Split. | None. |

## Proposed end state
One step in `journeys/workflows.spec.ts`: open a finished receipt, see the output, type in chat, the posted message holds
only the run identity and the data framing. Needs `harness/agent.ts`, `harness/connection.ts`. File deleted.
