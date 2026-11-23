# Chunk scripts-14: `scripts/test-a*` … `scripts/test-cross-*` (23 files)

All 23 files exist; none were deleted by the concurrent product work except that `test-calendar-sync-provider.ts` now
imports a deleted module (`runtime/calendar-linked-provider.ts`, D4) and fails.

| File | Kind | Verdict | Target |
|---|---|---|---|
| test-automatic-update-platform.ts | device probe + Java source transplant, no caller | DELETE (+ `test/fixtures/automatic-update-android/OtaActivity.java`) | — |
| test-batch-progress-stream.ts | integration (bundled real stream parser) | MOVE | `test/voice-progress.test.ts` |
| test-batch-voice-progress-ack.ts | unit (stubbed ack state machine) | MERGE (~8 cases) | `test/voice-progress.test.ts` |
| test-browser-bookmark-recovery.ts | Playwright in a child process, hand-written bridge | REWRITE | `journeys/browser.spec.ts` |
| test-browser-storage-format.ts | campaign wrapper (17 lines) | MERGE | `scripts/android-instrumentation.ts` registry entry |
| test-calendar-availability-flow.ts | integration (+ T1 block 57-65) | MOVE, drop T1 block | `test/calendar-availability.test.ts` |
| test-calendar-availability-provider-rows.ts | integration helper spawned with argv | MERGE | `test/calendar-availability-reader.test.mjs` |
| test-calendar-crud-review.ts | transplant (+ 2 T1 regexes) | DELETE + REWRITE 4 cases | `journeys/calendar.spec.ts` |
| test-calendar-query-race.ts | transplant | DELETE + REWRITE 1 case | `journeys/calendar.spec.ts` |
| test-calendar-regression.ts | device campaign runner | KEEP + SIMPLIFY, move | `scripts/android/campaigns/` |
| test-calendar-sync-provider.ts | integration of deleted D4 module (broken) | DELETE (+ `test/calendar-linked-provider.test.mjs`) | — |
| test-canonical-notification-navigation.ts | transplant + main.tsx/shade slicing | DELETE + REWRITE 5 cases | `journeys/notifications.spec.ts` |
| test-clock-handoff-flow.ts | transplant | DELETE + REWRITE 4 cases | `journeys/workflows.spec.ts` |
| test-cloud-delegation-return.ts | integration of real static page (child process) | MOVE | `journeys/connection-cloud.spec.ts` |
| test-cloud-delegation.ts | separate Vite build of real panel + own HTTP server | REWRITE 7 cases | `journeys/connection-cloud.spec.ts` |
| test-cloud-maps.ts | integration + failure-copy table | MOVE, shrink copy asserts | `test/maps-cloud.test.ts` |
| test-cloud-personal-flow.ts | D5 retired path | DELETE | — |
| test-cloud-protocol.ts | integration over loopback (+ D5 agent parts, prototype-shape T1) | MOVE, drop D5/T1 parts | `test/cloud-protocol.test.ts` |
| test-cloud-subscription.ts | integration over fake transport | MERGE | `test/cloud-protocol.test.ts` |
| test-cloud-voice-cancellation-flow.ts | transplant (`cloud-voice-view.mjs`) | DELETE + REWRITE 2 cases | `journeys/voice.spec.ts` |
| test-cloud-voice-flow.ts | transplant | DELETE + REWRITE | `journeys/notes.spec.ts` + integration on `NoteRecorderSession` |
| test-connection-history.ts | 471-line transplant of `connection-ui.tsx`, mostly D5 | DELETE + REWRITE 4 cases | `journeys/chat.spec.ts`, `test/local-agent-observation.test.ts` |
| test-cross-app-notifications.ts | device campaign runner | KEEP + SIMPLIFY, move | `scripts/android/campaigns/` |

Counts: KEEP 2, DELETE 10 (8 with a journey/integration rewrite of selected cases), MOVE 5, MERGE 5, REWRITE-only 1.

## Coverage that would be lost if DELETEs land without their rewrites
- Automatic (no-prompt) app self-update on Android: only `test-automatic-update-platform.ts` checked it, and it never
  ran in CI. Needs an owner decision and, if kept, an androidTest on the real installer path.
- Native Calendar unknown-delete hold, external handoff and committed-receipt refresh keeping the draft
  (`test-calendar-crud-review.ts`); stale month read discarded (`test-calendar-query-race.ts`).
