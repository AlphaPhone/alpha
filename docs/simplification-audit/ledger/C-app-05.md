# C-app-05: in-file cleanup of `apps/app/src/browser/` (agent-speech … development-identity)

Files deleted by stage A and skipped: `calendar-backup.ts` (A3), `calendar-linked-local.ts`, `calendar-sync-fields.ts`
(A1), `development-cloud-document.ts`, `development-cloud.ts` (A4). Stage A already applied in these files: Wallet
row (apps.ts), `createSessionSaver` (browser-poll.ts), `installed` guard (audio-settings.ts), restore option
(calendar-recovery.ts), `restore()` and legacy reader (calendar-store.ts), `storage` listeners (clock.ts,
development-account-document.ts), legacy readers in the dev documents, development-cloud-ui reduction, and the
B165 unexports of non-dev files.

## Done

- `agent-speech.ts`: `getCloudEnvironment`/`getCloudClient` required on `SpeechConnection`; no `?.()` on them (B2).
- `alert-audio.ts`: volume read as `settings[stream]/100`; the preference is already validated 0..100 and always present (B3).
- `apps.ts`: `devSurfacesEnabled&&browserDevProfile` → `browserDevProfile`; `build-flags` import dropped (B4).
- `audio-capture.ts`: local `Clip` → `VoiceClip` (native/alpha-voice-cloud, B2 map); `cancelled()` uses `abortError` (B1 map);
  one `recordedMs()` replaces `partMs` and the formula in `elapsed()` (C3); `try{}catch{}` removed around the three
  `recorder.stop()` calls already guarded by `state!=='inactive'` (B4).
- `audio-levels.ts`: `BARS=44` constant (C6).
- `browser-errors.ts`: fallback via `errorText` (B1 map; imported with `.ts`, the file is loaded by plain Node).
- `calendar-agent-review.ts`: `Fields` = upstream `CalendarFields`, `Existing` = `Pick<CalendarRecord,…>` (types.md),
  `deviceTimeZone()`, `DAY_MS` (B1 map; `.ts` import for plain Node).
- `calendar-alerts.ts`: `deviceTimeZone()`, `DAY_MS`, `CALENDAR_ALERT_MINUTES` (C6).
- `calendar-records.ts`: exports `CALENDAR_ALERT_MINUTES`; uses `seriesZone()` from calendar-recurrence (C3).
- `calendar-recurrence.ts`: exports `calendarRepeats` and `seriesZone()`; repeat check and zone use them (C6/C3).
  `DAY` stays local: `test/calendar-view-rules.test.mjs` transplants this file without its imports.
- `calendar-editor.ts`: `EditableCalendarEvent` = `Pick<CalendarRecord,…>` (C1); `deviceTimeZone()`; one `addPerson()`
  builds attendee rows for the initial list and restored unknown ids (C3).
- `calendar-editor.css`: deleted two rules that match no element (`.alpha-calendar-hint`,
  `[aria-label="Calendar editor draft recovery"]`; whole-repo grep: CSS only) (A7).
- `calendar.ts`: `EventRow` alias deleted (C1); `sha256Hex` ×2, `isOperationId` ×2, `isUuidV4`, `deviceTimeZone()` ×7,
  `DAY_MS` for every day literal (B1 map); `CALENDAR_ALERT_MINUTES` / `calendarRepeats` in `save` validation (C6).
- `clock.ts`: `releaseRing()` shared by `poll` and `retire` (C3); `navigator.locks` called unconditionally (B2);
  unused `catch(error)` binding dropped. Manifest symbols (`retire`, `stopSound`, `owns`, `ringing`, `poll`, …) kept.
- `cloud-connection.ts` (dev): `abortError`, `anyAbortSignal` and `delay(1000,signal)` from `lib/abort` (B1 map;
  rejection value is `signal.reason` as before); `isRecord` for the reply check (B1 map); `REQUEST_TIMEOUT_MS` (C6).
- `daily.ts`: `isOperationId`/`isSha256Hex` (B1 map); `sameTarget()` for the three target comparisons and
  `snoozeAlarm()` for the two alarm snoozes (C3).
- `deletions.ts`: `sha256Hex`, `isOperationId`, `isSha256Hex` (B1 map).
- `development-identity.ts`: `developmentNamespace` regex owned here; `sameIdentity()` used by assert/verify (C3);
  re-ANDed `devSurfacesEnabled` dropped from `assertDevelopmentProfile` (B4).
- `development-agent-document.ts`, `development-digest-document.ts`, `development-execution-document.ts`: use
  `developmentNamespace` (C3); re-ANDed flag dropped (B4); unexported `DevelopmentMessage`, `DevelopmentAgentState`,
  `validateDevelopmentAgent`, `DevelopmentDigestState`, `ExecutionPart` (A7, each grepped: file-only);
  execution document: impossible `JSON.stringify(...)===undefined` check deleted (B4).
- `development-account-document.ts`: re-ANDed flag dropped (B4); `publish()` replaces two copies of the commit-and-announce
  sequence (C3); `isOpaque36` for the session id (B1 map); `DevelopmentCloudAccount` unexported (A7).
- `development-actions.ts`: `isSha256Hex` ×2 (B1 map). `development-digests.ts`: `deviceTimeZone()` (B1 map).
- `development-digest-occurrence.ts`: `OccurrenceLoop`, `Occurrence` unexported (A7).

## Deleted tests and formal artefacts

None.

## Pins left broken

None that this unit caused. The Quint harnesses `browser-deletion-poll.mjs` and `browser-journal-retention.mjs`
list `calendar.ts`, `daily.ts`, `calendar-deletions.ts` and `calendar-store.ts` as hashed inputs only; both pass.

