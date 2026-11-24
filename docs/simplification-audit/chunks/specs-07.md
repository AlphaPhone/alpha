# Chunk specs-07: application Quint models R–Sh and the family README

31 files: `specs/quint/application/README.md` and 30 models from `ReadAloud` to `ShellNavigation`. Per-file reports
are under `files/specs/quint/application/…`. Every model here is listed in `application/manifest.json`, so all are
live for `quint:check`. Every listed `sources` file still exists, and every symbol pin still matches today.

## Files

| File | Kind | Verdict | Target / note |
|---|---|---|---|
| README.md | family docs | SIMPLIFY | Delete the per-model table (98 of 187 models; repeats the manifest), the legacy/D3 rows and the exact counts |
| ReadAloud.qnt | model, no harness | KEEP | Only symbol pins tie it to code |
| ReadReplyLease.qnt | model, no harness | KEEP | Only symbol pins; `agent-adapter`/`connection-ui` split will move them |
| RecorderStage.qnt | model, no harness | KEEP | Symbol pins on generic words (`generation`, `cleanup`) prove nothing |
| ReminderDecision.qnt | model + import harness | KEEP | Vacuous `startedStale`/`FreshBeforeDecision` |
| ReminderIntents.qnt | model + import harness | KEEP | Owner question: `ownerDiscard` has no product action |
| ReminderOpenIntent.qnt | model + transplant harness | KEEP / PORT | Port to `reminder-adapter-fixture.mjs`; "Legacy" header is misleading |
| ReminderRefresh.qnt | model + import harness | KEEP | — |
| ReminderTapTokens.qnt | model + import harness | KEEP (merge target) | Bundled-output text anchor for the tap probe |
| ReminderTodoAttempt.qnt | model + import harness | KEEP | — |
| RendererDigestQueue.qnt | model + import harness | KEEP | Path follows A103 (`digest-inbox.ts` → `hosted-background.ts`); Q-HOST-5 |
| RendererFailureUI.qnt | model + import harness (source append) | KEEP / PORT light | Stop appending an inspector to `error-boundary.tsx` |
| RendererHostedInbox.qnt | model + import harness | KEEP | A103 path; Q-HOST-5 |
| ResidentLiveness.qnt | model + slice harness | KEEP / PORT | Slices `connection-ui.tsx`; imports `legacy/core/source-support.mjs` |
| RetainedHomeBrief.qnt | model + import harness | KEEP | Q-HOST-5 |
| RetainedReminderTapAdmission.qnt | model + transplant harness | MERGE | into `ReminderTapTokens.qnt` (3 scenarios) |
| SavedServiceRead.qnt | model + import harness | KEEP | Reformat; drop harness hashing |
| ScheduledSnoozeAdmission.qnt | model + import harness | KEEP | Unbounded clock; drop provenance assert |
| ScheduledTaskControls.qnt | model + import harness | KEEP | Split 250-char cron lines; drop `template.html` source pin |
| ScreenFocusOwnership.qnt | model + injection harness | KEEP / PORT | Marker injection into prepared upstream file + sha256 checks |
| SelectedDocumentViewer.qnt | model + import harness | KEEP | — |
| SettingsCapabilityReads.qnt | model + transplant test | KEEP (merge target) / PORT | Absorbs SettingsReads' capability half |
| SettingsListenerReads.qnt | model + marker-slice test | KEEP / PORT | `// settings-reads:begin/end` markers in product code |
| SettingsPageFocus.qnt | model + slice harness | KEEP / PORT | Slices `model.js` `var stPageFocus =` |
| SettingsReads.qnt | model, no harness | MERGE | into `SettingsCapabilityReads.qnt` + `SettingsSession.qnt` (4 scenarios) |
| SettingsSession.qnt | model + transplant test | KEEP / PORT | Slices `settings-adapter.ts` at 3 anchors |
| ShadeNoticeQuestionAdmission.qnt | model of dev-only code + transplant | KEEP conditional (D19/D20) / PORT | Vacuous `staleEffect` |
| ShadePull.qnt | model + `model.js` text fixture | KEEP / PORT | Android surface is production |
| ShadeRowCustody.qnt | model of dev-only code + transplant | KEEP conditional (D19/D20) / PORT | Simulated shade only |
| SharePanelAdmission.qnt | model + whole-file vm | KEEP / PORT light | `sourceContext` → `bundledSource` |
| ShellNavigation.qnt | model + slice harness + Vite/Chromium replay | KEEP / PORT | Slices `model.js` `goHome`..`/* ---- Android` |

