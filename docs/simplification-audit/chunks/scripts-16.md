# Chunk scripts-16: `scripts/test-*` suites (local-digest … workflow-lifecycle-host)

37 files, all read completely. All are tests (or one generator) living in `scripts/` (T9). The per-file reports are in
`files/scripts/<name>.md`.

| File | Lines | Kind | Verdict | Target / note |
|---|---|---|---|---|
| test-local-digest-restart.ts | 204 | integration (4 real runtime processes, SIGKILL) | KEEP, MOVE, SIMPLIFY | `test/resident/digest-restart.test.ts`; drop `result.json`; delete `test/digest-restart-input.test.mjs` |
| test-local-digest-storage.ts | 64 | integration (dev store on disk + digest inbox) | KEEP, MOVE | `test/integration/digests.test.ts` |
| test-local-redaction.ts | 192 | live e2e (real provider, opt-in `--live`) | KEEP, MOVE, SIMPLIFY | `test/live/redaction.test.ts` (skipped without opt-in) |
| test-mail-html.ts | 27 | unit (sanitiser under jsdom) | REWRITE | 4 hostile-input cases in `journeys/inbox.spec.ts` (reuse `mail-images.spec.ts` setup) |
| test-maps-context-browser.ts | 57 | Playwright-in-script (T9) + in-page imports (T6) | REWRITE | `journeys/maps.spec.ts` (wire-context privacy) |
| test-maps-device-navigation.ts | 403 | integration (+ T1 upstream text block) | KEEP, MOVE, SIMPLIFY | `test/integration/maps-navigation.test.ts`; delete lines 109-130 |
| test-maps-reroute-freshness.ts | 134 | transplant (T2) + upstream unit (T5) | REWRITE | `journeys/maps.spec.ts` (aged fix keeps route) |
| test-mobile-workflow-bundle.ts | 56 | integration (packaged bundle under Bun) | KEEP, MOVE | `test/resident/`; CI `resident-android.yml` mobile-bundle |
| test-native-calendar-consumer.ts | 30 | upstream fixture runner, no caller | DELETE | upstream follow-up |
| test-native-calendar-deletion-restart.ts | 35 | Android campaign | KEEP, MOVE | `test/android/campaigns/` |
| test-native-cloud-runtime-config.ts | 12 | wrapper | MERGE | with `native-cloud-runtime-config-check.ts` -> `test/resident/native-cloud-runtime-config.test.ts` |
| test-native-permissions.ts | 350 | Android campaign | KEEP, MOVE, SIMPLIFY | `test/android/campaigns/permissions.ts`; unexport `cases` |
| test-native-restart.ts | 254 | Android campaign | KEEP, MOVE, SIMPLIFY | `test/android/campaigns/restart.ts`; delete `notes-secure-migration` (D1) |
| test-notes-action-flow.ts | 29 | integration (NotesStore + DeviceActions) | MERGE | `test/integration/notes-agent-actions.test.ts`; seed `NOTES_KEY` not legacy |
| test-notes-documents-browser.ts | 42 | Playwright-in-script on legacy source | DELETE | covered by `mvp.spec.ts` Import text note |
| test-notes-query-flow.ts | 45 | integration (DocumentNotesStore + executor + DeviceActions) | KEEP as merge base | `test/integration/notes-agent-actions.test.ts` |
| test-notes-store-flow.ts | 30 | unit of upstream store + legacy migration | DELETE | upstream owns; `notes-document-storage.spec.ts` |
| test-notes-trash-flow.ts | 189 | unit of upstream trash policy | DELETE | `notes-trash*.spec.ts`; keep one 30-day clock case in `journeys/notes.spec.ts` |
| test-own-notice-question.ts | 82 | transplant (T2) | DELETE | `reminder-notice-question.spec.ts`, `gmail-notice-question.spec.ts`, Quint `OwnNoticeQuestion` |
| test-photo-filter-png-reference.ts | 40 | generator | KEEP, rename | `scripts/generate-photo-filter-goldens.ts` (writes the androidTest asset) |
| test-reminder-one-off.ts | 33 | Android campaign | MERGE | `test/android/campaigns/reminders.ts` |
| test-reminder-recovery.ts | 3 | wrapper | MERGE | same |
| test-reminder-recurrence-recovery.ts | 3 | wrapper | MERGE | same |
| test-reminder-recurrence.ts | 32 | Android campaign | MERGE | same |
| test-reminder-time-flow.ts | 59 | transplant (4 files concatenated) | REWRITE | `journeys/reminders.spec.ts` (DST gap) |
| test-remote-protocol.ts | 161 | integration of hosted pairing client | DELETE | with `RemoteProtocol` (D5) |
| test-resident-reuse.ts | 116 | integration at bridge boundary | MERGE | `test/integration/local-agent.test.ts` |
| test-reviewed-workflow-host.ts | 27 | unwired live host probe | DELETE | with `fixtures/workflow-host.ts` |
| test-tts-startup.ts | 64 | transplant of vendor source | DELETE | upstream |
| test-tts-worker-lifecycle.ts | 101 | transplant of vendor source | DELETE | upstream |
| test-update-confirmation-platform.ts | 87 | unwired emulator probe | DELETE | with `test/fixtures/update-confirmation-android/` (owner may keep as campaign) |
| test-workflow-approval-crash.ts | 29 | unwired live host probe | DELETE | probe family |
| test-workflow-approval-ui-flow.ts | 29 | transplant via `workflow-renderer-fixture.ts` | REWRITE | `journeys/workflows.spec.ts` (lost response, missing disclosure, stopped run) |
| test-workflow-approvals-host.ts | 34 | unwired live host probe | DELETE | probe family |
| test-workflow-cancel-recovery.ts | 34 | unwired live host probe | DELETE | probe family |
| test-workflow-compiler.ts | 44 | integration (packaged compiler) | KEEP, MOVE, PORT | `test/resident/`; import `COMPILER_PROGRAM` instead of regex |
| test-workflow-lifecycle-host.ts | 17 | unwired live host probe | DELETE | probe family |

