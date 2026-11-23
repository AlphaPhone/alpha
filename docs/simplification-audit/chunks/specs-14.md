# Chunk specs-14: specs/quint/legacy/core (inventory, support library, task-service note)

| File | Kind | Verdict | Target |
|---|---|---|---|
| `specs/quint/legacy/core/source-inventory.json` | historical TLA/TLC + runtime-fragment hash inventory | DELETE (after prerequisites) | — |
| `specs/quint/legacy/core/source-support.mjs` | harness support library (bundle vendor core, deferred/tick, text-splice seams) | MOVE live parts, then DELETE | `specs/quint/refinement/support.mjs` |
| `specs/quint/legacy/core/task-service-refinement.md` | orphan prose for a legacy campaign | DELETE | — |

## Coverage that would be lost
None for live product behaviour. All three serve the 16 historical `legacy/Core*` translations of upstream TLA+ at
revision `4787d51a…`; current upstream has no TLA (`source-inventory.json` `currentUpstream.note`). Current
TaskService, ApprovalService and core runtime behaviour stay covered by the live `services/` harnesses
(`task-service/`, `current-approval-service.mjs`, `core-runtime/`). One sentence in `task-service-refinement.md:13`
(repeat task paused in the same write that records the failure at `maxFailures=1`) should be carried into the live
`TaskServiceLifecycle` model comment if not already there.

## Shared helpers worth keeping
- `deferred`, `tick`, `root` (source-support.mjs:12-18): move to `specs/quint/refinement/support.mjs`; replace ~20
  local `deferred` copies in refinement harnesses.
- `bundleVendorCore` (without the historical branch) and `observeFile`: needed by live
  `refinement/services/current-approval-service.mjs`.

## Cross-file actions (order matters)
1. Create `specs/quint/refinement/support.mjs` with the helpers above; repoint
   `refinement/application/{browser-deletion-poll,google-access-publication,resident-liveness}.mjs` (imports and their
   hashed-source path lists) and `refinement/services/current-approval-service.mjs`.
2. Remove `materializeHistoricalFormalSources` calls from `refinement/services/core-runtime/module.mjs:49` and
   `refinement/services/task-service/module.mjs:51` (they map nothing in normal runs; only add the inventory to the
   hash list).
3. Drop the `historicalRevision` assertion in `test/quint-core-approval-service.test.mjs:8`.
4. Delete `specs/quint/legacy/**`, `specs/quint/refinement/legacy/**`, `test/quint-tla-inventory.test.mjs`,
   `test/quint-core-*` legacy tests, the `legacy` entry in the family lists (`scripts/quint-lib.ts:43`,
   `scripts/check-quint.ts:42`, `check-quint-refinement.ts`, `check-changed-models.ts`, floors in
   `test/quint-checker.test.mjs`), and the inventory line in `scripts/prepare-quint-history.ts:8`.
5. `refinement/native/{mms,sms}-dispatch.mjs` import `materializeHistoricalSources` from
   `legacy/core/formal-source-inventory.mjs` with their own `mms-historical-sources.json`; that function must move to
   `refinement/support.mjs` too, or be deleted with those witnesses (owner question below).

## Owner questions
- Retire historical formal evidence (`specs/quint/legacy`, upstream TLA conversions) entirely? D11 says yes once live
  harnesses no longer import it; confirm no external audit relies on the 4787d51a TLA translations.
- Keep the MMS/SMS historical counterexample witnesses (`mms-historical-sources.json`)? If no, `prepare-quint-history.ts`
  and the history network fetch go away completely.
- Accept `current-approval-service.mjs` continuing to text-splice upstream `approval.ts` until upstream exposes an
  observation seam (D14 follow-up)?