Totals: 0 DELETE, 28 KEEP (13 of them need a harness PORT, 2 of those light), 2 MERGE, 1 SIMPLIFY (README).

## How the models are tied to code (T10)

- **Import-based, fine as is (12):** ReminderDecision, ReminderIntents, ReminderRefresh, ReminderTapTokens,
  ReminderTodoAttempt (`reminder-adapter-fixture.mjs` esbuild bundle with port stubs), RendererDigestQueue,
  RendererHostedInbox, RetainedHomeBrief (`support.mjs` `bundledSource`), SavedServiceRead, ScheduledSnoozeAdmission,
  ScheduledTaskControls, SelectedDocumentViewer (`loadBundled`). Use these as the template for every port.
- **Text-anchored, PORT or removed by MERGE (12):** ReminderOpenIntent, RetainedReminderTapAdmission (fixture slices `reminder-creations.ts`
  and runs `reminder-adapter.ts` in `vm`), ResidentLiveness (`connection-ui.tsx` slice), SettingsPageFocus and
  ShellNavigation (`model.js` slices), ScreenFocusOwnership (marker injection into the prepared upstream file),
  SettingsCapabilityReads / SettingsSession / SettingsListenerReads (host tests slicing `settings-adapter.ts`),
  ShadeNoticeQuestionAdmission / ShadeRowCustody (fixtures slicing `notifications-adapter.ts`), ShadePull
  (`shell-core-fixture.mjs` reads `model.js`).
- **Light anchors (3):** RendererFailureUI (appends an inspector export to `error-boundary.tsx`), SharePanelAdmission
  (whole-file strip + regex import removal), ReminderTapTokens (finds `let tapBusy = false, …` in bundler output).
- **Not executed at all (4):** ReadAloud, ReadReplyLease, RecorderStage, SettingsReads. Only manifest symbol pins
  connect them to code.

Product exports the ports need:
- `runtime/resident-recovery.ts`: `createResidentLiveness(ports)`, moved out of `connection-ui.tsx`.
- `prototype/settings-adapter.ts`: one exported read factory (capability read, licence load, device facts, text
  scale), plus `listenerReadGate` in its own module. Then delete the `// settings-reads:begin/end` marker comments.
- `prototype/model.js` (Stage F split): `stPageFocus` helper module, and shell navigation methods
  (`goHome`/`openView`/`back`) as an importable module.
- `prototype/automations-adapter.ts`: the Workflows device-reminder row handler, if ReminderOpenIntent keeps that
  branch.
- Upstream (D14 follow-up): an inspector for `upstream renderer: accessibility/screen-focus.ts`, or a ScreenFocusOwnership
  harness that only observes DOM focus.

## Behaviours that would lose all coverage if the DELETEs happen

There are no DELETEs. The two MERGEs carry their unique scenarios across, so no formal coverage is lost. Two honest
gaps remain:
- The four unharnessed models (ReadAloud, ReadReplyLease, RecorderStage and the merged SettingsReads) prove properties
  of the model only. When the T3/T2 host tests for those areas go (`local-speech-playback`, read-reply,
  voice-adapter recorder, settings reads), no test runs the real code against these rules. They need journey
  coverage: `journeys/voice.spec.ts` (read a note aloud, Listen toggles, record/stop-failure/retry/apply),
  `journeys/chat.spec.ts` (an approved Notes read answers once) and `journeys/settings.spec.ts` (resume behind another
  view, licences load once).
