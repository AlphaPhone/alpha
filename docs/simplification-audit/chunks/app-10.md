# Chunk app-10 — prototype automations, browser, calendar (17 files)

Per-file reports: `docs/simplification-audit/files/apps/app/src/prototype/<file>.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/automations-adapter.ts | SIMPLIFY (later MERGE into workflows owner) | 240 | 205 |
| apps/app/src/prototype/automations.css | SIMPLIFY | 130 | 110 |
| apps/app/src/prototype/browser-adapter.ts | SPLIT + SIMPLIFY | 669 | 600 (across 4-5 files) |
| apps/app/src/prototype/browser-camera.ts | SPLIT + MOVE to `browser/` | 446 | 380 (across 3 files) |
| apps/app/src/prototype/browser-external-handoff.ts | SIMPLIFY (small) | 55 | 48 |
| apps/app/src/prototype/calendar-adapter.ts | SPLIT + SIMPLIFY | 422 | 260 here (+35 runtime/calendar-options, +50 dev decorator) |
| apps/app/src/prototype/calendar-approval-adapter.ts | SIMPLIFY | 74 | 62 |
| apps/app/src/prototype/calendar-approval-fields.ts | KEEP (minor; optional MOVE to runtime/) | 67 | 60 |
| apps/app/src/prototype/calendar-approval-review.ts | SIMPLIFY (on `openReview`) | 30 | 20 |
| apps/app/src/prototype/calendar-availability-review.ts | SIMPLIFY (small) | 50 | 44 |
| apps/app/src/prototype/calendar-confirmation.ts | KEEP (later MERGE into calendar owner) | 20 | 18 |
| apps/app/src/prototype/calendar-days.ts | KEEP (Lemma-verified) | 112 | 108 |
| apps/app/src/prototype/calendar-edit-draft-adapter.ts | MERGE into calendar-form-draft-adapter.ts → `calendar-drafts.ts` | 60 | 0 |
| apps/app/src/prototype/calendar-form-draft-adapter.ts | SIMPLIFY + MERGE (becomes `calendar-drafts.ts`) | 80 | 95 (holds both) |
| apps/app/src/prototype/calendar-form-inputs.ts | KEEP (MOVE to runtime/) | 32 | 28 |
| apps/app/src/prototype/calendar-interval-presentation.ts | SIMPLIFY | 86 | 78 |
| apps/app/src/prototype/calendar-month-focus.ts | KEEP (later MERGE into calendar owner) | 25 | 22 |
| **Total** | | **2,598** | **≈2,225** (≈375 removable before formatting) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag` | type | automations-adapter.ts:16, browser-adapter.ts:20, calendar-adapter.ts:15, calendar-confirmation.ts:4, calendar-days.ts:11, calendar-edit-draft-adapter.ts:8, calendar-form-draft-adapter.ts:8, calendar-interval-presentation.ts:3, calendar-month-focus.ts:2 | ~45 prototype files, 10 in browser/ | `prototype/shell-types.ts` (`ShellHost`, `ViewApi`, view state types) |
| `Shell` | type | calendar-approval-adapter.ts:5 | `Shell = any` in 8 files | `ShellHost` |
| `Binding` | type | automations-adapter.ts:17 | `connectionController.getAutomationsClient` return type (runtime/connection-ui.tsx:2460) | `ReturnType<…>` |
| `civil` / `civilDay` | helper | calendar-adapter.ts:22, calendar-edit-draft-adapter.ts:29, calendar-form-draft-adapter.ts:11 and :42, calendar-form-inputs.ts:3, calendar-interval-presentation.ts:5 | canonical-calendar-drafts.ts:84, agent-calendar-adapter.ts:46-47, runtime/calendar-form-draft.ts:8, browser/workflow-calendar.ts:2, browser/workflow-receipts.ts:15 | `runtime/civil-date.ts` (`civilDay`, `DAY_MS`, `parseCivilDate`) |
| `DAY` | const | calendar-adapter.ts:17, calendar-form-inputs.ts:2, calendar-interval-presentation.ts:4 | 16 `86400000` literals in prototype/ | `runtime/civil-date.ts` |
| `calendarFormDayShift` | helper | calendar-form-draft-adapter.ts:11 | inline re-implementations calendar-form-draft-adapter.ts:42-43, calendar-edit-draft-adapter.ts:29-30, canonical-calendar-drafts.ts:84 | `calendar-drafts.ts` |
| UTC offset formatter `offset()` | helper | calendar-interval-presentation.ts:9 | calendar-adapter.ts:345 | `calendarIntervalDetail` (keep in interval-presentation) |
| guest email rule | helper | calendar-form-inputs.ts:29 (`calendarGuestEmail`) | calendar-adapter.ts:238 regex | `calendarGuestEmail` |
| civil date parse | helper | calendar-form-inputs.ts:7 (`readDate`) | calendar-approval-fields.ts:9 (`dateText`) | `runtime/civil-date.ts` |
| HH:MM regex | inline | automations-adapter.ts:28,54,208,229 | calendar-form-inputs.ts:8 | `runtime/workflow-local-time.ts` / `civil-date.ts` |
| `object` (plain-object guard) | helper | calendar-approval-fields.ts:5 | runtime/calendar-approval.ts:34, runtime/agent-calendar.ts:25, runtime/cloud-protocol.ts:124, browser/simulator-recovery.ts:9, browser/workflow-history.ts:5, +8 | `runtime/parse.ts` `isRecord` |
| `text` | helper | calendar-approval-fields.ts:6 | native-adapter.ts:84 | `runtime/parse.ts` |
| `localTime` | helper | calendar-approval-fields.ts:8 | locale-time.ts `formatDateTime` | `locale-time.ts` |
| recurrence vocabulary | const | calendar-adapter.ts:36 (`RRULES`), calendar-approval-fields.ts:14 (words) | agent-calendar-adapter.ts:200, browser/calendar-sync-fields.ts:4-8 | `runtime/calendar-recurrence.ts` |
| calendar grid constants | literals | calendar-interval-presentation.ts:47-56 (7, 23, 56, 912), calendar-days.ts:14 (60, 336) | model.js:1144 `CAL_H0/CAL_H1/CAL_PX` | shared calendar layout constants module |
| session identity tuple | helper | calendar-approval-adapter.ts:26, calendar-confirmation.ts:13 | main.tsx:102,430, agent-adapter.ts:443,1429,1694, agent-calendar-adapter.ts:142 | `runtime/session-key.ts` |
| app-record owner key tuple | inline | calendar-approval-adapter.ts:29 | agent-calendar model `ownerKey` writer | `runtime/session-key.ts` |
| `element` DOM factory | helper | calendar-availability-review.ts:5 | notes-query-review.ts:4-6, inline createElement chains (calendar-approval-review.ts, browser-camera.ts:430-437, …) | `prototype/dom.ts` |
| dialog scaffolding + theme-token copy | inline | calendar-approval-review.ts:8-18, browser-camera.ts:428-446 | source-review-dialog.ts `openReview` (canonical), workflow-filters.ts:14, file-email-review.ts, summary-note-review.ts, note-web-source-adapter.ts, note-source-adapter.ts, runtime/calendar-sync-settings.ts:205, browser/content-question.ts:9 | `openReview` (+ tokens on `:root`) |
| `AlphaCalendar` plugin typing | const | calendar-adapter.ts:16 | agent-adapter.ts:876,881,1034,1099,1129, maps-adapter.ts:134, workflow-authoring.ts:21, runtime/hosted-digest-ui.tsx:72, startup-permissions.tsx:24, browser/workflow-trigger-runtime.ts:26,59, browser/simulated-workflows.ts:24 | `runtime/alpha-calendar-plugin.ts` |
| `AlphaBrowser` plugin typing | const | browser-adapter.ts:23 | browser/register.ts:40 (web impl) | `browser/alpha-browser-plugin.ts` |
| `unimplemented` | helper | browser-adapter.ts:81 | Capacitor Unimplemented checks elsewhere | `platform-plugins.ts` |
| `photoId` / `mediaId` | helper | browser-camera.ts:106 / :197 | each other (identical) | one `mediaId` |
| IDB transaction wrapper | helper | browser-camera.ts:52-65 | browser document stores (C4, 8+) | shared browser IDB helper |
| photo CSS filter table | const | browser-camera.ts:105 | browser/photo-filter.ts | `browser/photo-filter.ts` |
| draft store wrapper / restore / recover / status-copy mapping | inline | calendar-form-draft-adapter.ts:22,62,66,76; calendar-edit-draft-adapter.ts:16,49,53,56 | canonical-calendar-drafts.ts | `calendar-drafts.ts` |
| `enabled`/`active` option default | helper | calendar-adapter.ts:61, calendar-form-draft-adapter.ts:17, calendar-edit-draft-adapter.ts:11 | each other | required option |
| `ExternalHandoffFlags` | interface | browser-external-handoff.ts:5 | browser-adapter closure vars | shared `BrowserPresentationState` |
| `homeCache` shape | inline type | automations-adapter.ts:61 | Home card values in home-cards.ts | `HomeWorkflowSnapshot` in home-cards.ts |
| focus-ring / text-field CSS | CSS | automations.css:9,22,27,29,32,45,82,87,99,105,130 | phone.css, scan-dialog.css | one rule each |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| 6 unused imports `calendarAgenda, calendarAgendaRows, calendarDayColumns, calendarDayCount, calendarDayLabel, visibleCalendarDays` (calendar-adapter.ts:11) | each name occurs exactly once in the file (the import) | Confirmed |
| `out.calendarSourceLabel/Text` (calendar-adapter.ts:181-182) | no template binding; overwritten by agent-calendar-adapter.ts:218 in the only active scope | Confirmed |
| Identical-branch ternaries: browser-adapter.ts:401, calendar-adapter.ts:182,272,325 | both branches the same literal | Confirmed |
| Stale comments calendar-adapter.ts:21,180; plan-name comments automations.css:59,85; `#701`, `#411` refs | describe nothing / history | Confirmed |
| browser-adapter disposer (668) + `disposed` flag (47 uses) + `flags.disposed` in browser-external-handoff | `main.tsx:154` ignores the return; no caller of `installPrototypeBrowserAdapter` in test/specs/scripts | Confirmed (product); T2 transplant tests reference the logic |
| `definition.reply=()=>null` (browser-adapter.ts:424) | agent-adapter.ts:1939 replaces `p.reply` globally | Confirmed |
| Constant fixture flags `isNews/isEnc/isBook/isSearch/isGeneric/recents/people/agOn/confirm` (browser-adapter.ts:471,473) | dc-lite treats absent as false/[] (dc-lite.js:118,136) | High |
| `// host-modal:begin/end` markers + test-only parameter (browser-adapter.ts:577-581) | used only by test/browser-host-modal.test.mjs (T2) | Confirmed (delete with test) |
| `workflowDetail` output (automations-adapter.ts:176) | 0 readers | Confirmed |
| `p.cachedAutomationsHome` prototype member (automations-adapter.ts:170) | only called in the same file | Confirmed (make local) |
| `out.formDraftAvailable=false` (calendar-form-draft-adapter.ts:60) | constant; canonical-calendar-drafts.ts:128 sets the real value | High |
| v2→v3 photo DB migration cursor + `??row.path` fallbacks (browser-camera.ts:40-45,88,217) and the v2 test case (test/browser-camera-storage.test.mjs:135) | current writers never store `path` in rows; D1 | High (D1) |
| `export {editReceiptAbandoned,editReceiptSettled}` re-export (browser-camera.ts:11-12) | only test/browser-camera-storage.test.mjs uses it | Confirmed |
| Exports with no external importer: `SHARE_LIMIT`, `ImportedCameraImage`, `splitVideoRow` (test only) (browser-camera.ts), `firstCalendarDay` (calendar-days.ts:27), `chooseAvailabilityCalendars`/`confirmAvailabilityResult` (calendar-availability-review.ts), `ExternalHandoffFlags/Deps` (browser-external-handoff.ts), `createCalendarReviewParses` (test only) | git grep | Confirmed (unexport) |
| `typeof setTimeout/clearTimeout` guards (calendar-adapter.ts:160,162) | Node transplant shims (D7) | Confirmed (with T2 tests) |
| Duplicate photo id function `mediaId` (browser-camera.ts:197) | identical to `photoId` | Confirmed |
| calendar-edit-draft-adapter.ts as a separate file | twin of calendar-form-draft-adapter.ts (C5) | High (merge) |
| Optional calls on always-present members (`view.refreshManagement?.`, `workflow.waitingFor?.`, `values?.call`, `getAppRecordClient?.`, `subscribe?.`, `unmount?.call`, `refreshAgentCalendar?.`, `refreshReminders?.`, `calendarFormCommitted?.`, `shell.S?.()`, `options.active?.()`) | members always installed in production (main.tsx order) | High (B2) |

