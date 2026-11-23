# Chunk test-02: AOSP, APK policy and app-update host tests (31 files)

| File | Kind | Verdict | Target |
|---|---|---|---|
| test/android-stage-voice-models.test.mjs | tooling | MERGE | test/tooling/android-build-inputs.test.ts |
| test/aosp-apk-preparation.py | tooling (Python, mocked subprocess) | DELETE (with orphan `scripts/prepare-aosp-apk.py`, owner confirm) | - |
| test/aosp-apk-preparation.test.mjs | wrapper | DELETE | - |
| test/aosp-capabilities.test.mjs | integration (javac) + tooling + source-text | MERGE | Gradle JVM image-capability test (interim: test/tooling/aosp.test.ts) |
| test/aosp-cloud-power-defaults.test.mjs | source-text | DELETE | - |
| test/aosp-cuttlefish.test.mjs | tooling | MERGE | test/tooling/aosp.test.ts |
| test/aosp-fresh-presets.test.py | JVM + tooling + source-text + transplant, orphan (no runner) | REWRITE | keep tests 1-4 in test/tooling/python.test.mjs (2-4 skip without fetched inputs); delete 5-6 |
| test/aosp-image-capability.test.mjs | mostly source-text, some unit/tooling | DELETE most; MERGE tests 1-2 and 4 | test/integration/phone-sms-contacts.test.ts; test/tooling/aosp.test.ts |
| test/aosp-listener-systemui.test.mjs | tooling + upstream data + skipped | MERGE test 3; DELETE 1-2 | test/tooling/aosp.test.ts |
| test/aosp-listener.test.mjs | runs upstream suite | DELETE (+ `loadListenerSystemuiTests` export) | - |
| test/aosp-native-fixtures.py | tooling integration (Python) | KEEP + SIMPLIFY (port regex stamp slice to an export) | run from test/tooling/python.test.mjs |
| test/aosp-pixel10a.test.mjs | tooling integration + constants + wrapper | MERGE (drop test 1, wrapper, source order) | test/tooling/aosp.test.ts |
| test/aosp-product-lock.test.mjs | tooling + committed-state | MERGE tests 2-3; DELETE test 1 | test/tooling/aosp.test.ts |
| test/aosp-provisioning-overlay.test.mjs | tooling + source-text | MERGE tests 1-3; DELETE test 4 | test/tooling/aosp.test.ts |
| test/aosp-release-signing.test.mjs | tooling integration | MERGE (drop clock re-export, vendor regex, literals) | test/tooling/release-signing.test.ts |
| test/aosp-retain-known-good.test.mjs | package.json text + upstream parser | DELETE | - |
| test/aosp-secure-camera-policy.test.mjs | tooling + upstream + source-text | MERGE test 1; DELETE 2-4 | test/tooling/aosp.test.ts |
| test/aosp-secure-camera.test.mjs | tooling integration (git) | MERGE | test/tooling/aosp.test.ts |
| test/aosp-sms.test.mjs | JVM (vendor) + unit + source-text | MERGE tests 3-8 (+ capability rows of 11); KEEP test 1; DELETE 2, 9, 10 | test/integration/phone-sms-contacts.test.ts |
| test/aosp-staging-patches.test.mjs | tooling integration (git) | MERGE (drop vendor patch regex) | test/tooling/aosp.test.ts |
| test/aosp-telephony.test.mjs | unit (real module, stub plugin) | MERGE | test/integration/phone-sms-contacts.test.ts |
| test/apk-alpha-power-policy.test.mjs | tooling (release gate) | MERGE | test/tooling/apk-verify-audit.test.ts |
| test/apk-alpha-tile-policy.test.mjs | tooling (release gate) | MERGE | test/tooling/apk-verify-audit.test.ts |
| test/apk-keyboard-dictation.test.mjs | tooling (release gate) | MERGE | test/tooling/apk-verify-audit.test.ts |
| test/apk-signer-range.test.mjs | unit of upstream re-export | DELETE | - |
| test/app-record-pending-actions.test.mjs | transplant (slices legacy previous-notes boundary) | DELETE | carry 3 cases to journeys/notes.spec.ts |
| test/app-speech-route.test.mjs | transplant | REWRITE | test/integration/voice.test.ts (8 cases, needs injectable ports in app-speech.ts) |
| test/app-update-automatic.test.mjs | transplant, duplicates two Quint harnesses | DELETE | carry 3 cases to journeys/settings.spec.ts |
| test/app-update-candidate.test.mjs | tooling + workflow YAML eval | MERGE tests 1-8; DELETE test 9 | test/tooling/release-signing.test.ts |
| test/app-update-startup.test.mjs | unit of upstream gate | DELETE | - |
| test/app-update.test.mjs | Java transplant + JVM + source-text | DELETE tests 1, 3, 4; REWRITE test 2 | Gradle JVM AppUpdateInstallerTest (keep test 2 until then) |

