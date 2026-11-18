# Chunk app-05: `apps/app/src/browser/` (agent-speech … development-identity), 50 files

Per-file reports: `docs/simplification-audit/files/apps/app/src/browser/<name>.md`. Line counts are physical lines in today's dense style. After Prettier, every file grows, so the estimates compare like with like.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| agent-speech.ts | SIMPLIFY | 21 | 15 |
| alert-audio.ts | KEEP (minor) | 12 | 11 |
| apps.ts | SIMPLIFY | 12 | 10 |
| audio-capture.ts | SIMPLIFY | 127 | 115 |
| audio-levels.ts | KEEP | 24 | 23 |
| audio-settings.ts | SIMPLIFY | 5 | 4 |
| browser-errors.ts | KEEP | 12 | 12 |
| browser-poll.ts | SIMPLIFY (delete unused saver) | 86 | 13 |
| browser-surface.ts | KEEP (minor) | 82 | 78 |
| calendar-agent-review.ts | KEEP | 41 | 40 |
| calendar-alerts.ts | KEEP | 8 | 8 |
| calendar-backup.ts | DELETE (D3) | 82 | 0 |
| calendar-deletions.ts | SIMPLIFY | 55 | 25 |
| calendar-editor-draft.ts | SIMPLIFY | 39 | 33 |
| calendar-editor.css | SIMPLIFY | 28 | 12 |
| calendar-editor.ts | SIMPLIFY | 49 | 40 |
| calendar-linked-local.ts | DELETE (D4) | 186 | 0 |
| calendar-meeting.css | MERGE into shared dialog stylesheet | 11 | 0 |
| calendar-meeting.ts | SIMPLIFY | 15 | 12 |
| calendar-records.ts | KEEP (minor) | 40 | 38 |
| calendar-recovery.ts | MERGE into domain recovery table | 9 | 0 |
| calendar-recurrence.ts | KEEP (minor) | 32 | 32 |
| calendar-response.css | MERGE into shared dialog stylesheet | 11 | 0 |
| calendar-response.ts | SIMPLIFY | 8 | 6 |
| calendar-store.ts | SIMPLIFY | 36 | 20 |
| calendar-sync-fields.ts | DELETE (D4) | 177 | 0 |
| calendar-time.ts | KEEP | 4 | 4 |
| calendar.ts | SIMPLIFY | 296 | 250 |
| camera-focus.ts | KEEP | 47 | 47 |
| camera-frame.ts | KEEP | 12 | 12 |
| clock.ts | SIMPLIFY | 87 | 75 |
| cloud-connection.ts | MOVE to dev/, SIMPLIFY | 142 | 130 |
| content-question.ts | MOVE to prototype/, SIMPLIFY | 49 | 45 |
| daily.ts | SIMPLIFY | 174 | 155 |
| deleted-note-origins.ts | MERGE into deletions.ts | 15 | 0 |
| deletion-recovery.ts | KEEP | 22 | 22 |
| deletions.ts | SIMPLIFY | 29 | 32 |
| dev-profile.ts | SIMPLIFY | 13 | 8 |
| development-account-document.ts | SIMPLIFY (dev/) | 37 | 25 |
| development-actions.ts | SIMPLIFY (dev/) | 60 | 45 |
| development-agent-document.ts | SIMPLIFY (dev/) | 28 | 15 |
| development-cloud-document.ts | MERGE into development-cloud.ts | 17 | 0 |
| development-cloud-ui.tsx | MOVE to dev/ (DELETE if D5 drops personal Cloud) | 33 | 25 |
| development-cloud.ts | SIMPLIFY (dev/) | 42 | 42 |
| development-connection.ts | SIMPLIFY (dev/) | 34 | 28 |
| development-digest-document.ts | SIMPLIFY (dev/) | 20 | 12 |
| development-digest-occurrence.ts | SIMPLIFY (dev/) | 109 | 85 |
| development-digests.ts | SIMPLIFY (dev/) | 77 | 65 |
| development-execution-document.ts | SIMPLIFY (dev/) | 25 | 16 |
| development-identity.ts | SIMPLIFY (dev/) | 25 | 20 |
| **Total** | | **2605** | **~1690 (≈915 removable)** |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `journalBinding {scope,proposalId,operationHash}` | type | calendar-deletions.ts:6 | daily.ts:38, deletions.ts:22, reminder-deletions.ts:6 | `JournalBinding` in `journal-retention.ts` |
| journal identity input `{scope,proposalId}` | type | deletions.ts:18 | calendar.ts:40 | `JournalIdentity` in `journal-retention.ts` |
| SHA-256 hex inline | helper | calendar.ts:50, calendar.ts:242, deletions.ts:20 | ~25 more in src | `sha256Hex()` beside `revision.ts` |
| deletion-method block (pending/settle/dismiss/undo/receipt) | helper | calendar.ts:274-278 | daily.ts:45-49 | `deletionMethods()` in `journal-retention.ts` |
| stage/settle/undo/guard algorithm | helper | calendar-deletions.ts:16-55 | reminder-deletions.ts:8-43 | generic `deletionJournal<Row>` |
| deletion history limit `500` | const | calendar-deletions.ts:24 | calendar.ts:71, daily.ts:41 | `journal-retention.ts` |
| `deviceTimeZone()` (`Intl…resolvedOptions().timeZone`) | helper | calendar.ts (×8) | calendar-alerts.ts:7, calendar-editor.ts:9, calendar-agent-review.ts:19, calendar-linked-local.ts:49 | calendar module (`calendar-time.ts`) |
| `calendarWall` / `civil` | helper | calendar-time.ts:1-2 | development-digest-occurrence.ts:34,36 (`wall`, `civil`), calendar.ts:205 (`civil`) | `calendar-time.ts` |
| alert minutes `[0,10,60]` | const | calendar-alerts.ts:7 | calendar.ts:232, calendar-editor.ts:36 | `calendar-records.ts` |
| repeat list `none/daily/weekdays/weekly` | const | calendar-recurrence.ts:10 | calendar.ts:237, calendar-backup.ts:29, calendar-editor.ts:35 | `calendar-recurrence.ts` |
| repeat→RRULE map | const | calendar-sync-fields.ts:4-8 | prototype/agent-calendar-adapter.ts:200, prototype/calendar-adapter.ts:36 | delete with D4, else `calendar-recurrence.ts` |
| occurrence id grammar `:occ:` | helper | calendar-records.ts:8 | calendar-recurrence.ts:29, calendar-backup.ts:3,37 | `calendar-recurrence.ts` |
| series zone `allDay?'UTC':tz\|\|'UTC'` | helper | calendar-records.ts:36 | calendar-recurrence.ts:12 | `calendar-recurrence.ts` |
| `EditableCalendarEvent` | interface | calendar-editor.ts:5 | `CalendarRecord` (calendar-records.ts:5) | `Pick<CalendarRecord,…>` |
| `Fields` / `Existing` | type | calendar-agent-review.ts:10-11 | upstream `CalendarFields`, `CalendarRecord` | import / Pick |
| `EventRow` alias | type | calendar.ts:22 | `CalendarRecord` | delete alias |
| `Alarm` | type | clock.ts:9 | `DeletableReminder` (reminder-deletions.ts) | Pick |
| `SpeechConnection` | type | agent-speech.ts:3 | `connectionController` (runtime/connection-ui.tsx:2198) | `Pick<typeof connectionController,…>` |
| HTTP(S) address check | helper | browser-surface.ts:12 | daily.ts:173 | shared `httpAddress()` |
| operation id regex `/^[A-Za-z0-9_-]{1,128}$/`, hex-64 regex | const | calendar.ts:41 | calendar.ts:216, daily.ts:25, deletions.ts:19, development-actions.ts:45, development-cloud-document.ts:10 | shared constants module |
| foreground predicate (hidden ∨ devBackground ∨ locked) | helper | clock.ts:39 | alert-audio.ts:7, notice-action.ts:2, notifications.ts:21, hosted-results.ts:17 | `foregroundBlocked()` (screen-locked module) |
| theme-token copy + dark detection (dialog kit) | helper | calendar-editor.ts:11, calendar-meeting.ts:6, calendar-response.ts:6, clock.ts:64, content-question.ts:9 | 15 browser files (research P4) | `openOwnedDialog()` |
| dialog CSS frame rules | css | calendar-meeting.css, calendar-response.css, calendar-editor.css | mail-attachments.css, selected-document-viewer.css, review.css | shared dialog stylesheet |
| observable document facade (`BroadcastChannel('alpha.browser.documents.v1')`) | helper | calendar-store.ts:12-34 | development-account-document.ts:11, reminder-store.ts, preference-documents.ts, notification-store.ts, hosted-results.ts, workflow-notices.ts, digest-authorization-document.ts | `observedDocument()` |
| plain-object/allowed-keys guard `keys()` | helper | calendar-editor-draft.ts:9 | ~35 `isPlainObject` copies | shared `isPlainObject` |
| connection selection parse | helper | development-actions.ts:12 | development-connection.ts:18, development-digests.ts:13,73 (+12 in src) | `readConnectionSelection()` in the connection owner |
| dev namespace regex | const | development-agent-document.ts:12 | development-digest-document.ts:15, development-execution-document.ts:10 | `development-identity.ts` |
| identity compare | helper | development-identity.ts:16 | development-identity.ts:19, development-cloud.ts:9,20 | `sameIdentity()` |
| `DevelopmentAccount` `'first'\|'second'` | type | development-account-document.ts:6 | development-cloud-document.ts:6, development-identity.ts:8 | account document |
| dev scenario list | const | development-cloud-document.ts:4 | development-cloud.ts:12, development-cloud-ui.tsx:29 | `development-cloud.ts` |
| `devSurfacesEnabled` | const | dev-profile.ts:4 | build-flags.ts:3 | `build-flags.ts` |
| `'/__alpha-browser-cloud'` endpoint | const | cloud-connection.ts:8 | runtime/browser-cloud-resident.ts:12,43, scripts/browser-cloud-dev-bridge.ts:19 | export from cloud-connection (dev/) |
| abortable sleep | helper | cloud-connection.ts:111 | other abortable sleeps (research C3) | shared `sleep(ms,signal)` |
| recorded-time formula | helper | audio-capture.ts:14,104 | (same file) | one `recordedMs()` |
| owner key `'agent:'+JSON.stringify([...])` | helper | deletion-recovery.ts:7 | runtime/deletion-owner.ts (writer) | export from deletion-owner |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `calendar-backup.ts` (whole file) | Only importer `calendar-recovery.ts`; restore UI opens only when `testMocksEnabled` (`domain-recovery.ts:9`); PRD no backup/import; D3 | High |
| `calendar-recovery.ts` restore/salvage option (lines 5-8) and the file itself after a recovery table | Same as above; positional `undefined` arg | High |
| `calendar-store.ts` `restore()` | Only used by the backup restore | High |
| `calendar-linked-local.ts` | Only importer `runtime/calendar-sync-host.ts`, which is imported only by `calendar-sync-settings.ts` (type-only in production); D4 | High (renderer) |
| `calendar-sync-fields.ts` | All 4 importers belong to the D4 linked-sync stack | Medium-high (confirm with runtime chunk re `CloudProtocol.googleCalendarSync` / Android bridge) |
| `browser-poll.ts:15-86` (`createSessionSaver`, `SessionSaver`, `saveRetryDelay`, `retryDelayForCount`, `SAVE_RETRY_*`) | `git grep -w createSessionSaver -- apps`: definition only; users are a host test, Quint `browser-tab-lifecycle.mjs`, LemmaScript proof | High (as unshipped code; owner may prefer wiring it in) |
| `clock.ts:35` `storage` listener for `alpha.browser.reminders.v1` | Nothing writes that key to localStorage; refresh comes via `alpha:reminders-document-changed` | High |
| `development-account-document.ts:33` `storage` listener on `alpha.browser.cloud.account.v1` | Legacy key, no writer | High |
| Legacy `localStorage` reader lambdas: calendar-store.ts:11, development-account-document.ts:10, development-agent-document.ts:21, development-cloud-document.ts:8, development-digest-document.ts:16, development-execution-document.ts:11-14 | D1; no writers of these keys | High (depends on `domain-document.ts` change) |
| `development-digest-occurrence.ts` pre-`settledOccurrences` compatibility branches | D1, dev data only | High |
| `development-digest-occurrence.ts:24-31` alias re-exports and `digestSourceState` wrapper | Pure renames of upstream exports; `DIGEST_RUN_WINDOW_MS` has no app importer | High |
| `apps.ts` wallet row | D2 | High |
| `audio-settings.ts` `installed` guard | Single caller, constructed once | High |
| Re-ANDed `devSurfacesEnabled` checks (apps.ts:12, development-identity.ts:7,12, development-agent-document.ts:12, development-account-document.ts:19, development-cloud.ts:17, development-digests.ts:12,72) | `browserDevProfile` implies the flag; modules are dev-only | High |
| Self-validators on dev documents (`validateDevelopmentAgent`, `validateDevelopmentDigests`, cloud-document `validate`, actions `validate`, `executionPart` shape check, account `decode` checks) | Validate bytes the same module wrote; dev-only | Medium |
| `calendar-editor-draft.ts:27` "Recover editor storage" backup button | Backup/reset dialog, test-mocks only, D3 | High |
| `development-cloud-ui.tsx:26,28` recovery buttons and `developmentOwnerRecovery` (development-identity.ts:22-25) | Backup/reset dialogs, D3 | High |
| `development-cloud-ui.tsx`, `development-cloud.ts`, `development-cloud-document.ts` (whole) | Fake personal-Cloud setup; PRD "No hosted-agent pairing"; runtime chunk lists `cloud-personal-*` for deletion (D5) | Owner decision |
| `deleted-note-origins.ts` (as a file) | 15-line single-importer adapter; merge into deletions.ts | High |
| `development-cloud-document.ts` (as a file) | Single importer; merge into development-cloud.ts | High |
| `calendar-meeting.css`, `calendar-response.css` (as files) | Near-duplicates; merge into a shared dialog stylesheet | High |
| Unused `export` keywords: `CaptureSegment`, `CalendarReviewSource`, `CalendarAlert`, `CalendarDeletionTarget`, `readCalendarEditorDraft`, `CalendarPerson`, `EditableCalendarEvent`, `RecurringCalendarRecord`, `CalendarOccurrence`, `calendarStorageKey`, `DevelopmentAgentState`, `DevelopmentMessage`, `validateDevelopmentAgent`, `DevelopmentDigestState`, `OccurrenceLoop`, `ExecutionPart` | Whole-repo `git grep -w`: no importer outside the file (apps, test, specs, scripts) | High |
| `calendar.ts:99` events-array recheck, `daily.ts:113` middle hidden check, `development-execution-document.ts:24` `raw===undefined` check, `cloud-connection.ts:88` `typeof window` | Impossible or repeated checks | High |

