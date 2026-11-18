# Chunk test-42: own-provider fixtures, owner tooling tests, packaged runtime, paired/Paradee, passwords, pending actions, phone, photos

30 assigned files; 29 present, 1 already deleted. Per-file reports: `docs/simplification-audit/files/<path>.md`.

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/own-provider/CredentialRequestFenceTest.java | Java unit of upstream fences | DELETE | upstream `plugin-native-agent/test/connection/OwnerProviderTest.java` already covers |
| test/own-provider/OwnProviderTest.java | Java unit of upstream provider slot/admission | DELETE | same upstream test |
| test/own-provider/OwnSpeechTest.java | Java unit of upstream `CartesiaSpeech` | DELETE | same upstream test |
| test/owned-captures-legacy-path.test.mjs | (missing) | DELETE (already gone) | - |
| test/owner-branch-integrity.test.mjs | tooling (fake `gh` + unit) | MERGE or DELETE with script | `test/tooling/owner-tools.test.ts` |
| test/owner-emulator-campaign-check.test.mjs | tooling + inventory/source-text | DELETE | - |
| test/owner-incident-response.test.mjs | tooling + source-text + data counts | DELETE (2 `gh-readonly` cases may move) | `test/tooling/owner-tools.test.ts` |
| test/owner-merge-review.test.mjs | tooling unit of one-off aid | DELETE | - |
| test/owner-route-native-import.test.mjs | loader check (spawn) | DELETE | covered by owner-route-parity |
| test/owner-route-parity.test.mjs | JVM transplant (regex-sliced gate) + Node integration | REWRITE / PORT | Gradle JVM connection-cloud suite + `test/integration/connection-cloud.test.ts`, shared case-table JSON |
| test/owner-sign-aosp-release-edges.test.mjs | tooling integration (openssl, releasetools doubles) | MERGE | `test/tooling/release-signing.test.ts` |
| test/packaged-runtime.test.mjs | Python wrapper | DELETE | `python-suites.test.mjs` / TS port |
| test/packaged-runtime.test.py | tooling integration (real ZIPs) | KEEP cases; REWRITE in TS with the script port | `test/tooling/apk-verify-audit.test.ts` |
| test/paired-speech-contract.test.mjs | JVM unit of paired-agent contract | DELETE (D5) | - |
| test/paradee-local-adapter.test.mjs | re-runs an upstream test | DELETE (T5) | - |
| test/paradee-runtime.test.mjs | tooling integration (real git fixtures) | MERGE | `test/tooling/android-build-inputs.test.ts` |
| test/password-dev-editor.test.mjs | unit of dev-only vault | DELETE | - |
| test/password-manager.test.mjs | stub-bundle unit + 1 transplant | MERGE + REWRITE | `journeys/settings.spec.ts` (Passwords) |
| test/password-manager-hidden.test.mjs | stub-bundle unit (twin harness) | MERGE | `journeys/settings.spec.ts` |
| test/password-manager-fences.test.mjs | stub-bundle unit (twin harness) | MERGE | `journeys/settings.spec.ts` |
| test/pending-action-background-recovery.test.mjs | transplant | DELETE | Quint PendingActionRecovery replay covers |
| test/pending-action-failure-boundary.test.mjs | transplant (5 slices) | DELETE + REWRITE 3 cases | `journeys/chat.spec.ts` |
| test/phone-adapter.test.mjs | stub-bundle unit + 1 source regex | REWRITE | `journeys/telephony.spec.ts`; observer-lease cases to `test/integration/phone-sms-contacts.test.ts` |
| test/phone-dial-agent-flow.test.mjs | integration (real `device-actions.ts`, ports) | MERGE | `test/integration/device-actions.test.ts` |
| test/phone-info-page.test.mjs | unit (presenters + loader) | REWRITE | `journeys/settings.spec.ts` (Settings → Phone) |
| test/photo-library-permission-owner.test.mjs | JVM transplant of vendor code + Capacitor source regex | DELETE | - |
| test/photo-library.test.mjs | source-text + upstream-contract units + 2 spawns | DELETE; MERGE 2 cases | `test/integration/photos-library-agent.test.mjs`, `test/integration/device-actions.test.ts`, APK manifest audit |
| test/photo-selection-cancel.test.mjs | transplant | DELETE | `photo-permitted-batch.spec.ts:47` covers |
| test/photo-viewport.test.mjs | unit | DELETE + REWRITE 3 cases | `journeys/camera-photos.spec.ts` |
| test/photos-debug-diagnostics.test.mjs | source-text + JVM transplant | DELETE | - |

