# Chunk scripts-17 summary

28 files reviewed (all present in the worktree on 2026-11-11). One report each under `files/scripts/`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `scripts/test-workflow-lifecycle-ui-flow.ts` | transplant-backed flow test (T2) | REWRITE, then DELETE | `test/browser/journeys/workflows.spec.ts` (lifecycle) |
| `scripts/test-workflow-metadata-host.ts` | unwired real-host evidence probe | DELETE | with the 5 sibling host probes, `scripts/fixtures/workflow-host.ts`, `start-reviewed-workflow-agent.ts` |
| `scripts/test-workflow-metadata-ui-flow.ts` | transplant-backed flow test (T2) | REWRITE, then DELETE | `journeys/workflows.spec.ts` (edit details) |
| `scripts/test-workflow-protocol.ts` | integration (real module + HTTP) | MOVE | `test/workflows.integration.test.ts` |
| `scripts/test-workflow-ui-flow.ts` | transplant-backed flow test (T2) | REWRITE, then DELETE | `journeys/workflows.spec.ts` (run/cancel) |
| `scripts/test-workflow-worker.ts` | integration (staged worker under Bun) | MOVE | `test/workflow-worker-artifact.test.ts` (resident Android lane) |
| `scripts/toolchain.ts` | helper | KEEP, extend | add `adb(serial)`, memoised env, `BUILD_TOOLS` |
| `scripts/typecheck-scripts.ts` | typecheck wrapper | SIMPLIFY (keep filter) | filter `vendor/`/`.eliza/` only |
| `scripts/update-apk-admission.ts` | release gate module | KEEP, light SIMPLIFY | — |
| `scripts/update-artifact.ts` | hash helper | MERGE | `scripts/lib/hash.ts sha256File` |
| `scripts/update-channel.ts` | release module | KEEP, light SIMPLIFY | — |
| `scripts/upstream-core-sources.ts` | pinned data (JSON in TS) | SIMPLIFY | `scripts/upstream-core-sources.json` |
| `scripts/upstream-mobile-build.ts` | pinned data (JSON in TS) | SIMPLIFY | `scripts/upstream-mobile-build.json` |
| `scripts/upstream-native-source.ts` | pinned-upstream reader | KEEP, light SIMPLIFY | shared hash/git/pin helpers |
| `scripts/vendor-lucide-icons.ts` | manual regeneration tool | KEEP | add `icons:vendor` alias |
| `scripts/verify-aosp-clock.ts` | manual device CLI | MERGE | `scripts/aosp-check.ts clock` |
| `scripts/verify-aosp-listener.ts` | manual device CLI | MERGE | `aosp-check.ts listener` |
| `scripts/verify-aosp-secure-camera.ts` | manual CLI | MERGE | `aosp-check.ts secure-camera` |
| `scripts/verify-apks.ts` | release gate (build-output audit) | KEEP, SIMPLIFY | split into functions; absorb runtime verifier |
| `scripts/verify-cuttlefish-launcher.ts` | manual device CLI | MERGE | `aosp-check.ts launcher --target cuttlefish` |
| `scripts/verify-packaged-runtime.py` | release gate (Python) | MERGE (port), then DELETE | `scripts/packaged-runtime.ts`, called by `verify-apks.ts` |
| `scripts/verify-pixel10a-image.ts` | manual device CLI | MERGE | `aosp-check.ts launcher --target pixel10a` |
| `scripts/verify-pixel10a-source.ts` | manual CLI, no caller | MERGE | `aosp-check.ts pixel10a-source` |
| `scripts/verify-upstream.ts` | pin/stamp/reachability check | KEEP, light SIMPLIFY | shared staged-stamp check |
| `scripts/voice-host.ts` | build/release module + CLI | KEEP, SIMPLIFY | trim staging paranoia, shared helpers |
| `scripts/with-test-mocks.ts` | env wrapper | DELETE | inline env in `package.json` |
| `scripts/workflow-renderer-fixture.ts` | transplant fixture (T2/T10) | DELETE after importers; PORT the Quint harness | helpers → `test/fixtures/workflow-agent.ts` |
| `scripts/workflow-worker-artifact.ts` | build module | KEEP, SIMPLIFY | drop retired patch-overlay refusal |

Counts: KEEP/SIMPLIFY in place 12 · MERGE/MOVE/REWRITE 13 · DELETE 3 (`test-workflow-metadata-host.ts`, `with-test-mocks.ts`, `workflow-renderer-fixture.ts` after its importers and the Quint harness port).

## Coverage that would be lost if the DELETEs land before the replacements
- **Workflows run/lifecycle/metadata safety rules in the renderer** (review-before-run, no automatic retry after an ambiguous accepted POST, durable content-free intents reconciled by GET across reload, typed vs generic 409 handling, account switch discarding held responses, manual-typed switch never sends `/activate`, hosted digest hides Run now). Today only the three `*-ui-flow.ts` transplant tests (plus `test-workflow-approval-ui-flow.ts` in another chunk and `test/workflow-lifecycle-resend.test.mjs`) cover them. They need `journeys/workflows.spec.ts` with a routed fake agent **before** the transplants go.
- **Quint workflow-adapter refinement** (`specs/quint/refinement/services/workflow-adapter-fixture.mjs`) depends on `workflow-renderer-fixture.ts`. Deleting the fixture without porting the harness fails the formal lane (D11).
- **Upstream metadata CAS on a real host** (`test-workflow-metadata-host.ts`): never run, so nothing is lost in practice; record as an upstream test follow-up.
- Packaged-runtime verification must not regress during the Python → TS port: compare `runtimePackaging` JSON from one Android build before and after.

