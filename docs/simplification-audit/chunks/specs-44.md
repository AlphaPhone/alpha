# Chunk specs-44: `specs/quint/refinement/services/` (credential … inbox-provider-draft-ports)

24 files, all present. Report-only; per-file reports under `files/specs/quint/refinement/services/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| credential-platform.mjs | Java port-stub writer | KEEP | fold into `credentials.mjs`; shared `writeJavaStubs` in `native/java.mjs` |
| credentials.mjs | refinement harness (real `AlphaCredentialStore` on JVM) | KEEP | add `test/quint-native-credential-mutation.test.mjs` (aggregate is its only runner) |
| current-approval-service.mjs | refinement harness (upstream `ApprovalService`) | KEEP + PORT helpers | helpers off `legacy/core/source-support.mjs` → `refinement/support.mjs`; drop `observeFile` text patch; upstream-pin lane |
| development-digest-pending-probe.mjs | probe (real imports, fs hook) | KEEP | delete legacy-phase scenarios with B297 / D1 (model too) |
| development-digest-pending.md | README | KEEP, SIMPLIFY | drop baseline commit and counts |
| development-digest-pending.mjs | runner | KEEP, SIMPLIFY | shared `runProbe`; drop hash-only sources |
| embedding-store-identity.mjs | refinement harness (upstream runtime) | KEEP | upstream-pin + `core-state-patch.ts` lane |
| embedding-store-pglite.mjs | real PGlite integration support | KEEP | — |
| fact-write-scope.mjs | refinement harness (upstream runtime + PGlite) | KEEP + PORT fixture | move fixture out of `legacy/core/check-fact-write-dedupe-refinement.mjs` |
| forward-replays.mjs | aggregate receipt wrapper | DELETE | all 14 rows duplicate per-model tests |
| gmail-agent-mailbox-recovery-probe.mjs | probe (real upstream host + Alpha cloud origin) | KEEP | alias imports later |
| gmail-agent-mailbox-recovery.md | README | KEEP, SIMPLIFY | drop counts |
| gmail-agent-mailbox-recovery.mjs | runner | KEEP, SIMPLIFY | shared `runProbe` |
| google-accounts-lifecycle.mjs | refinement harness (real Google account modules) | KEEP | merge target; add `test/quint-google-accounts.test.mjs` |
| google-accounts.mjs | refinement harness | MERGE | into `google-accounts-lifecycle.mjs` (carry the connect + matched Workspace return trace only) |
| identity-comms-traces.mjs | ITF replay library | MERGE | into `specs/quint/refinement/itf-replay.mjs` (10 importers) |
| inbox-cleanup.mjs | refinement harness (real Inbox modules) | KEEP | optional merge into `inbox-coordinator.mjs` |
| inbox-coordinator-ports.mjs | executable Inbox fixture | KEEP, SIMPLIFY | path-keyed stubs; delete dead `google-connect-flow` stub |
| inbox-coordinator.md | README | KEEP, SIMPLIFY | delete dated validation/changelog paragraphs |
| inbox-coordinator.mjs | refinement harness | KEEP, SIMPLIFY | split schedules into named functions |
| inbox-edit-coalescer-replay.mjs | Quint replay (real import) | KEEP, SIMPLIFY | delete Case3 (unit) and receipt counters |
| inbox-list-paging-ports.mjs | text transplant fixture | PORT | product exports an Inbox list/paging controller; file deleted |
| inbox-list-paging.mjs | refinement harness | PORT | import the extracted controller; delete canaries |
| inbox-provider-draft-ports.mjs | fixture extension | KEEP → MERGE | into `inbox-coordinator-ports.mjs` as an option |

Counts: KEEP 18 (incl. simplify/port-helpers), MERGE 3 (`google-accounts.mjs`, `identity-comms-traces.mjs`, `inbox-provider-draft-ports.mjs`), PORT 2, DELETE 1.

## Coverage at risk

- **NativeCredentialMutation** (`credentials.mjs`) and **GoogleAccounts** (`google-accounts*.mjs`) are run only by
  `test/quint-services-refinement.test.mjs` through `services/index.mjs`. Deleting the services aggregate (research
  §2.4, T4) without first adding per-model tests removes all their source-trace coverage.
- **InboxEditCoalescer invariant `WaitingHasDriver`** is asserted by hand only in Case3; the random walks cover it
  only if the model's step-level `heldWrite` check stays (it does, line 57). Low risk.
- **DevelopmentDigestPending legacy rows**: removing the legacy scenarios is intended (D1), not a loss, provided
  `local-agent-storage.ts:60` loses `prior.phase===undefined` in the same change.
- The forward-replays DELETE loses nothing: every model has its own `test/quint-<model>.test.mjs` (verified by grep).

## Shared helpers worth keeping

- `services/support.mjs` (`deferred`, `until`, `sourceModule`, `action`): the target for local copies in
  `inbox-cleanup.mjs`, `inbox-coordinator.mjs` and for `legacy/core/source-support.mjs` (`bundleVendorCore`,
  `observeFile`, `tick`).
- `inbox-coordinator-ports.mjs`: the one executable Inbox fixture; extend it with options rather than copying it.
- `embedding-store-pglite.mjs`: real PGlite runtime harness also used by `named-embedding-provenance.mjs`.
- `replayTraces` (from `identity-comms-traces.mjs` and its three twins) into one `refinement/itf-replay.mjs`.

## Cross-file actions

1. Create `refinement/itf-replay.mjs` from `assistant-model-traces.mjs`, `identity-comms-traces.mjs`,
   `services/maps-model-traces.mjs`, `services/inbox-workflows-model-traces.mjs`; parse `.qnt` via the Quint AST.
2. Move `bundleVendorCore`, `observeFile`, `deferred`, `tick` from `legacy/core/source-support.mjs` and the fact-write
   fixture from `legacy/core/check-fact-write-dedupe-refinement.mjs` into `refinement/`; prerequisite for retiring
   `specs/quint/legacy` (P6).
3. Add per-model tests for NativeCredentialMutation and GoogleAccounts, then delete `forward-replays.mjs` and the
   services aggregate entries.
4. Product extraction for Inbox list paging (`inbox-cloud-adapter.ts` closure → exported list controller); port
   `inbox-list-paging*.mjs`. Coordinate with the adapter/`model.js` split (D2), which also breaks
   `inbox-coordinator-ports.mjs mount()` and `inbox-coordinator.mjs` `shell.inboxAccountsChanged`.
5. One `runProbe(path,args)` for the two spawn-a-probe runners.
6. CI lanes: CoreApprovalServiceCurrent, EmbeddingStoreIdentity, FactWriteScope run on `upstream.lock.json`
   (+ `scripts/core-state-patch.ts` for embeddings); GmailAgentMailboxRecovery on upstream pin +
   `apps/app/src/runtime/cloud-protocol.ts`; Inbox harnesses on `apps/app/src/{prototype,runtime}/inbox-*`,
   `gmail-grants.ts`, `assistant-draft-controller.ts`.

## Owner questions

- `DevelopmentDigestPending`: confirm phase-less pending rows can no longer exist (B297) so the model's `legacy` phase
  and two scenarios can be deleted together with the product branch.
- Upstream-only models in this chunk (CoreApprovalServiceCurrent, EmbeddingStoreIdentity, FactWriteScope): keep in
  alphaphone on an upstream-pin lane, or move upstream (D14 follow-up)?
- May the Inbox adapter export a list/paging controller purely so its formal harness can import it (accepted as part
  of the adapter split rather than test-shaped code, D7)?
