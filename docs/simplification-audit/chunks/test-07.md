# Chunk test-07: browser specs `browser-reminder-recurrence` … `camera-overlay-contrast`

38 assigned paths: 35 present, 3 already deleted in the worktree with the client Calendar linked-sync stack (D4).
Per-file reports are in `files/test/browser/<name>.md`. Journey targets follow `journeys/<area>.spec.ts`.

## Files

| File | Lines | Kind (project) | Verdict | Target |
|---|---|---|---|---|
| browser-reminder-recurrence.spec.ts | 95 | mixed UI + module-in-page (chromium) | MERGE | `journeys/reminders.spec.ts` (3 cases) |
| browser-secret-retirement.spec.ts | 39 | module-in-page (chromium) | REWRITE | Node storage-contract integration case, or DELETE if web secret store is dev-only |
| browser-signins.spec.ts | 186 | UI journey (chromium) | MERGE | `journeys/browser.spec.ts` |
| browser-speech.spec.ts | 101 | 2 module-in-page + 7 Notes recorder UI (chromium) | MERGE (recorder) / DELETE (2 module tests) | `journeys/notes.spec.ts` |
| browser-video.spec.ts | 108 | mostly module-in-page, 2 UI (chromium) | MERGE | `journeys/camera-photos.spec.ts` |
| browser-voice-registration.spec.ts | 14 | module-in-page (chromium) | DELETE | dev smoke keeps "Device controls opens" |
| browser-web-find.production.spec.ts | 46 | UI (production) | MERGE | `journeys/browser.spec.ts` production section |
| calendar-accessibility.spec.ts | 98 | layout UI + stand-in dialogs by import (chromium) | MERGE (renderer cases) / DELETE (stand-in dialogs) | `journeys/accessibility.spec.ts` |
| calendar-agent-all-day-review.spec.ts | 46 | module driver of web stand-in (chromium) | DELETE | — |
| calendar-agent-transaction-cancel.spec.ts | 19 | module + prototype patch (chromium) | DELETE | — |
| calendar-approval-queue.spec.ts | 31 | dialog opened by import (chromium) | REWRITE | `journeys/calendar.spec.ts` via approval queue UI |
| calendar-availability.spec.ts | 248 | UI journey over inline bridge + dev pairing (chromium) | REWRITE | `journeys/calendar.spec.ts` production section on resident-agent harness |
| calendar-backup-restore.spec.ts | 77 | UI, test-mocks backup (chromium+ff+webkit) | DELETE (D3) | — |
| calendar-creation-recovery.spec.ts | 65 | UI + 7 prototype patches (chromium) | MERGE (3 cases) | `journeys/calendar.spec.ts` |
| calendar-delete-completion.spec.ts | 35 | UI + prototype patch (chromium) | MERGE | `journeys/calendar.spec.ts` "late completion" case |
| calendar-delete-review.spec.ts | 59 | UI journey (chromium) | MERGE | `journeys/calendar.spec.ts` |
| calendar-draft-readiness.ts | 30 | helper (18/7/3 importers) | MERGE / DELETE `expectSavedCalendarDraft` | `harness/media.ts`, `harness/calendar.ts` |
| calendar-edit-draft.spec.ts | 36 | UI + seeding/patches (chromium+ff+webkit) | MERGE (3 cases) | `journeys/calendar.spec.ts` |
| calendar-end-after-start.spec.ts | 20 | UI (chromium) | MERGE | `journeys/calendar.spec.ts` |
| calendar-fixture.ts | 8 | helper, 1 importer (DELETE spec) | DELETE | `harness/storage.ts` `holdDocumentsTransaction` |
| calendar-form-controls.spec.ts | 105 | UI + React-fiber state access (chromium) | MERGE | `journeys/calendar.spec.ts` form section |
| calendar-form-draft.spec.ts | 78 | UI + draft-store reads/patches (chromium+ff+webkit) | MERGE (5 cases) | `journeys/calendar.spec.ts` |
| calendar-linked-storage.spec.ts | — | already deleted (D4) | — | — |
| calendar-maps-handoff.spec.ts | 42 | UI after legacy-envelope seeding (chromium) | MERGE | `journeys/maps.spec.ts` |
| calendar-modal-draft.spec.ts | 32 | stand-in modal opened by import (chromium+ff+webkit) | DELETE | (one dev case only if web editor stays) |
| calendar-month-focus.spec.ts | 13 | UI keyboard (chromium, 4 runs) | MERGE | `journeys/calendar.spec.ts` |
| calendar-options.spec.ts | 28 | pure function table in page (chromium) | DELETE | replacement case in calendar production journey |
| calendar-proposal-review.production.spec.ts | 239 | UI journey (production) | KEEP (move) | `journeys/calendar.spec.ts` production section |
| calendar-recovery.spec.ts | 35 | UI over legacy bytes + test-mocks reset (chromium+ff+webkit) | DELETE (D1/D3) | — |
| calendar-save-completion.spec.ts | 16 | UI + prototype patch (chromium) | MERGE | `journeys/calendar.spec.ts` "late completion" case |
| calendar-storage-migration.spec.ts | 83 | legacy import + module races (chromium+ff+webkit) | DELETE | — |
| calendar-sync-fixture.ts | — | already deleted (D4) | — | — |
| calendar-sync-settings.spec.ts | — | already deleted (D4) | — | — |
| calendar-transaction-cancel.spec.ts | 30 | stand-in dialogs + patch (chromium) | DELETE | — |
| calendar-wide-days.spec.ts | 40 | UI layout (chromium) | MERGE | `journeys/calendar.spec.ts` |
| camera-controls.spec.ts | 116 | 4 module + 5 UI (chromium) | MERGE | `journeys/camera-photos.spec.ts` |
| camera-media.production.spec.ts | 75 | UI journey (production) | KEEP (split) | `journeys/camera-photos.spec.ts` + `journeys/files.spec.ts` |
| camera-overlay-contrast.spec.ts | 16 | computed-style maths (chromium, mock mode) | MERGE | `journeys/accessibility.spec.ts` contrast sweep |