## Cross-file actions
1. **Calendar draft merge (C5):** `calendar-form-draft-adapter.ts` + `calendar-edit-draft-adapter.ts` (+ later `canonical-calendar-drafts.ts`) → `calendar-drafts.ts`; update `main.tsx:18-19,133-134`, `specs/quint/refinement/application/calendar-adapter-fixture.mjs:8-9,40,143-144`, `specs/quint/application/manifest.json:6496-6536`, `test/quint-day-anchor.test.mjs:11-12`, `test/calendar-view-rules.test.mjs:31`, `test/support/feature-parity.mjs:352-353`, comment in `scan-event.ts:4`. Keep store keys `'calendar-creation-form'`, `'calendar-inline-edit-form'` and output keys identical.
2. **Required `active` option:** `calendar-adapter.ts:61`, `calendar-form-draft-adapter.ts:17`, `calendar-edit-draft-adapter.ts:11` and the Quint fixture `calendar-adapter-fixture.mjs:141-144` (pass `()=>true`).
3. **`runtime/civil-date.ts`:** replace civil-day/`DAY`/date-parse copies in calendar-adapter.ts, calendar-form-draft-adapter.ts, calendar-edit-draft-adapter.ts, calendar-form-inputs.ts, calendar-interval-presentation.ts, calendar-approval-fields.ts, canonical-calendar-drafts.ts, agent-calendar-adapter.ts, runtime/calendar-form-draft.ts, browser/workflow-calendar.ts, browser/workflow-receipts.ts.
4. **Locale-time conversions:** automations-adapter.ts:149,215 and calendar-adapter.ts:343-344 (via `calendarIntervalDetail`) → remove both from `test/locale-time-usage.test.mjs:16` `pending` set in the same change (the test fails otherwise). calendar-month-focus.ts:13 → `monthNames`; calendar-days.ts:73-76 → locale-time formatter.
5. **Browser-adapter teardown removal:** browser-adapter.ts (disposer, `disposed`), browser-external-handoff.ts (`flags.disposed`, accessor shim), T2 tests that transplant browser-adapter (`test/browser-*.test.mjs` list in the report), Quint browser refinement anchors in `specs/quint/application/manifest.json`.
6. **browser-camera move/split to `apps/app/src/browser/`:** update `prototype/camera-adapter.ts:26`, `browser/files.ts:1`, 22 Playwright specs + `test/browser/helpers/owned-photo.ts` (`import('/src/prototype/browser-camera.ts')`), `test/browser-camera-storage.test.mjs:77`, `test/recently-deleted.test.mjs`, `test/camera-preview-recovery.test.mjs`, Quint `specs/quint/native/manifest.json:441,3914-3938`, `specs/quint/application/manifest.json:3367,3769`, `specs/quint/refinement/{application/browser-album-storage,application/camera-preview-retirement,application/photos-window,native/copy-receipt,legacy/camera-session}.mjs`, `specs/quint/legacy/photos-library/*`, `test/support/feature-parity.mjs:343`.
7. **Calendar option helpers move:** `zonedInstant…calendarOptionEvent` → `runtime/calendar-options.ts` with one RRULE map shared with `agent-calendar-adapter.ts:200` and `browser/calendar-sync-fields.ts:4-8`; replace `test/browser/calendar-options.spec.ts` (T6) with an integration test.
8. **Browser-calendar dev decorator:** move the `!Capacitor.isNativePlatform()` branches of calendar-adapter.ts into a test-mocks-only module installed at the same position in `main.tsx`; `browser-adapter.ts:650-655` stops importing `browserCalendarScope` (agent-calendar-adapter.ts:50).
9. **Status ids for calendar status prose:** calendar-adapter.ts:19-20/87/93/95/99/102/111 and the overview consumer (`daily-overview.ts`), keeping copy.
10. **Typed plugin modules (C2):** `AlphaCalendar` (12 call sites listed above), `AlphaBrowser` (browser-adapter.ts:23, browser/register.ts:40).
11. **`openReview` adoption:** calendar-approval-review.ts, browser-camera.ts `openCameraImageImport`; extend `source-review-dialog.ts` with the extra theme tokens and `alpha:device-state` abort, or define tokens globally (also removes `workflow-filters.ts:14` copy and automations.css:66 fallbacks).
12. **Session key helper:** calendar-approval-adapter.ts:26,29, calendar-confirmation.ts:13, main.tsx:102,430, agent-adapter.ts:443,1429,1694, agent-calendar-adapter.ts:142.
13. **Workflows install duplication:** `main.tsx:168` and `:175` → one condition; later a workflows owner composing workflow-adapter.ts, automations-adapter.ts, clock-adapter.ts (removes `view.automationsManaged`, `view.refreshManagement` flags between them).
14. **Hosted digests bus:** automations-adapter.ts:181 `window.dispatchEvent('alpha:hosted-digests')` → exported opener in `runtime/hosted-digest-ui.tsx:135`.
15. **Native error code for unsupported profiles:** browser-adapter.ts:24,176 compares the Java message text; needs a plugin error code (Alpha plugin or upstream tab host — upstream follow-up per D14 if it lives in vendor).
16. **Calendar grid constants:** calendar-interval-presentation.ts:47-56, calendar-days.ts:14, model.js:1144.