Counts: DELETE 17 (incl. 1 missing), MERGE/REWRITE/PORT 12, KEEP 1 (packaged-runtime.test.py cases, pending its TS port).

## Corrections to research (`research/tests-host.md`)
- `paradee-local-adapter` compiles two **vendor** files and re-runs upstream's own test; not "one product Java class".
- `owner-sign-aosp-release-edges` does not run a Python unittest; python3 only builds zips.
- `photo-library-permission-owner` and `photos-debug-diagnostics` were marked "keep (D+A)"; both are transplants of vendor/Alpha Java plus source regexes → DELETE.
- `test/own-provider/*.java` duplicate upstream `OwnerProviderTest.java` (same three classes).
- `owner-route-native-import` comment premise is stale: no native Vite config loader and no JSON import in `owner-route-table.ts`.

## Behaviours that lose all coverage if the DELETEs land without replacements
- Phone voicemail (tab gating, carrier transcript, delete confirm + once-only dispatch, observer lease), MMI refusal, emergency/busy/unavailable wording: only `phone-adapter.test.mjs`. Needs `journeys/telephony.spec.ts`.
- Settings → Phone rows and the read-only-while-open loader (number/IMEI privacy): only `phone-info-page.test.mjs`.
- Password draft retention/expiry, hidden page reads nothing after a failed lock, after-leave copy/delete/unlock fences, reset confirmation lifecycle: host trio only (2 of ~12 scenarios in Playwright).
- Reply-failure notice suppression on conversation/session change, notice bounding, "Done…" after applied effect: only `pending-action-failure-boundary.test.mjs`.
- Photo viewer keyboard zoom/pan, video refuses zoom: only `photo-viewport.test.mjs`.
- Owner-route gate parity (Android vs renderer): must be PORTED, not deleted; it is a security boundary.
- Manifest media-permission rules: currently only source regex in `photo-library.test.mjs`; move into the APK manifest audit.
- Photos QA marker silence in release builds: only `photos-debug-diagnostics`; probably dead code (owner question).

## Shared helpers worth keeping
- `test/fixtures/jvm-tools.mjs` (`runJvm`, `javaBinary`) for the owner-route Gradle/JVM port until Gradle JVM tests replace it.
- The richer release-signing fixture block in `owner-sign-aosp-release-edges` (managed mode, APEX) as the base for `test/tooling/release-signing.test.ts`.
- `password-manager.spec.ts` `nativeVault` fixture (hold list/unlock) as the single Passwords harness.
- A `fakeGh(responses)` helper for owner read-back tests (twins in `owner-branch-integrity`, `ci-ruleset-readback`).

## Cross-file actions
- Product: extract the local-agent request refusal condition from `AlphaLocalAgentPlugin.request()` into `OwnerRoutes` (or a `LocalAgentRequestGate`), and the Cloud automations rule from `AlphaConnectionPlugin`, so the parity test compiles real classes; export a `compileOwnerRoutes(table)` from `owner-route-policy.ts` for broken-table cases.
- Delete with D5: `PairedSpeechContract.java`, `test/fixtures/PairedSpeechContractTest.java`, `paired-speech-contract.test.mjs` together.
- Delete with D3: the `transfer.ts` stub dies with password transfer.
- `test/own-provider/` directory goes with tests 1-3 of `test/own-provider.test.mjs` (chunk test-41).
- `scripts/owner/*` incident tools, IOC JSON, `merge-review.ts`, `emulator-campaign-check.ts` and their tests are deleted together.
- `verify-packaged-runtime.py` TS port takes the packaged-runtime cases; delete its removed-flag refusal stub.
- Path filters: owner-route parity only on `OwnerRoutes.java`/`AlphaLocalAgentPlugin.java`/`AlphaConnectionPlugin.java`/`owner-route-*.ts`; release-signing and Paradee tooling only on their scripts and `android/aosp/**`, `android/paradee-voice/**`.

## Owner questions
1. Are incidents #658/#659/#679 closed so the `scripts/owner` incident tools, IOC data and their tests can be deleted?
2. Does the #676 emulator campaign still need `scripts/owner/emulator-campaign-check.ts`?
3. Is `scripts/owner/read-branch-integrity.ts` still run by hand (merge with `read-required-checks.ts`) or can both go?
4. Does any manual QA procedure read the `AlphaPhotosQA` debug log tag? If not, delete `qaMarker` from `AlphaPhotosPlugin.java`.
5. Should the upstream `OwnerProviderTest` be extended (lease expiry/capacity, Cartesia response bound, managed Google binding) before deleting Alpha's copies?