Totals: KEEP 10 (all moved out of `scripts/`), DELETE 14, MERGE/REWRITE 13.

## Behaviour that loses coverage if the DELETEs happen without replacements

- **Maps reroute on an aged fix keeps the route** ("current route was kept"): no Playwright spec asserts it today; only the
  transplant and the Quint model. Needs the `journeys/maps.spec.ts` case before deleting the transplant.
- **Reminder at a DST-gap time is refused** ("Time skipped (DST)"): no browser spec has it. Needs the `journeys/reminders.spec.ts`
  case.
- **Workflow approval lost-response lock, missing-disclosure block and stopped-run close**: `workflows.production.spec.ts` covers
  only the second confirmation. Needs three journey cases.
- **Hostile HTML mail inputs** (SVG/foreignObject, `javascript:` links, `data:` SVG images, forms, size bound):
  `mail-images.spec.ts` covers only one injected `<script>`. Needs four inbox journey cases.
- **Maps wire-context privacy** (coordinates/labels/search text never sent): partly in `maps-approved-read.spec.ts`; carry the
  case.
- **Upstream engine/worker behaviour** (workflow approval/cancel/lifecycle durability across SIGKILL, TTS/ASR worker
  lifecycle, NotesStore and Trash policy algorithms): loses Alpha-side coverage by design; these are upstream's to test
  (D14 follow-ups). The workflow host probes never ran in CI, so nothing that runs today is lost.
- **OTA PackageInstaller confirmation across process death** (`test-update-confirmation-platform.ts`): never wired; owner
  decides.

## Shared helpers worth keeping (move to `test/support` or `test/fixtures`)

- `scripts/native-test-fixture.ts` (all Android campaigns) - add `until`, `pidof`, `setPermission`,
  `instrumentExpectingCrash` here instead of the copies in `test-native-permissions.ts` / `test-native-restart.ts`.
