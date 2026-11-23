# Chunk test-47: host tests `reset-wiring` … `secure-store-memory`

39 assigned files (38 present; `test/scanned-calendar-handoff.test.mjs` was already deleted). Per-file reports are in
`docs/simplification-audit/files/test/`.

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| reset-wiring.test.mjs | Java compile+run of constants, source-text | DELETE | device: `ResetPolicyInstrumentedTest`; Quint reset-orchestration |
| resident-admission-outcome.test.mjs | unit (real import, table) | REWRITE | `journeys/connection-cloud.spec.ts` (6 cases) |
| resident-agent-fixture-provider-status.test.mjs | transplant of a test helper | DELETE | T5 |
| resident-android-json-compile.test.mjs | compile check | DELETE | Android build compiles it |
| resident-attachment.test.mjs | upstream JVM + spawn + source-text + Java transplant | DELETE | also delete `scripts/test-resident-reuse.ts`, 2 fixtures |
| resident-auto-retry.test.mjs | transplant + source-text | REWRITE | `journeys/connection-cloud.spec.ts` (1 case, Playwright clock) |
| resident-binding-guard-return.test.mjs | transplant | DELETE | |
| resident-build-output.test.mjs | tests upstream tsconfig | DELETE | upstream follow-up |
| resident-crash-diagnostic.test.py | CI tooling (Python), runs twice | DELETE | remove `python-suites.test.mjs:27`, `resident-android.yml:245` |
| resident-crash-diagnostics.test.mjs | wrapper spawning Python | DELETE | also `scripts/ci/test-resident-uid-crash-audit.py` |
| resident-credential-shutdown-retry.test.mjs | Java transplant ×3 | DELETE | dup of Quint `resident-coordinator` |
| resident-explicit-panel-startup.test.mjs | transplant | REWRITE | `journeys/connection-cloud.spec.ts` (1 case) |
| resident-native-ci-admission.test.mjs | CI tooling, inline Python, source-text, one real import | MERGE (test 4 only) | `test/android-ci-tooling.test.mjs` (emulator admission) |
| resident-native-patch-admission.test.mjs | hash pins of vendor files, tombstone | DELETE | |
| resident-prebind-stop.test.mjs | 9-slice transplant | DELETE | carry 1 case to connection-cloud journey |
| resident-recovery-review.test.mjs | JVM unit + source-text | DELETE | dup of Quint `resident-coordinator` |
| resident-recovery.test.mjs | unit + transplant | DELETE | `resident-recovery.production.spec.ts` |
| resident-result-transport.test.mjs | JVM of Alpha classes | DELETE | dup of Quint `hosted-inbox` harness |
| resident-retirement-cleanup.test.mjs | transplant (incl. C4 `remote` kind) | DELETE | |
| resident-start-failure-policy.test.mjs | Java transplant + source-text | DELETE | |
| restored-history-limits.test.mjs | transplant (connection-ui + model.js) | REWRITE | `journeys/chat.spec.ts` (2-3 cases) |
| retained-reminder-tap-admission.test.mjs | transplant fixture + Quint | DELETE | dup of application refinement aggregate |
| retired-shell-work.test.mjs | transplant | DELETE | carry typing-lease case to chat journey |
| runtime-licenses.test.mjs | tooling integration | MERGE | `test/release-licences.test.mjs` |
| runtime-source-clone.test.mjs | tooling integration (spawns preparer, git) | KEEP, SIMPLIFY | drop APFS/timing evidence |
| saved-note-speech-policy.test.mjs | JVM unit of upstream `RecordingWindow` | DELETE | upstream follow-up |
| saved-note-transcript.test.mjs | unit (real import, port stub) | REWRITE | `journeys/notes.spec.ts` (3 cases) |
| sbom.test.mjs | tooling integration | MERGE | `test/release-licences.test.mjs` |
| scan-all-day-draft.test.mjs | unit | REWRITE | `journeys/camera-photos.spec.ts` (1 case) |
| scan-document-draft-ownership.test.mjs | unit of upstream scan-document | DELETE | upstream follow-up |
| scan-document-drafts.test.mjs | transplant bundle + jsdom | REWRITE | `journeys/camera-photos.spec.ts` (4 cases) |
| scan-event.test.mjs | unit + re-export identity | DELETE | `scan-event.spec.ts` |
| scan-page-camera.test.mjs | transplant | DELETE | `scan-page-camera.spec.ts`, `scan-native-page-camera.spec.ts` |
| scan-review-pdf-errors.test.mjs | transplant + bundle | REWRITE | `journeys/camera-photos.spec.ts` (2) + `journeys/files.spec.ts` (1) |
| scanned-calendar-handoff.test.mjs | — | already deleted | |
| scheduled-task-controls.test.mjs | transplant fixture + Quint | DELETE | dup of application refinement aggregate |
| scoped-calendar-snapshot.test.mjs | JVM integration | DELETE | identical run in Quint `scoped-calendar-review-platform.mjs:170-171` |
| scripts-typescript.test.mjs | inventory/lint | DELETE | `typecheck:scripts` |
| secure-store-memory.test.mjs | JVM unit of patched upstream, 600 s budget | DELETE | upstream follow-up |

Totals: 26 DELETE, 11 MERGE/REWRITE, 1 KEEP, 1 already gone.

