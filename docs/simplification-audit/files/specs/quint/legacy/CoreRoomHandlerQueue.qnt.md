# specs/quint/legacy/CoreRoomHandlerQueue.qnt
- Lines: 193 | Kind: Quint model, upstream TLA+ conversion (`upstream-design-conversion`, revision 4787d51a) with a trace-refinement harness | Verdict: MOVE to services family (KEEP model)
- Covers: upstream RoomHandlerQueue: per-room mutual exclusion, ordered acquisition, bounded queue, no admission after close, writes under lease; bounded and cycle configurations; 4 runs. Duplicates: partial: `services/CoreRuntimeShutdown` lists room-handler-queue.ts among its sources. Callers/importers: `legacy/manifest.json`, `legacy/core/source-inventory.json` (packages/core/tla/RoomHandlerQueue.tla (the only Core model also naming a pinned shared source)), `legacy/core/check-room-handler-queue-refinement.mjs` (imports `coreStatePatch`/`ROOM_QUEUE_TARGET` from `scripts/core-state-patch.ts` and bundles the patched `room-handler-queue.ts`), `test/quint-room-handler-queue.test.mjs`, `refinement/legacy/index.mjs` (aggregate, `test/quint-legacy-campaign-report.test.mjs`), `test/quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | P6 / D11 | Lives in the `legacy` family that D11 retires, and its inventory entry is what forces `scripts/prepare-quint-history.ts` to `git fetch` upstream revision 4787d51a on every verify. | See verdict. | — |
| 2 | — | — | Refines the product's patched copy of the upstream queue (ROOM_QUEUE_TARGET). Live product code. | Keep; relocate. | High if deleted |

## Proposed end state
Move to `specs/quint/services/CoreRoomHandlerQueue.qnt` with its manifest entry (drop `upstreamSources`/historical inventory fields; keep `sources` as the current vendor paths the harness bundles). Move its harness from `legacy/core/` to `refinement/services/core-upstream/` and import `deferred`/`tick` from `refinement/support.mjs`. Run it only when `upstream.lock.json`, `scripts/core-state-patch.ts`, `scripts/upstream-core-sources.ts` or the model/harness change (research §2.9). 
