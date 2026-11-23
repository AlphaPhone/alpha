# specs/quint/services/InboxDelivery.qnt
- Lines: 136 | Kind: Quint model, live (services manifest); component of `InboxCoordinator` (via `RetainedInboxOperation`) and imported by `native/ApplicationComposition.qnt:107` | Verdict: KEEP
- Covers: one selected-account Inbox operation: intent persisted before a single dispatch, unknown outcome never re-arms, cache visible only under the current read grant, cleanup only after a confirmed success, restored grants need a fresh review (8 runs, 6 invariants). Duplicates: none (the coordinator composes it). Callers/importers: manifest; `InboxCoordinator.qnt`, `InboxProviderDrafts.qnt` (indirect), `native/ApplicationComposition.qnt`; `refinement/services/inbox.mjs` (imports the real `InboxOperation` from `apps/app/src/runtime/inbox-operation.ts`), aggregate `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 52-56 | A8 | `confirm` is labelled "Compatibility macro" but it is the action `inbox.mjs:44-47` records for `op.confirm()`; it is current, not compatibility. | Reword the comment ("single-step reserve+persist as observed by callers that see only the committed result"). | None |
| 2 | harness | — | Only runner is the aggregate `services/index.mjs` (no per-model wrapper). | Keep in the single services runner. | — |

## Proposed end state
Unchanged model with an accurate comment; harness imports `InboxOperation` directly. Path filter: `apps/app/src/runtime/inbox-operation.ts`, `inbox-attachment.ts`, `inbox-local-store.ts`, `inbox-unsaved-record.ts`, `gmail-grants.ts`, `reviewed-mail-context.ts`, model + harness (and the compositions that import it).
