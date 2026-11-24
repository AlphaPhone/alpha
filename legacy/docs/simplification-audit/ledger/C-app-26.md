# C-app-26 — runtime voice/workflow tail, view navigation, startup permissions

Stage C in-file cleanup of the 21 files in `chunks/app-26.files.txt` (all still exist). Changes already made by
stage A in these files (A2: walkthrough v1–3 and sessionStorage fallback, workflow-intents `legacy()` seed; A3:
send-policy switch, `'agent'` return, forked approval poster; A4: `paired` provenance) were left as found.

## Done

- `runtime/view-navigation.ts`: hoisted the handoff value allow-list to a module `Set` `HANDOFF_VALUE_KEYS` (D9);
  the duplicated "current + fence or stale" block in `deliver()` is one local `assertFresh()` (C3, same copy);
  removed blank-line/brace padding around two returns (D8); `frame` typed `Record<string,unknown>` instead of
  `Record<string,any>` and `executeView` receives the already-matched `context.view` (narrow `any`).
- `runtime/voice-assistant.ts`: re-export list trimmed to the five names any importer uses
  (`VoiceAssistantSession`, `splitSpokenSentences`, `ASSISTANT_TIMING_DEFAULTS`, `AssistantState`,
  `AssistantTextFrame`); issue-number history removed from the header (A7, A8).
- `runtime/voice-turn-routes.ts`: re-exports trimmed to the used names (`createHeardReporter`, `readEndOfTurn`,
  `residentEndpoint`, `clefEndpointStageEnabled`, `createEndpointChain`); header history removed (A7, A8).
- `runtime/voice-selection.ts`: brief-hold failure codes hoisted to a module `Set` `BRIEF_HOLD_CODES` (D9); date and
  issue numbers removed from comments (A8).
