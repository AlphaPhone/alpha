# Chunk test-24: Calendar and Camera host tests (43 files)

Per-file reports: `docs/simplification-audit/files/test/<name>.test.mjs.md`. Seven assigned files are already deleted in
the working tree and get a two-line report.

| File | Kind | Verdict | Target |
|---|---|---|---|
| `calendar-agent-review` | unit (real module, pure) | MERGE | `test/integration/calendar.test.ts` (DST + all-day review cases) |
| `calendar-agent-write-host` | unit of upstream `vendor/eliza` code | DELETE | upstream `managed-calendar-host.test.ts` exists |
| `calendar-approval-client` | unit, stub port | MERGE | calendar integration (3 cases) |
| `calendar-approval-ui` | unit + JSDOM + adapter transplant (esbuild stub plugin) | REWRITE | `journeys/chat.spec.ts` (Calendar review in chat); parse tables to calendar integration |
| `calendar-availability-reader` | host-JVM integration + spawns `scripts/test-calendar-availability-provider-rows.ts` | KEEP | Gradle JVM calendar test; script leg → integration fixture case |
| `calendar-availability` | wrapper for `scripts/test-calendar-availability-flow.ts` (T9) | MERGE | calendar integration (non-browser cases only) |
| `calendar-confirmation` | transplant (`new Function`) | DELETE | 2 steps in `journeys/calendar.spec.ts` |
| `calendar-connect-policy` | transplant (marker slices of `google-connection-ui.tsx`), legacy envelope | DELETE | ABA fence → `test/integration/connection-cloud.test.ts` via real `google-agent-access.ts` |
| `calendar-connection-scope` | — | already deleted | — |
| `calendar-day-context` | integration (7 real runtime modules) | KEEP (MERGE, trimmed) | calendar integration |
| `calendar-delete-latch` | transplant (`vm`, ~30 globals) | DELETE | `journeys/calendar.spec.ts` unconfirmed device delete |
| `calendar-deletion-identity` | host-JVM unit, inline Java | KEEP | Gradle JVM test |
| `calendar-deletions` | unit (esbuild bundle) | MERGE | calendar integration (3 cases) |
| `calendar-empty-bootstrap-repro` | — | already deleted | — |
| `calendar-end-after-start` | unit, host twin of same-name spec | DELETE | DST-gap step into `journeys/calendar.spec.ts` |
| `calendar-form-inputs` | unit (esbuild bundle) | MERGE | calendar integration (2 cases); legacy draft case dropped |
| `calendar-linked-provider` | — | already deleted | — |
| `calendar-linked-store` | — | already deleted | — |
| `calendar-managed-rejection` | integration, prepared SDK + real dev broker | KEEP, SIMPLIFY | `test/integration/resident-runtime.test.ts` (prepared-SDK lane) |
| `calendar-mounted-draft-handoff` | Chromium e2e in node:test | DELETE | duplicate of Quint `canonical-calendar-draft-handoff` |
| `calendar-mounted-edit-admission` | Chromium e2e in node:test | DELETE | duplicate of Quint `canonical-calendar-editor-close` |
| `calendar-mounted-editor` | Chromium e2e in node:test | DELETE | duplicate of Quint `canonical-calendar-editor-close` |
| `calendar-mounted-preservation` | — | already deleted | — |
| `calendar-range-reader` | host-JVM + regex slice of `AlphaCalendarPlugin.java` | PORT | Gradle JVM test over an extracted `AlphaCalendarConfiguration` |
| `calendar-read-timing` | unit/integration of upstream `.eliza` module, tsx self re-exec | DELETE | upstream test follow-up |
| `calendar-recurrence` | unit (pure, DST-risky) | MERGE | calendar integration recurrence table |
| `calendar-regression-runner` | tooling (device runner via fake adb) | MERGE | `test/tooling/native-campaigns.test.ts` |
| `calendar-review-parse-cache` | transplant + source-text | DELETE | none needed (memoisation) |
| `calendar-settings-simplicity` | — | already deleted | — |
| `calendar-sync-cloud-refusal` | Java method regex transplant + source count | DELETE + PORT | status table into Gradle calendar-sync test after extracting `cloudFailure` |
| `calendar-sync-consent` | host-JVM unit + source-order check | KEEP test 1 / DELETE test 2 | Gradle JVM |
| `calendar-sync-mutation` | host-JVM integration, patch materialisation | KEEP, SIMPLIFY | Gradle JVM (no patch step; `patches/` is gone) |
| `calendar-sync-receipt-recovery` | host-JVM unit + 2 source-order checks | KEEP test 1 / DELETE tests 2-3 | Gradle JVM |
| `calendar-sync-settings-navigation` | — | already deleted | — |
| `calendar-sync-snapshot` | host-JVM integration | KEEP | Gradle JVM (delete `calendar-sync-snapshot-jvm.mjs`) |
| `calendar-view-rules` | transplant (7 `vm` contexts) | DELETE | midnight/reminder/alarm steps in Calendar & Reminders journeys; skipped-date case to recurrence table |
| `camera-capture-mode-patch` | source-text over upstream Kotlin (patch no longer exists) | DELETE | quality check as a camera journey step |
| `camera-preview-recovery` | transplant (6 slices + upstream source eval, no `test()`) | DELETE | ~10 steps in `journeys/camera-photos.spec.ts` |
| `camera-rapid-leave` | Chromium e2e in node:test | DELETE | duplicate of Quint `camera-preview-retirement` |
| `camera-resume` | upstream unit + source-text | DELETE | upstream `host-ports.test.ts` |
| `camera-scan-keep` | transplant (brace-matched slices) | DELETE | 2 steps in `journeys/camera-photos.spec.ts` |
| `camera-scanned-note` | transplant, legacy Notes mode | DELETE | canonical save step in camera/scan journey |
| `campaign-speech-routes` | source-text over Java + scripts | DELETE | none |