## Corrections to `research/tests-host.md`
- `runtime-licenses.test.mjs` and `runtime-source-clone.test.mjs` run no Python unittest; they import/spawn TS scripts.
- `scan-document-draft-ownership.test.mjs` tests upstream `plugin-native-camera` code, not a `scripts/` module (T5, delete).
- `resident-android-json-compile`, `resident-recovery-review`, `resident-result-transport`, `scoped-calendar-snapshot`,
  `secure-store-memory`, `saved-note-speech-policy` were "keep; merge into Gradle JVM": there is no Gradle JVM test source
  set, and four of them duplicate Quint native refinement harnesses that compile the same classes (T4); the other two
  test upstream classes. Delete instead of creating a new unit-test source set.
- Quint duplication: `retained-reminder-tap-admission` and `scheduled-task-controls` re-run components that
  `specs/quint/refinement/application/index.mjs` already runs in `quint-application-refinement.test.mjs`.

## Behaviours that lose all coverage if the DELETEs land without replacements
1. Resident auto-retry schedule (3/10/30/60 s, start-failed only): add to connection-cloud journey.
2. Startup completion keeps an explicitly opened plan/account panel: connection-cloud journey.
3. Pre-bind stop refusal preserves the bound provider and never starts again (`resident-prebind-stop`): connection-cloud
   journey with a stub that refuses stop. Partly modelled upstream in `cloud-resident-binding`.
4. Admission outcome → sign-in/detach/forget-plan mapping (`resident-admission-outcome`): connection-cloud journey.
5. Restored and proactive chat rows over 200,000 characters are clipped for display, not dropped: chat journey.
6. A retired send's cleanup cannot clear a newer send's typing state: chat journey.
7. Saved-note windowed transcription (order, single save, no retry, stops on note change): notes journey.
8. Scan document Close/Keep/Discard/Resume/Delete draft flow on native: camera-photos journey.
9. All-day poster → all-day Calendar draft with stable creation identity: camera-photos journey.
10. Searchable-PDF "nothing written keeps review open"; Recent eviction releases a picked document's grant:
    camera-photos and files journeys.
11. Native-only, no host replacement proposed (accept or cover by emulator instrumentation): image-revocation retirement
    of the Contacts view (AOSP image), resident attach for a second surface without re-pairing, reset recovery-copy
    "never claims deletion" (upstream), `RecordingWindow` ownership/clipping and secure-store 32 MiB memory bound
    (upstream follow-ups).

## Shared helpers and fixtures
- Keep: `test/fixtures/jvm-tools.mjs`, `test/fixtures/native-source.mjs` (Quint native harnesses import them);
  `SqliteCalendarProvider.java`, `ScopedCalendarSnapshotTest.java`, `scoped-calendar-jvm/` (Quint scoped-calendar and
  calendar-sync harnesses); `retained-reminder-tap.mjs`, `scheduled-task-controls.mjs` (Quint application harnesses, until
  those are ported per T10); `workflow-device-bindings.mjs` (other importers); `secure-store-memory/` (still imported by
  `gmail-background-lock-contention.test.mjs`).
- Orphaned by this chunk (delete with it): `test/fixtures/ResidentAttachmentTest.java`, `ResidentAttachDiagnosticTest.java`,
  `ResidentCredentialShutdownRetryTest.java`, `ResidentResultTransportTest.java`, `ResidentDeliveryTest.java`;
  `scripts/test-resident-reuse.ts`; `scripts/ci/test-resident-uid-crash-audit.py`.
- New shared fixture for the merge: one staged-runtime builder used by `test/release-licences.test.mjs` (replaces
  `runtime-licenses.test.mjs:22-59` and `sbom.test.mjs:166-203`).

## Cross-file actions
- Remove `test/python-suites.test.mjs:27` and `.github/workflows/resident-android.yml:245` with
  `resident-crash-diagnostic.test.py`.
- Quint `hosted-inbox.mjs` compiles `HostedTransport.java` and `NativeDeviceEnrollmentKey.java`; it must be updated when
  C4 deletes them (same for the deleted `resident-result-transport` test, which would have broken).
- `resident-explicit-panel-startup` and `resident-prebind-stop` slice to `async function connectCloud(`; stage A4 (C4)
  breaks them, so delete them before or with A4.
- Path filters for the survivors: release-licences → `scripts/generate-*.ts`, `scripts/licence-policy.ts`,
  `scripts/agent-bundle-dependencies.ts`, `licenses/**`, `package-lock.json`, `android/gradle/verification-metadata.xml`;
  runtime-source-clone → `scripts/prepare-local-agent.ts`, `scripts/local-agent-source.ts`, `scripts/copy-file-clone.ts`,
  `upstream.lock.json`; emulator admission → `scripts/resident-emulator-admission.ts`.
- Upstream follow-ups (D14): knowledge plugin `tsconfig.build` stories exclusion; `ResidentAttachment`; `RecordingWindow`;
  `JsonCredentialSlots` large-record memory; `createScanDocument` draft ownership; reset recovery copy.

## Owner questions
1. Is `scripts/ci/resident_crash_diagnostic.py` (and `resident_uid_crash_audit.py`) still wanted, given
   `resident-android.yml` has had no green run in 40? Their tests are deleted here either way.
2. Should the SBOM still list the "legacy qualification record; incompatible with current Paradee engine" embedding host
   and model, or should those entries go with the legacy record?
3. Are the `resident_native_source.py` / `resident_fixture.py` CI tamper verifiers (tested only by
   `resident-native-ci-admission` test 1) worth keeping, or is `resident-android.yml` itself being retired?
