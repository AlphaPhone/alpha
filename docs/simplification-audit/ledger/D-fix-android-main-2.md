# D-fix-android-main-2

Review fixes for the Android main sources. Behaviour is unchanged in every case.

## 1 and 2. OwnerRoutes.ASSET visibility (one defect, reported twice)

- Confirmed. At HEAD, `OwnerRoutes.ASSET` is `private`. `test/fixtures/OwnerRoutesTest.java:20`, in the same package, reads it, so javac rejects the harness compiled by `test/owner-route-parity.test.mjs`.
- Fix: the working tree already puts back develop's package-private `static final String ASSET="owner-routes.json";` (an uncommitted edit). That edit is kept as the fix. The fixture is unchanged.
- Not committed here, because this unit may not run git commands that write. The edit has to be committed with the branch.
- Check: `node --test test/owner-route-parity.test.mjs` passes.

## 3. AlphaUtil bloat

- Confirmed, as code quality only.
- `AlphaUtil.submit` duplicated `PluginWorkers.submit`, which describes itself as "the one way a plugin hands work to its own worker".
- These members had no callers in android/, test/, scripts/ or apps/: `OPERATION_ID`/`isOperationId`, `OPAQUE_ID`/`isOpaqueId`, `httpStatus` and `Guard`. Every unqualified `Guard` in the package resolves to that class's own nested interface.
- Fix in `AlphaUtil.java`: removed `submit`, `Guard`, `OPERATION_ID`, `OPAQUE_ID`, their patterns and checks, `httpStatus`, and the imports of `Executor` and `RejectedExecutionException`.
- Fix in `AlphaDeletionsPlugin.java`: its four `AlphaUtil.submit(worker,` calls now call `PluginWorkers.submit(worker,` with the same arguments.
- The class doc is still accurate.
- Checks:
  - host javac compiles `AlphaUtil.java`
  - these suites pass 26/26: owner-route-parity, calendar-sync-mutation, google-workspace-return-flow, workspace-return-fallback, workflow-worker-assets, plugin-worker-guard and diagnostics-export
  - `npx tsc --noEmit` is clean
- `AlphaDeletionsPlugin.java` was not compiled, because it needs the Gradle build and the Android SDK.