- Canonical notification tap routing/acknowledgement and draft protection (`test-canonical-notification-navigation.ts`);
  `canonical-notification-security.test.mjs` covers only owner/token rules.
- Clock handoff lost-response "Unknown" without retry and storage-failure refusal (`test-clock-handoff-flow.ts`);
  existing clock specs cover the happy path and repeat days.
- Read-aloud Stop -> voice capture ordering and late synthesis suppression (`test-cloud-voice-cancellation-flow.ts`).
- Notes recording failed-save retention and Cloud-transcription consent after Stop (`test-cloud-voice-flow.ts`).
- Chat Stop with/without turn-abort, refusal copy without retry, `calendarDay` observation admission
  (`test-connection-history.ts`). These are the most valuable cases in the chunk and today run only through a text cut.

## Shared helpers worth keeping
- `scripts/fixtures/local-agent-stream.ts` (esbuild loader of the real stream module) -> `test/fixtures/` until Stage F
  makes the module Node-importable.
- `scripts/fixtures/loopback.ts` (used by the kept Cloud protocol test).
- `scripts/instrumentation-result.ts` parser: campaign runners should use it instead of local log parsers.
- Not worth keeping after this chunk: `scripts/fixtures/calendar-adapter.ts` and `prototype-script.ts` (transplant
  harnesses; check their other importers in other chunks), `test/fixtures/cloud-voice-view.mjs` (both importers here
  are DELETE), `scripts/fixtures/cloud-delegation/` (after the journey rewrite; also referenced by
  `audit-production-bundle.ts`, `ci/export-browser-proof.ts`, `prototype-capture.ts` and Quint specs).

## Cross-file actions
- `test/adapter-contracts.test.mjs`: remove entries for calendar-crud-review, calendar-query-race, clock-handoff-flow,
  cloud-protocol, cloud-subscription, cloud-personal-flow, cloud-voice-flow, cloud-voice-cancellation-flow, cloud-maps.
- `test/browser/adapters.spec.ts`: remove cloud-delegation, cloud-delegation-return, browser-bookmark-recovery.
- Delete shims: `test/batch-progress-stream.test.mjs`, `batch-voice-progress-ack.test.mjs`,
  `calendar-availability.test.mjs`, `calendar-linked-provider.test.mjs`, `canonical-notification-navigation.test.mjs`;
  `connection-contracts.test.mjs` loses `test-connection-history.ts`.
- `test/fixtures/workflow-clock-admission.mjs:21` (`workflowClockSources`, used by the Quint
  `workflow-clock-admission` harness) lists `scripts/test-clock-handoff-flow.ts`: remove the entry with the delete or
  the harness fails (keep Quint at 100 %).
- `scripts/android-instrumentation.ts` `CAMPAIGN_RUNNERS`: drop `test-browser-storage-format.ts` and add a registry
  entry for `BrowserStorageFormatInstrumentedTest`; update paths if campaigns move.
- `apps/app/src/runtime/phone-context.ts:131` comment and its copied `CALENDAR_AVAILABILITY_CAPABILITY` constant
  (import from contracts instead, C6).
- Comments naming `test-connection-history.ts` in `test/browser/connection-boundaries.production.spec.ts:412` and
  `test/workflow-device-bindings-fixture.test.mjs:5`.
- `ALPHA_ACK_HOST_ROOT` knob is also read by `test/batch-ack-shell-retirement.test.mjs`; remove both together.
- `cloudDelegationSlot` product export exists only for the delegation fixture (delete-candidates B274).

## Owner questions
1. Is automatic (no-prompt) app self-update an MVP path that needs an emulator/androidTest proof, or can
   `test-automatic-update-platform.ts` and its fixture go without replacement?
2. Device campaign runners (`test-calendar-regression.ts`, `test-cross-app-notifications.ts`) never run in CI: keep them
   as manual evidence tools under `scripts/android/campaigns/`, or wire them into an emulator lane?
3. The Cloud sign-in browser hand-off (`CloudProtocol.login`) is described as "product until the in-app readiness probe
   passes": is it still a product path, and is the legacy `apiKey` response still possible?
4. Note recorder Cloud transcription (consent after Stop) is an open decision; keep its integration test or delete with
   the feature?