Counts: KEEP 2, DELETE 10 (incl. `calendar-fixture.ts`), MERGE/REWRITE 23, gone 3.
Runtime cost removed by DELETEs alone: 4 storage-list specs × 3 engines (`calendar-storage-migration`, `calendar-backup-restore`,
`calendar-recovery`, `calendar-modal-draft`); `calendar-edit-draft` and `calendar-form-draft` should also leave the firefox/webkit list
because nothing in them is engine-specific.

## Research report corrections

- `browser-secret-retirement` is not a legacy path; it tests the current web secure-slot fallback (`native-connection.ts:147,162,214`).
- `calendar-modal-draft`, `calendar-transaction-cancel`, `calendar-agent-*` drive the web `AlphaCalendar` stand-in's own dialogs
  (P7), so "merge into calendar.journey" overstates their product value. They are DELETE.
- `calendar-recovery` is a legacy-bytes (D1) plus test-mocks backup/reset (D3) path, not a calendar journey. It is DELETE.
- `calendar-maps-handoff` seeds through the legacy `{version:1,legacy,value}` envelope and will break as soon as D1 lands.

## Behaviours that lose all coverage if the DELETEs happen

These need a replacement journey or integration case. The proposed case is named in each file report.
1. **Provider-field mapping** for all-day, other-zone and weekday-repeat saves, and the DST-gap refusal (`calendarOptionEvent`).
   Replacement: a production-lane Calendar save case that reads the bridge recorder. Only `calendar-options.spec.ts` covers this today.
2. **Availability freshness evidence**: a missing freshness marker makes the result "unknown" (`calendar-availability.spec.ts:216`).
3. **Browser secure-slot failure handling** (fixed message, no sign-out, stale compare-and-clear). This applies only if the web
   store stays in the product.
4. **Web stand-in Calendar semantics**: the all-day whole-date refusal in agent review, cancel after preparation, a dismissed
   editor/response aborting its IndexedDB write, and Home during a queued read presenting nothing late. They are covered nowhere
   else. On Android the native plugin owns them, and nothing here proves that the native plugin does.