- If the owner deletes the dev simulated shade (D19), ShadeNoticeQuestionAdmission and ShadeRowCustody go with it.
  The production shade path is then covered only by ShadePull plus NotificationCollection.

## Shared helpers worth keeping

- `specs/quint/refinement/application/reminder-adapter-fixture.mjs` (`buildReminderAdapter`,
  `reminderAdapterFixture`). It is the single reminder harness, and the ReminderOpenIntent and
  RetainedReminderTapAdmission ports should reuse it.
- `support.mjs` `bundledSource` / `sourceModule`, `browser-model-traces.mjs` `loadBundled`, and `deferred`/`tick`
  (already in `support.mjs:61-62`, so `legacy/core/source-support.mjs` is not needed).
- The transplant fixtures `test/fixtures/{reminder-open-intent,retained-reminder-tap,shade-notice-question,
  shade-row-custody}.mjs` die once their ports land. `test/fixtures/settings-model-traces.mjs` (runs Quint to
  generate SettingsSession traces) moves into the ported harness.

## Cross-file actions

1. Manifest: replace `symbols` with file pins for all 30 models. Many pins are generic words or code fragments
   (`generation`, `async function refresh()`, `licenses.status`, a UI message string).
2. A103 (`digest-inbox.ts` merged into `hosted-background.ts`) must update the `sources` of RendererDigestQueue and
   RendererHostedInbox and the `implementation` path in `renderer-digest-queue.mjs` / `renderer-hosted-inbox.mjs` in
   the same commit. `quint-lib.ts:233` reads every source at load time.
3. `resident-liveness.mjs:8` must import `deferred`/`tick` from `support.mjs` before `specs/quint/legacy` is retired.
4. T4 double runs. 14 harnesses here run both from the aggregate `test/quint-application-refinement.test.mjs` and
   from a per-model wrapper (`test/quint-{renderer-digest-queue,recovery-ui-refinement,renderer-hosted-inbox,
   resident-liveness,retained-home-brief,saved-service-read,scheduled-snooze-admission,screen-focus-ownership,
   shade-row-custody,share-panel-admission}.test.mjs`, `test/{reminder-open-intent,retained-reminder-tap-admission,
   scheduled-task-controls,shade-notice-question}.test.mjs`). Keep one runner (tests chunk).
5. `shell-coordinator.mjs` starts Vite and Chromium inside `npm test` and hashes every app/android file as input.
   Move it to the Playwright lane or path-filter it (P1).
6. README: when other chunks delete NotesLifecycle legacy mode, DurableStore/DomainDocumentCreation legacy bytes,
   BrowserSessionPersistence (D20), CredentialVault transfer, NotesDocumentTransfer, DevelopmentHost and
   PasswordProviderDialog, their README rows go too. The simpler route is to delete the table now.
7. Small model fixes: remove the vacuous `startedStale` (ReminderDecision) and `staleEffect`
   (ShadeNoticeQuestionAdmission), bound the clock in ScheduledSnoozeAdmission, add header comments to
   ResidentLiveness and ScreenFocusOwnership, and split the long cron lines in ScheduledTaskControls.

## Owner questions

- Q-HOST-5 (already open): are hosted digests and Cloud reads in PRD scope? RendererDigestQueue, RendererHostedInbox
  and RetainedHomeBrief stand or fall with that answer.
- D19: does a retained e2e spec drive the simulated development shade? If not, delete `installNotificationsAdapter`
  together with ShadeNoticeQuestionAdmission and ShadeRowCustody (D20 rule).
- ReminderIntents: the Android reminder screens offer no way to discard an unconfirmed creation or operation, so a
  full pending history blocks new reminders forever. Is that intended?
