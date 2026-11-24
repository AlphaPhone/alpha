# test/quint-composer-send.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (calls `runComposerSendReplay` from `specs/quint/refinement/application/composer-send.mjs`; driver strips/slices `prototype/agent-adapter.ts` into `vm`, imports `alpha-client.ts` and the upstream draft controller) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: the chat shell send path (typing, send, transport refusal/failure, streaming, cancel, session switch) follows 73 ComposerSend traces. Duplicates: none (the driver is not in any family index, so this file is the only execution). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-14 | T4 (none) | Only execution of this model: `composer-send.mjs` is not imported by any family index. | Register `runComposerSendReplay` in the application index; delete the wrapper. | Low |
| 2 | 10-13 | B5 | Exact trace count (73), checkpoint floor and per-action counters. | Drop; keep the action-coverage check inside the driver if wanted. | None |
| 3 | — | T10 | Driver slices the send method out of `agent-adapter.ts` (C1 removes ~400 lines of that file). | PORT: export the send step from the agent-adapter split (`views/chat/send.ts`) and import it. | High (breaks with C1) |

## Proposed end state
Deleted. The application index lists `ComposerSend`; the harness imports an exported send function instead of slicing `agent-adapter.ts`.
