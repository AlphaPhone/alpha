# Chunk specs-42: `specs/quint/refinement/observed-replay.mjs` and `specs/quint/refinement/services/` (A–C, Java drivers)

23 files assigned, 22 present. `calendar.mjs` was already deleted in this worktree (stage A1).

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| `refinement/observed-replay.mjs` | harness library (forward-replay receipts) | KEEP, SIMPLIFY | Remove the per-receipt `git ls-files` hashing of the whole repo and the before/after hash ceremony (B5). About 50 lines remain. |
| `services/NativeGoogleAccessFileTraces.java` | JVM driver, real `GoogleAgentAccessFile` | KEEP | — |
| `services/README.md` | narrative doc | DELETE | Stale counts, false `CalendarSync` row. Fold the run command into `specs/quint/README.md`. |
| `services/ServiceCredentialTraces.java` | JVM driver, real `AlphaCredentialStore` | KEEP | Reformat (D8). |
| `services/ServicePdfTraces.java` | JVM driver, real `IsolatedPdfService` | KEEP | Reflection on `busy`/`endpoint`. |
| `services/ServicePolicies.java` | JVM driver, upstream auth and browser-surface helpers | KEEP | Owner question: move `sites()`/`downloads()` upstream. Use `AlphaCloudSignInPlugin.REGISTRATION`. |
| `services/SignInCoordinatorTraces.java` | JVM driver, real Alpha and patched upstream sign-in plugin | KEEP, SIMPLIFY | Scenario table; about 25 reflective private-field reads (T10). One JVM for all scenarios. |
| `services/SignInTestPorts.java` | JVM fixture (HTTPS and storage ports) | KEEP | — |
| `services/android-browser-module-stage.mjs` | harness, imports real stager scripts | KEEP | Match error codes, not message regexes. Build-tool model (owner question). |
| `services/android-build-input-readiness.mjs` | harness, imports real preflight | KEEP, SIMPLIFY | Problem kinds, not message regexes. Shared `git` helper. |
| `services/android-gzip-asset-stage.mjs` | harness, imports real gzip script | KEEP, SIMPLIFY | Inject a remove port instead of patching global `fs.rmSync`. |
| `services/app-update-candidate.mjs` | harness, imports real `main` | KEEP, SIMPLIFY | Remove `resident-android.yml` from receipt and manifest sources. Trim host-test duplicates. |
| `services/approval-decision-replay.mjs` | forward replay over a transplanted workflow adapter | PORT | Import `installWorkflowAdapter` with injected ports; drop dead `t`/`canaries` params. |
| `services/authorization.mjs` | harness, imports real `subscription-entitlement.ts` | KEEP | Reference pattern for ports. |
| `services/automation-request-settlement.mjs` | harness that slices a **test file** and patches product source text | PORT (blocking) | Move `adapterFixture` out of `test/automations-unified.test.mjs` before that test is rewritten. Observe rendered state, not a patched-in closure observer. |
| `services/browser-cloud-request-custody-baseline.md` | historical defect narrative | DELETE | — |
| `services/browser-cloud-request-custody-probe.mjs` | child process, imports real dev bridge with closed fs hook | KEEP | Drop the dead `'current'` mode argument. |
| `services/browser-cloud-request-custody.mjs` | harness (spawns the probe) | KEEP, SIMPLIFY | Drop the esbuild metafile pass and lockfile hashing. |
| `services/browser-google-return.mjs` | harness that slices a dev-bridge branch into `new Function` | PORT | Drive the real `createBrowserCloudDevHandler` in the probe style, or export `handleWorkspaceGoogleReturn`. |
| `services/cache.mjs` | harness, imports real `ServiceReadCache` and upstream coordinator | KEEP | Narrow the manifest sources. |
| `services/calendar-linked.mjs` | harness over upstream client linked-sync only | DELETE | With `CalendarLinkedSync.qnt` and its manifest entry (D4/D11). Offer upstream. |
| `services/calendar.mjs` | (already deleted) | DELETED | Stale `CalendarSync` obligation at `index.mjs:138`. The model has no harness. |
| `services/client-feature-publication.mjs` | harness that runs a test file via nested `node --test` and an env knob (T9) | REWRITE | Shared `test/fixtures/client-feature-race.mjs` imported by both. |

Counts: KEEP 15 (several with SIMPLIFY), DELETE 3, PORT/REWRITE 4, already deleted 1.

## Behaviours that would lose coverage