## Cross-file actions
1. **Delete the calendar backup/restore (D3):** delete `browser/calendar-backup.ts`; strip the restore option from `browser/calendar-recovery.ts`; delete `restore()` in `browser/calendar-store.ts`; drop `RestoreOption` and the calendar-specific copy in `browser/domain-recovery.ts`; delete `test/browser/calendar-backup-restore.spec.ts` and the restore parts of `test/browser/calendar-recovery.spec.ts`; edit `scripts/storage-specs.ts:16-17` and `test/support/feature-parity.mjs`.
2. **Recovery table:** replace `calendar-recovery.ts` (and siblings `preference-recovery.ts`, `reminder-recovery.ts`, `notification-recovery.ts`) with `openRecovery(domain)` in `domain-recovery.ts`. Update `browser/device-controls.tsx:7,36`, `prototype/calendar-adapter.ts:6,185`, `prototype/settings-adapter.ts:8,866,877`, `scripts/fixtures/calendar-adapter.ts:83`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:98`, `test/calendar-delete-latch.test.mjs:32`, `test/calendar-view-rules.test.mjs:116`, `test/calendar-sync-settings-navigation.test.mjs:92`, `test/browser/domain-recovery-lifecycle.spec.ts:23` and `test/browser/workflow-dialog-layout.spec.ts:11`.
3. **Linked-sync stack (D4):** delete `browser/calendar-linked-local.ts` and `browser/calendar-sync-fields.ts` together with `runtime/calendar-sync-host.ts`, `runtime/calendar-linked-provider.ts`, `runtime/native-calendar-sync.ts`, `runtime/calendar-linked-store.ts`/`-storage.ts`, and `calendar-sync-settings.ts` except its type. Also delete `test/browser/calendar-linked-storage.spec.ts`, `test/native-calendar-sync-port.test.mjs`, `test/calendar-linked-store.test.mjs` and the sync parts of `test/browser/calendar-sync-fixture.ts` and `test/fixtures/browser-daily-stores.mjs`. Edit `specs/quint/services/manifest.json:2342`, the `specs/quint/native/manifest.json` sync-host entries, `specs/quint/refinement/composition/ports.mjs` and the comment at `prototype/agent-calendar-adapter.ts:44`.
4. **Legacy reader removal (D1):** drop the `legacy` parameter of `BrowserDomainDocument` (`browser/domain-document.ts`) and the lambdas in `calendar-store.ts`, `development-account-document.ts`, `development-agent-document.ts`, `development-cloud-document.ts`, `development-digest-document.ts` and `development-execution-document.ts`. Delete the A1 migration specs (`test/browser/calendar-storage-migration.spec.ts`, `cloud-account-migration.spec.ts`, `cloud-setup-migration.spec.ts`, `agent-conversation-migration.spec.ts`, `execution-storage-migration.spec.ts`, `digest-execution-migration.spec.ts`, `digest-inbox-migration.spec.ts`, `digest-authorization-migration.spec.ts`, `device-storage-migration.spec.ts`, `preference-storage-migration.spec.ts`, `reminder-storage-migration.spec.ts`). Update the Quint `domain-document-creation.mjs` and `browser-deletion-poll.mjs` models.
5. **Unused session saver:** delete `browser-poll.ts:15-86` and the saver half of `test/browser-session-persistence.test.mjs`. Update `specs/quint/refinement/application/browser-tab-lifecycle.mjs` and remove the `retryDelayForCount` row from `specs/lemma/README.md`. `LemmaScript-files.txt` keeps the path.
6. **Shared deletion journal:** add `JournalBinding`, `JournalIdentity`, a deletion limit constant, `deletionMethods()` and a generic `deletionJournal<Row>` in `journal-retention.ts`. Use them from `calendar-deletions.ts`, `reminder-deletions.ts`, `calendar.ts`, `daily.ts`, `deletions.ts` and `deletion-recovery.ts`. Re-check Quint `browser-deletion-poll`, `browser-reminder-orphan` and the manifest at lines 2004-2008 and 2530-2535.
7. **Dialog kit:** add `openOwnedDialog()` and one dialog stylesheet. Migrate `calendar-editor.ts`/`.css`, `calendar-meeting.ts`/`.css`, `calendar-response.ts`/`.css`, `clock.ts` and `content-question.ts`, plus the other 15 browser dialogs from the research list. Mount every dialog inside `.os` so the token copying can go.
8. **Observable document:** add `observedDocument()` and use it in `calendar-store.ts`, `development-account-document.ts`, `reminder-store.ts`, `preference-documents.ts`, `notification-store.ts`, `hosted-results.ts`, `workflow-notices.ts` and `digest-authorization-document.ts`. Keep the `alpha:*-document-changed` event names.
9. **Dev boundary (D6):** move `cloud-connection.ts`, the `development-*` files (12 in this chunk), and `dev-profile.ts` or its flags into `apps/app/src/dev/` behind one dynamic import. Remove the export folds (`development-cloud-ui.tsx:10`, `development-identity.ts:10`) and the inner flag checks. Update importers `runtime/connection-ui.tsx`, `runtime/native-connection.ts`, `runtime/hosted-digest-ui.tsx`, `browser/voice.ts`, `main.tsx`. Update `vite.config.ts` stubs and `test/dev-surface-gates.test.mjs`, and edit the `feature-parity.mjs` paths. Run the bundle audit with the flag on and off.
10. **`devSurfacesEnabled` single definition:** make `dev-profile.ts` import it from `build-flags.ts`. Add an `import.meta.env` shim in the shared Node test loader (`test/support/strip-types.mjs`). Delete the source-text tests `test/dev-surface-gates.test.mjs` and `test/settings-truth.test.mjs:173`, or rewrite them (D10).
11. **Shared small helpers:** add `sha256Hex` (beside `revision.ts`), `deviceTimeZone`/`civilWall` in `calendar-time.ts`, `httpAddress`, `foregroundBlocked` (screen-locked module), `readConnectionSelection` (connection owner, `runtime/connection-ui.tsx:204` `SELECTION`), id regex constants, `CALENDAR_ALERT_MINUTES`, `calendarRepeats` and the occurrence-id helpers. Touched files: calendar.ts, deletions.ts, daily.ts, browser-surface.ts, clock.ts, alert-audio.ts, the development files, calendar-alerts.ts, calendar-editor.ts, calendar-records.ts, calendar-recurrence.ts, development-digest-occurrence.ts.
12. **Move `content-question.ts` to `prototype/`:** update 8 importers, 3 + 1 Quint manifest entries, 4 Quint harnesses, `scripts/test-own-notice-question.ts`, 3 host tests and fixtures, 5 browser specs, and `feature-parity.mjs`.
13. **Merges:** fold `deleted-note-origins.ts` into `deletions.ts` and `development-cloud-document.ts` into `development-cloud.ts`, editing `feature-parity.mjs` for each. Optionally create a `browser/calendar/` folder for the 15 calendar files; that touches every path pin in the "Text/path pins" list below.
14. **Wallet (D2):** remove the `apps.ts` wallet row together with the Wallet view and specs (prototype chunk).
15. **Cloud bridge endpoint:** export the endpoint from `cloud-connection.ts` and use it in `runtime/browser-cloud-resident.ts:12,43`.

## Text/path pins
- `test/support/feature-parity.mjs`: every one of the 50 files is listed by path (exact inventory, `test/feature-parity.test.mjs`). Every delete, merge or move must edit it.
- `specs/quint/application/manifest.json` pins these paths and symbols:
  - `alert-audio.ts`: line 6404.
  - `audio-capture.ts`: line 3434.
  - `browser-poll.ts`: lines 5145-5150, 5750, 5786, symbol `surfacePollIdle`.
  - `browser-surface.ts`: lines 332, 429, 5239, 5281-5285, 5678-5706, symbols incl. `setBookmark`, `bookmarks`.
  - `calendar.ts`: lines 1869, 2004.
  - `calendar-store.ts`: lines 1871, 2006, 3275.
  - `calendar-deletions.ts`: line 2008.
  - `camera-focus.ts`: lines 7542-7562, symbols `BrowserCameraFocus`, `cameraFocusTarget`, `applyConstraints`, `writes`, `epoch`.
  - `clock.ts`: lines 97, 2531, 6403-6444, symbols `BrowserClock`, `owns`, `ringing`, `soundTimer`, `alpha.browser.alarm-owner`, `ifAvailable`, `stopSound`, `retire`, `allowed`, `poll`.
  - `content-question.ts`: lines 1232, 3053, 3402.
  - `daily.ts`: lines 1870, 2005, 2530.
  - `deletion-recovery.ts`: line 2535.
  - `dev-profile.ts`: lines 481, 5597, 5630, symbol `browserDevProfile`.
- `specs/quint/services/manifest.json` pins `content-question.ts` (785) and `calendar-sync-fields.ts` (2342).
- Quint harnesses that import these files:
  - `refinement/application/browser-deletion-poll.mjs`: calendar, daily, calendar-store, calendar-deletions.
  - `browser-reminder-orphan.mjs`: deletion-recovery.
  - `browser-surface-navigation.mjs`: browser-surface.
  - `browser-surface-presentation.mjs` and `browser-tab-lifecycle.mjs`: browser-poll.
  - `camera-focus-writes.mjs`: camera-focus.
  - `calendar-preservation-confirmation.mjs`: calendar-store.
  - `notes-recorder-media-admission.mjs`: audio-capture.
  - `hosted-digest-refresh.mjs`: content-question, dev-profile, development-digests.
  - `own-notice-question.mjs`, `photos-window.mjs`, `services/reading.mjs`: content-question.
  - `surfaces.mjs`, `services/contacts-session-replay.mjs`: dev-profile.
  - `calendar-adapter-fixture.mjs`: `openCalendarRecovery`.
  - `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`: audio-capture.
- `LemmaScript-files.txt:1` and `specs/lemma/README.md:159-160` pin `browser-poll.ts`.
- Scripts:
  - `scripts/storage-specs.ts:16-17` lists the calendar backup and recovery specs.
  - `scripts/test-own-notice-question.ts` uses content-question.
  - `scripts/fixtures/calendar-adapter.ts:83` uses `openCalendarRecovery`.
  - `scripts/audit-production-bundle.ts:30` denylists `'__alpha-browser-cloud'` and 'Development reply'.
- Source-text and slice tests:
  - `test/dev-surface-gates.test.mjs` and `test/settings-truth.test.mjs` read `dev-profile.ts`.
  - `test/locale-time-usage.test.mjs` reads `calendar.ts` and `clock.ts`.
  - `test/digest-occurrence-delivery.test.mjs:122-129` checks the re-exports and regex-matches the upstream policy.
  - `test/calendar-view-rules.test.mjs` uses `clock.ts` and `calendar-recurrence.ts`.
- Host tests that import these files: `test/browser-errors.test.mjs`, `test/calendar-agent-review.test.mjs`, `test/calendar-deletions.test.mjs`, `test/calendar-recurrence.test.mjs`, `test/calendar-empty-bootstrap-repro.test.mjs`, `test/browser-deletion-recovery.test.mjs`, `test/browser-session-persistence.test.mjs`, `test/browser-presentation-lifecycle.test.mjs`, `test/browser-camera-storage.test.mjs`, `test/camera-preview-recovery.test.mjs`, `test/quint-camera-focus-writes.test.mjs`, `test/notes-recorder.test.mjs`, `test/browser-cloud-dev-bridge.test.mjs`, `test/native-secure-slots.test.mjs`, `test/native-calendar-sync-port.test.mjs`, `test/selection-ask-readiness.test.mjs`, `test/agent-always-local.test.mjs`, `test/native-adapter-activity.test.mjs`, `test/password-manager.test.mjs`, `test/quint-view-admission.test.mjs`.
- Fixtures: `test/fixtures/browser-daily-stores.mjs`, `calendar-mounted-editor.mjs`, `notes-recorder-media.mjs`, `google-cancel-boundary.mjs`, `shade-notice-question.mjs`.
- Browser specs that import these paths through `page.evaluate(import('/src/browser/…'))`: about 120 spec files, most of them for `calendar-store.ts` (about 45), the `development-*` files (about 40), and `daily.ts`/`calendar.ts` (about 40). Per-file reports list them.

## New patterns
- **NEW-a: dead `storage`-event listeners for keys that moved to IndexedDB.** `clock.ts:35` listens for `alpha.browser.reminders.v1` and `development-account-document.ts:33` for `alpha.browser.cloud.account.v1`. In both cases the key name was kept for the IndexedDB document, so the listener looks live, but the `storage` event only fires on `localStorage` writes, which nothing makes any more. This is a close relative of A1 and is easy to miss because the key string is still current. Treatment: grep `addEventListener('storage'` and delete every listener whose key has no `localStorage.setItem` writer.
- **NEW-b: pure alias re-exports of upstream constants under a second name.** `development-digest-occurrence.ts:24-31` re-exports `DIGEST_RUN_WINDOW_MS=RUN_WINDOW_MS` and similar, and a test then asserts that the two names are equal. It is close to D4 but adds a test pinning the alias. Treatment: import the upstream names directly and delete the equality assertion.

## Owner questions
1. Should the browser `AlphaCalendar` plugin (`calendar.ts` and about 15 `calendar-*` files) move behind the dev boundary? `prototype/agent-calendar-adapter.ts:50` (`browserCalendarScope=testMocksEnabled&&web&&…`) already limits its UI to test-mocks builds. The canonical agent calendar is the product path, and the plugin still serves web alerts, deletions and agent operations.
2. `createSessionSaver` in `browser-poll.ts` is LemmaScript-proved and Quint-modelled, but the product never calls it. Should it be wired into `prototype/browser-adapter.ts` or deleted with its proof, test and model?
3. Is `calendar-sync-fields.ts` still needed for any Android native-sync path (`CalendarSyncBridge`)? If not, it goes with the D4 stack. If so, move it to `runtime/`.
4. Should the development Cloud fixture (`development-cloud-ui.tsx`, `development-cloud.ts`, `development-cloud-document.ts`, `development-account-document.ts`, and the cloud profile in `development-identity.ts`) be kept? It simulates the personal-Cloud and hosted path that the PRD excludes (D5).
5. Dev documents store JSON inside JSON (`{rawAccount}`, `{actions,workflows}`). These shapes come from legacy merges. D1 says current formats stay byte-identical, but this is dev-only data. May the dev documents be re-keyed to plain values (a key bump) when the legacy readers go?
6. Should `DailyApps` keep its seven pass-through file-selection methods (`daily.ts:166-172`)? The alternative is for callers to use `AlphaFiles` directly, which needs a matching Android plugin interface change.
