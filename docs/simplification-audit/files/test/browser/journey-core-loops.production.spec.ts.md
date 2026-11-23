# test/browser/journey-core-loops.production.spec.ts
- Lines: 931 (71 KB) | Kind: Playwright journeys, `production` project (flag-off bundle, audited preview), 13 `test(` sites expanding to 17 tests; Android tests run on a private 175-line in-page Capacitor stub, web-build tests run signed out; no `/src` imports (correct for production), state read from the stub's `window.coreLoops` | Verdict: KEEP the coverage, SPLIT into per-area production journeys on the shared `flag-off-android.ts` harness (targets below)
- Covers: on the shipped renderer, loop A (resident agent answers, conversation follows across apps, Stop honest, restart restores), loop C (Clock handoff set/snooze/dismiss/cancel/unknown/time-zone change, never a saved alarm), J05 (native page excerpt review bound to tab+navigation, credential refusal, navigation retires review, reconnect retires summary, one web-linked note), B/J02 (recording → explicit transcript → summary, nothing scheduled; signed-out sign-in first), D/F (phone-bound digests, mail asks for a Gmail grant), and in the web build: Agent Calendar needs a connection, local alarms persist, Maps waits for location, digests/mail name the missing account, page content needs review, no dev vault, J01 scan stays in review, J03 document question with no agent sends nothing. Duplicates: `journey-a/b/c/d/e/f-*.spec.ts` (dev-profile twins of each loop, T4/C5), `chat-continuity.production.spec.ts`, `clock-repeat.production.spec.ts`, `document-summary-note.production.spec.ts` (J05 web branch), `journey-j01-poster-calendar.spec.ts`, `journey-j03-document-analysis.spec.ts`, `journey-j04-*.production.spec.ts`, `mail-review.production.spec.ts`, `digest-resident-schedule.production.spec.ts`. Callers/importers: none; imports `flag-off-android.ts`, `helpers/retained-digests.ts`, `helpers/note-schedule-contract.ts`, `helpers/cloud-plan-settings.ts`, `helpers/native-navigation-protocol.ts`, `helpers/browser-calendar.ts`, `helpers/legacy-notes.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-209 | T7/C5 | Private `android()` stub: ElizaSystem, DailyApps (Clock outcomes, reminders), Agent (resident history, held streams, cancel), AlphaConnection (slots, Cloud billing), AlphaVoiceCloud (recorder, note recorder, local ASR), AlphaNoteAudio, AlphaCalendar, AlphaBrowser (tabs, commit, `reviewQuestion`), AlphaActionJournal, AlphaNotifications. `flag-off-android.ts` (used by 43 production specs) has none of `clockHandoff`, `reviewQuestion`, `startNoteRecording`, `AlphaNoteAudio`, `scheduleReminder` or a held stream; both re-implement Agent/AlphaConnection. | Move these handlers into `flag-off-android.ts` behind options (`clock`, `browser`, `voice`, `holdReplies`) and delete the private stub. | Medium: two stubs must converge without changing what the other 43 specs see. |
| 2 | 27-29, 224, 227-233 | C5 | `button`, `native` and `residentHome` duplicate `flag-off-android.ts` exports `button` (399), `harness` (398) and `residentHome` (453). | Import the shared ones. | none |
| 3 | 2, 23 | B4/T2 | `beforeEach(installNoteScheduleContract)` routes `**/src/main.tsx*`, which the production bundle never requests: the hook is a no-op here (the comment at ~851 says production must not be injected). | Delete the import and the hook. | none |
| 4 | 931 | D9 | A second `test.beforeEach(seedCompletedAccessSetup)` sits after the last test, applying to every test above it; `residentHome` also calls `completeAccessSetup`. | One `beforeEach` at the top (or the harness option `freshAccess:false`). | none |
| 5 | 6, 636-644 | A1/C5 | Local `openRetainedNativeNotes` is a verbatim copy of `helpers/native-notes.ts`; both seed a legacy `notes-records:v1:device` envelope (`archive:{v1,v2,daily}`) and open "Previous notes". C1 deletes that source. J05 "one web-linked note" and B/J02 "recording survives restart" depend on it. The stub answers `/api/notes/state` with 503 (~74), so canonical Notes are unavailable. | Port both tests to canonical Notes on the resident stub (add `/api/notes/*` handlers, or reuse whatever `helpers/canonical-notes.ts` provides at the app-record boundary). Delete the local copy. | High: without the port, the shipped note-save and recording paths lose their only production coverage. |
| 6 | 5, 800-802, 813 | T6/A1 | `openAndroidCalendar` → `selectCalendarSource('Android calendars')` walks the React fiber tree and sets `calendarAuthority:'android-native'`. In B/J02 nothing asserts calendar state afterwards. | Delete the call (and the helper once nothing else uses it). | Low |
| 7 | 258, 309, 617, 667, 774, 813, 908 | T6 | `window.dispatchEvent(new Event('launcher-home'))` used as navigation. | Use the visible Home/app-switch control (`returnToApps`). | Low |
| 8 | 211-222 | — | `storedEvents` opens IndexedDB raw to prove no local event was written. Correct for production (no imports). | Keep as one harness helper (`storedDocument(key)`), shared with other production specs. | none |
| 9 | 236-912 | T8 | 120-300 s timeouts per test; no fixed sleeps (good). | Lower after the split; most cases need <60 s. | none |
| 10 | 434-612 | — | The five web-build tests mostly assert absence of development surfaces and honest "Connect"/"unavailable" states. That is production gating. | Keep; place each in its area journey or in `journeys/production-gating.spec.ts`. | none |
| 11 | 8-20 | A8 | Header comments narrate the relation to the dev twins. | One line. | none |

Split (production project, shared harness):
- `journeys/chat.spec.ts`: loop A (Android).
- `journeys/reminders.spec.ts`: loop C ×5 (opened/unavailable, snooze+dismiss, cancel/unknown restart, time-zone change) + web local alarm persistence.
- `journeys/browser.spec.ts`: J05 Android ×5 (excerpt bound to navigation, too-long/empty, credential refusal, navigation retires review, reconnect retires summary) + E/J05 web (review required, no TLS claim).
- `journeys/notes.spec.ts`: J05 web-linked note save, B/J02 recording + summary, B/J02 signed-out sign-in first (after the canonical-Notes port).
- `journeys/calendar.spec.ts` / `journeys/maps.spec.ts`: web Agent Calendar needs connection; Maps waits for location.
- `journeys/workflows.spec.ts` + `journeys/inbox.spec.ts`: D/F web and Android.
- `journeys/camera-photos.spec.ts`: J01 scan stays in review. `journeys/files.spec.ts`: J03 document question.
- `journeys/settings.spec.ts` (or production-gating): no dev vault/password provider.

## Proposed end state
- File deleted after the split; every case kept, none added.
- One Android stub (`flag-off-android.ts`) gains Clock, AlphaBrowser review, note recorder/audio, reminders and held-stream options; the private stub and duplicated helpers go.
- Notes-dependent cases ported to canonical Notes before C1 lands (or in the same change).
- No `installNoteScheduleContract`, no fiber walk, no `launcher-home` events.
- Expected ~550 lines across the area journeys, against 931.
