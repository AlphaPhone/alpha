# specs/quint/legacy/core/README.md
- Lines: 197 | Kind: formal-spec documentation (historical) | Verdict: DELETE (with `specs/quint/legacy/core/**`)
- Covers: documents the 16 upstream TLA+ to Quint conversions at historical upstream `4787d51a…`, the `check-configurations.mjs` runner and nine source-trace campaigns. Duplicates: per-campaign `.md` files in the same folder (`task-service-refinement.md`, `plugin-lifecycle-refinement.md`, …) and `specs/quint/refinement/services/core-runtime/connector-custody.md`. Callers/importers: none (docs only; `git grep "legacy/core/README"` finds no reference outside the audit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-30 | P6, B5 | Describes a historical-evidence regime (Git-object provenance, before/after input hashing, receipts) for models of upstream code at a superseded revision; it states itself that the evidence "does not qualify the current application source". | Delete with the tree. | None: documentation. |
| 2 | 17-24, 52-58 | A7 | Documents `check-configurations.mjs` and `check-interactive-task-refinement.mjs`, which nothing in package.json, CI or tests runs. | Delete with those scripts. | None. |
| 3 | 162-178 | — | The only prose that explains a product-side change: the authenticated `scripts/core-state-patch.ts` fix to upstream `RoomHandlerQueue` (reentrant `enqueued` listener could over-admit). | Carry two or three sentences into the doc next to the ported room-queue harness (see `check-room-handler-queue-refinement.mjs.md`). | Low: loses rationale if dropped. |
| 4 | 64-160 | A8 | Long per-campaign narrative (checkpoint counts, "authenticated", "pinned") duplicating what the tests assert numerically. | Delete. | None. |

## Proposed end state
Gone. The room-queue patch rationale moves to `specs/quint/refinement/services/core-runtime/room-handler-queue.md` (or a comment in `scripts/core-state-patch.ts`). Connector-custody history stays only in `connector-custody.md`.