## Shared helpers worth keeping / creating
- `scripts/lib/hash.ts`: `sha256Hex(bytes)`, `sha256File(file) -> {size, sha256}` (replaces `update-artifact.ts`, `workerHash`, `upstream-native-source.ts sha`, `update-channel.ts digest`, `voice-host.ts digest`, `vendor-lucide-icons.ts hash`, four inline hashes in `verify-apks.ts`).
- `toolchain.ts`: memoised `androidEnv()`, `tool()`, `BUILD_TOOLS`, new `adb(serial)` + `type Adb`.
- `scripts/lib/pin.ts readUpstreamPin()`, `scripts/lib/git.ts`, `readAppConfig()`.
- `test/fixtures/workflow-agent.ts`: one fake workflow agent server + `workflowHttpClient` + `waitForWorkflow` (from `workflow-renderer-fixture.ts`), used by the integration test and the journey.
- `upstream-native-source.ts` as the single pinned-upstream reader (Python `git show` per file goes away with the port).

## Cross-file actions
1. Delete `test/adapter-contracts.test.mjs` entries for `test-workflow-{protocol,ui-flow,lifecycle-ui-flow,metadata-ui-flow}.ts` as each moves/rewrites; repoint the comment in `test/browser/workflow-missed-run-now.spec.ts:21`.
2. Delete the six workflow host probes + `scripts/fixtures/workflow-host.ts` + `scripts/start-reviewed-workflow-agent.ts` together.
3. Create `scripts/aosp-check.ts` (subcommands `clock | listener | secure-camera | launcher --target | pixel10a-source`, `node:util parseArgs`, `--serial --user --fingerprint`), delete the five CLIs, `aosp-clock-contract.ts` re-export, and the stub-adb tests `cuttlefish-launcher-postboot.test.mjs`, `pixel10a-image.test.mjs` (D10). Repoint or drop `npm run aosp:verify-secure-camera`.
4. Port `verify-packaged-runtime.py` → `scripts/packaged-runtime.ts`; delete `test/packaged-runtime.test.py`; share the staged-stamp check with `verify-upstream.ts`.
5. Convert `upstream-core-sources.ts` and `upstream-mobile-build.ts` to `.json`; delete `build-policy-source.ts`; update `core-state-patch.ts`, `mobile-uuid-adapter.ts`, `source-snapshot.ts`, `quint-lib.ts`, refinement harnesses `combined-agent-launcher.mjs`, `reviewed-workflow-launcher.mjs`. Expect one re-stage (receipt hashes change). Read the Bun version for CI from the JSON.
6. Remove removed-runtime-profile refusals from `verify-apks.ts` and `sign-release-apks.ts:291-292`; delete `removed-profile-flags.ts`; drop `demoEntryPoints` together with `.github/workflows/android.yml:119-121`.
7. Remove the `.patch-overlay.json` refusal from `workflow-worker-artifact.ts`, `test/workflow-worker-assets.test.mjs:18` and the Quint harness `workflow-worker-staging.mjs:29` in one commit, keeping the model passing.
8. Update path pins in `specs/quint/services/manifest.json` and `quint-lib.ts` for every moved/deleted file here (`update-artifact.ts`, `with-test-mocks.ts`, `verify-packaged-runtime.py`).
9. Inline `ELIZA_DEV_ALLOW_TEST_MOCKS=1` in `package.json` `dev:ui` / `build:test-mocks`; delete `with-test-mocks.ts`.

## Corrections to `research/scripts.md`
- `typecheck-scripts.ts`: not deletable today. Unfiltered `tsc -p tsconfig.scripts.json` gives 214 errors, 200 in `vendor/eliza` (pulled in by imports such as `toolchain.ts:2`). Narrow the filter instead.
- `test-workflow-protocol.ts` is a genuine integration test (imports the real module, real HTTP). The three `*-ui-flow.ts` scripts are transplants through `workflow-renderer-fixture.ts`, not "the suite itself", so "move to test/" is the wrong treatment for them: they need rewriting.
- `workflow-renderer-fixture.ts` "keep" → DELETE: it slices three product files as text, and a Quint harness depends on it.
- `LEGACY_APP_UPDATE_TAG` in `update-channel.ts` is still used by `deliver-app-update.ts` and `app-update-candidate.ts` to publish to the old `app-stable` tag (an install-base concern, D17), not dead code.

## Owner questions
1. Does any installed Alpha build still poll the `app-stable` manifest URL? If not, delete `LEGACY_APP_UPDATE_TAG` and the dual-tag publication in `deliver-app-update.ts` / `app-update-candidate.ts`.
2. Self-provenance: should the staged runtime stamp keep hashing `prepare-local-agent.ts`, `local-agent-source.ts`, `copy-file-clone.ts` and the mobile/core adapter scripts (so every refactor of those tools forces a re-stage), or stamp on the pin and the prepared-tree content only?
3. Are the AOSP device CLIs (clock, listener, secure-camera, Cuttlefish/Pixel launcher image, Pixel 10a source) run by hand during image acceptance? Yes → merge into `aosp-check.ts`. No → delete.
4. Is Windows development supported? (`with-test-mocks.ts` has a `win32` branch; inlining env in `package.json` is POSIX-only.)
5. `voice-host.ts voiceStagingState` scans Gradle source-set overlays and two upstream vendor paths for stray voice payloads. Was this added after a real incident? If not, keep only the `.eliza/paradee-voice` owner-folder check.