- `scripts/reminder-recovery-fixture.ts` - absorbed into the merged reminders campaign.
- `scripts/fixtures/hosted-digest-protocol.ts`, `scripts/fixtures/loopback.ts` - move to `test/fixtures/`.
- `scripts/local-agent-source.ts`, `scripts/workflow-worker-artifact.ts` - product tooling, keep.
- New: one `poll/until`, one `killProcessGroup` (digest-restart `killOwned` = redaction `terminate`), one `freePort`, one
  upstream-lock reader (four files here read `upstream.lock.json` by hand), one `deviceActionHarness` (journal/proposal fakes
  copied between the two Notes flows).
- Losing importers: `scripts/fixtures/prototype-script.ts` (reroute transplant), `scripts/workflow-renderer-fixture.ts`
  (approval UI), `scripts/fixtures/playwright.ts` (two browser scripts here), `scripts/fixtures/workflow-host.ts` (all six
  importers deleted: delete it), `test/fixtures/update-confirmation-android/` (sole user deleted).

## Cross-file actions

1. Delete shim tests that only spawn these scripts: entries in `test/adapter-contracts.test.mjs` (maps-device-navigation,
   reminder-time-flow, notes-*, workflow-approval-ui-flow), `test/browser/adapters.spec.ts` (maps-context, notes-documents),
   `test/local-agent-contracts.test.mjs:11`, `test/mail-html.test.mjs`, `test/maps-reroute-freshness.test.mjs`,
   `test/own-notice-question.test.mjs`, `test/tts-worker-lifecycle.test.mjs`, `test/connection-contracts.test.mjs:7`,
   `test/resident-attachment.test.mjs:21-23` (and its source-slice case), `test/digest-restart-input.test.mjs`.
2. Delete host tests of the campaign runners (T5): `test/native-permission-runner.test.mjs`, `test/native-restart-runner.test.mjs`,
   `test/native-reminder-runner.test.mjs`, `test/native-reminder-recovery-runner.test.mjs`, the runner parts of
   `test/android-instrumentation-runner.test.mjs` (it reads `test-native-restart.ts` text), and `test/fixtures/isolated-native-campaign.mjs`
   once nothing imports it.
3. Update path references after moves: `package.json` (`agent:test-redaction`, `agent:test-digest-restart`,
   `agent:test-mobile-workflow-bundle`, `agent:test-workflow-compiler`), `.github/workflows/resident-android.yml:312,313,329`,
   `.github/workflows/digest-restart.yml` path filter, `scripts/android-instrumentation.ts:149-311` notes and campaign list, Java
   comments in the instrumented tests, `photo-filter-goldens.json` `source` field.
4. D1: delete `notes-secure-migration` case + `NotesSecureStorageInstrumentedTest#secureMigrationProcessRestartPhase`; reseed
   `test-notes-action-flow` via `NOTES_KEY`; `test/browser/helpers/legacy-notes.ts` loses `test-notes-documents-browser.ts`.
5. D5: `test-remote-protocol.ts` goes when `RemoteProtocol` leaves production; sequence with `scripts/test-connection-history.ts`
   and `fixtures/workflow-host.ts` (also D5 pairing).
6. Upstream follow-ups (D14): export `COMPILER_PROGRAM` from plugin-workflow; speech worker env must not forward provider keys;
   native-calendar consumer test in elizaOS CI.
7. One import path for `requireInstrumentationInterruption` (vendor `.mjs` vs `scripts/instrumentation-result.ts`).

## Owner questions

1. The Android campaigns (permissions, restart, reminders, calendar deletion restart) are run by no workflow. Keep them as
   documented manual campaigns under `test/android/campaigns/`, wire some into `android-emulator.yml`, or delete them with
   the instrumented methods only they drive?
2. Deleting the six workflow host probes leaves `scripts/start-reviewed-workflow-agent.ts` and the `ReviewedWorkflowLauncher`
   Quint model without users. Delete them too?
3. `test-local-redaction.ts` (real Cerebras, opt-in): keep as a pre-release live check (who runs it, with which key), or delete?
4. `test-update-confirmation-platform.ts`: delete, or keep as a manual OTA confirmation campaign?
5. Photo filter goldens: keep the generator (renamed, writing the asset directly) as the regeneration path?