Counts (36 live files): DELETE 18, MERGE/REWRITE/PORT 11, KEEP 7 (6 move to Gradle). Plus 7 already deleted.

## Behaviours that lose all coverage if the DELETEs land without replacements
- **Unconfirmed device-calendar delete hold** (`calendar-delete-latch`): only this transplant checks that an unknown
  `removeScoped` result blocks a second dispatch until a requested refresh. Needs the `journeys/calendar.spec.ts` step
  and a Calendar bridge fake that can answer `unknown`.
- **Midnight rollover** (`calendar-view-rules`): device rows and reminders re-read after local midnight, an unretained
  form moves "tomorrow" to "today", the timer stops with the view. Needs Playwright clock steps.
- **Reminder store failure still shows device rows with a stale notice** and **browser alarm poll only while visible**
  (`calendar-view-rules`). The alarm-visibility case may be an accepted loss; owner call.
- **Camera session rules** (`camera-preview-recovery`): no lost shutter, flip resets, failed switch restart, focus
  that never settles, 0.556 zoom chip, agent capture queue and chat grace. Quint replays cover retirement and focus
  ordering only. Needs a gateable Camera bridge fake.
- **Scan Keep retry with the same operation id** and **selection-change toast policy** (`camera-scan-keep`).
- **Calendar Cloud refusal status classes** (`calendar-sync-cloud-refusal`) until `cloudFailure` is extracted.
- **Source-order guards in native code**: consent before connection (`calendar-sync-consent` test 2) and receipt capacity
  before record/dispatch (`calendar-sync-receipt-recovery` tests 2-3). They are text checks today; replacing them needs
  a small extraction in `AlphaConnectionPlugin`/`CalendarSyncBridge`. Medium risk.
- **Calendar read-timing privacy** (`calendar-read-timing`): upstream module with no upstream test. Needs an upstream
  follow-up.