## Text/path pins
- `LemmaScript-files.txt:8` (calendar-days.ts) and `specs/lemma/apps/app/src/prototype/calendar-days.dfy(.gen)`, `specs/lemma/README.md:175` — any change to the verified functions or a move needs regeneration.
- `specs/quint/application/manifest.json`: browser-adapter (70 pins), calendar-adapter (36), automations-adapter (3), browser-camera (2), calendar-form-draft-adapter (6), calendar-edit-draft-adapter (3), calendar-approval-adapter (3), calendar-days (3), calendar-month-focus (2), calendar-approval-review, browser-external-handoff, calendar-form-inputs (1 each). `specs/quint/services/manifest.json:4947-4981` (automations-adapter, 9), `specs/quint/native/manifest.json:441,3914-3938` (browser-camera, 7), `specs/quint/legacy/manifest.json:258` (calendar-adapter), browser-adapter in legacy/services manifests.
- Quint refinement drivers reading these sources: `specs/quint/refinement/services/automation-request-settlement.mjs:9`, `application/workflow-request-recovery-admission.mjs:7`, `application/{address-input,bookmarks-hydration,browser-session-persistence,browser-surface-presentation,browser-tab-lifecycle,find-in-page,files-*}.mjs`, `application/browser-external-handoff.mjs`, `application/{browser-album-storage,camera-preview-retirement,photos-window}.mjs`, `native/copy-receipt.mjs:12,30,111`, `legacy/camera-session.mjs:13`, `application/calendar-adapter-fixture.mjs:7-9,39-40`, `application/calendar-agent-selection.mjs`, `application/day-anchor.mjs`, `application/calendar-approval-review.mjs`, `application/calendar-form-controls.mjs:5,8`, `legacy/home-layout/check-home-layout-refinement.mjs:358`, `legacy/photos-library/check-photos-library-refinement.mjs:19,174`, `legacy/files-browser/*`, `legacy/google-connect/*`.
- Host tests that read/slice/bundle these files (T1/T2): `automations-unified.test.mjs:75`, `home-cards.test.mjs:285`, `locale-time-usage.test.mjs:16` (pending list), `browser-host-modal.test.mjs:3` (markers), `browser-{bookmark-startup,calendar-open-source,command-refusals,navigation-creation,popup-opener,presentation-lifecycle,reading-capability,receipt-order,session-persistence}.test.mjs`, `files-browser`, `login-surfaces`, `theme-palette`, `client-feature-preparation`, `browser-camera-storage.test.mjs:77,135`, `calendar-review-parse-cache.test.mjs:9-12`, `calendar-approval-ui.test.mjs:7,62,87`, `calendar-confirmation.test.mjs:2`, `calendar-delete-latch.test.mjs:10`, `calendar-view-rules.test.mjs:17,31`, `canvas-geometry.test.mjs:82`, `calendar-form-inputs.test.mjs:4`, `scanned-calendar-handoff.test.mjs:10`, `calendar-day-context.test.mjs:183`, `quint-day-anchor.test.mjs:11-12`, `quint-calendar-agent-selection.test.mjs` (mutates calendar-adapter source), `quint-calendar-approval-review.test.mjs`, `browser-external-handoff-refinement.test.mjs`, `recently-deleted.test.mjs`, `camera-preview-recovery.test.mjs`.
- Fixtures: `test/fixtures/reminder-open-intent.mjs:9`, `scheduled-task-controls.mjs:10`, `browser-external-handoff.mjs:8`, `calendar-mounted-editor.mjs`, `canonical-calendar-draft-owner.mjs`, `modal-scrim-chromium.mjs:13`.
- Scripts: `scripts/test-calendar-crud-review.ts:58` (regex on calendar-adapter's `reminderWallTime` import line), `scripts/fixtures/calendar-adapter.ts`, `scripts/test-calendar-query-race.ts`, `scripts/prepare-client-features.ts` (browser-adapter).
- Playwright `page.evaluate(import('/src/prototype/…'))` (T6): browser-camera (22 specs + helper), `calendar-options.spec.ts:8` (calendar-adapter), `calendar-approval-queue.spec.ts:9`, `browser-external-handoff.spec.ts:16`.
- `test/support/feature-parity.mjs:33-35` (owner mappings for calendar-approval-fields, calendar-confirmation, calendar-form-inputs) and `:341-356` (all 16 TS files listed).

## New patterns
- **Identical-branch ternary** — `cond ? 'Saved' : 'Saved'`, `isNative ? '' : ''`, `isNative ? 'Cleared' : 'Cleared'` (calendar-adapter.ts:182,272,325; browser-adapter.ts:401). Leftover after copy edits; collapse to the literal. (Fits B4 loosely; worth its own grep: `\?\s*('[^']*')\s*:\s*\1`.)
- **Locale bypass** — bare `toLocale*String` / private `Intl.DateTimeFormat` instead of `locale-time.ts`, so the Android 12/24-hour choice or app locale is ignored (automations-adapter.ts:149,215; calendar-adapter.ts:343-344; calendar-approval-fields.ts:8; calendar-days.ts:75; calendar-month-focus.ts:13). Partly tracked by `test/locale-time-usage.test.mjs`'s pending list (time only).
- **Per-render closure re-assignment on the shell** — `renderVals` wrapper re-creating `this.browserCommand/browserNavigateApproved/browserSelection` every render (browser-adapter.ts:491-541). Assign once at mount.
- **Exceptions as goto / probes** — bare `throw new Error()` to reach a shared catch in address parsing (browser-adapter.ts:182-199); `try{current();admitted=true}catch{}` as a boolean probe (calendar-approval-adapter.ts:54).
- **Render recursion** — a decorator calling the full inner view `render` again per visible day (calendar-interval-presentation.ts:38,45), multiplying the onion-render cost (D2/P17).
- **Import-time global listeners** — module evaluation adds window/document listeners never removed (browser-camera.ts:343).

## Owner questions
1. Is the web (development-preview) build expected to keep its own recovery surfaces — Workflows intent-journal "Recovery · Back up or reset" (automations-adapter.ts:184-186), browser bookmark recovery (browser-adapter.ts:52-80), Calendar/reminder browser recovery (calendar-adapter.ts:185-186)? Proposed: move them behind the dev module boundary (D6), not delete.
2. The browser-calendar ("Browser calendar (development)") behaviour in calendar-adapter.ts only runs with `testMocksEnabled`. Agree to move it into a dev decorator installed only in test-mocks builds (keeps the chromium calendar specs)?
3. Converting the remaining bare time formatting to `locale-time.ts` changes visible times on devices set to 24-hour/12-hour (they will follow the phone setting). Confirm this is wanted (the locale-time test says it is the plan).
4. Photo DB v2→v3 migration (browser-camera.ts:40-45): D1 says delete legacy readers; this one only affects development-preview IndexedDB in a browser profile that pre-dates the split. Confirm deletion.
5. Should `calendar-days.ts` (Lemma-verified) and `calendar-form-inputs.ts` move to `runtime/` now (proof path churn: `LemmaScript-files.txt`, `specs/lemma/...`) or only together with a calendar view-owner folder?
6. Native unsupported-profile detection compares the Java error message (browser-adapter.ts:176). If the message comes from upstream (`vendor/eliza` tab host), the error-code change is an upstream follow-up (D14).