5. **Web DailyApps decision idempotency** (snooze twice gives `unchanged`, a repeated done gives `stale`).
6. **Recording races**: late mic permission after closing the camera, Stop while permission is pending, and the missing stop
   callback. These are kept only if the camera journey retains one race case.

## Shared helpers worth keeping (into the one harness)

- `helpers/browser-calendar.ts` (`openBrowserCalendar`, `chooseCalendarEventAction`), with about 20 importers.
- `helpers/calendar-review.ts` (`reviewCalendarAction`). Note that `specs/quint/refinement/composition/controllers.mjs` also imports it.
- `helpers/calendar-storage-hold.ts` `holdDocumentsTransaction`. It should be the single storage-hold helper. Its twins are
  `calendar-fixture.ts` and the inline copy in `calendar-form-draft.spec.ts:69-74`.
- `calendar-draft-readiness.ts` `guardCalendarFixture`, renamed `guardNoMedia`. 14 of its 18 importers are not Calendar specs.
- `helpers/resident-agent-plugin.ts` with `flag-off-android.ts`: the production-lane agent harness that calendar journeys need.
- `cloud-notes-voice-fixture.ts` for the Notes recorder journey.
- New harness pieces this chunk needs:
  - `setTextScale(page,%)`, which replaces `BrowserDevice.prototype.setTextScale` in 6 places.
  - `systemBack()` and `goHome()`, which replace the `alpha-back` and `launcher-home` events.
  - `seedCalendar()` and `seedReminder()` at the bridge.
  - `fakeCamera()`: one canvas stream for `browser-video`, `camera-controls` and `camera-media`.
  - `installBridge(page,handlers)` and `agentRoutes()`. They replace the 60-line and 115-line inline bridges in
    `calendar-availability` and `calendar-proposal-review`.

## Cross-file actions

- `scripts/storage-specs.ts`: remove lines 8, 10, 13, 9, 14 and 15. These are `calendar-storage-migration`, `calendar-modal-draft`,
  `calendar-edit-draft`, `calendar-form-draft`, `calendar-backup-restore` and `calendar-recovery`.
- Delete these together with product code:
  - `calendar-backup-restore` goes with `browser/calendar-backup.ts`, the restore option in `calendar-recovery.ts` and the
    developer row "Calendar backups" (`settings-adapter.ts:870`).
  - `calendar-recovery` and `calendar-storage-migration` test 1 go with the legacy reader lambda in `calendar-store.ts:11`.
- `calendar-maps-handoff`: change its seeding before or with the D1 envelope removal.
- Host-test twins to delete once the journeys exist:
  - `test/calendar-end-after-start.test.mjs`
  - `test/calendar-approval-ui.test.mjs`, which is a T2 transplant. Its Quint model stays.
- Stale references to deleted D4 files, to be fixed with the formal port:
  - `specs/quint/native/manifest.json:1349`
  - `specs/quint/services/manifest.json:224`
  - `test/native-secure-slots.test.mjs:97`
  - `specs/quint/refinement/application/google-calendar-link-publication.md:20`
- Product markup changes that make journeys selector-free:
  - The day-chip row needs an accessible name. It is currently `div.scr[style*="pan-x"]`.
  - The zoom chips need `aria-pressed`. Tests currently detect selection with `width:40px`.

## Owner questions

1. Is the web build (the `browser/*` stand-ins `BrowserCalendar`, `BrowserDaily`, `createBrowserConnection` and `browserCamera`) a
   shipped product surface, or only the developer simulator?
   - If it is only the simulator, the stand-in semantics tests above are deleted outright.
   - If it ships, about six cases have to be kept as web journeys.
2. Is the Calendar approval queue (`calendar-approval-adapter.ts` → `connectionController.readCalendarApproval`) reachable in a
   production build, or is it part of the hosted path (D5)? The answer decides whether `calendar-approval-queue` is rewritten or
   deleted.
3. The calendar availability journey currently pairs a "Local development agent", which is a D5 test-mocks path. May it move to the
   production lane on the resident-agent harness? That is the proposal here.