- **`CalendarSync` model (agent-side Calendar outbox, undo, restart, unknown outcome)** no longer has a refinement harness, because `calendar.mjs` was deleted with the renderer linked store. The model still lists `agent-calendar.ts`, `agent-calendar-client.ts` and `CalendarSync*.java` as sources. It needs one of two things: a harness over `agent-calendar.ts` (the product path, D4), or an explicit "model-only" status. Its obligation text in `index.mjs:138` is now false.
- **`CalendarLinkedSync`**: deleting it loses nothing that Alpha runs. The client linked-sync controller is upstream-only here. Owner confirmation is still requested (below).
- **Runner gap**: `authorization.mjs`, `cache.mjs`, `browser-google-return.mjs` and `calendar-linked.mjs` have no per-model test wrapper. They run only through `test/quint-services-refinement.test.mjs`, which another report marks DELETE (T4). The replacement manifest-driven runner (`test/quint-refinement.test.mjs`) must enumerate every campaign in `index.mjs`, not just the ones that had wrappers. Otherwise `ServiceAuthorization`, `NoticesAndCaches` and `BrowserGoogleReturn` silently stop running.
- **`AutomationRequestSettlement`** breaks as soon as `test/automations-unified.test.mjs` is rewritten (its report says: adapter cases go to `journeys/workflows.spec.ts`). The port must land first.

## Shared helpers worth keeping

- `observed-replay.mjs` `recordComparedObservation` / `observedReplay`. This is the core of every forward replay; remove only the hashing ceremony.
- The probe pattern in `browser-cloud-request-custody-probe.mjs`: import the real module and close its filesystem with `registerHooks`. The `browser-google-return.mjs` port should copy it.
- `SignInTestPorts.java` and the `*-platform.mjs` stub generators (other chunks).
- `support.mjs` `deferred`/`until`/`casStore`. `sourceModule`'s re-bundle-and-compare step is B5 and can go.

## Cross-file actions

1. `index.mjs`: remove the `calendarLinkedRefinement` import and registration, and the `CalendarSync` obligation row (or rewrite it once a new harness exists).
2. `specs/quint/services/manifest.json`: remove `CalendarLinkedSync`. Drop `.github/workflows/resident-android.yml` from `AppUpdateCandidate`. Narrow `NoticesAndCaches` sources. Change `BrowserSiteState`/`BrowserDownloads` sources to the upstream files they actually execute.
3. `test/automations-unified.test.mjs`: extract `adapterFixture` into `test/fixtures/` before the rewrite. `automation-request-settlement.mjs` then imports it.
4. `test/client-feature-preparation.test.mjs`: extract the three-process race into a fixture and remove the `ALPHA_CLIENT_FEATURE_PUBLICATION_TRACE` knob (line 172).
5. `workflow-adapter-fixture.mjs` (another chunk): it transplants `workflow-adapter.ts`. Porting it ports `approval-decision-replay.mjs` and the other workflow replays at the same time.
6. `scripts/android-build-preflight.ts` and `scripts/prepare-patched-native.ts` / `android-host.ts`: return problem kinds and error codes so harnesses stop matching message text.
7. `scripts/android-gzip-assets.ts`: add an optional remove port to `protectGzipAssets`.
8. `scripts/browser-cloud-dev-bridge.ts`: optionally export the `/google-return` branch as a function.
9. Android: check that nothing writes the `calendar-linked-sync:v1:` slot (`AlphaCredentialStore.java:49`, `RendererCredentialSlots.java:26`) once the renderer stack is gone. The name is persisted, so this needs the Android owner.
10. `check-traces.mjs` / `observed-replay.mjs`: remove the repository-wide input hashing. Assertions on `driverInputsBound` / `inputsUnchanged` in the per-model wrappers go with it.

## Owner questions

- Should formal models of build and release tooling stay in per-PR CI? These are `AndroidBrowserModuleStage`, `AndroidBuildInputReadiness`, `AndroidGzipAssetStage`, `AppUpdateCandidate` and `ClientFeaturePublication`. They could instead run only when their scripts change, or be retired in favour of the real build.
- `CalendarLinkedSync` models only upstream client linked-sync code that Alpha no longer runs. Can it be deleted here and offered upstream?
- `CalendarSync` has lost its only refinement harness. Should one be written against `agent-calendar.ts`, or should the model be marked model-only?
- Should `BrowserSiteState`/`BrowserDownloads` (`ServicePolicies.sites()/downloads()`) and most of `IdentitySession`'s coordinator evidence move upstream? They execute only `vendor/eliza` classes.
- `BrowserCloudRequestCustody` and `BrowserGoogleReturn` model the development-only Cloud bridge (D6/D20). Should they keep running on every PR, or only when `scripts/browser-cloud-dev-bridge.ts` changes?
