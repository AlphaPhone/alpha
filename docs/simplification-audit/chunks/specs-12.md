# Chunk specs-12: `specs/quint/legacy/core` (README and 13 harnesses)

All 14 files were read in full. Reports are in `files/specs/quint/legacy/core/`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `README.md` | historical formal documentation | DELETE | Two or three sentences on the RoomHandlerQueue patch move next to the ported harness |
| `check-action-settlement-refinement.mjs` | legacy refinement harness: upstream-only code, two text seams | DELETE | – |
| `check-approval-service-refinement.mjs` | legacy harness: runs a historical upstream fragment | DELETE | twin `services/CoreApprovalServiceCurrent.qnt` stays |
| `check-configurations.mjs` | standalone historical TLC runner with no caller | DELETE | (+ `interaction-metadata.json`, `lifecycle-metadata.json`) |
| `check-embedding-sql-refinement.mjs` | legacy harness: historical fragments in PGlite | DELETE | covered by `refinement/services/named-embedding-provenance.mjs` |
| `check-fact-write-dedupe-refinement.mjs` | legacy harness whose fixture a live harness imports | MERGE fixture, DELETE rest | `specs/quint/refinement/services/fact-write-scope.mjs` |
| `check-interaction-session-refinement.mjs` | legacy harness: upstream-only, real SQLite | DELETE | upstream follow-up |
| `check-interactive-task-refinement.mjs` | standalone script with no caller | DELETE | – |
| `check-interactive-task-traces.mjs` | legacy harness: upstream pure reducer | DELETE | – |
| `check-plugin-connector-custody.mjs` | driver for the LIVE `services/CoreConnectorCustody` model | MERGE | `specs/quint/refinement/services/core-runtime/connector-custody.mjs` |
| `check-plugin-lifecycle-refinement.mjs` | legacy harness: real runtime | DELETE | overlaps connector-custody and `core-runtime/shutdown.mjs` |
| `check-provider-execution-refinement.mjs` | legacy harness: upstream-only | DELETE | – |
| `check-room-handler-queue-refinement.mjs` | legacy harness of PRODUCT-PATCHED upstream code, eight text seams | PORT | `specs/quint/services/RoomHandlerQueue.qnt` + `refinement/services/core-runtime/room-handler-queue.mjs` |
| `check-runtime-lifecycle-refinement.mjs` | legacy harness: real runtime | DELETE | overlaps `core-runtime/shutdown.mjs` |

Counts: 11 DELETE (README included), 2 MERGE, 1 PORT, 0 KEEP.

## Key finding: three files cover code the product ships, not history

`scripts/core-state-patch.ts` patches upstream at build time (`CORE_STATE_TARGETS`), and `scripts/build-mobile-agent.ts`
ships the result in the on-device agent. Three of the patched targets are exercised only through this folder:

- `PLUGIN_CONNECTOR_TARGET` (`packages/core/src/plugin-lifecycle.ts`): `check-plugin-connector-custody.mjs` drives the
  live `CoreConnectorCustody` model through `refinement/services/core-runtime/connector-custody.mjs`. Move it; do not
  delete it.
- `ROOM_QUEUE_TARGET` (`packages/core/src/runtime/room-handler-queue.ts`): `check-room-handler-queue-refinement.mjs` is
  the only model of the reentrant-admission fix. Port it into the services family.
- `EMBEDDING_STATE_TARGET` and the named-embedding targets are already covered by the live
  `named-embedding-provenance.mjs`. The legacy embedding harness runs historical code and can go.

The other harnesses run upstream code the product ships unchanged, or historical upstream fragments materialised from Git
objects. Both fall under research §2.9/§2.10 and DECISIONS D11/D14.

## Behaviours that lose all coverage in this repo if the DELETEs happen

All of the following are upstream-owned. None is product code, so per AGENTS.md they belong upstream:
- Action-handler callback buffering and late-delivery ordering (`settleActionHandler`).
- ApprovalService selector/timeout/cancel/stop settlement as a model (the current twin model stays, but it has no source
  harness here).
