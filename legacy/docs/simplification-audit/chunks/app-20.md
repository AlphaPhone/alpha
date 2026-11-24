# Chunk app-20 — runtime a–c (abort-signal … clock-handoff-history)

38 files, 3,052 lines. Per-file reports: `docs/simplification-audit/files/apps/app/src/runtime/<name>.md`.
Estimated after: ~1,720 lines in these paths (+~140 lines moved to new homes: provider-key module, `agent-types.ts`, owner-route-policy). Net removable ≈ 1,190 lines, of which 689 are the dead Calendar linked-sync stack.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/runtime/abort-signal.ts | SPLIT (`runProviderConfiguration` → provider-key module; polyfill pending WebView floor) | 44 | 16 (0 if floor ≥ 116) |
| apps/app/src/runtime/accessibility-timeout.ts | SIMPLIFY | 39 | 33 |
| apps/app/src/runtime/action-message-presentation.ts | SPLIT into `runtime/chat/{action-projection,system-notices,markup}.ts` | 246 | ~200 (3 files) |
| apps/app/src/runtime/agent-calendar-client.ts | MERGE into app-record-port (`appRecordFetch`) | 17 | 0 |
| apps/app/src/runtime/agent-calendar-view.ts | SIMPLIFY | 48 | 38 |
| apps/app/src/runtime/agent-calendar.ts | SIMPLIFY (A1 legacy preservation, owner) | 289 | ~250 formatted |
| apps/app/src/runtime/alpha-client.ts | SIMPLIFY + types MOVE to `agent-types.ts` | 506 | ~300 (+110 in agent-types.ts) |
| apps/app/src/runtime/always-on-listener.ts | SIMPLIFY (dormant half = owner decision) | 77 | 38 (60 if dormant code kept) |
| apps/app/src/runtime/aosp-image.ts | SIMPLIFY (minor) | 36 | 22 |
| apps/app/src/runtime/aosp-telephony.ts | SIMPLIFY (shim shrink) | 49 | 15 |
| apps/app/src/runtime/app-record-completion.ts | SIMPLIFY + absorb automation-completion.ts | 58 | 55 |
| apps/app/src/runtime/app-record-route-policy.ts | MERGE assert into owner-route-policy.ts; rename `app-record-port.ts` | 15 | 22 (gains fetch adapter) |
| apps/app/src/runtime/app-speech.ts | SIMPLIFY | 33 | 30 |
| apps/app/src/runtime/assistant-draft-record.ts | DELETE | 3 | 0 |
| apps/app/src/runtime/assistant-draft-store.ts | SIMPLIFY (minor) | 25 | 22 |
| apps/app/src/runtime/automation-completion.ts | MERGE into app-record-completion.ts | 11 | 0 |
| apps/app/src/runtime/automations-protocol.ts | SIMPLIFY | 173 | 150 |
| apps/app/src/runtime/automations-route-policy.ts | MERGE into owner-route-policy.ts | 11 | 0 |
| apps/app/src/runtime/browser-cloud-resident.ts | MOVE to `browser/dev/` + SIMPLIFY | 88 | 70 |
| apps/app/src/runtime/browser-note-documents.ts | MOVE to `browser/note-documents.ts` | 11 | 11 |
| apps/app/src/runtime/browser-notes-document.ts | SIMPLIFY (A1 legacy archive) then MOVE to `browser/` | 68 | 35 |
| apps/app/src/runtime/calendar-approval-client.ts | KEEP (cosmetic) | 35 | 32 |
| apps/app/src/runtime/calendar-approval.ts | SIMPLIFY (inbox CHOICE out, shared parsers) | 62 | 45 |
| apps/app/src/runtime/calendar-availability.ts | DELETE (pure re-export) | 20 | 0 |
| apps/app/src/runtime/calendar-day-observation.ts | SIMPLIFY (minor) | 19 | 22 (formatted) |
| apps/app/src/runtime/calendar-edit-draft.ts | MERGE into calendar draft codec | 31 | 0 |
| apps/app/src/runtime/calendar-form-draft.ts | SIMPLIFY + absorb two codecs → `calendar-draft-codec.ts` | 48 | ~90 (holds all three) |
| apps/app/src/runtime/calendar-linked-provider.ts | DELETE (dead sync stack) | 26 | 0 |
| apps/app/src/runtime/calendar-linked-storage.ts | DELETE (dead sync stack) | 35 | 0 |
| apps/app/src/runtime/calendar-linked-store.ts | DELETE (dead sync stack) | 26 | 0 |
| apps/app/src/runtime/calendar-sync-host.ts | DELETE (dead sync stack) | 345 | 0 |
| apps/app/src/runtime/calendar-sync-settings.ts | DELETE (type → google-accounts.ts) | 257 | 0 |
| apps/app/src/runtime/canonical-calendar-draft.ts | MERGE into calendar draft codec | 20 | 0 |
| apps/app/src/runtime/canvas-geometry.ts | KEEP (minor; Lemma-proved) | 132 | 128 |
| apps/app/src/runtime/client-observation-support.ts | SIMPLIFY | 90 | 75 |
| apps/app/src/runtime/clock-agent-review.ts | MERGE into `clock.ts` | 6 | 0 |
| apps/app/src/runtime/clock-contract.ts | SIMPLIFY → `clock.ts` (absorbs the two clock files) | 37 | ~22 |
| apps/app/src/runtime/clock-handoff-history.ts | MERGE into `clock.ts`, drop legacy key | 16 | 0 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| SHA-256→hex inline | helper | agent-calendar.ts:27; assistant-draft-store.ts:14 | sms-agent-contract.ts:4, native-recovery-backup.ts:11, ~24 more app-wide | `apps/app/src/lib/sha256.ts` `sha256Hex` |
| `record` / `object` plain-object guard | helper | agent-calendar.ts:25; calendar-approval.ts:34; automations-protocol.ts:22 (throwing); inline in action-message-presentation.ts:202,232, client-observation-support.ts:71, browser-cloud-resident.ts:49 | cloud-protocol.ts:124, local-agent.ts:163, device-view-profile.ts:8, ~25 more | `apps/app/src/lib/is-record.ts` (`isRecord`, `expectRecord`) |
| UUID regex | const | calendar-approval.ts:3; action-message-presentation.ts:10 | google-accounts.ts:52, local-agent.ts:183, resident-recovery.ts:33, device-view-profile.ts:4, browser/development-workflows.ts:58,64,77 | `apps/app/src/lib/uuid.ts` |
| hand-rolled abort/timeout race | helper | abort-signal.ts:24-37; alpha-client.ts:321-345; client-observation-support.ts:55-66; always-on-listener.ts:29-44; app-speech.ts:23 | local-agent.ts:236-250, :282-318 | `apps/app/src/lib/abort.ts` `raceAbort` |
| `[CHOICE:…]` block parsers | helper | action-message-presentation.ts:10 (check-in), :191-196 (`SHARE_CHOICE`); calendar-approval.ts:6 (approval), :22 (inbox) | none outside | `runtime/chat/markup.ts` `parseChoiceBlocks` (keep `SHARE_CHOICE` name, manifest-pinned) |
| `\n{3,}` collapse after removal | helper | action-message-presentation.ts:217,245; calendar-approval.ts:28 | — | `runtime/chat/markup.ts` |
| `Bag`-style record types | type | action-message-presentation.ts:5 `Message`; automations-protocol.ts:11 `ObjectValue`; calendar-form-draft.ts:2 & calendar-edit-draft.ts:3 `Form`; canonical-calendar-draft.ts:2 `Bag` | 60 `Bag` declarations app-wide | real row types / one shared form type in the calendar draft codec |
| session identity tuple `JSON.stringify([origin,ownerId,agentId,sessionId,…])` | helper | alpha-client.ts:241; client-observation-support.ts:18; agent-calendar.ts:14 and binding tuple ×7 (L60,94,97,250,257,266) | calendar-sync-host.ts:99 (deleted), connection-ui.tsx:1647, main.tsx:102,430 | `sessionKey(session, ...extra)` in `runtime/agent-types.ts`; `bindingKey(port)` in agent-calendar.ts |
| `AppRecordMethod` / `AutomationsMethod` | type | app-record-route-policy.ts:5; automations-route-policy.ts:3 | each other | `owner-route-policy.ts` `OwnerRouteMethod` |
| `assertAppRecordRequestAllowed` / `assertAutomationRequestAllowed` | helper | app-record-route-policy.ts:13; automations-route-policy.ts:9 | each other | `owner-route-policy.ts` `assertOwnerRequest` |
| AppRecordPort fetch adapter | helper | agent-calendar-client.ts:9-16 | prototype/canonical-notes-controller.ts:15-22 | `app-record-port.ts` `appRecordFetch` |
| effect-receipt walk | helper | app-record-completion.ts:23-53; automation-completion.ts:5-11 | each other | merged `effect-invalidations` |
| `NOTES_INVALIDATED_EVENT` | const | app-record-completion.ts:3 | prototype/canonical-notes-controller.ts:6 `CANONICAL_NOTES_INVALIDATED_EVENT` | app-record-completion.ts |
| `'alpha:canonical-calendar-invalidated'` | const | app-record-completion.ts:4 | literal in prototype/agent-calendar-adapter.ts:135,137 | app-record-completion.ts |
| typed slices of `AlphaDevice` plugin | type | accessibility-timeout.ts:11 `TimeoutPort` | crash-log.ts:52 `CrashLogPort`, main.tsx:181 `SystemBars`, browser/simulated-workflows.ts:24 (`any`) | one typed AlphaDevice plugin module |
| typed `AlphaActionJournal` plugin | type | clock-agent-review.ts:4 `ClockReviewBridge` | connection-ui.tsx:503 `ActionJournal` | one typed plugin module |
| dev loopback session rule | const/helper | alpha-client.ts:185-191 | remote-protocol.ts:81-82 | delete with retired `'local'` kind (or one shared rule) |
| dev "browser Cloud resident" flag | const | browser-cloud-resident.ts:5 | local-agent.ts:69, local-agent-storage.ts:9, alpha-client.ts:185 | `build-flags.ts` |
| `/__alpha-browser-cloud` POST | helper | browser-cloud-resident.ts:12, :43 | `/__alpha-local-agent` POSTs local-agent.ts:104,109,117; local-agent-storage.ts:11 | one dev bridge client in `browser/dev/` |
| dev-background foreground predicate | helper | app-speech.ts:20 | 23 inline `dataset.devBackground==='true'` checks in 21 files (browser/alert-audio.ts:7, clock.ts:39, hosted-results.ts:17, location.ts:11, notice-action.ts:2, notifications.ts:21, password-provider.ts:23, review.ts:10,35, voice.ts:275, …) | `apps/app/src/lib/foreground.ts` |
| civil-date helpers (`DAY`, `civil`, `day`, ISO date format) | helper | agent-calendar-view.ts:5-7 (`date` unused); calendar-form-draft.ts:8; calendar-day-observation.ts:17 | each other | `runtime/calendar-dates.ts` |
| draft size limit 64000 bytes | const | calendar-form-draft.ts:22; calendar-edit-draft.ts:16; canonical-calendar-draft.ts:11 | each other | calendar draft codec |
| `fail()` | helper | calendar-form-draft.ts:9; calendar-edit-draft.ts:4 | each other | calendar draft codec |
| persisted cache keys `calendar:owner:v1`, `calendar:feed:v1`, `calendar:access-refused:v1` | const | agent-calendar.ts:68,73,109-110,126,174 | none | constants in agent-calendar.ts (values unchanged) |
| `CanonicalCalendarSyncSettings` | type | calendar-sync-settings.ts:8 | — | `google-accounts.ts` |
| `ClockResult` re-export | type | clock-contract.ts:19 | daily.ts:55 (different type, same name) | delete re-export |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Client-side Calendar linked-sync stack: `calendar-sync-settings.ts` (except type), `calendar-sync-host.ts`, `calendar-linked-store.ts`, `calendar-linked-storage.ts`, `calendar-linked-provider.ts` (+ out-of-chunk `native-calendar-sync.ts` 68, `browser/calendar-linked-local.ts` 186, `browser/calendar-sync-fields.ts` 177, `CloudProtocol.googleCalendarSync`) | `openCalendarSyncSettings` and `startCalendarSyncHost`: 0 importers in apps/android; every other file reachable only through them; `calendarSyncHttp` only feeds `googleCalendarSync`, whose only caller is the dead host; quint doc `google-calendar-link-publication.md:18-22` already says test-only | High (renderer); Android `CalendarSyncBridge`/slot allowlist needs owner |
| `always-on-listener.ts` `assistantInvocation` (L53-57) and `MODAL` (L60) | 0 references in apps, android, test, scripts, specs | High |
| `agent-calendar-view.ts:7` `date` helper | never called (local `date` at L37 shadows it) | High |
| `agent-calendar-view.ts:48` `canonicalHomeCalendar` | no app importer; only a T2 slice in `test/agent-calendar-refresh-state.test.mjs:12` | High |
| `assistant-draft-record.ts` | one-line type alias, one importer | High |
| `calendar-availability.ts` | pure re-export, two importers | High |
| `aosp-telephony.ts` alias types `PermissionState, RoleState, Subscription, ContactCard, HandoffStatus, HandoffResult, AccessKind` and re-exports `SMS_*_MAX*`, `MessageDirection`, `MmsSendResult`, `MessageStatus`, `SmsMessage`, `SmsSendState`, `SmsThread`, `TelephonyRole`, `TelephonyStatus` | no `from '…/aosp-telephony'` import names them | High |
| `clock-contract.ts` re-exports `CLOCK_CAPABILITY`, `ClockOperation`, `ClockResult`, `ClockHandoffResult`, `CLOCK_DAY_NAMES`, `ClockSetRequest`, `ClockDraftRequest`; test-only aliases `clockDays`, `validateClockOperation`, `validateClockOutcome`, `describeClockHandoff` | 0 importers / tests only | High |
| `alpha-client.ts` `close?()` + `old?.close?.()` try/finally | sole transport (agent-adapter.ts:830-836) never defines `close` | High |
| `alpha-client.ts` dev loopback session (`developmentSessionsAllowed`, `developmentSessionOrigin`, `developmentOrigin` option) | only used when `connection.kind==='local'` (retired paired kind, agent-adapter.ts:836) | Medium (with P4 removal) |
| `agent-calendar.ts` legacy calendar preservation (`LegacyCalendarCapture`, `CalendarPreservation`, `transition-required`/`legacy-recovery`, `confirmLegacyRetention`) + `legacy-calendar-preservation.ts` + transition UI | A1; renamed package starts empty | Medium (owner Q) |
| `agent-calendar.ts` injectable `ClientFactory` | only constructor call passes `undefined` | High |
| `browser-notes-document.ts` legacy Notes archive reading (`legacy`, `sameLegacy`, `assertLegacy`, daily key) + legacy-notes specs/UI | A1; dev-browser data only | Medium (owner) |
| `browser-notes-document.ts` `DocumentNotesStore` re-export, `openBrowserNotes` | test-only | High |
| `clock-handoff-history.ts` `clockHandoffLegacyKey` + legacy reader | upstream `legacy` option is optional; envelope keeps `legacy:null` | High |
| `always-on-listener.ts` dormant invocation half (`installListenerInvocation`, `openListenerSettings`, `INVOCATION_EVENT`) + `voice-entry-policy.ts` + `AlphaAssistActivity` JS event | `externalVoiceInvocationEnabled = false` constant | Owner decision (PRD AP gate) |
| `app-speech.ts` `testMocksEnabled` branch | D5 dev branch in production router | Medium |
| unexports (no external importer): accessibility-timeout `TimeoutPort`, `ResumePort`, `ACCESSIBILITY_TIMEOUT_BASE_MS`; action-message-presentation notice constants + `WorkflowRunCard`; alpha-client `AlphaClientState`; aosp-image `AOSP_TELEPHONY_PLUGIN`; aosp-telephony `ALPHA_TELEPHONY_UNAVAILABLE`; app-record-completion `AppRecordInvalidation`; automations-protocol `AutomationKind`, `AutomationSnapshot`, `ScheduledVerb`; browser-cloud-resident `BrowserProvider*` types; browser-notes-document `browserNotesKey`; calendar-approval-client `CalendarApprovalConnection`; canvas-geometry `LARGE_TEXT`, `SPLIT_CANVAS`; client-observation-support cache/binding/context helper | whole-repo grep | High |

