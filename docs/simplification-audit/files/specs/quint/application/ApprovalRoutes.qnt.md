# specs/quint/application/ApprovalRoutes.qnt
- Lines: 90 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP (model-only); consider MERGE with `AssistantConversation`
- Covers: An action card is executed at most once across the live (AlphaClient proposal) and recovered (refetch pending actions) routes, a completed card is inert, and a stale live card after a context change sends nothing. Models: `apps/app/src/prototype/agent-adapter.ts` (`cardAct`, `recoverPendingActions`, `pendingActionApproval`), `runtime/alpha-client.ts` (`approve`, `consumed`, `keepConsumed`), `connection-ui.tsx` (`approvePendingAction`) — exist; symbols present. Duplicates: `AssistantConversation` models the consumed set / one-dispatch-per-session part of the same flow. Callers/importers: manifest (6 tests, 5 witnesses, 11 symbol pins); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes. No harness, no test wrapper.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-48 | C5 / T4 | Consumed-set and reattach semantics are modelled twice (here and `AssistantConversation.attach/detach`), with no shared definitions. | Owner choice: merge into one `AssistantApproval` model with both routes, or keep both and import shared definitions. Not required for 100 % passing. | Low |
| 2 | manifest | T10 | 11 symbol-name pins incl. generic names (`approve`, `consumed`, `disconnect`). | Pin files only. | Low |

## Proposed end state
Unchanged model (or merged with AssistantConversation); manifest pins files, not names.
