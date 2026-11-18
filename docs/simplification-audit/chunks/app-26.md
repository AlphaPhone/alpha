# Chunk app-26 — runtime voice/workflow tail, view navigation, startup permissions

21 files, 1,949 lines. Reports in `docs/simplification-audit/files/apps/app/src/...`. Estimated net removable: ~600 lines. That excludes reformatting and the startup-permissions split, which moves code without shrinking it.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/runtime/view-navigation.ts | SIMPLIFY | 426 | ~310 |
| apps/app/src/runtime/voice-assistant.ts | DELETE (D4 re-export shim) | 27 | 0 |
| apps/app/src/runtime/voice-entry-policy.ts | DELETE with dormant branches (owner: P-78) | 2 | 0 |
| apps/app/src/runtime/voice-selection.ts | SIMPLIFY | 134 | ~85 |
| apps/app/src/runtime/voice-states.ts | KEEP (minor) | 59 | ~55 |
| apps/app/src/runtime/voice-timing.ts | SIMPLIFY | 144 | ~70 |
| apps/app/src/runtime/voice-turn-routes.ts | DELETE (D4 re-export shim) | 31 | 0 |
| apps/app/src/runtime/voicemail-state.ts | KEEP (owner-gated cloud-mode removal) | 63 | ~58 |
| apps/app/src/runtime/voicemail-transcription.ts | KEEP (minor) | 20 | ~12 |
| apps/app/src/runtime/workflow-device-contract.ts | SIMPLIFY | 181 | ~60 |
| apps/app/src/runtime/workflow-intents.ts | SIMPLIFY | 45 | ~30 |
| apps/app/src/runtime/workflow-local-time.ts | SIMPLIFY (small) | 79 | ~78 |
| apps/app/src/runtime/workflow-presentation.ts | SIMPLIFY (owner check on native probe) | 57 | ~15 |
| apps/app/src/runtime/workflow-protocol.ts | KEEP (minor) | 46 | ~30 |
| apps/app/src/runtime/workflow-reminder-read.ts | KEEP (minor) | 30 | ~30 |
| apps/app/src/runtime/workflow-request-recovery.ts | MOVE to apps/app/src/browser/ (or DELETE with browser recovery layer) | 53 | ~50 |
| apps/app/src/startup-browser-permissions.ts | SIMPLIFY + MOVE behind browser boundary | 89 | ~80 |
| apps/app/src/startup-permission-flow.ts | SIMPLIFY | 109 | ~65 |
| apps/app/src/startup-permission-progress.ts | SIMPLIFY | 23 | ~14 |
| apps/app/src/startup-permissions.css | KEEP (minor) | 38 | ~32 |
| apps/app/src/startup-permissions.tsx | SIMPLIFY + SPLIT (hook + bridges) | 293 | ~140 (+~155 moved to hook/bridge modules) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `object` | helper | runtime/view-navigation.ts:22 | remote-protocol.ts:65, native-calendar-sync.ts:14, owner-reminder-notification-protocol.ts:24, cloud-protocol.ts:124, automations-protocol.ts:22, calendar-approval.ts:34, agent-calendar.ts:25, local-agent.ts:163, device-view-profile.ts:8, cloud-voice-limit.ts:13 | apps/app/src/lib/parse.ts `expectRecord` |
| `Request` | type | runtime/view-navigation.ts:12 | maps/resident-relay.ts:7, device-view-profile.ts:7 | runtime/alpha-client.ts `OwnerRequest` |
| inline view-id map | const | runtime/view-navigation.ts:83 | product/alpha-product.ts `alphaCanonicalViewId` | delete, call registry |
| `Reason` / error row extraction | type/helper | runtime/voice-states.ts:4,11; runtime/voice-selection.ts:76-78; startup-browser-permissions.ts:62-63,76 | browser/speech-errors.ts | apps/app/src/lib/parse.ts `errorCode` |
| `voiceTimingRoutes` | const | runtime/voice-timing.ts:43 | route names in runtime/voice-states.ts:55 | export `VOICE_ROUTES` from voice-timing |
| abort/timeout race | helper | runtime/voice-timing.ts:126-129; runtime/workflow-presentation.ts:47-51; startup-browser-permissions.ts:46-52 | native-connection.ts:276-301, local-speech-playback.ts:19-20, native-network.ts:5-21, alpha-client.ts:321-345 | apps/app/src/lib/abort.ts `raceAbort` / `withTimeout` |
| `voiceStartupClock` / timing clock | helper | runtime/voice-timing.ts:46,88 | upstream voice-turn-timing.ts:291 `defaultClock` | upstream default / one lib helper |
| `VoiceStartupStage`, `VoiceStartupTiming` | type | declared in runtime/diagnostics-export.ts, used by voice-timing.ts:1 | — | move to voice-timing.ts (producer) |
| `VoiceSendPolicy` | type | runtime/voice-selection.ts:20 | upstream `VoiceTimingPolicy` | delete (owner) or alias upstream |
| `ApprovalPosterSession`, `ApprovalPosterNative`, `definiteNoticeFailure`, `createWorkflowApprovalPoster` | interface/helper | runtime/workflow-device-contract.ts:100-181 | .eliza/client-features/packages/contracts/src/workflow-approval-poster.ts (live) | delete |
| `validateWorkflowReminderResult` | helper | runtime/workflow-device-contract.ts:42 | runtime/workflow-reminder-read.ts:27-28 | delete (keep reminder-read) |
| `WorkflowTapNative` | interface | runtime/workflow-device-contract.ts:55 | AlphaNotifications typings in startup-permissions.tsx:15, workflow-presentation.ts:46 | apps/app/src/native/alpha-notifications.ts |
| `WorkflowIntentOwner` | type alias | runtime/workflow-intents.ts:7 | upstream | delete (0 importers) |
| `android()` predicate | helper | runtime/workflow-intents.ts:19,36; startup-permissions.tsx:64 | notes-trash.ts:16, note-audio-deletions.ts:16, reminder-journal-store.ts:10, notes-folders.ts:9 | native.ts `isAndroid` |
| workflow-intents event/channel names | const | runtime/workflow-intents.ts:28-29 | prototype/workflow-adapter.ts | export from workflow-intents |
| `OWNER_LOCAL_TZ` | const | runtime/workflow-local-time.ts:6 | runtime/automations-protocol.ts:67 literal `'owner_local'` | export here (ask upstream to export) |
| `OPEN` reminder statuses | const | runtime/workflow-reminder-read.ts:6 | runtime/reminder-creations.ts:34 | daily.ts `OPEN_REMINDER_STATUSES` |
| `'alarm_'` prefix | const | runtime/workflow-reminder-read.ts:18 | browser/daily.ts:140,161, browser/clock.ts:10 | daily.ts `ALARM_ID_PREFIX` |
| `PhoneSpec` vs `PhoneWorkflowSpec` | type | runtime/workflow-protocol.ts:15-20 (casts) | runtime/phone-workflow-authoring.ts:12, upstream contracts phone-workflow.ts | one type (upstream) |
| inline plugin typing `{workflowPresentationCapabilities}` | type | runtime/workflow-presentation.ts:46 | AlphaNotifications/AlphaVoiceCloud elsewhere | apps/app/src/native/ |
| 8 plugin interfaces | type | startup-permissions.tsx:15-26 | daily.ts:56-138, maps/native-location.ts:5, 16× AlphaVoiceCloud, 18× AlphaDevice | apps/app/src/native/<plugin>.ts |
| `permissionAccess` | helper | startup-permissions.tsx:51 | upstream permission-walkthrough.ts:105 `permissionStateAccess` | delete |
| `startupPhotoAccess`, `startupLocationAccess` | helper | startup-permission-flow.ts:26,42 | upstream `photoLibraryAccess`, `locationAccess` | delete |
| `defaultStore` | helper | startup-permission-flow.ts:52 | upstream permission-walkthrough.ts `defaultStore` | delete |
| `STARTUP_PERMISSIONS_KEY`, `startupPermissionProgressKey` | const | startup-permission-flow.ts:48, startup-permission-progress.ts:11 | product/alpha-product-registration.ts:335-336, Quint drivers, Playwright specs | product registration |
| theme-token copy loop | helper | startup-permissions.tsx:191 | ~15 browser/* files (review.ts:16, selected-document-viewer.ts:7, dialog-layout.ts:6, …) | shared `copyShellTheme` or CSS inheritance |
| imperative `<dialog>` lifecycle | helper | startup-permissions.tsx:183-187 | 21 copies | shared `useModalDialog` |
| `RecoveryRequest` | type | runtime/workflow-request-recovery.ts:4 | browser/calendar-recovery.ts, calendar-editor-draft.ts | browser/domain-recovery.ts |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| workflow-device-contract.ts:99-181 forked approval poster (83 lines) | workflow-adapter.ts:2, scripts/workflow-renderer-fixture.ts:1 and test/workflow-approval-poster.test.mjs:2 all import the upstream `workflow-approval-poster.ts`; `ApprovalPosterSession`/`Native` have 0 refs outside the file | High |
| workflow-device-contract.ts:42-46 `validateWorkflowReminderResult` | only test/workflow-reminder-contract.test.mjs | High (delete with test edit) |
| workflow-device-contract.ts:47-50 `parseWorkflowPhoneReview` | only test/workflow-output-contract.test.mjs, test/workflow-typed-schedule.test.mjs | High (with test edit) |
| workflow-device-contract.ts:52 `// workflow-notice-coordination:begin` marker | no `:end`, no reader (grep: 1 hit) | High |
| workflow-device-contract.ts re-exports `SELECTED_REMINDERS_WINDOW`, `workflowObject`, `workflowId` | 0 importers via this path | High |
| voice-assistant.ts (whole) | re-export shim; one product importer (voice-adapter.ts:39) | High (needs manifest + feature-parity edits) |
| voice-turn-routes.ts (whole) | re-export shim; one product importer (voice-adapter.ts:35) | High (same) |
| voice-selection.ts:9-12 `voicePreferenceKeys` + voice-adapter.ts:1516 listener | route key never read or written; `'alpha:voice-preferences'` never dispatched anywhere | High |
| voice-selection.ts `'agent'` in `VoicePreference`/return type + note-recorder-driver.ts:84,89-93 branch | `selectVoiceRoute` never returns `'agent'` | High |
| voice-timing.ts `voiceTimingMarks`, `voiceTimingRecords`, `clearVoiceTiming`, `setVoiceTimingClock` | no product importer | Medium-high (tests move to instance) |
| voice-timing.ts:46 `storage`/`clock`/`nativeEntry` options | equal upstream defaults | High |
| view-navigation.ts `interactionAvailable()`, `ready()`, `rendererReady` | tests only (home-agent-navigation, native-browser-view-binding, optional-view-channel-chat) | High |
| startup-permissions.tsx:36,43-48 sessionStorage `alpha:startup-permission-progress:v1` fallback | never written; pre-durable-marker format | High |
| startup-permission-progress.ts native versions 1-3 | historical installs cannot exist (package renamed, empty data) | Medium-high |
| startup-permissions.tsx:51-54 `permissionAccess` | verbatim upstream `permissionStateAccess` | High |
| startup-permission-flow.ts `startupPhotoAccess`, `startupLocationAccess`, `defaultStore`, `readStartupPermissionMemory`, `writeStartupPermissionMemory`, `StartupPermissionMemory` | wrappers of upstream / test-only / 0 importers | High |
| startup-permission-progress.ts `StartupPermissionChoice` | 0 importers | High |
| startup-permission-flow.ts:108 `'did not confirm revoking'` substring | no producer in apps/ | High (Lemma regeneration) |
| workflow-intents.ts:39-44 `legacy()` seed + `WorkflowIntentOwner` alias | pre-document browser slots; alias has 0 importers | Medium-high |
| workflow-local-time.ts `_locale` param (+ automations-protocol `automationWhen` `_zone`/`locale`) | ignored | High |
| workflow-presentation.ts native probe (`workflowPresentationProtocol`, `probePresentation`, `presentationReady`) | both bridges ship in the same APK and answer protocol 2 (AlphaVoiceCloudPlugin.java:76, upstream NotificationsHostPlugin.java:150) | Medium (owner: stalled-bridge behaviour) |
| voice-selection.ts send-policy switch + `setVoiceSendPolicyForTests` | constant `'auto-send'`; override test-only | Medium (owner P-39) |
| voice-selection.ts Clef switch | constant false, client always null | Medium (owner #663/H-18) |
| voice-entry-policy.ts + dormant listener invocation paths | constant false | Medium (owner P-78 says keep dormant) |
| voicemail `'cloud'` transcription mode | only installer hard-codes `'local'` | Medium (owner; Quint model change) |

## Cross-file actions
1. **Delete the voice re-export shims.** Delete `runtime/voice-assistant.ts` and `runtime/voice-turn-routes.ts`. Point the imports at upstream: `prototype/voice-adapter.ts:35,39`; `test/voice-assistant.test.mjs:8,145,750`; `test/voice-turn-routes.test.mjs:12-13`; `test/live-voice.test.mjs`; `test/browser/chat-dictation-api.spec.ts:25`; `test/browser/voice-stop-speaking.spec.ts:10`; `specs/quint/refinement/composition/ports.mjs:60`; `specs/quint/refinement/native/renderer.mjs:13`. Then update `specs/quint/native/manifest.json:70,75,541,1353` and `test/support/feature-parity.mjs:616,621`.
2. **Delete the dead voice preference listener.** Remove `voicePreferenceKeys` from `runtime/voice-selection.ts`. Remove the `window.addEventListener`/`removeEventListener(voicePreferenceKeys().event, …)` pair in `prototype/voice-adapter.ts:1516-1520`. Remove it from the vm export list in `test/voice-selection.test.mjs:21`.
3. **Remove the `'agent'` voice route.** Edit `runtime/voice-selection.ts`, the `runtime/note-recorder-driver.ts:84,89-93` branch, and `test/voice-selection.test.mjs:115,148,154`.
4. **Retire the owner-gated constant switches.** Each needs an owner decision first:
   - Send policy: `voice-selection.ts`, the voice-adapter review branch, `voice-timing` policy argument, `test/voice-selection.test.mjs`, `test/browser/chat-voice-mode.spec.ts`, `test/browser/voice-timing.spec.ts`.
   - Clef stage: `voice-selection.ts`, `voice-adapter.ts`, `test/voice-turn-routes.test.mjs`, `test/pixel-spoken-acks.test.mjs`.
   - External voice invocation: `voice-entry-policy.ts`, `main.tsx:430`, `runtime/always-on-listener.ts`, `prototype/model.js:5441`, `prototype/settings-adapter.ts`, 3 tests, `specs/quint/refinement/application/shell-core-fixture.mjs`, feature-parity.
5. **Export a single voice-timing instance.** In `runtime/voice-timing.ts`, replace the 14 forwards with one exported instance. Update every importer: voice-adapter, local-speech-playback (both), settings-adapter, connection-ui, diagnostics-export, native-voice-turn, local-reply-speech, development-cartesia-conversation, plus about 12 tests and scripts. First replace the source regex in `test/diagnostics-export.test.mjs:220-221` with an import. Move `VoiceStartupStage`/`VoiceStartupTiming` from `diagnostics-export.ts` into `voice-timing.ts`.
6. **Trim workflow-device-contract.ts.** Delete the poster fork and the test-only wrappers. Edit `test/workflow-reminder-contract.test.mjs`, `test/workflow-output-contract.test.mjs` and `test/workflow-typed-schedule.test.mjs`. Optionally rename `validateWorkflowResult` → `validateWorkflowReadResult` in `prototype/agent-adapter.ts`, `runtime/device-actions.ts`, `browser/development-workflows.ts` and 2 tests. Regenerate the Lemma `.dfy.gen` if lsc output depends on line positions.
7. **Simplify the workflow presentation probe** (owner decision). Edit `runtime/workflow-presentation.ts` and `runtime/connection-ui.tsx:1151,1479,1543`. Then delete `test/workflow-presentation-probe.test.mjs` and adjust `test/fixtures/workflow-device-bindings.mjs`, `test/workflow-device-bindings-fixture.test.mjs`, `test/resident-explicit-panel-startup.test.mjs` and `scripts/test-connection-history.ts`.
8. **Remove the voicemail cloud mode** (owner decision). Edit `runtime/voicemail-state.ts`, `runtime/voicemail-transcription.ts`, the `VoicemailTranscriber` type in `prototype/phone-adapter.ts:23,149-152`, `specs/quint/native/Voicemail.qnt` (`setStt`, `cloudUploads`) and `specs/quint/refinement/native/telephony.mjs` (`cloud()` scenario).
9. **Clean up the startup permission walkthrough.**
   - Delete the sessionStorage fallback and the progress v1-3 versions: `startup-permissions.tsx`, `startup-permission-progress.ts`, `test/startup-permission-completion.test.mjs:63,66,68`, `test/product-identity.test.mjs`.
   - Delete the reader wrappers: `startup-permission-flow.ts` and `startup-permissions.tsx:72,77`.
   - Drop the test-only memory read/write: `startup-permission-flow.ts`, `test/startup-access-flow.test.mjs`, `test/quint-conformance.test.mjs`, `specs/quint/refinement/application/portable.mjs`, `specs/quint/application/README.md`.
10. **Replace the `lateReadyNotice` message matching with a flag.** Set `previousSignInUnconfirmed` at `runtime/connection-ui.tsx:2155`. Change `LateReadyInput` and the `//@` ensures in `startup-permission-flow.ts`. Regenerate `specs/lemma/apps/app/src/startup-permission-flow.dfy(.gen)`. Update `startup-permissions.tsx:150`.
11. **Split `startup-permissions.tsx`** into a hook plus a bridge module. First move or replace the text anchor in `specs/quint/refinement/application/permission-choices.mjs:41-47`. Also update `startup-permissions-coordinator.mjs`, the `test/startup-permission-completion.test.mjs` module hooks (import specifiers `./platform-plugins`, `connection-ui`) and the `test/browser-host-modal.test.mjs:21` regex.
12. **Add typed plugin modules** under `apps/app/src/native/` for AlphaNotifications, DailyApps, AlphaVoiceCloud, ElizaLocation, AlphaPhotoLibrary, AlphaCalendar, AlphaDevice and AlphaFiles. Consumers in this chunk: `startup-permissions.tsx:15-26`, `workflow-presentation.ts:46`, `workflow-device-contract.ts:55` (consumed by `workflow-adapter.ts:144`). There are many more outside the chunk.
13. **Remove the view-navigation test transplants first.** Rewrite `test/voice-completed-action-context.test.mjs`, which slices the source between `'\tmetadata(context:'` and `'\n\tcapture('`, and `test/voice-prepared-navigation.test.mjs`, which evals the source with an injected import list. Then make the `subscribe`/`executeView`/`reviewFirst` ports required, which updates every test constructor. Delete `interactionAvailable`/`ready` (3 tests). Format the file.
14. **Turn the workflow-intents vm transplant into an import.** `scripts/workflow-renderer-fixture.ts:36-39` transplants `workflow-intents.ts` with an injected alias list. Make it a real import before changing that file's imports, removing `legacy()` or the `typeof BroadcastChannel` guard.
15. **Move `OWNER_LOCAL_TZ` and the dead locale argument.** Edit `runtime/workflow-local-time.ts` and `runtime/automations-protocol.ts:33,67`.
16. **Share the reminder statuses and alarm prefix.** Move them to `daily.ts`, and use them from `runtime/workflow-reminder-read.ts`, `runtime/reminder-creations.ts:34`, `browser/daily.ts:140,161` and `browser/clock.ts:10`.
17. **Make the browser-only modules dev-only.** Load `startup-browser-permissions.ts` and `runtime/workflow-request-recovery.ts` behind the browser host boundary. Update the paths in `specs/quint/application/manifest.json` and `test/support/feature-parity.mjs:630-631`.

## Text/path pins
- `test/support/feature-parity.mjs:615-633`: exact inventory of every runtime file in this chunk, plus the three startup `.ts` files. A delete or move must edit it.
- `specs/quint/native/manifest.json`: paths of `voice-assistant.ts` (70, 541, 1353), `voice-turn-routes.ts` (75), `voicemail-state.ts`, `voicemail-transcription.ts` and `voice-states.ts`.
- `specs/quint/services/manifest.json`:
  - `workflow-device-contract.ts` (477, 534, 673, 688, 3997, 4027-4031): symbols `resolveWorkflowTap`, `readyTapStep`, `tapRecheck`, `pendingWorkflowTap`, `consumeWorkflowTap`.
  - `workflow-intents.ts`: `WorkflowIntentStore`, `runIntentReconcilable`, `workflowIntentKey`.
  - `workflow-protocol.ts`: `WorkflowProtocol`, `resendLifecycle`, `savePhone`, `versionId`, error and receipt classes.
  - `workflow-local-time.ts`: path.
- `specs/quint/application/manifest.json`: paths of `view-navigation.ts` (46, 93), `workflow-intents.ts`, `workflow-local-time.ts`, `workflow-request-recovery.ts`, `startup-browser-permissions.ts`, `startup-permission-flow.ts` and `startup-permission-progress.ts`.
- `LemmaScript-files.txt` and `specs/lemma/apps/app/src/...dfy(.gen)` for:
  - `runtime/voice-states.ts` (`deniedSettingsChoice`)
  - `runtime/workflow-device-contract.ts` (`readyTapStep`, `tapRecheck`)
  - `startup-permission-flow.ts` (`startupPermissionsActiveCore`, `lateReadyNotice`)
- **Source-text tests and transplants** (T1/T2/T10):
  - `test/voice-completed-action-context.test.mjs:6-9` (view-navigation slice by tab-indented anchors)
  - `test/voice-prepared-navigation.test.mjs:12-13` (view-navigation whole-file eval)
  - `test/voice-selection.test.mjs:20,36,136-138` (voice-selection vm transplant; asserts no `localStorage|getItem|setItem` in the source)
  - `test/cloud-voice-limit.test.mjs:125`, `test/live-voice.test.mjs:130`, `test/voice-turn-routes.test.mjs:235` (voice-selection source)
  - `test/diagnostics-export.test.mjs:220-221` (regex on `const voiceTimingRoutes`)
  - `test/voice-denied-recovery.test.mjs:3` (voice-states source)
  - `scripts/workflow-renderer-fixture.ts:36-39` (workflow-intents vm transplant)
  - `test/browser-host-modal.test.mjs:21` (`/panel\.showModal\(\)/` in startup-permissions.tsx)
  - `specs/quint/refinement/application/permission-choices.mjs:41-47` (text anchors `async function allow() {` and `const ticket = sequence.current, credentialId = connection.cloudAccount?.credentialId;`)
- **Persisted keys and wire values that must stay:**
  - Storage keys: `alphaphone:voice-timing:v1`, `alphaphone:realtime-voice-timing:v1`, `alpha.workflow.pending.v1:`, `alpha.browser.workflow-intents.v1:`, `alpha.startup-permissions.v1`, `alpha:startup-permission-walkthrough:v1`.
  - Export format `alpha-voice-timing-v1`, read by `scripts/aggregate-voice-latency.ts:85`.
  - Events: `alpha:startup-permissions-reopen` and `alpha:workflow-intents`; BroadcastChannel `alpha.workflow-intents`.
  - Wire: `workflowProtocol` 1/2/3; the lifecycle route and its error code.

## New patterns
- **NEW-strip-then-re-add:** a local wrapper strips fields from an upstream reader, and its only caller adds the same field back with the same expression. Example: `startupLocationAccess` drops `requestable`, then `startup-permissions.tsx:77` re-adds it. Treatment: delete the wrapper and use upstream directly.
- **NEW-meaningless-in-memory version:** an in-memory state type carries a `version` literal that is never read and differs from what gets persisted (`startup-permissions.tsx:37`, `version: 3` vs written 4/1). Treatment: drop the field.
- **NEW-runtime-imports-prototype:** a `runtime/` module imports a `prototype/` adapter to register itself (`voicemail-transcription.ts:8`). Treatment: export the implementation and let `main.tsx` wire it. This is close to D3/D11.
- **NEW-types-owned-by-consumer:** a producer imports its record types from the module that consumes them, which creates a type cycle (`voice-timing.ts:1` ← `diagnostics-export.ts`). Treatment: the producer owns the types.
- **NEW-constructor-holder indirection:** `const holder = {}` plus `holder.store!` exists only to reach `this` inside closures passed to `super()` (`workflow-intents.ts:18`). Treatment: use lazy methods or a protected setter.

## Owner questions
1. **P-78 dormant external voice invocation.** Do we keep `voice-entry-policy.ts` and the dormant listener-invocation paths (main.tsx, always-on-listener, model.js, settings-adapter)? Or delete them as A4?
2. **P-39 send policy.** Is auto-send final? If so, we can remove `VOICE_SEND_POLICY`, the `'review'` path and `setVoiceSendPolicyForTests`.
3. **#663 / H-18 Clef end-of-turn stage.** Is it planned in this product cycle? If not, the switch and the Clef exports go.
4. **Voicemail transcription.** Is it on-device only? `voicemail-transcription.ts` says audio is never sent to the cloud. `voicemail-state.ts`, `Voicemail.qnt` and `telephony.mjs` still model a cloud mode. Can that mode be removed from the code and the model?
5. **Workflow presentation probe.** The renderer and bridge ship in one APK, so a missing method is impossible. Should a stalled native bridge at enrollment still register protocol 1? Or can the device protocol be the constant 3?
6. **Browser recovery dialogs.** Should `workflow-request-recovery.ts` (download/reset of pending requests) and `startup-browser-permissions.ts` stay in the Android bundle? They only work on the browser development host. The other option is moving them behind the dev boundary, or deleting the recovery layer with the browser A1 work.
7. **Old voice route key.** Do we keep the tests proving an old `alphaphone:voice-route:v1` value is ignored (`voice-selection.test.mjs:133-140`, `voice-route-preference.spec.ts`)? The package starts with empty data, so they test a state that cannot occur.
