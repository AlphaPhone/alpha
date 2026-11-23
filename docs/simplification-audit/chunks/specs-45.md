# Chunk specs-45: services refinement harnesses (inbox … native-google)

19 files, all present. All reports are under `files/specs/quint/refinement/services/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `inbox-provider-drafts.md` | model doc | MERGE | header comment of `inbox-provider-drafts.mjs`; drop history sections |
| `inbox-provider-drafts.mjs` | refinement harness (real modules) | KEEP, SIMPLIFY | delete the `legacy-reference-retains-new-edits` scenario (A1); shared `deferred/until`; no direct-run block |
| `inbox-workflows-model-traces.mjs` | ITF helper | MERGE | `specs/quint/refinement/itf.mjs` |
| `inbox.mjs` | refinement harness (real `InboxOperation`) | KEEP | needs a `test/quint-inbox-delivery.test.mjs` wrapper |
| `index.mjs` | services aggregate | DELETE | after the 15 aggregate-only campaigns get wrappers; delete `forward-replays.mjs` and `test/quint-services-refinement.test.mjs` with it |
| `lifeops-scheduled-task-route.md` | model doc | MERGE | harness header (keep the occurrence-ABA counterexample) |
| `lifeops-scheduled-task-route.mjs` | refinement harness (upstream code) | KEEP | owner question: models upstream-only code (P6) |
| `maps-connection.mjs` | trace replay, **slices one product line** | PORT | export `readCloudMaps` from `apps/app/src/maps/cloud-maps.ts` |
| `maps-guidance-voice.mjs` | trace replay (real module) | KEEP, SIMPLIFY | shared loader |
| `maps-model-traces.mjs` | ITF helper | MERGE | base for `specs/quint/refinement/itf.mjs` |
| `maps-screen-source.mjs` | refinement harness + text-mutation canaries | KEEP, SIMPLIFY | delete mutant canaries (T10/T5) and double compile (B5) |
| `maps.mjs` | refinement harness (real modules) | KEEP | needs a `test/quint-maps-navigation.test.mjs` wrapper; retirement case duplicates `maps-screen-source` |
| `mms-compose-replay.mjs` | trace replay; its fixture injects code at a text marker | KEEP + PORT fixture | `test/fixtures/observed-sms-adapter.mjs` stops rewriting `sms-adapter.ts`; delete the canary |
| `mobile-bundle-admission.md` | model doc | MERGE | harness header |
| `mobile-bundle-admission.mjs` | refinement harness over build tooling | KEEP | match refusals by error `code`, not message text; replaces tests 3-6 of `test/mobile-uuid-build.test.mjs` |
| `named-embedding-provenance.mjs` | refinement harness (real runtime + PGlite) | KEEP | upstream-patch model (D14 follow-up) |
| `native-google-access-file.md` | model doc | MERGE | harness header |
| `native-google-access-file.mjs` | refinement harness (real Java + host) | KEEP; MERGE `test/native-google-agent-host-access.test.mjs` into it | widen request kinds; one Java fixture |
| `native-google-host-artifact-baseline.md` | historical note | DELETE | none |

Counts: keep 9 (including SIMPLIFY and harnesses that need a wrapper), merge or rewrite 9 (MERGE 7, PORT 1, plus `index.mjs` handled by moving its campaigns to per-model wrappers), delete 2 (`index.mjs` and the baseline note). `index.mjs` is counted under delete.

## Coverage at risk if the DELETEs happen
- Deleting `index.mjs` and the services aggregate test removes the only replay for 15 campaigns that have no per-model test: `forward-replays` (its replays do have wrappers), `browser-google-return`, `authorization`, `google-accounts`, `google-accounts-lifecycle`, `inbox` (InboxDelivery), `maps` (MapsNavigation, including the only Cloud traffic-evidence validation check), `cache`, `workflow`, `policies`, `reading`, `scan`, `credentials`, `pdf`, `calendar-linked`, `protected-app-update-promotion`. Each live one needs a 5-line `test/quint-<model>.test.mjs` first.
- Deleting the `legacy-reference-retains-new-edits` scenario loses coverage only of the legacy normaliser, which D1 deletes too.
- Deleting the canaries in `maps-screen-source`/`mms-compose-replay` loses only the tests that check the test machinery.

## Shared helpers worth keeping (consolidated)
- One `specs/quint/refinement/itf.mjs` built from `maps-model-traces.mjs` and `identity-comms-traces.mjs` (more robust `plain`/`balanced`), plus `modelWalks`/`modelScenario`/`actionCounter` from `inbox-workflows-model-traces.mjs`, replacing the `assistant-model-traces.mjs` twin too. Watch the `plain` variants: set ordering and `Map` vs object differ per caller.
- One `sourceModule(path, {replace, external, define, fresh})` replacing the private esbuild loaders in `maps-connection`, `maps-guidance-voice`, `maps-screen-source`, `native-google-access-file`, `support.mjs` and `inbox-workflows-model-traces`. It should fail on a stub key that nothing used.
- `services/support.mjs` (`deferred`, `until`, `action`, `casStore`) stays; `inbox-provider-drafts` should use it.

## Cross-file actions
1. Product: export `readCloudMaps` from `apps/app/src/maps/cloud-maps.ts` (maps-connection port).
2. Product: SMS adapter exposes a read-only draft snapshot, so `test/fixtures/observed-sms-adapter.mjs` stops inserting code at `' const sync=()=>{'` (also used by `sms-send-replay.mjs`).
3. Product: `scripts/mobile-uuid-adapter.ts` refusals get `error.code` values.
4. Product: delete the Inbox retained-draft normaliser for old `messageId`-bearing provider references (D1).
5. Tests: delete `test/native-google-agent-host-access.test.mjs` and `test/fixtures/GoogleAgentAccessFileTest.java` after the replay covers every write kind. Delete tests 3-6 of `test/mobile-uuid-build.test.mjs`. Delete wrapper test 1 of `test/quint-lifeops-scheduled-task-route.test.mjs`, the two canary tests in `test/quint-maps-screen-source.test.mjs`, and the source-slicing second test in `test/quint-inbox-provider-drafts.test.mjs`. That wrapper should import in-process instead of spawning a child process.
6. `check-traces.mjs` / `observed-replay.mjs`: drop the input hashing (`captureInputs`, `driverHashes`, `driverInputsBound`) and the assumptions/obligations prose. Every harness here then loses 5–20 lines.
7. `scripts/check-quint-refinement.ts`: drop the `services` family runner, or point it at the per-model tests. `browser-google-return.mjs:16` stops hashing `index.mjs`.

## Owner questions
- Upstream-only models (`LifeOpsScheduledTaskRoute`, `NamedEmbeddingProvenance`): keep them here or move them upstream? The LifeOps harness records a real upstream defect (an older held dispatch can overwrite a newer occurrence) that should be filed upstream.
- `calendar-linked.mjs` (CalendarSync) drives the client linked-sync stack that D4 deletes. Delete the model with it?