- `runtime/voice-timing.ts`: 36-line header condensed (issue numbers, A-10/#395/#423 history removed, A8); the
  realtime-timing import moved from mid-file to the top (D8).
- `runtime/workflow-device-contract.ts`: dropped the unused re-exports `SELECTED_REMINDERS_WINDOW`, `workflowId`,
  `workflowObject` (A7, no importer through this path); deleted the reader-less `// workflow-notice-coordination:begin`
  marker (A8/T10); `WorkflowTapNative` is now `Pick<AlphaNotificationsPlugin,'pendingWorkflowTap'|'consumeWorkflowTap'|'addListener'>`
  from `native/alpha-notifications.ts` (B2 map; name kept for `workflow-adapter.ts`).
- `runtime/workflow-intents.ts`: deleted the `WorkflowIntentOwner` rename alias (0 importers, D4); the upstream type
  is imported under its own name.
- `runtime/workflow-local-time.ts`: `workflowCronLabel` reuses `cadence` instead of recomputing `formatSchedule`
  (C3); `workflowDeviceTimeZone` uses `deviceTimeZone()` from `lib/civil-date` with its `||'UTC'` fallback (B1 map).
- `runtime/workflow-presentation.ts`: abort race replaced by `raceAbort` from `lib/abort` (B1 map, timer cleanup kept
  in `finally`); probe plugin typed `Pick<AlphaNotificationsPlugin,'workflowPresentationCapabilities'>` and
  registered through `platform-plugins` instead of `@capacitor/core` (B2 map). Probe logic itself unchanged (Q-VOICE-4).
- `startup-permission-flow.ts`: deleted `startupPhotoAccess` and `startupLocationAccess` (D4 / NEW-STRIP-READD;
  the caller now uses upstream `photoLibraryAccess` / `locationAccess`); deleted the `StartupPermissionMemory` and
  `Store` aliases (types.md row "Store"; signatures use upstream `WalkthroughMemory`/`WalkthroughStore`).
- `startup-permission-progress.ts`: deleted `StartupPermissionChoice` (A7, 0 importers).
- `startup-permissions.tsx`: local `permissionAccess` replaced by upstream `permissionStateAccess` (C3, identical);
  photo and location bridges call upstream `photoLibraryAccess` / `locationAccess` directly (the location bridge no
  longer strips and re-adds `requestable`); the 8 inline plugin generics replaced by `Pick<…>` of the typed modules
  (`AlphaNotificationsPlugin`, `DailyAppsPlugin`, `AlphaVoiceCloudPlugin`, plugin-maps `LocationBridge`,
  `AlphaPhotoLibraryPlugin`, `AlphaCalendarPlugin`, `AlphaDevicePlugin`, `AlphaFilesPlugin`; type-only imports, the
  `./platform-plugins` specifier the harnesses stub is unchanged) (B2 map); the two imports from
  `./startup-permission-flow` merged; the never-read in-memory `version: 3` dropped from `Progress` (NEW-MEANINGLESS
  version; the persisted write still sets 4/1); `onClick={()=>void finish()}` → `onClick={finish}`.
- `startup-permissions.css`: the second `.alpha-permission-icon{position:relative}` rule merged into the first (D8).

## Deleted tests and formal artefacts

- `test/startup-access-flow.test.mjs`: removed the two cases that exercised the deleted `startupPhotoAccess` /
  `startupLocationAccess` wrappers (they only re-tested upstream readers); the file's other two cases stay.
- No Quint, Lemma or harness file deleted.

## Pins left broken

- None caused by this unit.
- Pre-existing (stage A2, not this unit): `test/quint-permission-coordinator-refinement.test.mjs` fails at
  `specs/quint/refinement/application/startup-permissions-coordinator.mjs:441` — scenario
  `auth-ready-preserves-completed-{4,5,6,7}` seeds completed native progress versions 1–3, which A2 removed from
  `startup-permission-progress.ts`. The same cause fails `test/quint-permission-choices.test.mjs` at
  `specs/quint/refinement/application/permission-choices.mjs:427` (scenario
  `returning-auth-preserves-completed-{4,5,6,7}`). Both scenarios must drop the historical versions (stage E port).

## Skipped

- view-navigation finding 2 (`object` → `expectRecord`, and `isRecord` in `receiveInteraction`): applied, then
  reverted. Seven tests transplant this source with an injected import list (`home-agent-navigation`,
  `voice-prepared-navigation`, `optional-view-channel-chat`, `prepared-navigation-route`,
  `committed-view-observation` fixture, `view-navigation-settle`, `calendar-day-context`) and all fail with
  `expectRecord is not defined`; deleting seven tests for a four-line helper is out of proportion. Do it after
  stage E turns those transplants into imports.
- view-navigation finding 1 (inline `home→chat`/`workflows→automations` map → `alphaCanonicalViewId`): not identical
  for every view (`canonicalId(view) ?? view` maps other served ids too), so it would change the request URL.
- view-navigation findings 5–7 (`interactionAvailable`/`ready`/`rendererReady`, required ports, `document.*?.`):
  behavioural tests (`native-browser-view-binding`, `home-agent-navigation`, `optional-view-channel-chat`,
  `calendar-day-context` with a `{hidden:false}` document fake) use them; needs the test rework of stage E.
- view-navigation findings 4, 9, 12, 13 (`live()` predicate, `deliver()` split, formatting): the
  `voice-completed-action-context` slice (`'\tmetadata(context:'`…`'\n\tcapture(`) and the transplants pin the
  layout; formatting is D9 (stage F).
- voice-assistant / voice-turn-routes deletion (D4): needs edits in `prototype/voice-adapter.ts` (other owner),
  two Playwright specs that `import('/src/runtime/voice-assistant.ts')`, Quint `composition/ports.mjs`,
  `native/renderer.mjs`, `specs/quint/native/manifest.json` sources and `test/voice-assistant.test.mjs:750`; belongs
  to the `@eliza/*` alias unit (U-R2).
- voice-selection: `voicePreferenceKeys` + dead listener (needs `voice-adapter.ts` edits, other owner); `'agent'` in
  `VoicePreference` (`voice-adapter.ts:1272` passes it); navigator `try/catch` (vm transplants in
  `cloud-voice-limit`, `offline-signed-out-speech`, `local-speech-playback`, `cloud-voice-view` fixture run without
  `navigator`); Clef switch (D7 keep).
- voice-states: no `errorCode` helper exists in `lib/parse.ts`; DOMException-name sets left (Lemma-registered file,
  low value).
- voice-timing: forward-to-instance refactor (D4, ~20 importers and tests), test-only exports, `raceAbort` (the
  `cloud-voice-view` fixture and `voice-replies` evaluate this source with imports stripped, so a new import breaks
  them), default-equal `storage`/`clock` options (kept on purpose: the transplants need this realm's globals),
  moving `VoiceStartupStage`/`VoiceStartupTiming` (edits `diagnostics-export.ts`, other owner).
- voicemail-state / voicemail-transcription cloud mode: Q-VOICE-3 Open. Runtime→prototype registration: needs
  `main.tsx` (other owner).
- workflow-device-contract: `validateWorkflowReminderResult`, `parseWorkflowPhoneReview` (behavioural tests
  `workflow-reminder-contract`, `workflow-output-contract`, `workflow-typed-schedule` call them; stage E),
  `validateWorkflowResult` alias rename (3 product importers owned by others), `binding!` narrowing (low value).
- workflow-intents: holder indirection, `typeof BroadcastChannel` guard and Android predicate
  (`scripts/workflow-renderer-fixture.ts` vm-transplants this file without `BroadcastChannel`; T2 first); event and
  channel constants (no second importer change possible here); `agentOwnerKey` (B1 map) — the vm transplant has no
  `agentOwnerKey` in scope.
- workflow-local-time: dropping `_locale` (caller `automations-protocol.ts automationWhen` and
  `test/polish-automation-when.test.mjs` pass it); exporting `OWNER_LOCAL_TZ` (its second user is another owner's
  file); `DAY_NAMES`/`resolveZone` refactors (D9, low value).
- workflow-presentation probe removal: Q-VOICE-4 Open.
- workflow-protocol `PhoneSpec` casts: needs `phone-workflow-authoring.ts` (other owner).
- workflow-reminder-read status set / alarm prefix: needs exports in `daily.ts` (other owner).
- workflow-request-recovery, startup-browser-permissions move behind the dev boundary: file moves (stage F, Q-DEV-3).
  startup-browser-permissions `errorCode`/`withTimeout`: no such shared helpers exist.
- startup-permission-flow: `readStartupPermissionMemory`/`writeStartupPermissionMemory` (Quint
  `refinement/application/portable.mjs` and `test/quint-conformance.test.mjs` use them), `defaultStore` (upstream
  does not export its twin; explicit `null` store semantics differ), `lateReadyNotice` flag (Lemma `.dfy`
  regeneration plus `connection-ui.tsx`, other owner), storage-key constants into product registration (other owner).
- startup-permissions.tsx: hook/bridge split (stage F; `permission-choices.mjs` text anchors), refresh/retire
  helpers and `states` initialiser (hook layout is pinned: the coordinator harness asserts 13 state hooks and 12 ref
  hooks and reads them by index), theme-copy loop and `<dialog>` lifecycle (`browser-host-modal.test.mjs:21`),
  `.catch(()=>{})` on `addListener` (behaviour on bridge failure), `isAndroid` (no shared `native.ts` export found).
- startup-permissions.css token/`!important`/`.alpha-btn` changes: visual changes that need a screenshot check.

## Verification

- `npx tsc --noEmit -p .`: no errors (whole project, at the time of the run).
- `node --test` per file, all passing: `voice-prepared-navigation` 8, `voice-completed-action-context` 5,
  `native-browser-view-binding` 8, `home-agent-navigation` 27, `optional-view-channel-chat` 3,
  `committed-view-observation` 23, `view-navigation-settle` 6, `calendar-day-context` 12,
  `prepared-navigation-route` 2, `voice-assistant` 35, `voice-turn-routes` 14, `live-voice` 9, `cloud-voice-limit` 7,
  `offline-signed-out-speech` 4, `local-speech-playback` 4, `pixel-spoken-acks` 256, `voice-timing` 3,
  `voice-entry-timing` 12, `diagnostics-export` 20, `voice-replies` 10.
- `node --test` batches, all passing: `workflow-presentation-probe` + `workflow-device-registration` +
  `startup-access-flow` + `browser-host-modal` (9); `startup-permission-completion` + `workflow-reminder-contract` +
  `workflow-output-contract` + `workflow-typed-schedule` + `workflow-adapter-recovery` + `workflow-notice-return`
  (65); `automations-unified` + `polish-automation-when` + `quint-conformance` + `workflow-lifecycle-resend` +
  `workflow-approval-poster` + `workflow-device-bindings-fixture` + `resident-explicit-panel-startup` (74).
- `test/quint-permission-coordinator-refinement.test.mjs`: fails at the A2 pin listed above (not this unit).
- `test/quint-permission-choices.test.mjs`: fails at the same A2 pin (`permission-choices.mjs:427`), not this unit.
  The text anchors `async function allow() {` and the `const ticket = …` line are unchanged.
- Not run: `npm run lemma:check` (Dafny; the verified functions `deniedSettingsChoice`, `readyTapStep`,
  `tapRecheck`, `startupPermissionsActiveCore`, `lateReadyNotice` and their types are untouched), `quint:check`,
  Playwright, `npm run build`, `audit:bundle`, Android/Gradle (no Java touched).