## Skipped

- Open owner questions: Q-UI-29 (`DailyApps` pass-through file methods, `daily.ts`); Q-CAL-5 (browser Calendar plugin
  behind the dev boundary); Q-FORMAL-5 (already settled by A3/D20); Q-DEV-2 (development Cloud fixture).
- File moves and merges (stage F): `deleted-note-origins.ts` into `deletions.ts`, `cloud-connection.ts` /
  `development-*` / `dev-profile.ts` into `dev/`, `content-question.ts` into `prototype/`, dialog CSS merge,
  `browser-errors.ts` move, `calendar-time.ts` into `lib/civil-date.ts`.
- Shared modules that do not exist yet: `JournalBinding`/`JournalIdentity`, `deletionJournal`, `deletionMethods`,
  `DELETION_HISTORY_LIMIT` (journal-retention.ts, not owned); `openOwnedDialog`/dialog kit (calendar-editor,
  -meeting, -response, clock, content-question token copying and `.os` mounting); `observedDocument`
  (calendar-store, development-account-document); `foregroundBlocked` (alert-audio, clock); `httpAddress`
  (browser-surface, daily); `readConnectionSelection` (development-actions/-connection/-digests); deletion-owner
  key builder (deletion-recovery; owner is `runtime/deletion-owner.ts`); cloud endpoint export (its only consumer
  `runtime/browser-cloud-resident.ts` is not owned).
- `dev-profile.ts`: importing `devSurfacesEnabled` from build-flags breaks the many Node tests that import this
  chain without `import.meta.env`; one shared `URLSearchParams` was tried and reverted because it reads `location`
  eagerly, which Node imports of this module do not provide.
- `cloud-connection.ts` `typeof window==='undefined'` guard: kept; `test/browser-cloud-dev-bridge.test.mjs:299`
  asserts its `browser-unavailable` code.
- `calendar-store.ts` / `development-account-document.ts` `typeof BroadcastChannel` guard: kept;
  `test/fixtures/browser-daily-stores.mjs` sets `BroadcastChannel=undefined`.
- `browser-surface.ts` required host (drop body/fixed fallback): Quint `browser-surface-navigation` mounts the module
  without the template host. Inline styles to CSS (D12): visual risk without a spec run.
- `calendar.ts` #2 `withTicket`, #3 `creating` alias (narrowing), #8 re-check of `events` after `prepareCalendarSource`
  (a second storage read: trust boundary), #9 `people` validation (plugin boundary), #12 date formatter.
- `calendar-editor-draft.ts` #1 "Recover editor storage" (A3: visible in production); #2 validating its own write:
  wrong, user input can exceed the field limits, so the full validator is the specified "Too large" path.
- `daily.ts` #6 (the middle `document.hidden` check follows an `await`), #7 (changes notification reads per poll).
- `development-digest-occurrence.ts` alias re-exports and `digestSourceState` wrapper (NEW-b): pinned by the
  behavioural cases in `test/digest-occurrence-delivery.test.mjs:122-124,273-275`; the no-`settledOccurrences`
  branches are exercised by the same test (`legacy` loop, :204). Left for stage E with that test.
- Dev self-validators (`validateDevelopmentAgent`, `validateDevelopmentDigests`, account `decode`,
  `executionPart` shape check, actions `validate`): they guard IndexedDB reads, a storage trust boundary. Repeated
  identity checks in development-actions/-connection/-digests: kept (owner/selection fences).
- `audio-capture.ts` pause/resume helper, `calendar-records.ts` occurrence-id helpers, `deletions.ts`
  dismiss/undo table, `camera-focus.ts`/`camera-frame.ts`/`content-question.ts`/`calendar-time.ts` findings:
  low value or visual.

## Verification

- `npx tsc --noEmit -p tsconfig.json`: no errors in any owned file (5 errors remain, all in `prototype/` files owned
  by other units: agent-calendar-adapter, calendar-adapter, calendar-confirmation, calendar-edit-draft-adapter,
  calendar-form-draft-adapter, canonical-calendar-drafts, inbox-cloud-adapter).
- `node --test` passing: calendar-agent-review 7/7, calendar-recurrence 4/4, calendar-deletions 5/5,
  browser-errors 4/4, notes-recorder 33/33, digest-occurrence-delivery 7/7, browser-deletion-recovery 2/2,
  locale-time-usage 2/2, local-agent-contracts 6/6, browser-notification-clear 6/6, workflow-reminder-midnight 1/1,
  browser-voice-cancellation 5/5, dev-surface-gates 8/8, selection-ask-readiness 5/5, browser-cloud-dev-bridge 77/77,
  quint-browser-deletion-poll 1/1, quint-browser-journal-retention-refinement 1/1.
- Failing, not caused by this unit: calendar-view-rules 6/7 (`civilDayDiff is not defined` in the transplanted
  `prototype/calendar-form-draft-adapter.ts`; the clock and recurrence cases pass); home-overview-cards 6/7
  (Home card markup); quint-browser-reminder-orphan (harness seeds the legacy localStorage reader removed by A2);
  quint-cloud-connection-notices ("Redeem code" notice in connection-ui; first run failed to load
  `connection-ui.tsx` while other units were editing it); quint-canonical-calendar-editor-close (timed out at 155 s,
  not investigated further).
- Vite: every module in the `runtime/connection-ui.tsx` graph (237) transforms without error
  (`server.transformRequest`, test mocks on); `esbuild --bundle` of connection-ui resolves.
- Not run: Playwright specs, `npm run build`, `npm run audit:bundle`, Android (no Java touched).