Totals: DELETE 10 files (2 Python/wrapper, cloud-power-defaults, listener, retain-known-good, signer-range,
record-pending-actions, app-update-automatic, app-update-startup, and image-capability almost entirely); KEEP 1;
MERGE/REWRITE 20 (most with partial deletions inside).

## Behaviours that lose all executable coverage if the DELETEs happen
- Emergency-number routing and the role/permission/busy ordering in `placeCall`, SMS journal-before-dispatch, immutable
  SMS PendingIntents and provider-row matching (vendor `TelephonyPlugin`/`SmsTelephony`): only regex today; needs
  upstream executable tests or instrumentation (D14 follow-up).
- Framework overlay values for power long-press assistant (aosp-cloud-power-defaults): only provable on an image boot.
- Renderer lock frame requires Unlock before Camera (aosp-secure-camera-policy test 4): no journey covers it found.
- Notes New-note behaviour while the agent is starting/recovering/offline, and Notes→Calendar review admission
  (app-record-pending-actions): needs `journeys/notes.spec.ts` steps.
- App speech fallback and stuck-speaker rules (app-speech-route) until the voice integration rewrite lands.
- Automatic update refused during compact voice / focused editor (app-update-automatic): the Quint harnesses still
  cover it while they exist; add journey steps before those harnesses are ported.
- Install-session ordering in `AlphaDevicePlugin.installUpdate` (app-update test 3): partly modelled by Quint update
  models; no executable host check after the regex goes.
- Per-flavor telephony manifest permissions: safe only if `scripts/apk.ts` lists every permission the regex test listed
  (READ_CONTACTS, READ_PHONE_STATE, WRITE_CONTACTS, READ_CALL_LOG, CALL_PHONE, USE_FULL_SCREEN_INTENT, RECEIVE_*, SEND/READ_SMS); verify before deleting.

## Shared helpers worth keeping / creating
- `test/fixtures/jvm-tools.mjs`, `git-fixture.mjs`, `voice-host-product.mjs`, `app-update-candidate.mjs` (also used by
  the Quint services replay), `app-update-jvm/` (used by four Quint native harnesses), `assert-order.mjs` (other importers).
- New: `test/fixtures/aapt-tree.mjs` (aapt xmltree builder duplicated in provisioning-overlay and secure-camera-policy);
  one release-manifest builder for the three `apk-*` policy files; one telephony stub plugin + status builder; one
  "complete descriptor copy" helper for product-lock and release-signing; a shared ELF/`Android.bp` fixture for the
  Python and Pixel staging tests.
- Deletable with their tests: `test/fixtures/UpdateDownloadTest.java`, `UpdateFlowTest.java`.

## Cross-file actions
- Delete `scripts/prepare-aosp-apk.py` with its test (test-only caller; agrees with `files/scripts/prepare-aosp-apk.py.md`).
- Delete `loadListenerSystemuiTests` from `scripts/aosp-listener-systemui.ts`.
- `assertAlphaProvisioningDefault` (`scripts/aosp-capability-overlay.ts:25`) has no non-test caller: wire into
  `verify-apks`/`stage-aosp` or delete.
- Export a `sourceStamp(root)` from `scripts/prepare-local-agent.ts` so `aosp-native-fixtures.py` stops regex-slicing
  `const stamp=` (blocks the Prettier commit otherwise).
- `app-speech.ts` needs injectable ports; `AlphaDevicePlugin` update flow needs extraction into a class (also unblocks
  the T10 port of the Quint update harnesses that use `exactUpdateMembers`).
- Register `test/aosp-fresh-presets.test.py` and `test/aosp-native-fixtures.py` in the single Python runner; remove the
  `python3` spawn from `aosp-pixel10a.test.mjs`.
- Research correction: `tests-host.md:494` labels aosp-release-signing "runs a Python unittest"; it only builds zips with python3.

## Owner questions
1. Delete `scripts/prepare-aosp-apk.py` (no CI, package or doc caller)?
2. `aosp-fresh-presets.test.py` has never run in CI and needs fetched AOSP inputs: register it (skipping without inputs), or drop it?
3. Persisted SMS identity strings (`alpha-sms-sends.journal`, operation namespace): is the JVM journal-compatibility test enough, or keep a guard on the identity constants?
4. Should the "no key material committed under android/aosp" check become a CI secret-scan step instead of a host test?
5. Does upstream run `sense.test.mjs` and the TelephonyPlugin/SmsTelephony behaviours in its own CI (precondition for deleting the local re-runs and regexes)?