- **Calendar approval review dialog and chat adapter** (`calendar-approval-ui`): `calendar-approval-queue.spec.ts` and
  the Quint approval replays cover part of it; the chat-side cases (draft kept, sensitive context, late result after a
  conversation switch) need the `journeys/chat.spec.ts` section.

## Shared helpers worth keeping
- `test/fixtures/calendar-mounted-editor.mjs`, `calendar-draft-handoff.mjs`, `camera-preview-port.mjs`: still imported by
  Quint harnesses (`canonical-calendar-draft-handoff`, `canonical-calendar-editor-close`, `camera-preview-retirement`,
  `notes-recorder-media-admission`); they survive the three mounted DELETEs and `camera-rapid-leave`.
- `test/fixtures/isolated-native-campaign.mjs`: shared by six runner tests; keep as the base of `test/tooling/native-campaigns.test.ts`.
- `test/fixtures/browser-source.mjs` (Vite-aware loader): the right loader for the calendar integration file; replaces
  per-file esbuild bundles in `calendar-deletions`, `calendar-form-inputs`.
- JVM fixtures `CalendarAvailabilityReaderTest`, `CalendarListWindowTest`, `CalendarSyncConsentTest`,
  `CalendarSyncMutationTest`, `CalendarSyncReceiptRecoveryTest`, `CalendarSyncSnapshotTest`, `SqliteCalendarProvider`:
  move into the Gradle test source set with one Android stub tree.
- `test/fixtures/calendar-sync-snapshot-jvm.mjs`: one importer; delete when the snapshot test moves to Gradle.

## Cross-file actions
1. Create `test/integration/calendar.test.ts` from: agent review DST/all-day, approval client (3), approval parse tables,
   availability executor non-disclosure, visible-day context (trimmed), deletion queue (3), form round-trip (2),
   recurrence table (5 incl. the skipped-date case from `calendar-view-rules`).
2. Create a Gradle JVM calendar test class set (availability reader, range reader, deletion identity, sync consent,
   mutation, receipt recovery, snapshot, cloud refusal) with one stub tree; delete the seven JS wrappers and the patch
   materialisation step in `calendar-sync-mutation`.
3. Product seams needed for the ports: `AlphaCalendarConfiguration` (Capacitor-free) out of `AlphaCalendarPlugin`;
   `cloudFailure` out of `CalendarSyncBridge`; optional "admit operation" step in `CalendarSyncReceiptRecovery`.
4. Remove legacy branches with their tests: `notesSourceMode==='legacy'` in `camera-adapter.ts:195-196`; optional
   `guestsReviewed` in `canonical-calendar-draft.ts:13`; `legacy-recovery` / non-canonical `calendarAuthority` rows in
   `calendar-day-observation.ts`; possibly the numeric legacy id in `CalendarDeletionIdentity`.
5. Simplify `calendar-managed-rejection` to the broker leg and run it only in the prepared-SDK lane
   (`resident-prepare.yml:43`), without the skip switch.
6. Upstream follow-ups (D14): read-timing privacy tests; confirm `managed-calendar-host.test.ts` and `host-ports.test.ts`
   carry the cases deleted here.
7. Delete `scripts/test-calendar-availability-flow.ts` and `scripts/test-calendar-availability-provider-rows.ts` once
   their cases have moved.

## Owner questions
- Is the on-device Calendar runner (`scripts/test-calendar-regression.ts`) release-gating tooling, so that its host tests
  stay (merged), or developer tooling to drop?
- Does `PairedSpeechContract` (and `scripts/android-paired-speech-live.ts`) survive D5 "no hosted-agent pairing"?
- Are the native source-order guards (consent before connection, receipt capacity before dispatch) worth a small
  extraction to test them by behaviour, or is losing the text checks accepted?
- Does the renderer still emit numeric (pre-`delete2`) deletion ids? If not, `CalendarDeletionIdentity`'s legacy branch
  goes with D1.
- Is the browser alarm-poll visibility rule (`browser/clock.ts`) worth a journey step, or an accepted loss?