- Message interaction-session leases, commitments, reconciliation and SQLite reopen.
- The InteractiveTask reducer fences (upstream has its own conformance tests).
- ProviderStateComposer single-flight cancellation.
- Joined plugin registration with init-failure rollback.
- Failed core initialization releasing eager service waiters.
- Possibly "a queued waiter enters with an aborted signal after strict stop". Before deleting
  `check-runtime-lifecycle-refinement.mjs`, check `core-runtime/shutdown.mjs` and add that one schedule if it is missing.

## Shared helpers worth keeping

- From `source-support.mjs` (another chunk owns it, but this chunk's PORT needs it): `bundleVendorCore`, `deferred` and
  `tick` move to `specs/quint/refinement/support.mjs`. `observeFile` moves only while the room-queue port still needs seams.
- From `check-fact-write-dedupe-refinement.mjs`: `fixture`, `reach`, `evidence`, `text` and `gate` move with the
  FactWriteScope harness.
- `denyFetch` appears 3 times and `flush`/`tick`/`turn` 4 times. Put one of each in `refinement/support.mjs`.

## Cross-file actions

1. Move the connector-custody driver and the fact-write fixture out of `legacy/core` first. Live services harnesses
   import them, and a live harness hashes the fact-write file as `fixtureSource`.
2. Port the room-queue harness and model to `services/` (`services/manifest.json`), and repoint
   `test/quint-room-handler-queue.test.mjs`.
3. Remove these rows from `specs/quint/refinement/legacy/index.mjs` (or delete the whole legacy index with the other
   legacy chunks): CoreActionSettlement, CoreApprovalService, CoreEmbeddingDimension, CoreFactWriteDedupe,
   CoreInteractiveTask, CoreInteractionSession, CorePluginLifecycle, CoreProviderExecution, CoreRoomHandlerQueue and
   CoreRuntimeLifecycle.
4. Delete these tests: `test/quint-core-approval-service.test.mjs`, `quint-core-interaction-session.test.mjs`,
   `quint-core-interactive-task-traces.test.mjs`, `quint-core-plugin-lifecycle-refinement.test.mjs`,
   `quint-core-runtime-lifecycle-refinement.test.mjs`, `quint-embedding-sql-refinement.test.mjs`,
   `quint-fact-write-dedupe-refinement.test.mjs` and `quint-provider-execution-refinement.test.mjs`.
5. Delete these `.qnt` models and their `legacy/manifest.json` entries: `legacy/CoreActionSettlement`,
   `CoreApprovalService`, `CoreEmbeddingDimension`, `CoreFactWriteDedupe`, `CoreInteractionSession`,
   `CoreInteractiveTask`, `CorePluginLifecycle`, `CoreProviderExecution` and `CoreRuntimeLifecycle`. Lower or remove the
   legacy floor in `test/quint-checker.test.mjs:32`.
6. Delete the prose files `interactive-task-source-traces.md`, `plugin-lifecycle-refinement.md`,
   `plugin-connector-custody-baseline.md` and `fact-write-dedupe-refinement.md`. These belong to the sibling chunk; this
   is a reminder only.
7. `refinement/services/core-runtime/module.mjs:9` and `task-service/module.mjs:10` import
   `legacy/core/formal-source-inventory.mjs`. That file must move or be removed before the folder can go (sibling chunk).

## Owner questions

- Should the upstream-only harnesses (action settlement, interaction session, provider execution, plugin registration
  rollback) be offered upstream (D14), or dropped?
- The room-queue port needs grant/release/writer-tail observations, which the public event stream does not emit. There
  are three options: add `granted`/`released` events to the product's `core-state-patch` (a product change), add them
  upstream, or coarsen the model to checkpoint observations.
- Does the shipped product actually use message interaction sessions (`SqliteMessageInteractionSessionStore`)? If it
  does, the owner may want a live services model of the current source rather than none.
