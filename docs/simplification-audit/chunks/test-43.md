# Chunk test-43: Photos, pilot tooling, Pixel voice acks, Pixel 10a, Playwright projects

Reports are in `docs/simplification-audit/files/test/<name>.md`.

| File | Lines | Kind | Verdict | Target |
|---|---|---|---|---|
| test/photos-library-patch.test.mjs | 392 | source-text + transplant + host-JVM run of upstream Java | DELETE | upstream follow-up: SQLite page-key case to `plugin-native-media/test/native-host/PermittedMediaTest.java`; folder retirement if `FolderSessionTest` lacks it |
| test/photos-native-order.test.mjs | 59 | exact duplicate of the test above | DELETE | — |
| test/photos-pending-read.test.mjs | 38 | transplant (`camera-adapter.ts`) | DELETE | 2 cases to `journeys/camera-photos.spec.ts` |
| test/photos-thumbnail-refresh.test.mjs | 94 | transplant + upstream unit | DELETE | 2 cases to `journeys/camera-photos.spec.ts` |
| test/photos-view-contract.test.mjs | 80 | unit test of an upstream module (duplicated upstream) | DELETE | — |
| test/photos-view.test.mjs | 172 | unit test of an upstream module + 2 source-text tests | DELETE | upstream follow-up: `photos-view.test.ts` in `packages/ui` |
| test/pilot-rotation-journal.test.mjs | 84 | tooling | MERGE | `test/release-tooling/pilot.test.ts` (1 case + anchor refusal) |
| test/pilot-units.test.mjs | 313 | tooling + source-text | MERGE | `test/release-tooling/pilot.test.ts` (admission, blockers, readback; drop qualify-head and source-text) |
| test/pilot-update-export.test.mjs | 275 | tooling + 1 source-text test | MERGE | `test/release-tooling/pilot.test.ts` (export parser, `planHome`, agent restart, readback recheck) |
| test/pinned-voice-build.test.mjs | 53 | tooling of a script nothing calls | DELETE | with `scripts/build-pinned-voice.ts` (owner question) |
| test/pixel-spoken-acks.test.mjs | 1678 | transplant (vm-evals Alpha voice views + upstream session) + 2 source-text tests | REWRITE | `test/integration/voice.test.ts`, 15 listed cases |
| test/pixel10a-image.test.mjs | 55 | tooling; the rules under test are upstream | DELETE | — |
| test/pixel10a-source.test.mjs | 104 | tooling of the upstream verifier + 1 config pin | DELETE | — |
| test/playwright-projects.test.mjs | 47 | test-machinery and inventory check | DELETE | 3-line load-time check in `playwright.config.ts` |

Totals: 9 DELETE, 3 MERGE, 1 REWRITE, 0 KEEP as-is. About 3,450 lines become about 560 (pilot ≈120, voice integration ≈350, journey cases ≈60, config check ≈3).

## Key facts found

- `android/upstream-native-sources.json` has `"patches": []`, and there is no `patches/` folder. Every "patched" Photos Java file is pinned
  upstream source. So the photos-library and native-order tests test upstream code. Their header still names a patch file that no
  longer exists (A8).
- The two JVM Photos tests skip in the verify job, which has no Android SDK, so they gave no CI coverage. On-device equivalents exist:
  `PhotosCatalogOrderInstrumentedTest`, `PhotoReplaceInstrumentedTest`.
- `specs/quint/refinement/services/pilot-update.mjs` already runs the real `planHome`/`updateUnit` and the real rotation journal on the same
  `test/fixtures/pilot-update.mjs`, with the same named faults. Most update-window cases in `pilot-update-export` and `pilot-rotation-journal`
  are therefore duplicate coverage (T4).
- Upstream already tests `photos-view-contract` (`photos-view-contract.test.ts`), `verifyDeviceSource`
  (`device-source-inventory.node.test.ts`) and the verified-boot rules (`verify-launcher-image.node.test.ts`).
- `STORAGE_SPECS` lists about 9 specs that D1 and D3 delete (storage migrations, `calendar-backup-restore`). `playwright-projects.test.mjs` would fail on each of those deletions.

## Behaviours that lose all host coverage if the DELETEs land without replacement

1. `DocumentFolderTree.forget/adopt` retirement races (failed or unconfirmed release, stale instance, concurrent adopt, linked-note grants).
   This logic is upstream; ask whether `FolderSessionTest.java` covers it. Otherwise it is device-only (no instrumented test was found
   for folder retirement).
2. The `PermittedMediaCatalog.after` page key with TEXT-bound SQLite args (the uncast `?` bug). Covered on device only by
   `PhotosCatalogOrderInstrumentedTest`, which does not run in PR CI.
3. The `photos-view.ts` pure algorithms (`virtualGrid` height arithmetic, `runBatches` stop-on-cancel, `mergeWindow`, `filterMatches` date
   words) until upstream adds `photos-view.test.ts`. The Playwright specs cover their visible effect only partly.
4. The Pixel voice fault and timing matrices (about 100 generated cases) beyond the 15 carried cases. This is session-internal
   behaviour of upstream `VoiceAssistantSession` and `native-cloud-speech`, so it should be proposed upstream.
5. `scripts/build-pinned-voice.ts` provenance stamping, if the owner keeps the script.

## Shared helpers worth keeping

- `test/fixtures/pilot-update.mjs`: the Quint refinement imports it, so it survives and the merged pilot test reuses it.
- `test/browser/helpers/photos-bridge.ts`: add a held-read and held-thumbnail hook, so journeys stop monkey-patching `Capacitor.nativePromise` in the page.
- Voice: replace `test/fixtures/cloud-voice-view.mjs` + `shared-batch-voice.mjs` (vm transplant loaders) with one
  `test/support/voice-harness.ts` that imports the real modules and provides a fake native port and a fake clock.

## Cross-file actions

- Delete `scripts/qualify-head.ts` with `test/qualify-head.test.mjs` and the qualify-head cases in `pilot-units` (owner decision in `research/scripts.md:643`).
- Consolidate the `releaseBlockers` assertions (pilot-units, aosp-release-signing, licenses, font-license) into one file.
- Merge `scripts/verify-pixel10a-source.ts` into `stage-aosp.ts`. Fold `verify-pixel10a-image.ts` into `verify-cuttlefish-launcher.ts --target pixel10a`, or keep it as a manual tool.
- Move `scripts/storage-specs.ts` next to `playwright.config.ts`, add a missing-file throw, and prune the deleted migration specs.
- `test/fixtures/jvm-tools.mjs` loses the photos-library-patch importer; re-check its other importers.
- Voice rewrite needs product ports: the Alpha voice adapter must accept the Capacitor driver, the connection controller and the native speech port as parameters (D7), and `.eliza` imports go through the `@eliza/*` alias (D13).
- Upstream follow-ups (D14): `photos-view.test.ts`; `PermittedMediaCatalog` TEXT-binding page keys; folder retirement; the voice session fault matrices.

## Owner questions

1. Is `scripts/build-pinned-voice.ts` run by hand? If not, delete it with its test.
2. Should `verify-pixel10a-image.ts` remain a separate manual device tool, or become a `--target` of the cuttlefish launcher verifier?
3. Should the phone's `LIBRARY_LIMITS.kept` and `.query` be derived from the upstream Photos view contract, instead of being kept equal by a test?
4. Is device-only coverage (instrumented tests outside PR CI) acceptable for Photos catalog order, replace recovery and folder-grant retirement, until upstream host tests exist?
