# Chunk app-24 — apps/app/src/runtime (hosted-digest-ui … native-assistant-draft-recovery)

37 files, 3,480 lines. Per-file reports: `docs/simplification-audit/files/apps/app/src/runtime/<name>.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/runtime/hosted-digest-ui.tsx | SPLIT into `runtime/digests/` | 870 | 720 (across folder) |
| apps/app/src/runtime/hosted-digests.ts | SIMPLIFY | 76 | 60 |
| apps/app/src/runtime/hosted-live-source-ui.tsx | SIMPLIFY | 266 | 235 |
| apps/app/src/runtime/hosted-notice-question.ts | SIMPLIFY | 47 | 45 |
| apps/app/src/runtime/hosted-result-notices.ts | SIMPLIFY | 42 | 35 |
| apps/app/src/runtime/image-contacts.ts | KEEP | 12 | 12 |
| apps/app/src/runtime/image-preview.ts | KEEP | 70 | 60 |
| apps/app/src/runtime/image-sms.ts | SIMPLIFY (or DELETE, fold into sms-adapter) | 19 | 4 |
| apps/app/src/runtime/inbox-attachment.ts | SIMPLIFY | 9 | 4 |
| apps/app/src/runtime/inbox-edit-coalescer.ts | KEEP | 55 | 55 |
| apps/app/src/runtime/inbox-local-store.ts | SIMPLIFY | 32 | 25 |
| apps/app/src/runtime/inbox-operation.ts | SIMPLIFY | 72 | 45 |
| apps/app/src/runtime/inbox-unsaved-record.ts | DELETE | 6 | 0 |
| apps/app/src/runtime/inline-modal.ts | KEEP (becomes the shared dialog lifecycle) | 113 | 95 |
| apps/app/src/runtime/legacy-calendar-preservation.ts | DELETE | 22 | 0 |
| apps/app/src/runtime/live-segment-stream.ts | DELETE | 11 | 0 |
| apps/app/src/runtime/live-voice.ts | DELETE | 34 | 0 |
| apps/app/src/runtime/local-agent-native-events.ts | KEEP | 30 | 28 |
| apps/app/src/runtime/local-agent-native-stream.ts | KEEP | 82 | 75 |
| apps/app/src/runtime/local-agent-storage.ts | MOVE to `browser/development-storage.ts` | 81 | 70 (moved) |
| apps/app/src/runtime/local-agent-stream.ts | SIMPLIFY | 202 | 190 |
| apps/app/src/runtime/local-agent.ts | SPLIT (`local-agent.ts`, `provider-keys.ts`, dev bridge+speech to `browser/`) | 756 | 330 here (+150 provider-keys, ~150 moved to browser/; net ≈ −120) |
| apps/app/src/runtime/local-reply-speech.ts | SIMPLIFY | 121 | 105 |
| apps/app/src/runtime/local-speech-text.ts | KEEP | 91 | 89 |
| apps/app/src/runtime/local-voice.ts | SIMPLIFY | 89 | 70 |
| apps/app/src/runtime/mail-html.ts | KEEP | 32 | 30 |
| apps/app/src/runtime/mail-preview.ts | DELETE | 2 | 0 |
| apps/app/src/runtime/mail-sender-image.ts | KEEP | 12 | 10 |
| apps/app/src/runtime/managed-service-routes.ts | SIMPLIFY | 29 | 35 (table form) |
| apps/app/src/runtime/maps-contract.ts | DELETE | 1 | 0 |
| apps/app/src/runtime/maps-event-return.ts | SIMPLIFY | 40 | 32 |
| apps/app/src/runtime/maps-notification-open.ts | KEEP | 25 | 25 |
| apps/app/src/runtime/media-copy-intent.ts | SIMPLIFY | 29 | 25 |
| apps/app/src/runtime/message-draft.ts | KEEP | 68 | 68 |
| apps/app/src/runtime/mock-admission.ts | MOVE to `dev/` | 13 | 13 (moved) |
| apps/app/src/runtime/modal-inert.ts | KEEP | 7 | 7 |
| apps/app/src/runtime/native-assistant-draft-recovery.ts | SIMPLIFY (or DELETE after DomainRecovery change) | 14 | 6 |

Totals: 3,480 now → ≈2,960 in these paths after (≈ −520; of which ≈ −330 deleted outright and the rest moved to `browser/`/`dev/` or new split files).

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Pending` | type | hosted-digest-ui.tsx:56 | hosted-live-source-ui.tsx:25 (review payload subset); local-agent-storage.ts:56 reads its phase | `hosted-digests.ts` `DigestPending` |
| `srOnly`/`dot`/`chip`/`switchRow`/`switchInput` | const (styles) | hosted-digest-ui.tsx:5-9 | calendar-sync-settings.ts:10-13, cloud-delegation-ui.tsx:10 | CSS classes in connection-ui.css |
| `same` (JSON equality) | helper | hosted-digest-ui.tsx:70 | hosted-notice-question.ts:26, inbox-local-store.ts:27, media-copy-intent.ts:20 | keep local / `lib/json-equal.ts` |
| `nativeSources` (AlphaHostedResults) | const | hosted-digest-ui.tsx:71 | hosted-result-notices.ts:19, hosted-background.ts:13, prototype/workflow-adapter.ts:266 | `runtime/hosted-results-plugin.ts` |
| `HostedResultNative` | interface | hosted-result-notices.ts:5 | same three | `runtime/hosted-results-plugin.ts` |
| `nativeCalendars` (AlphaCalendar) | const | hosted-digest-ui.tsx:72 | other AlphaCalendar typings (native-calendar-sync.ts, agent-calendar adapters) | one AlphaCalendar plugin module |
| dev-selection read `JSON.parse(localStorage.getItem('alpha.connection.selection.v1')…)?.kind==='development'` | const | hosted-digest-ui.tsx:84,284; hosted-live-source-ui.tsx:132 | main.tsx:106, six browser/* files | dev module `developmentSelectionActive()` |
| native listener-with-catch idiom | helper | hosted-digest-ui.tsx:100,164,337,425 | connection-ui.tsx, google-connection-ui.tsx, main.tsx | `runtime/native-listener.ts` |
| focus trap / modal lifecycle | helper | hosted-digest-ui.tsx:355-394 | inline-modal.ts (`createInlineModal`), connection-ui chooser, prototype review dialogs | `inline-modal.ts` |
| `focusableControls` | helper | inline-modal.ts:22 | hosted-digest-ui.tsx:376 | export from inline-modal.ts |
| time-zone validity | helper | hosted-digest-ui.tsx:535,556 | — | local `validTimeZone` |
| `range` (hours bound) | helper | hosted-live-source-ui.tsx:45 | hosted-digest-ui.tsx:535,721-727 | hosted-digests.ts `withinHours` |
| `Result` tap union | type | hosted-notice-question.ts:7 | hosted-result-notices.ts:34 inline return type | hosted-result-notices.ts `HostedResultTap` |
| `hostedTapResolver` | helper | hosted-notice-question.ts:40 | maps-notification-open.ts:8-17, hosted-digest-ui.tsx `refreshFlight` | keep / `lib/single-flight.ts` |
| unreadable-summary literal | const | hosted-notice-question.ts:13 | upstream plugin-workflow hosted-digests.ts:284 | upstream export (D14) |
| `ContactsShell` | type | image-contacts.ts:1 | ~60 Shell/Bag declarations | shared `Shell` type |
| ref mount/dispose idiom | helper | image-preview.ts:6-9 | inline-modal.ts:5-8 | optional `refCallback` |
| `receiptLabel` alias | const | image-sms.ts:14 | upstream `smsReceiptLabel` | delete |
| SHA-256 hex | helper | inbox-local-store.ts:13; legacy-calendar-preservation.ts:13 | ~28 renderer copies | `lib/sha256-hex.ts` |
| `EditCoalescerTimers` | interface | inbox-edit-coalescer.ts:2 | local-agent.ts:735 clock port | stays |
| `InboxOperation.receiptReads` | helper (static) | inbox-operation.ts:38 | `receiptReadGuard` same file | delete, use function |
| `NativeVoiceEventPort` / `NativeStreamPort` / `NativeRequestPort` / `LocalAgentBridge` | interface | local-agent-native-events.ts:2, local-agent-native-stream.ts:3, local-agent.ts:20,35 | native-view-events.ts `NativeViewEventPort`; intersected at local-agent.ts:64 | `runtime/agent-plugin.ts` |
| `quiet` / `cleanup` | helper | local-agent-native-events.ts:10, local-agent-native-stream.ts:29 | each other | `lib/settle-quietly.ts` |
| base64↔bytes, WAV header check | helper | local-agent-native-stream.ts:52; local-agent.ts:331,355,366,411-412 | — | `lib/bytes.ts` |
| abort race / abortable delay | helper | local-agent.ts:239,267-272,285; local-agent-native-stream.ts:66 | abort-signal.ts, cloud-protocol.ts:143, alpha-client.ts:321-376 | `abort-signal.ts` |
| `developmentBridgeAllowed` | const | local-agent.ts:71 | local-agent-storage.ts:9 (verbatim) | `build-flags.ts` |
| `/__alpha-local-agent` POST | helper | local-agent.ts:104,109,117 | local-agent-storage.ts:11, browser-cloud-resident.ts | `browser/development-bridge.ts` |
| `record` / `identifier` | helper | local-agent.ts:163,176 | cloud-protocol.ts:124-142, ~35 plain-object guards | `lib/parse.ts` |
| UUID regex | const | local-agent.ts:183, local-agent-stream.ts:44 | ~10 more in src | `lib/uuid.ts` |
| binding tuple check | helper | local-agent-storage.ts:30,45 | device-actions.ts journal binding | local helper |
| `advancesPendingDigest` | helper | local-agent-storage.ts:56 | hosted-digests.ts `digestPendingDiscardable` | reuse phase rule |
| `LocalProvider*` types, `modelLabel` | type/helper | local-agent.ts:507-523 | — | `runtime/provider-keys.ts` |
| `'cerebras/qwen-3.8-27b'` | const | local-agent.ts:528,722 | `LOCAL_PROVIDER_MODEL` | `CLOUD_PROVIDER_MODEL` const |
| `Bridge` (AlphaVoiceCloud) | type | local-reply-speech.ts:13 | local-voice.ts:7, cloud-voice.ts:102, native-live-voice.ts:15, native-reading-voice.ts:7, native-voice-turn.ts:12, note-recorder-driver.ts:27, paired-voice.ts:17, voice-adapter.ts:76, local-speech-playback.ts:58, startup-permissions.tsx:21 (17 typings) | `runtime/voice-plugin.ts` |
| `voiceBinding` tuple | helper | local-voice.ts:25,38 | maps/navigation-voice.ts:50-54 | local helper |
| https-without-credentials | helper | mail-html.ts:6,13 | — | local `safeHttps` |
| brand domain list | const | mail-sender-image.ts:10 | public/icons/senders/sources.json | derive from sources.json |
| managed route allow-list | const | managed-service-routes.ts:14-28 | upstream managed-google-route-policy.ts; Java CalendarSyncConsent/ConnectionRoutes | route table here; upstream follow-up |
| `Bag` | type | maps-event-return.ts:6 | 60 declarations | typed row / shared type |
| `Archive` | type | media-copy-intent.ts:5 | browser/domain-document.ts `Envelope` | stays |
| AlphaConnection slice | type | mock-admission.ts:9 | native-connection.ts | shared plugin module |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `runtime/legacy-calendar-preservation.ts` + `LegacyCalendarCapture`, `CalendarPreservation`, `'transition-required'|'legacy-recovery'` in agent-calendar.ts + retention block in prototype/agent-calendar-adapter.ts | A1 legacy reader; DECISIONS D1; one importer | High (Quint `calendar-preservation-confirmation` retired with it) |
| `runtime/live-segment-stream.ts` | 0 src importers; only `test/voice-assistant.test.mjs`, Quint native manifest:74, feature-parity | High |
| `runtime/live-voice.ts` | only a type-only import in native-live-voice.ts:5 | High |
| `runtime/inbox-unsaved-record.ts` | pure re-export, 1 importer | High (pins: 5 Quint services manifest entries) |
| `runtime/mail-preview.ts` | pure re-export, 1 importer | High |
| `runtime/maps-contract.ts` | `export *`, 1 importer using `isMapsOperation` | High |
| `inbox-attachment.ts:6` `AttachmentRefusedError`/`attachmentRefused` re-export | 0 importers anywhere | High |
| `inbox-operation.ts` re-exports `composerContent`, `composerKind`, `inboxOperationKey`, `reviewBinding`, `reviewBindingRefusal`, `ComposerEmail`, `InboxOperationRecord`, `ReviewBinding`, `attachmentBytes`, `checkOutgoingAttachments`, `outgoingAttachmentLimits` | 0 src importers via this path; scripts/tests only | High |
| `InboxOperation.receiptReads` static | pass-through to `receiptReadGuard` | High |
| `local-reply-speech.ts` `holdSpeechEngine`/`releaseSpeechEngineHold`, `hold()` + `voice-adapter.ts:859` call | no Java implementation (grep android: 0); call always rejects and is swallowed | High |
| `local-agent.ts` `localAgentRefusal` | 0 product callers; 1 test | High |
| `local-agent.ts` `recoveries` counter | no product reader | High |
| `local-agent.ts` `residentAttachable`, `ports`/`bridge`/`nativePlatform` test seams, exports `requestNativeAgent`/`NativeRequestPort`/`localAgentAvailable`/`LocalAgentMethod`/`configureLocalCloudProvider`/`awaitLocalAgentStopped` | test-only exports/params (grep) | High |
| `local-agent.ts` ~25 "Update Alpha"/"in this version" guards and optional bridge members | Capacitor proxies make them always truthy (comment line 65); one APK | High |
| `hosted-digest-ui.tsx:289,292` `testMocksEnabled&&connection.kind==='cloud'` runtime read | retired hosted-Cloud path (D5) | High (test-mocks only) |
| `Pending.phase` optional / "older build" handling in hosted-digest-ui.tsx, hosted-digests.ts, local-agent-storage.ts | A1; every writer sets phase | Medium (Lemma + Quint text pins) |
| `hosted-result-notices.ts` `backgroundStatus?`, `lastSuccess?` fields | no renderer reader | High (type only) |
| `hosted-digests.ts` `digestToggledSpec` | one-line spread, one caller | Medium |
| `media-copy-intent.ts:14` localStorage legacy seed | A1; web never writes that key now | Medium |
| `native-assistant-draft-recovery.ts` legacy fields | A1 with `DomainRecovery` legacy fields | Medium (cross-file) |
| `managed-service-routes.ts:19-20` sync-v1 admissions | no renderer caller; dev resident only after D4 | Low-Medium (owner) |
| `local-reply-speech.ts` `openMicrophoneAvailable` | one-line wrapper of `Capacitor.isNativePlatform()` | High |
| `image-sms.ts` `receiptLabel` alias, `createSmsSession` wrapper | D4 pass-through | High |

## Cross-file actions
1. **AlphaHostedResults plugin module**: create `runtime/hosted-results-plugin.ts`; update `hosted-digest-ui.tsx:71`, `hosted-result-notices.ts:5-19`, `hosted-background.ts:13`, `prototype/workflow-adapter.ts:266`; give `browser/hosted-results.ts` (web impl, registered in `browser/register-hosted-results.ts`) no-op `withdrawResult`/`setResultsShowing`/`releaseResultQuestion` so the members can be required.
2. **AlphaVoiceCloud plugin module** (`runtime/voice-plugin.ts`): local-reply-speech.ts, local-voice.ts, cloud-voice.ts, native-live-voice.ts, native-reading-voice.ts, native-voice-turn.ts, note-recorder-driver.ts, paired-voice.ts, prototype/voice-adapter.ts, local-speech-playback.ts, startup-permissions.tsx; test fakes `test/browser/voice-assistant-fixture.ts`, `test/local-reply-speech.test.mjs`.
3. **Agent plugin module** (`runtime/agent-plugin.ts`): local-agent.ts:20,35,64, local-agent-native-events.ts, local-agent-native-stream.ts, native-view-events.ts, browser/development-connection.ts (implements `LocalAgentBridge`).
4. **Dev flags to build-flags.ts**: `developmentBridgeAllowed` and `browserLocalAgentEnabled` from local-agent.ts:71-72 and local-agent-storage.ts:9; consumers prototype/settings-adapter.ts, prototype/workflow-authoring.ts, connection-ui.tsx, google-agent-access.ts, hosted-digest-ui.tsx; `test/dev-surface-gates.test.mjs:88` loads both paths.
5. **Dev code out of runtime/**: local-agent-storage.ts → `browser/development-storage.ts` (importers browser/digest-storage.ts, prototype/workflow-authoring.ts, connection-ui.tsx:50, hosted-digest-ui.tsx:285; pins scripts/test-local-agent.ts:156, scripts/test-local-digest-storage.ts:6, Quint native manifest:13, services manifest:2608, development-digest-pending-probe.mjs:5, two Playwright specs, feature-parity); local-agent.ts browserBridge/subscribeBrowserConversationEvents/speech methods → `browser/development-agent-bridge.ts` + `browser/agent-speech.ts` (consumers browser/voice.ts, browser/local-transcription.ts, connection-ui.tsx `browserSpeechAvailable`); mock-admission.ts → `dev/` with `vite.config.ts:31-32` stub entries removed; hosted-digest-ui dev storage/recovery/scheduler + hosted-live-source-ui `BrowserDigestDelegation` → one dev factory.
6. **Legacy calendar authority removal**: delete legacy-calendar-preservation.ts; edit runtime/agent-calendar.ts (types 6-13, constructor 53, confirm/retention paths), prototype/agent-calendar-adapter.ts:15,53,65; browser/calendar-store.ts:21 `capture`; retire `specs/quint/refinement/application/calendar-preservation-confirmation.mjs` and `specs/quint/application/manifest.json:3274`; delete test/calendar-empty-bootstrap-repro.test.mjs, adjust test/fixtures/calendar-mounted-editor.mjs:20, feature-parity.mjs:538.
7. **DomainRecovery legacy fields**: browser/domain-document.ts (`Envelope`, `DomainRecovery.legacy/legacyChanged`, constructor `legacy` arg) + native-assistant-draft-recovery.ts + media-copy-intent.ts:14 + every `new BrowserDomainDocument(...)` / `openDomainRecovery` caller (hosted-digest-ui.tsx:299, notes/calendar documents) + `test/browser/media-copy-intent-storage.spec.ts:21,27-29`.
8. **Digest pending phase required**: hosted-digest-ui.tsx:56-67, hosted-digests.ts:41-53 (+ `LemmaScript-files.txt:17`, `specs/lemma/README.md:195` contract), local-agent-storage.ts:56-61, Quint `specs/quint/application/manifest.json` HostedDigest abstraction text ("including a legacy record without a phase") and its model.
9. **Re-export shim deletions** (repoint importers to upstream, update pins): inbox-unsaved-record.ts (prototype/inbox-unsaved.ts; Quint services manifest 297,1131,1208,4115,4179; inbox-coordinator-ports.mjs:34; scripts/test-inbox-cloud-flow.ts:14; scripts/test-inbox-sent-cleanup.ts:13; test/inbox-draft-copies.test.mjs:6), mail-preview.ts (prototype/inbox-cloud-adapter.ts; scripts/inbox-adapter-fixture.ts:6), maps-contract.ts (prototype/agent-adapter.ts:59), live-voice.ts (native-live-voice.ts:5; test/live-voice.test.mjs; test/browser/live-voice.spec.ts:18), live-segment-stream.ts (test/voice-assistant.test.mjs:9,750; Quint native manifest:74), image-sms.ts aliases (prototype/agent-adapter.ts, prototype/sms-adapter.ts; Quint native:4413, services 3116-4882), inbox-operation.ts test-only re-exports (scripts/inbox-adapter-fixture.ts, scripts/test-inbox-*.ts, test/inbox-draft-copies.test.mjs, test/native-secure-slots.test.mjs:102), and `test/support/feature-parity.mjs:536,539,540,550,553` lines.
10. **Dialog lifecycle (C4)**: hosted-digest-ui.tsx:355-394 → `createInlineModal`; export `focusableControls` from inline-modal.ts; later migrations: connection-ui chooser, google-connection-ui.tsx, prototype/calendar-approval-review.ts, source-review-dialog.ts, workflow-filters.ts, file-email-review.ts.
11. **Locale fix**: hosted-live-source-ui.tsx:126,137 → `formatDateTime`, and remove `'runtime/hosted-live-source-ui.tsx'` from `test/locale-time-usage.test.mjs:18` pending set in the same commit (the test fails if a listed file is already converted).
12. **Speech-engine hold removal**: local-reply-speech.ts:19-20,108-115 + prototype/voice-adapter.ts:859 + test fakes (voice-assistant-fixture.ts:64, local-reply-speech.test.mjs:18).
13. **Shared micro-helpers** (`lib/`): sha256Hex (inbox-local-store.ts, ~28 copies), base64/WAV (local-agent.ts, local-agent-native-stream.ts), isUuid (local-agent.ts, local-agent-stream.ts), parse helpers (local-agent.ts record/identifier, cloud-protocol.ts), raceAbort/abortableDelay (local-agent.ts, local-agent-native-stream.ts, alpha-client.ts, cloud-protocol.ts, abort-signal.ts).
14. **Upstream follow-ups (D14)**: export a readable-summary predicate/constant from plugin-workflow `hosted-digests.ts` (used by hosted-notice-question.ts:13); one shared managed-route table (managed-service-routes.ts vs `managed-google-route-policy.ts` vs Java `CalendarSyncConsent`).

## Text/path pins
- `test/support/feature-parity.mjs:524-560` lists every file in this chunk (plus `:40` local-reply-speech, `:41` maps-notification-open).
- `LemmaScript-files.txt:17-19` (hosted-digests.ts, inbox-edit-coalescer.ts, inbox-operation.ts) and `specs/lemma/README.md:195,198,199`.
- Quint manifests: `specs/quint/application/manifest.json` (hosted-digest-ui 3130,3153,3399; hosted-digests 3055,3108,3131,3154,3241; hosted-notice-question 3052,3401; hosted-result-notices 3004; image-contacts 6995,7002; inbox-attachment 531; inline-modal 95,2779,8515-10033; legacy-calendar-preservation 3274; local-agent 1910,3518,3721; maps-event-return 2748,2878; media-copy-intent 530,7239-7259; mock-admission 480; modal-inert 96,2780,3087,8514-8527), `specs/quint/services/manifest.json` (hosted-digest-ui 2610; hosted-result-notices 674; image-contacts 3214,3247; image-sms 3116-4882; inbox-attachment 298,1130,2350; inbox-edit-coalescer 4113-4147; inbox-local-store 296,1129,1209; inbox-operation 295,1128,1207; inbox-unsaved-record 297,1131,1208,4115,4179; local-agent-storage 2608; managed-service-routes 96,151,155,2351), `specs/quint/native/manifest.json` (image-sms 4413; inbox-operation 544; live-segment-stream 74; local-agent 10,542,4304,4340,4344; local-agent-native-events 11; local-agent-native-stream 12,3496-3524; local-agent-storage 13; message-draft 4411).
- Quint refinement harnesses naming these paths: hosted-digest-refresh.mjs:11,71, development-digest-pending.mjs:15, development-digest-pending-probe.mjs:5, hosted-notice-question.mjs:9, browser-hosted-result-notice.mjs:11, retained-home-brief.mjs:7, contacts-session-replay.mjs:13, boundaries.mjs:16,17, inbox.mjs:3,30, inbox-coordinator-ports.mjs:32-34, inbox-edit-coalescer-replay.mjs:5, calendar-preservation-confirmation.mjs:11, native-stream-bridge.mjs:108, google-access-publication.mjs:11, observation-turn-dispatch.mjs:13, resident-liveness.mjs:13, native/local-agent.mjs:13, request-withdrawal.mjs:15, agent-calendar-event-return.mjs:8,50,223 (imports `mapsEventOriginOf` by name), map-plane-ownership.mjs:20,25, maps-event-return.mjs:10,11, media-copy-intent.mjs:1,6, telephony.mjs:32,35.
- Source-text (T1/T2) tests: test/digest-capabilities.test.mjs:40, test/digest-missed-run-now.test.mjs:62, test/digest-pending-storage.test.mjs:2, test/digest-delegation-host.test.mjs:2 (hosted-digest-ui, hosted-live-source-ui), test/locale-time-usage.test.mjs:18 (pending list), test/calendar-empty-bootstrap-repro.test.mjs:36 (evaluate transplant), test/inbox-operation-guards.test.mjs:17-20,62 (bundles with stubbed `inbox-attachment`, asserts `receiptReads.length`), test/dev-surface-gates.test.mjs:88.
- Module-stub keys by basename: `'inbox-attachment'` in test/inbox-draft-copies.test.mjs:26, test/inbox-operation-guards.test.mjs:19-20, scripts/test-inbox-multiple-drafts.ts:20.
- Scripts importing by path: scripts/test-local-agent.ts, test-local-agent-stream.ts, test-resident-reuse.ts, test-connection-history.ts, test-local-digest-storage.ts, test-digest-cancellation.ts, test-batch-progress-stream.ts, test-batch-voice-progress-ack.ts, test-local-redaction.ts, test-inbox-*.ts, inbox-adapter-fixture.ts, test-mail-html.ts, test-maps-reroute-freshness.ts, test-calendar-crud-review.ts, test-clock-handoff-flow.ts, test-google-calendar-protocol.ts, browser-cloud-dev-bridge.ts (imports `mapsTilePath`), storage-specs.ts (media copy key), fixtures/hosted-digest-protocol.ts, fixtures/local-agent-stream.ts.
- Playwright specs importing `/src/runtime/...` in-page: local-agent.ts (10 specs), inbox-local-store.ts (12), hosted-digests.ts (8), media-copy-intent.ts (3), inbox-attachment.ts (3), local-agent-storage.ts (2), live-voice.ts, local-agent-native-stream.ts, hosted-result-notices.ts, native-assistant-draft-recovery.ts, modal-inert.ts (2).
- `vite.config.ts:31-32` stubs `./runtime/mock-admission` and `./mock-admission`.

## New patterns
- **NEW-1 Locale bypass**: bare `toLocaleString()` for times in product UI, ignoring Android's 12/24-hour choice, while a shared `formatDateTime` exists (hosted-live-source-ui.tsx:126,137; `test/locale-time-usage.test.mjs` tracks 11 such files). Treatment: use `prototype/locale-time.ts` and shrink the pending list.
- **NEW-2 Phantom native feature**: an optional bridge method that no native plugin implements, called with `?.()` inside try/catch so it silently does nothing (`holdSpeechEngine`/`releaseSpeechEngineHold`, local-reply-speech.ts). Distinct from B2 (where the method exists): here the feature itself is fictional. Treatment: grep `android/` for every optional plugin method; delete those with no `@PluginMethod`.
- **NEW-3 JSON-stringify equality** used as structural equality/CAS in several modules (hosted-digest-ui `same`, hosted-notice-question snapshot, inbox-local-store CAS, media-copy-intent). Acceptable where comparing stored bytes; name it once if more modules adopt it.

## Owner questions
1. `managed-service-routes.ts:19-20`: after deleting the client-side Calendar linked-sync stack (D4), does the dev browser Cloud resident (`npm run dev:cloud`, `scripts/browser-cloud-dev-bridge.ts:462`) still need the renderer to admit `/api/v1/eliza/google/calendar/sync-v1/*`? If not, delete the two admissions.
2. `hosted-digest-ui.tsx` dev surfaces (development digest storage, "Digest inbox recovery" with backup download copy, development scheduler, `dataset.devBackground` screen-lock simulation): keep all under the single `dev/` boundary, or drop the development digest inbox recovery entirely?
3. `local-agent.ts` browser-dev speech (`developmentCloudSpeech` with `cloud`/`direct` Cartesia routes, `synthesizeSpeech` Paradee, `speechRequest`): which of `VITE_ALPHA_DEV_CARTESIA`, `VITE_ALPHA_DEV_CLOUD_VOICE`, browser Cloud resident are still used? Each removed mode deletes a branch when the code moves to `browser/`.
4. `Pending.phase` / Lemma contract `digestPhaseDiscardable` (`phase === undefined ==> !\result`): OK to change the LemmaScript-verified contract and the Quint abstraction text to drop the "legacy record without a phase" case?
5. `maps-event-return.ts` v1 origins come from device-calendar rows (`alphaCalendarId`/`nativeEvent`, prototype/calendar-adapter.ts:353): is the device-calendar (non-agent) Calendar path still a product path alongside the agent calendar, or is v1 also legacy?