## Cross-file actions
1. **Delete the Calendar linked-sync stack** — files: runtime/calendar-sync-settings.ts, calendar-sync-host.ts, calendar-linked-store.ts, calendar-linked-storage.ts, calendar-linked-provider.ts, native-calendar-sync.ts, browser/calendar-linked-local.ts, browser/calendar-sync-fields.ts; edit runtime/cloud-protocol.ts (import L4, `googleCalendarSync` L548), runtime/google-accounts.ts:5 and runtime/google-connection-ui.tsx:17 (type import → google-accounts.ts); remove `alpha:calendar-sync-*` dispatchers (connection-ui.tsx:460 per research); tests/specs: test/browser/calendar-sync-settings.spec.ts, calendar-sync-fixture.ts, calendar-linked-storage.spec.ts, test/calendar-sync-settings-navigation.test.mjs, test/calendar-linked-store.test.mjs, test/native-calendar-sync-port.test.mjs, test/calendar-agent-write-host.test.mjs, test/calendar-managed-rejection.test.mjs (check scope), test/native-secure-slots.test.mjs:97, test/fixtures/browser-daily-stores.mjs:41, test/browser/accessibility-states.ts:461, scripts/test-calendar-sync-provider.ts, scripts/storage-specs.ts:10-11, specs/quint/refinement/composition/ports.mjs:58, specs/quint/refinement/services/calendar.mjs, specs/quint/{native,services}/manifest.json entries, test/support/feature-parity.mjs:191,198,469-473; Android `CalendarSyncBridge.java` / `AlphaCalendarPlugin` sync methods and the `calendar-linked-sync:v1:` slot (owner).
2. **Calendar draft codec merge** — calendar-form-draft.ts + calendar-edit-draft.ts + canonical-calendar-draft.ts → `calendar-draft-codec.ts`; importers prototype/calendar-adapter.ts, calendar-form-draft-adapter.ts, calendar-edit-draft-adapter.ts, canonical-calendar-drafts.ts; scripts/storage-specs.ts; quint manifests (application, services) and calendar-adapter-fixture.mjs, contracts.mjs, canonical-calendar-draft*.mjs; feature-parity inventory; tests importing by path (calendar-form-inputs, calendar-end-after-start, quint-day-anchor, scan-all-day-draft, canonical-calendar-draft-ownership, quint-canonical-calendar-draft*).
3. **Clock binding merge** — clock-contract.ts + clock-agent-review.ts + clock-handoff-history.ts → `clock.ts`; importers daily.ts, prototype/agent-adapter.ts, prototype/clock-adapter.ts (also drop legacy reader at L27), runtime/phone-context.ts, runtime/connection-ui.tsx:33; tests test/clock-repeat-days.test.mjs, reminder-lifecycle-pure.test.mjs, native-secure-slots.test.mjs:125, browser/agent-clock-handoff.spec.ts:161,168,220, fixtures/workflow-clock-admission.mjs:17-19; scripts/test-clock-handoff-flow.ts, test-connection-history.ts:28; feature-parity inventory.
4. **Owner-route assertion merge** — app-record-route-policy.ts + automations-route-policy.ts → owner-route-policy.ts (`assertOwnerRequest`, `OwnerRouteMethod`, `AutomationRequestNotDispatchedError`); importers connection-ui.tsx (L9, L23), local-agent.ts, cloud-protocol.ts, development-cloud-agents.ts, automations-protocol.ts; `AppRecordPort` + new `appRecordFetch` in `app-record-port.ts` used by agent-calendar.ts (replacing agent-calendar-client.ts) and prototype/canonical-notes-controller.ts:15-22, plus prototype/agent-calendar-adapter.ts, canonical-notes-ui.ts.
5. **Effect invalidations merge** — app-record-completion.ts + automation-completion.ts; connection-ui.tsx (L10 + dispatch site 3532), prototype/automations-adapter.ts:4, prototype/canonical-notes-controller.ts:6 (use shared constant), prototype/agent-calendar-adapter.ts:135,137 (literal → constant).
6. **Chat markup consolidation** — split action-message-presentation.ts into runtime/chat/*; move calendar-approval.ts `inboxChoiceText` and CHOICE parsing into chat/markup.ts; importers prototype/agent-adapter.ts, maps-adapter.ts, maps-chat-adapter.ts, voice-adapter.ts, calendar-approval-adapter.ts, runtime/connection-ui.tsx, device-actions.ts; manifest application pins `mapsChatText`, `SHARE_CHOICE` (update path).
7. **Legacy readers (A1, owner)** — agent-calendar.ts + legacy-calendar-preservation.ts + prototype/agent-calendar-adapter.ts (L15,151,219,232,235,243,251) + prototype/settings-adapter.ts:862-866 + quint calendar-preservation-confirmation.mjs; browser-notes-document.ts + prototype/legacy-notes-access.ts + runtime/notes-secure-store.ts `readLegacyDailyNotes` + notes-store.ts `LEGACY_NOTES_KEY` + Playwright legacy-notes specs; clock-handoff-history.ts + prototype/clock-adapter.ts:27.
8. **Shared micro-helpers** — create `apps/app/src/lib/{sha256,is-record,uuid,abort,foreground}.ts` and replace the twins listed above (this chunk: agent-calendar.ts, assistant-draft-store.ts, calendar-approval.ts, automations-protocol.ts, action-message-presentation.ts, client-observation-support.ts, alpha-client.ts, abort-signal.ts, always-on-listener.ts, app-speech.ts).
9. **Retired paired 'local' kind** — alpha-client.ts dev-origin option goes with prototype/agent-adapter.ts:836 and remote-protocol.ts:81-83 when research P4 lands.
10. **Wire types move** — alpha-client.ts types → runtime/agent-types.ts; ~20 type importers and quint manifest `sources` lists that name alpha-client.ts.

## Text/path pins
- **Manifest symbol pins** (renaming the symbol or moving the file breaks them): alpha-client.ts (`AlphaClient, run, send, approve, cancel, disconnect, setViewContext, generateWorkflowText, consumed, proposals, expiresAt, keepConsumed, consumedSession`), accessibility-timeout.ts (`accessibilityTimeoutScale`), aosp-image.ts (`AOSP_IMAGE_VIEWS`; services `ADMITTED_AOSP_VIEW_ADAPTERS`), always-on-listener.ts (`listenerStatus`), canvas-geometry.ts (`canvasGeometry, keyboardFreeHeight, WIDE_CANVAS, isEditing`), aosp-telephony.ts (`createAospTelephony, normalizePhoneNumber`; services also `reviewMms, MMS_MAX_ATTACHMENTS`), action-message-presentation.ts (`mapsChatText, SHARE_CHOICE`), app-speech.ts (native: `retirement, speakAppText, confirmSpeechRetirement`), automations-protocol.ts (services: `AutomationOutcomeError, mergeAutomationRows`).
- **Manifest `sources`/file lists** (paths): most files in this chunk appear in `specs/quint/{application,native,services}/manifest.json`; feature-parity inventory `test/support/feature-parity.mjs:442-479` lists every runtime file here (exact inventory — add/remove on every move/delete); `reviewedHelpers` entry for calendar-approval-client.ts.
- **Source-text tests (T1/T2)**: test/abort-signal-compat.test.mjs:5, test/direct-provider-module-budget.test.mjs (abort-signal); test/voice-in-chat-only.test.mjs:35,41 (always-on-listener regex); test/app-speech-route.test.mjs:6 (strip+eval app-speech); test/agent-calendar-refresh-state.test.mjs:7,11-13 (agent-calendar, slice of `canonicalHomeCalendar`); test/canonical-maps-return.test.mjs:6 (agent-calendar); test/agent-always-local.test.mjs:156, test/login-surfaces.test.mjs:330 (alpha-client); test/aosp-image-capability.test.mjs:36; test/aosp-sms.test.mjs:269 (aosp-telephony); test/upstream-owner-gate-compat.test.mjs:89-90,147-149 (calendar-approval*); test/calendar-linked-store.test.mjs:336 (calendar-sync-host); test/calendar-sync-settings-navigation.test.mjs:8 (strip+eval); test/native-secure-slots.test.mjs:97,125 (calendar-linked-storage slot, clock-handoff-history `clockHandoffSlot`); test/wallet-disabled.test.mjs:22-27 (rewrites aosp-image import).
- **Path-keyed esbuild stubs**: `runtime/aosp-image` and `runtime/aosp-telephony` in test/image-sms, phone-adapter, quint-phone-recents, quint-view-admission, sms-incomplete-rows, telephony-attention-lifecycle tests and specs/quint/refinement/services/*-replay.mjs.
- **Quint harnesses reading source**: specs/quint/refinement/application/scheduled-snooze-admission.mjs:12, services/automation-request-settlement.mjs:17, services/calendar.mjs:10,18, composition/ports.mjs:58, native/speech-cleanup-latch.mjs, application/accessible-toast-lifetime.mjs:123.
- **LemmaScript**: `LemmaScript-files.txt` + `specs/lemma/apps/app/src/runtime/canvas-geometry.dfy(.gen)` generated from `//@` annotations in canvas-geometry.ts.
- **Playwright in-page imports by path**: `/src/runtime/browser-notes-document.ts` (~45 specs), `/src/runtime/calendar-availability.ts`, `/src/runtime/clock-agent-review.ts`, `/src/runtime/clock-contract.ts`, `/src/runtime/calendar-sync-host.ts`, `/src/runtime/calendar-sync-settings.ts`, `/src/runtime/calendar-linked-{store,storage}.ts`.
- **Scripts**: scripts/test-connection-history.ts, test-agent-calendar-mutation-flow.ts, test-calendar-availability-flow.ts, test-calendar-availability-provider-rows.ts, test-calendar-sync-provider.ts, test-clock-handoff-flow.ts, test-notes-documents-browser.ts, storage-specs.ts, browser-cloud-dev-bridge.ts, prepare-client-features.ts (upstream clock file list).
- **Android**: `AlphaAssistActivity.java:19` mirrors `INVOCATION_EVENT`; `AlphaTelephony` plugin name in MainActivity/AlphaImageCapability.

## New patterns
- NEW — **dev "simulated background" predicate re-inlined**: `document.hidden || document.documentElement.dataset.devBackground === 'true' (|| browserScreenLocked())` appears 23 times in 21 files, including production paths (app-speech.ts:20). Fits C3/D5; worth naming so one `appInForeground()` absorbs the dev switch.
- NEW (candidate) — **self-round-trip on encode**: codecs that decode what they just encoded before returning (calendar-edit-draft.ts:13, canonical-calendar-draft.ts:8, calendar-form-draft.ts:29 `validate(payload)`). Close to B3; acceptable only where "never persist what cannot be restored" is the stated rule.
- NEW (candidate, D10 variant) — **behaviour keyed on upstream log/label text**: automations-protocol.ts:61 parses `lastDecisionLog` text to detect a snooze; action-message-presentation.ts:57,69 keys on 'Review on phone' / 'Completed'.

## Owner questions
1. Minimum supported Android System WebView: if ≥ 116, delete the `anyAbortSignal` polyfill (12 importers) and its test.
2. Confirm that the agent-side linked-calendar control (`AgentCalendar.reviewSync/changeSync` + `google-accounts.ts linkGoogleCalendar`) is the accepted AP-09 "local-first sync", so the client-side linked-sync stack (≈1,120 renderer lines) and the Android `CalendarSyncBridge` sync methods/slot can be deleted.
3. Legacy data: may the legacy app-calendar preservation (agent-calendar.ts + legacy-calendar-preservation.ts + transition UI), the browser legacy Notes archive (browser-notes-document.ts, legacy-notes-access.ts) and the Clock handoff legacy key be deleted, given the renamed package starts with empty data?
4. Always-on listening / assistant invocation is dormant behind `externalVoiceInvocationEnabled = false` while the PRD lists it as an AOSP gate: keep the dormant code (record in DECISIONS.md) or delete it with `AlphaAssistActivity`'s JS event?
5. Is the device-calendar (`native:` source) edit surface (prototype/calendar-adapter.ts + calendar-edit-draft codec) still a product surface beside the canonical agent calendar, or part of the legacy calendar authority to remove?
6. Is the `npm run dev:cloud` browser Cloud resident mode still used? If not, `browser-cloud-resident.ts` and its branches in nine production modules can go; if yes, it should be injected as a dev transport.
7. Should the `bootstrapDiagnostic` stage trail in `AgentCalendar.restoreSaved` stay (who reads it)?
8. Upstream: which note operation names can `normalizeEffectReceipts` still emit (`notes.note.*` vs `notes.*-note`)? And can upstream expose a structured snooze field so automations-protocol stops parsing `lastDecisionLog` text?
