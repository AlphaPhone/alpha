# Chunk scripts-11: native/mobile build helpers, voice latency tooling, `scripts/owner/`

22 files reviewed, 22 reports under `files/scripts/` and `files/scripts/owner/`. Report-only. No source changed.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| scripts/mobile-bundle-smoke.ts | build-output smoke | SIMPLIFY | Keep only the uuid-bridge check and the pre-provider turn probe; drop re-tests of the `uuid` package |
| scripts/mobile-uuid-adapter.ts | build tooling | SIMPLIFY | Smaller receipt (one producer digest), no exact counts or policy-literal re-checks, shared fs/hash helpers |
| scripts/native-cloud-runtime-config-check.ts | integration test in scripts/ | MOVE | Merge with `scripts/test-native-cloud-runtime-config.ts` → `test/native-cloud-routing.integration.ts`; `resident-android.yml` calls it |
| scripts/native-google-host-artifact.ts | build tooling | SIMPLIFY | Shared helpers, Bun pin constant, exported input list for Quint; rollback path is Quint-modelled (keep unless the formal owner agrees) |
| scripts/native-google-product-host.ts | build input | KEEP | `@eliza/*` alias later |
| scripts/native-test-fixture.ts | manual campaign support | KEEP → MOVE | `test/support/android/` with the `scripts/test-*` campaigns; fix cwd-relative `app.config.json` read |
| scripts/native-view-policy.ts | build/runtime data | KEEP | — |
| scripts/native-voice-latency-emulator.ts | manual emulator campaign | KEEP (owner may DELETE) | Unexport unused `parse`/`repetitions`, shared args/adb helpers |
| scripts/native-voice-latency.ts | evidence aggregator | SIMPLIFY | Delete v2 legacy format support (A1) |
| scripts/owner/InspectUpdateApk.java | update admission tool | KEEP → MOVE | `scripts/apk/` (optionally one Java tool with VerifyApkRotation) |
| scripts/owner/VerifyApkRotation.java | release signing tool | KEEP → MOVE | `scripts/apk/`; update release workflow, `sign-release-apks.ts`, Quint pin |
| scripts/owner/emulator-campaign-check.ts | owner planning aid, source-text | DELETE | With `test/owner-emulator-campaign-check.test.mjs` |
| scripts/owner/forged-branch-scan.ts | incident tool | DELETE | After #658 closed |
| scripts/owner/gh-readonly.ts | shared GitHub read client | SIMPLIFY | Drop IOC half; move to `scripts/lib/github-read.ts` |
| scripts/owner/incident-2026-10-27-iocs.json | incident data | DELETE | With incident tools |
| scripts/owner/incident-access-audit.ts | incident tool | DELETE | After #658 closed |
| scripts/owner/incident-ci-exposure.ts | incident tool | DELETE | After rotation confirmed |
| scripts/owner/input.ts | shared helpers | MERGE | `scripts/lib/` guards + args |
| scripts/owner/merge-review.ts | one-merge review aid | DELETE | With `test/owner-merge-review.test.mjs` |
| scripts/owner/pilot-rotation-journal.ts | release tooling | KEEP → MOVE | Beside `pilot-update.ts`; Quint `pilot-update` imports it |
| scripts/owner/pilot-rotation.ts | release tooling | KEEP → MOVE | Beside `pilot-update.ts` |
| scripts/owner/read-branch-integrity.ts | manual owner readback | MERGE | With `scripts/ci/read-required-checks.ts` → `scripts/owner/read-branch-rules.ts` |

## Coverage lost if the DELETEs happen
- None of the deleted files protects product, build, release or CI behaviour. They are incident forensics (#658/#659) and a #676 planning report, run by hand and kept alive only by their own unit tests (`test/owner-incident-response.test.mjs`, `test/owner-merge-review.test.mjs`, `test/owner-emulator-campaign-check.test.mjs`, `test/owner-branch-integrity.test.mjs`). Those tests go with them.
- Deleting the v2 voice-timing format loses the ability to aggregate pre-rename v2 exports. They were diagnostic-only, and old evidence stays in git.
- `native-cloud-runtime-config-check.ts` is a MOVE, not a delete. It is the only test of compiled native-host Cloud routing (cloud text, local embeddings, no send broker, no credential persistence), so it must keep running in `resident-android.yml`.

## Shared helpers worth keeping
- `ghGet`/`ghGetAll`/`collectRows` (gh-readonly.ts) as `scripts/lib/github-read.ts`.
- One `readRegularFile` / `sha256Hex` / `readJson` / `isSafeRelativePath` in `scripts/lib/fs.ts`, replacing copies in `mobile-uuid-adapter.ts`, `native-google-host-artifact.ts`, `native-test-fixture.ts`, `pilot-rotation*.ts`.
- `isRecord`/`errorCode`/`isSafeInteger` (owner/input.ts) in `scripts/lib/guards.ts`. Use `node:util` `parseArgs` instead of `gh-readonly.parseArgs`, `input.option` and the emulator script's parser.
- One `PINNED_BUN_VERSION` constant (now `'1.4.2'` in at least six places).

## Cross-file actions
1. Move `InspectUpdateApk.java`, `VerifyApkRotation.java`, `pilot-rotation.ts`, `pilot-rotation-journal.ts` out of `scripts/owner/`. Update `update-apk-admission.ts:18`, `sign-release-apks.ts:207`, `.github/workflows/release-cloud-app-signing.yml:166`, `pilot-update.ts`, `scripts/quint-lib.ts:37`, Quint `services/pilot-update.mjs:13-14,25` and `services/manifest.json` in one change. Then `scripts/owner/` holds only owner readback tools.
2. Mobile receipt change (mobile-uuid-adapter #3): update `scripts/verify-packaged-runtime.py:161`, `test/mobile-uuid-build.test.mjs`, `test/fixtures/mobile-uuid-build.mjs` and the Quint `mobile-bundle-admission` / `android-build-input-readiness` harnesses together. Any edit to `mobile-bundle-smoke.ts` also changes the mobile build identity.
3. The Quint harnesses `native-google-host-artifact.mjs:41` and `-probe.mjs:37` repeat the host artifact's input path list. Export it from `native-google-host-artifact.ts` and import it there (T10).
4. Delete `test/wallet-disabled.test.mjs` under D2. It is one of `native-view-policy.ts`'s importers.
5. Scripts research corrections: `owner/input.ts` has no Python test caller (`embedding-artifact-inputs.test.py` is a false positive). `native-voice-latency-emulator.ts` exports `parse`/`repetitions` with no importer. `native-google-host-artifact.ts`'s rollback is modelled by Quint, so it is not plain ceremony.

## Owner questions
- Are incidents #658/#659 closed, and has every secret listed by `incident-ci-exposure.ts` been rotated? This gates deleting the four incident tools and the IOC file. Should a committed file that names an external actor and other organisations' repositories stay in this repository at all?
- Is issue #676 (H-31 emulator campaign inventory) done, so `emulator-campaign-check.ts` can go?
- Keep one manual branch-rules readback tool (merged `read-branch-integrity` + `ci/read-required-checks`), or rely on the GitHub UI and delete both?
- Is the emulator voice-latency campaign (`native-voice-latency-emulator.ts` + `inject-emulator-audio.py`) still wanted, given that latency acceptance is device-only?
- Can the native Google host's publish-rollback (`publishPair`), which Quint models, be simplified, with the model and traces changed in the same commit?
