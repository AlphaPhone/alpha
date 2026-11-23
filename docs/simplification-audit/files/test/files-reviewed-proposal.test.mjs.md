# test/files-reviewed-proposal.test.mjs
- Lines: 52 | Kind: unit (real import of `apps/app/src/runtime/device-actions.ts` `DeviceActions` with a scripted `request` function, an in-memory journal and a fake dispatcher) | Verdict: MERGE into `test/integration/device-actions.test.ts` (the agent-action area integration file; research calls the Files part `camera-photos-files-scan`)
- Covers: a reviewed Files move binds the identity token read at first review, refresh cannot rebind it, the journal records that token, and an unbound proposal cannot be approved or journaled. Duplicates: none (only importer of `setFilesReviewIdentity` besides `agent-adapter.ts`). Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-30 | T3 | Request, journal and dispatcher are stubs; but they stand in for the network and native boundaries, and `DeviceActions` itself runs unchanged. This is the only coverage of the FixIdentity rule on the renderer side. | Keep the two cases; build them on the shared device-action fixture (one scripted proposal server and journal) used by the other device-action cases instead of a private fixture. | Medium if deleted (an owner-reviewed move could act on a replaced file) |
| 2 | 5 | D3 | `setFilesReviewIdentity` is a module-level setter (global hook) rather than a constructor port. | Product follow-up: pass the identity reader to `DeviceActions`; the test then injects it. | Low |
| 3 | 33-34 | test design | The global setter is not reset between cases. | Reset in `afterEach` once merged. | Low |

## Proposed end state
Two cases ("refresh keeps the reviewed token", "unbound proposal is refused before the journal") in the device-actions
integration file, sharing its proposal-server/journal fixture. Optionally a journey case in `journeys/files.spec.ts`
where the file is renamed between review and approval and the approval is refused.
