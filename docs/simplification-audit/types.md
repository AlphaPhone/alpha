# Global type ledger

This ledger backs patterns **C1** (local structural types re-declared per file), **C2** (native plugin
interfaces typed at each call site) and **B2** (optional members on our own bridge interfaces) in
[`PATTERNS.md`](PATTERNS.md).

Sources:
- the "Local types and helpers" tables of all 44 chunk summaries in [`chunks/`](chunks/);
- research §4 of `app-prototype.md`, `app-runtime-a-m.md`, `app-runtime-n-z-and-root.md` and
  `app-browser-and-build.md`;
- a fresh parse of every `type`/`interface` declaration in `apps/app/src` (699 declarations,
  including ones inside dense single-line statements), every `registerPlugin` call (139 call sites
  across 32 plugin names), and every Java `interface` under `android/` (47).

Each shape below was checked against its declaration text. Line numbers are for this worktree at
`b9c5844dc`. "Upstream" means `.eliza/client-features/**` (generated from `vendor/eliza`) or
`vendor/eliza/plugins/plugin-native-*`.

Conventions:
- **Identical**: the same members and types.
- **Subset/superset**: one side adds or drops members.
- **Different**: the name collides but the concept differs. The fix is to rename, not merge.

---

## 1. Types declared more than once, or duplicating an upstream/shared type

### 1.1 Renderer — same concept, more than one declaration

| name | all declaration sites (file:line, under `apps/app/src/`) | shapes identical? | proposed single home | importers to update |
|---|---|---|---|---|
| `Bag` (`Record<string,any>`) | **browser/** focus-state.ts:2, simulated-apps.ts:11, simulated-inbox.ts:5, simulated-messages.ts:5, simulated-voicemail.ts:3, simulated-workflows.ts:18, simulator-recovery.ts:3, workflow-dated-sources.ts:2, workflow-focus.ts:4, workflow-history.ts:3, workflow-local-send.ts:1, workflow-messages.ts:1, workflow-receipts.ts:4, workflow-trigger-runtime.ts:9, workflow-triggers.ts:1 (15). **prototype/** agent-calendar-adapter.ts:24, automations-adapter.ts:16, browser-adapter.ts:20, calendar-adapter.ts:15, calendar-confirmation.ts:4, calendar-days.ts:11, calendar-edit-draft-adapter.ts:8, calendar-form-draft-adapter.ts:8, calendar-interval-presentation.ts:3, calendar-month-focus.ts:2, camera-adapter.ts:40, canonical-calendar-drafts.ts:8, canonical-notes-ui.ts:15, clock-adapter.ts:5, contacts-adapter.ts:6, context-selection.ts:10, data-adapter.ts:8, home-overview-cards.ts:3, home-shell.ts:8, inbox-cloud-adapter.ts:33, maps-adapter.ts:36, native-adapter.ts:14, note-origin-adapter.ts:4, note-source-adapter.ts:8, note-web-source-adapter.ts:2, notes-document-adapter.ts:4, notes-folders-adapter.ts:2, notes-share-adapter.ts:4, notes-trash-adapter.ts:14, phone-adapter.ts:10, photo-library-adapter.ts:14 (unused), reminder-adapter.ts:13 (`= any`), selection-adapter.ts:14, settings-adapter.ts:42, share-panel-adapter.ts:3, sms-adapter.ts:35, subview-accessibility.ts:6, telephony-attention.ts:17, voice-adapter.ts:54, workflow-adapter.ts:19, workflow-authoring.ts:16 (41). **runtime/** canonical-calendar-draft.ts:2, maps-event-return.ts:6, reminder-creations.ts:7 (3). **passwords/** password-manager.ts:23 (1). Same type, other names: `Api` browser/incoming-simulation.ts:5; `ReplyShell` prototype/subview-accessibility.ts:157 | 59 are `Record<string,any>` and 1 is `any`. 970 `Bag` references in total. | None of them should survive as `Bag`. **Prototype view code** uses `ViewApi` / `ViewState` / `ShellHost` from the new `prototype/shell-types.ts` (§3.2). **browser/ simulators** use their own row types next to each simulator (`SimulatedMessage`, `SimulatedRun`, and so on). For the **runtime/ and passwords/** sites, see §4 rows 4–7. Until a site is typed properly, it imports one transitional `export type LooseRecord = Record<string, unknown>` from `lib/parse.ts`, never a new local `any` alias. | Every file listed. Migrate one adapter per commit, starting with the adapters that also declare `Shell`. |
| `Shell` | prototype/agent-adapter.ts:88 (`any`), chat-overlay-motion-adapter.ts:22 (`any`), local-speech-playback.ts:22 (`any`), notes-folders-adapter.ts:3 (`any`), notes-trash-adapter.ts:15 (`any`), use-in-email-review.ts:5 (`any`), calendar-approval-adapter.ts:5 (`Record<string,any>`), maps-chat-adapter.ts:55 (`Record<string,any>`). Partial structural copies: `ContactsShell` runtime/image-contacts.ts:1 (`{S():{view?};goHome()}`), `AgentStatusShell` prototype/workflow-authoring.ts:241 (`{S();openView(...)}`), `ChatDestination.shell:any` voice-adapter.ts:191, `ExternalHandoffDeps.shell:()=>any` browser-external-handoff.ts:7, `shell:any` notes-organize-executor.ts:98 | 6 are `any` and 2 are `Record<string,any>`. The 3 structural copies are honest `Pick`s of the same shell: `S`, `goHome`, `openView`. | `prototype/shell-types.ts` `ShellHost`. The structural copies become `Pick<ShellHost,'S'\|'goHome'>` and `Pick<ShellHost,'S'\|'openView'>`. | The 8 declaring files, plus image-contacts.ts, workflow-authoring.ts, voice-adapter.ts, browser-external-handoff.ts and notes-organize-executor.ts |
| `ShellPrototype` | prototype/camera-adapter.ts:163 | single declaration, but every `install*Adapter(Component, VIEWS)` (D2) re-states it implicitly through `Component.prototype` | `prototype/shell-types.ts` | camera-adapter.ts, then each lifecycle wrapper as D2 is undone |
| View API (object returned by `api(k)`) | implicit in prototype/model.js:5390-5420. It is typed `api: Bag` / `current: Bag` / `viewApi: Bag` in about 45 adapters. model.d.ts:2-3 exports `Component: ComponentType<any>` and `VIEWS: Record<string,any>`. | An implicit type with one producer. Upstream `plugin-files/src/browser/files-browser-adapter.ts:32-38` declares a private subset (`set`, `toast`, `isActive`, `open?`, `ic?`). | `prototype/shell-types.ts` `ViewApi` (members: `key`, `S`, `st`, `ic`, `people`, `person`, `isActive`, `now`, `theme`, `name`, `active`, `set`, `get`, `setView`, `shell`, `reopenStartupAccess`, `open`, `home`, `toast`, `everyBg`, `laterBg`, `stopBg`, `secure`, `chat`, `send`, `say`, `sw`, `swallowed`, `later`, `every`, `stop`, `track`, `kx`) and `ViewDefinition<S>` (`state`, `render`, `back`, `onLeave`, `preset`, as at model.js:3074/3452/3655/3919/4328/4695). Then type `model.d.ts` with them. | model.d.ts, then every adapter that types `api`, `current` or `view` as `Bag` |
| Owner request function `(path, body, signal) => Promise<unknown>` | runtime/view-navigation.ts:12 `Request`; maps/resident-relay.ts:7 `Request`; runtime/device-view-profile.ts:7 `Request` (`body: unknown\|undefined`); runtime/connection-ui.tsx:202 `DeviceRequest` (`body: unknown\|undefined`); inline runtime/device-actions.ts:89; inline connection-ui.tsx:2525 (`getResidentLiveVoice().request`) | Identical (`unknown\|undefined` ≡ `unknown`). Superset: runtime/calendar-approval-client.ts:7 adds `headers?` and `method?`. This is the `LocalAgentProtocol.request` signature at local-agent.ts:222. | `runtime/alpha-client.ts` `export type OwnerRequest`. calendar-approval-client.ts:7 can be `Pick<LocalAgentProtocol,'request'>`. | view-navigation.ts, resident-relay.ts, device-view-profile.ts, device-actions.ts, connection-ui.tsx |
| `journalBinding {scope, proposalId, operationHash}` | browser/calendar-deletions.ts:6 (in `CalendarDeletion`), browser/reminder-deletions.ts:6 (in `ReminderDeletion`), browser/daily.ts:38 (param), browser/deletions.ts:22 (param) | Identical (4×) | `browser/journal-retention.ts` `export type JournalBinding = JournalIdentity & {operationHash: string}` | calendar-deletions.ts, reminder-deletions.ts, daily.ts, deletions.ts |
| journal identity `{scope, proposalId}` | browser/deletions.ts:18 (`journalIdentity`), browser/calendar.ts:40 (`journalIdentity?`) | Identical | `browser/journal-retention.ts` `export type JournalIdentity` | deletions.ts, calendar.ts |
| `Deletion` | browser/journal-retention.ts:49 `{id; phase; deadline}` | A structural subset of `ReminderDeletion` / `CalendarDeletion` (upstream `PendingDeletion<T>`, `contracts/src/deletion-window.ts:53`) | Export from journal-retention.ts as `Pick<PendingDeletion<unknown>,…>` | journal-retention.ts |
| `Notice` (device notification row) | browser/notifications.ts:17; prototype/notifications-adapter.ts:16; prototype/context-selection.ts:119 (exported) | **Not identical.** notifications.ts has `packageName?`, `epoch?` and `occurrenceId?`. notifications-adapter.ts drops those and adds `kind?`. context-selection.ts is a loose subset (`source: string` and every display field optional). | `browser/notification-store.ts` `export type Notice` (the union of fields: `kind?`, `packageName?`, `epoch?`, `occurrenceId?`). context-selection.ts uses `Pick<Notice,'id'\|'revision'\|'source'\|'kind'\|'title'\|'text'\|'appLabel'>`. | notifications.ts, notifications-adapter.ts, context-selection.ts, own-notice-question.ts, main.tsx, connection-ui.tsx, hosted-result-notices.ts (these reference context-selection's `Notice`) |
| `DeviceEvent` | browser/notification-store.ts:7 (spelled out); browser/notifications.ts:18 (`Notice & {…}`) | Near-identical. The notifications.ts version also admits `epoch?` and `occurrenceId?` through `Notice`. | `browser/notification-store.ts` (export, defined as `Notice & {source:'external';packageName;sourceKey;autoCancel;secret}`) | notifications.ts |
| `Selection` (notification preview) | browser/notification-store.ts:5; browser/notifications.ts:19 | Identical `{packageName; preview}` | `browser/notification-store.ts` `export type NotificationSelection` | notifications.ts |
| `Snapshot` (browser document receipt) | browser/domain-document.ts:2; browser/note-recording-journal.ts:1 | Identical `{revision; raw: string\|null}`. Duplicates upstream `BrowserDocumentSnapshot` (`packages/ui/src/platform/browser-document-store.ts:2`). | Import upstream `BrowserDocumentSnapshot` | domain-document.ts, note-recording-journal.ts |
| `Documents` (document store port) | browser/domain-document.ts:3-8; browser/note-recording-journal.ts:2 | **Subset.** domain-document has `read`, `readOrCreate`, `compareExchange` and `edit` with `signal?`. note-recording-journal has `read`, `readOrCreate` and `edit`, without `signal`. Both are slices of upstream `BrowserDocumentStore`. | `Pick<BrowserDocumentStore, 'read'\|'readOrCreate'\|'compareExchange'\|'edit'>` (upstream class) | domain-document.ts, note-recording-journal.ts |
| Browser JSON document `{readJson<T>(); editJson<T>(update)}` | runtime/reminder-journal-store.ts:4 `BrowserDocument` (`editJson → Promise<unknown>`); runtime/notes-folders.ts:7 inline (`→ Promise<void>`); prototype/note-origin-adapter.ts:8 inline (`→ Promise<void>`) | Identical up to `void` vs `unknown`, which are assignment-compatible | `browser/json-domain-document.ts` `export type BrowserJsonDocument = Pick<BrowserJsonDomainDocument,'readJson'\|'editJson'>`. Better still, delete all three when the durable-slot adapter is generalised (C4). | reminder-journal-store.ts, notes-folders.ts, note-origin-adapter.ts |
| `Archive` / `Envelope` (browser-document raw shapes) | `Archive`: browser/json-domain-document.ts:4 `{raw}`, runtime/media-copy-intent.ts:5 `{raw; revision?}`, runtime/browser-notes-document.ts:12 `{v1; v2; daily}`. `Envelope`: browser/domain-document.ts:9 `{version:1; legacy; value}`, runtime/browser-notes-document.ts:13 `{version:1; archive; currentRaw}`. | **Different** per domain. The `legacy` / `v1` / `v2` members are A1 legacy envelopes. | No merge. They go away with A1 (legacy envelopes). media-copy-intent's `Archive` becomes json-domain-document's `{raw}` plus `revision`. | — |
| `Clip` / `VoiceClip` | browser/audio-capture.ts:3 `Clip`; prototype/voice-adapter.ts:55 `Clip`; runtime/cloud-voice.ts:83 `VoiceClip` (exported) | Identical `{recordingId; durationMs}`. Near-twin: runtime/cloud-voice.ts:84 `VoiceRecordingStopped` (`durationMs?`, `interrupted?:'call-active'`). | `native/alpha-voice-cloud.ts` (§3.1) exports `VoiceClip` and `VoiceRecordingStopped` | audio-capture.ts, voice-adapter.ts, cloud-voice.ts |
| `SavedAudio` / `SavedNoteAudio` | prototype/voice-adapter.ts:79 `SavedAudio {audioId; noteId; durationMs; transcript}`; `SavedNoteAudio` in runtime/note-recorder.ts | Same native result (chunk app-19) | `native/alpha-note-audio.ts` | voice-adapter.ts, note-recorder.ts |
| `Point` | browser/camera-focus.ts:1; prototype/photo-viewport.ts:1 | Identical `{x; y}` | Leave as is (2 trivial uses, different domains), or `lib/geometry.ts`. Low value. | — |
| `MapsChatCard` | prototype/maps-chat-adapter.ts:6 (exported); runtime/action-message-presentation.ts:172 (exported) | **Superset.** The runtime version adds `mapQuery?`. | runtime/action-message-presentation.ts. Delete the prototype copy and its `mapsChatText` twin. | maps-chat-adapter.ts |
| `MapsShareChoice` | prototype/maps-chat-adapter.ts:8; runtime/action-message-presentation.ts:174 | Identical | runtime/action-message-presentation.ts | maps-chat-adapter.ts |
| SMS open thread `{participant; messages[{direction; date; body}]; truncated}` | prototype/sms-adapter.ts:12 `OpenThread` (exported); runtime/telephony-executor.ts:46 (inline `openThread()` return); runtime/connection-ui.tsx:2283 (inline `draftSmsReply` param) | Identical (3×) | `runtime/telephony-executor.ts` `export type OpenThread` | sms-adapter.ts, connection-ui.tsx |
| Voicemail delete result `'deleted'\|'none-selected'\|'cancelled'\|'failed'` | prototype/phone-adapter.ts:28 `DeleteResult`; runtime/telephony-executor.ts:48 (inline) | Identical | `runtime/telephony-executor.ts` `export type VoicemailDeleteResult` | phone-adapter.ts |
| Voicemail state union | prototype/phone-info-page.ts:37, :51, :56; prototype/phone-adapter.ts:67 (inline) | Identical literal unions | `VoicemailState` in phone-info-page.ts (or the telephony contract) | phone-adapter.ts |
| `Voicemail` / `Call` / `Thread` (telephony rows) | prototype/phone-adapter.ts:11 `Voicemail` (8 fields); prototype/telephony-presenters.ts:98 `Voicemail` (5 fields); telephony-presenters.ts:96 `Thread`, :97 `Call` | **Subsets** of upstream `VoicemailEntry`, `SmsThread` and `TelephonyCallLogEntry` | `Pick<>` of the upstream telephony types (already reached via `runtime/aosp-telephony.ts`) | phone-adapter.ts, telephony-presenters.ts |
| Paired voice binding `{origin; ownerId; expiresAt; sessionId}` | runtime/paired-voice.ts:6 `Binding`; runtime/connection-ui.tsx:2531 (inline `getPairedVoiceBinding()` return); runtime/native-reading-voice.ts:17 (spread `{...resident, expiresAt}`) | Identical | Export `PairedVoiceBinding` from paired-voice.ts. Delete it if paired voice is retired (A3/A4 decision). | connection-ui.tsx, native-reading-voice.ts |
| Automations client binding | prototype/automations-adapter.ts:17 `Binding {sessionId; conversationId?; request}`; runtime/connection-ui.tsx:2460 (inline `getAutomationsClient()` return, plus `scope?` and `preflight`) | **Subset** | `ReturnType<typeof connectionController.getAutomationsClient>`, exported from the automations module as `AutomationsClient` | automations-adapter.ts (also drops the cast at :62) |
| Cloud client binding | maps/agent-navigation.ts:7 `CloudAccount {sessionId; credentialId; client: unknown}`; maps/cloud-maps.ts:12 `BoundClient = NonNullable<ReturnType<getCloudClient>>`; connection-ui.tsx:2540 inline `{client: CloudProtocol; sessionId; credentialId}` | Same members. `CloudAccount` erases `client` to `unknown`. | `export type CloudBinding` next to `getCloudClient` (connection-ui.tsx, later `runtime/connection/`) | agent-navigation.ts, cloud-maps.ts |
| Google session binding | runtime/google-connection-return.ts:2 `GoogleConnectionReturnBinding` (`client: object`, `environment: string`, `userId`, `organizationId`, `sessionId`, `credentialId`); runtime/google-workspace-return.ts:5 `GoogleWorkspaceBinding` (no `client`, `environment: 'production'\|'staging'`) | **Superset / near-identical.** They differ in `client` and in how the environment is typed. Comparators: `sameGoogleWorkspaceBinding` (google-workspace-return.ts:20) and `sameLease` (google-accounts.ts:55). | `runtime/google-return.ts` `GoogleSessionBinding` (environment typed `CloudEnvironment`), with `& {client}` where needed and one comparator | google-connection-return.ts, google-workspace-return.ts, google-connection-ui.tsx, native-connection.ts, google-accounts.ts |
| Google account owner | runtime/gmail-account-selection.ts:3 `Owner {environment: string; userId; organizationId?}`; runtime/google-calendar-selection.ts:5 `GoogleCalendarAccountKey {environment: CloudEnvironment; userId; organizationId}` | **Near-identical.** Optional vs required `organizationId`, and `string` vs `CloudEnvironment`. | `runtime/cloud-protocol.ts` `export type CloudOwner {environment: CloudEnvironment; userId; organizationId}` | gmail-account-selection.ts, google-calendar-selection.ts, google-connection-ui.tsx:37 |
| Listener handle `{remove(): Promise<void>\|void}` | runtime/google-connection-return.ts:8 `Listener`; google-workspace-return.ts:12, :40 (inline); native-connection.ts:36 (inline); plus `{remove(): Promise<void>}` in camera-adapter.ts:70/1692/1733, local-agent-native-stream.ts:4, native-view-events.ts:3, local-agent-native-events.ts:2 | Identical up to the `void` arm | Capacitor `PluginListenerHandle` (already imported at native-calendar-sync.ts) | the 7 files listed |
| Storage port `Pick<Storage,'getItem'\|'setItem'\|'removeItem'>` | runtime/gmail-account-selection.ts:4 `Storage` (spelled out, shadows DOM `Storage`); runtime/google-calendar-selection.ts:7 `GoogleCalendarSelectionStorage`; prototype/files-index.ts:12 `Store` | Identical | DOM `Storage` itself (all three are only ever passed `localStorage`), or `lib/storage.ts` `KeyValueStore` if a test seam is kept | the 3 files |
| HTTP method unions | runtime/app-record-route-policy.ts:5 `AppRecordMethod = 'GET'\|'POST'\|'PATCH'\|'DELETE'`; runtime/automations-route-policy.ts:3 `AutomationsMethod = 'GET'\|'POST'\|'PUT'\|'DELETE'` | **Different** (`PATCH` vs `PUT`). Both are narrowings of one concept. | `runtime/owner-route-policy.ts` `export type OwnerRouteMethod` plus a per-route `Extract<>` | connection-ui.tsx, local-agent.ts, automations-protocol.ts, cloud-protocol.ts, development-cloud-agents.ts |
| `ClockResult` | daily.ts:55 (exported) `{action; status; message}`; runtime/clock-contract.ts:19 re-exports upstream `ClockHandoffResult as ClockResult` | **Different** shapes under one name | Rename the daily.ts type `ClockHandoffOutcome` (or `DailyClockResult`). Delete the `as ClockResult` alias and import `ClockHandoffResult`. | daily.ts, clock-adapter.ts, clock-contract.ts |
| Notes restore outcome | prototype/notes-organize-executor.ts:8 `NotesRestoreOutcome` (7 values, includes `'missing'`); prototype/notes-trash-adapter.ts:126 `RestoreOutcome` (6 values) | **Superset** | Export `NotesRestoreOutcome` from notes-organize-executor.ts. notes-trash-adapter uses `Exclude<NotesRestoreOutcome,'missing'>`. | notes-trash-adapter.ts |
| Notes review receipt | prototype/notes-organize-executor.ts:28 `NotesOrganizeReceipt {status; summary}`; prototype/notes-query-executor.ts:37 `ReviewResult {status; summary; foregroundResult?}` | **Superset** (same `status` union) | One `NotesReviewReceipt` exported from notes-organize-executor.ts, with `foregroundResult?` | notes-query-executor.ts |
| Minimal note record | prototype/notes-organize-executor.ts:7 `Note {id; folderId?: unknown; [k]: unknown}`; runtime/notes-view.ts:8 `Note` (16 `unknown` fields); runtime/notes-folders-model.ts:64 `FolderNote {id; folderId?: unknown}` | Subsets of upstream `NoteRecord` (`plugin-notes/src/client/notes-store.ts:15`, re-exported by runtime/notes-store.ts:2) | `NoteRecord` / `Pick<NoteRecord,'id'\|'folderId'>` | notes-organize-executor.ts, notes-view.ts, notes-folders-model.ts |
| Notes kinds | runtime/notes-view.ts:9-10 `NotesKind` / `NOTES_KINDS`; notes-trash-policy.ts:14 (literal) | Duplicates upstream `notes-organize-contract.ts:15` | Upstream | notes-view.ts, notes-trash-policy.ts |
| Calendar event fields | browser/calendar-editor.ts:5 `EditableCalendarEvent`; browser/calendar-agent-review.ts:10 `Fields`, :11 `Existing`; browser/calendar.ts:22 `EventRow = CalendarRecord` | Subsets of `CalendarRecord` (browser/calendar-records.ts:5) and upstream `CalendarFields` (`calendar-contract.ts:34`). `EventRow` is a pure alias. | `Pick<CalendarRecord,…>`; import `CalendarFields`; delete `EventRow` | calendar-editor.ts, calendar-agent-review.ts, calendar.ts |
| Calendar form draft | runtime/calendar-form-draft.ts:2 `Form = Record<string,any>`; runtime/calendar-edit-draft.ts:3 `Form = Record<string,any>`; runtime/canonical-calendar-draft.ts:2 `Bag`; prototype/calendar-form-inputs.ts:1 `Form {off; t; d}`; prototype/scan-event.ts:5 `ScanEventDraft` (the full form literal); reminder-adapter.ts:22 (literal) | The first three are identical `any` bags of one concept. calendar-form-inputs is the time slice. `ScanEventDraft` is the only spelled-out shape. | `runtime/calendar-form-draft.ts` `export type CalendarFormDraft` (promote `ScanEventDraft`'s field list: `id`, `creationId`, `separateCreation`, `title`, `off`, `t`, `d`, `where`, `notes`, `cal`, `who`, `repeat`, `alert`, `video`, `allDay?`). calendar-form-inputs uses `Pick<CalendarFormDraft,'off'\|'t'\|'d'>`. | calendar-edit-draft.ts, canonical-calendar-draft.ts, calendar-form-inputs.ts, scan-event.ts, the three prototype draft adapters (C5 merges them) |
| `Alarm` | browser/clock.ts:9 | Subset of `DeletableReminder` (browser/reminder-deletions.ts:5) | `Pick<DeletableReminder,…>` | clock.ts |
| `SpeechConnection` | browser/agent-speech.ts:3 | Hand-written slice of `connectionController` | `Pick<typeof connectionController, 'getBrowserSpeechAgent'\|'getCloudEnvironment'\|'getCloudClient'\|'getSnapshot'>`. Make the members required (B2). | agent-speech.ts |
| `DeviceRequest` | runtime/connection-ui.tsx:202 | Identical to `OwnerRequest` (row above). Also the parameter type of `device-actions.ts:89`. | `OwnerRequest` | connection-ui.tsx |
| Hosted-digest pending review | runtime/hosted-digest-ui.tsx:56 `Pending`; runtime/hosted-live-source-ui.tsx:25 (payload subset); runtime/local-agent-storage.ts:56 (reads `phase`) | Subset | `runtime/hosted-digests.ts` `DigestPending` | hosted-digest-ui.tsx, hosted-live-source-ui.tsx, local-agent-storage.ts |
| Workflow save expectation | prototype/workflow-authoring.ts:17 `Pending` | Duplicates upstream `PhoneWorkflowSaveExpectation` | Upstream type | workflow-authoring.ts |
| `PhoneSpec` vs `PhoneWorkflowSpec` | runtime/phone-workflow-authoring.ts:12 `PhoneSpec` (`steps: PhoneStep[]`, where `PhoneStep` is `[key]: any`); upstream `contracts/src/phone-workflow.ts:158` `PhoneWorkflowSpec`; casts at runtime/workflow-protocol.ts:15-20 | Same concept. The local copy is looser and needs casts. | Upstream `PhoneWorkflowSpec` | phone-workflow-authoring.ts, workflow-protocol.ts, workflow-authoring.ts, browser/development-workflows.ts |
| Workflow tap result / hosted tap result | prototype/workflow-notice-question.ts:5 `Result`; runtime/hosted-notice-question.ts:7 `Result`; inline return at hosted-result-notices.ts:34 and workflow-adapter.ts:163 | Each pair is identical within its own domain. The two names collide across domains. | `HostedResultTap` (hosted-result-notices.ts) and `WorkflowTapResult` (workflow-device-contract.ts) | the 4 files |
| Workflow filters | prototype/workflow-filters.ts:3-4 `WorkflowTypeFilter` / `WorkflowStatusFilter`; prototype/automations-adapter.ts:33 `Filter = FeedFilter\|'schedules'` (+ `filterNames` :34) | Overlapping literal unions | workflow-filters.ts (one labels record) | automations-adapter.ts |
| `CloudAuthority` | runtime/cloud-protocol.ts:31 | Hand-written shape of `productionCloud` in cloud-deployment.generated.ts:2 | `typeof productionCloud` | cloud-protocol.ts |
| `CloudEnvironment` | runtime/cloud-protocol.ts:30 (exported); re-derived as the return type in cloud-environment-selection.ts:11 | Identical | cloud-protocol.ts only | cloud-environment-selection.ts |
| `ObjectValue` | runtime/cloud-protocol.ts:123 (`Record<string,unknown>`, exported); runtime/automations-protocol.ts:11 (`Record<string,any>`) | **Different** (`unknown` vs `any`) | `lib/parse.ts` `JsonObject = Record<string, unknown>`, with `isRecord` (C3) | cloud-protocol.ts, automations-protocol.ts, and every local `object()` / `record()` guard (C3 list) |
| `ResultInbox` / `NativeInbox` | runtime/digest-inbox.ts:2 `ResultInbox` (interface); implemented in hosted-background.ts | One interface, one implementation, one consumer | Move the interface into hosted-background.ts and delete digest-inbox.ts | digest-inbox.ts, hosted-background.ts, hosted-digest-ui.tsx |
| `RecoveryRequest` | runtime/workflow-request-recovery.ts:4 | Same port is restated in browser/calendar-recovery.ts and calendar-editor-draft.ts (chunk app-26) | `browser/domain-recovery.ts` | the 3 files |
| `RestoreOption` | browser/domain-recovery.ts:6 | Single declaration with one user (calendar-recovery.ts) | Move it into calendar-recovery.ts | domain-recovery.ts |
| `CanonicalCalendarSyncSettings` | runtime/calendar-sync-settings.ts:8 (dead file per A2), imported by google-accounts.ts:5 and google-connection-ui.tsx:17 | Single declaration in a dead file | `runtime/agent-calendar.ts` (or `google-calendar-link.ts`) | google-accounts.ts, google-connection-ui.tsx |
| `SystemBars` | prototype/system-bar-appearance.ts:1 (`{setSystemBarAppearance}`); main.tsx:181 uses it for `registerPlugin('AlphaDevice')` | Name collides with the Capacitor `SystemBars` used at agent-adapter.ts:80 | `native/alpha-device.ts` | main.tsx, agent-adapter.ts, system-bar-appearance.ts |
| `PhotoAccess` | prototype/settings-adapter.ts:43; the same shape at camera-adapter.ts:101, :131 | Identical | `native/alpha-photos.ts` | settings-adapter.ts, camera-adapter.ts |
| Camera / photos records (`Photo`, `VideoReceipt`, `PreviewReceipt`, `Lens`, `LibraryAccess`, `SavedPhoto`, `EditPreview`, `EditReceipt`, `OwnedAlbum`) | prototype/camera-adapter.ts:41-46, :67-68, :133-135 | Mirrored by browser/browser-camera.ts (`Row` :15), photo-library-adapter.ts, runtime/photo-library.ts | `native/eliza-camera.ts` and `native/alpha-photos.ts` | camera-adapter.ts, browser-camera.ts, photo-library-adapter.ts, photo-library.ts |
| `SelectedFile` | prototype/file-email-review.ts:5 (`MailAttachment & {size; sha256}`) | Same as the review shape in runtime/inbox-attachment.ts | `runtime/inbox-attachment.ts` | file-email-review.ts |
| Mail attachment part (inline) | prototype/inbox-cloud-adapter.ts:133, :138 | Identical within the file | `MailAttachmentPart` (same file, or `native/alpha-mail-attachments.ts`) | inbox-cloud-adapter.ts |
| `HistoryEntry` | runtime/connection-ui.tsx:1996 | Duplicates the row in device-record-presentation.ts | device-record-presentation.ts | connection-ui.tsx |
| `RoleRow` | prototype/settings-adapter.ts:125 | Duplicates the row of the upstream `@elizaos/capacitor-system/settings` parser | Upstream | settings-adapter.ts |
| `AgentStatusShell`, `showAgentStatus` | prototype/workflow-authoring.ts:241-248 | Misplaced; a `Pick` of `ShellHost` | connection-ui (runtime) with `Pick<ShellHost,…>` | workflow-authoring.ts |

### 1.2 Renderer — local aliases of upstream types (pure renames; D4)

All of these are identical by construction. Delete the alias and import the upstream name.

| alias | declaration site | upstream name | importers to update |
|---|---|---|---|
| `CanonicalNotesViewHooks` | prototype/canonical-notes-controller.ts:5 | `NotesControllerHooks` | canonical-notes-controller.ts |
| `AssistantDraftController` | prototype/assistant-draft-controller.ts:7 | `DurableDraftController` | browser/calendar-editor-draft.ts, agent-adapter.ts, calendar-edit-draft-adapter.ts, calendar-form-draft-adapter.ts, canonical-calendar-drafts.ts, inbox-unsaved.ts |
| `InboxAttention` | prototype/inbox-cloud-adapter.ts:38 | `SharedInboxAttention` (mailbox-list.ts) | inbox-cloud-adapter.ts |
| `Folder` (+ `folderQuery` const) | prototype/inbox-cloud-adapter.ts:64, :109 | `MailboxFolder` | inbox-cloud-adapter.ts |
| `ComposePrefill` / `ForwardSource` / `SuggestionTarget` | prototype/inbox-drafts.ts:10, :12, :14 | `SharedComposePrefill` / `SharedForwardSource` / `SharedSuggestionTarget` (drafts-controller.ts) | inbox-drafts.ts, inbox-cloud-adapter.ts |
| `TileKey` / `TileFacts` | prototype/native-adapter.ts:88-89 | `SystemTileKey` / `SystemTileFacts` (`@elizaos/capacitor-system/settings`) | native-adapter.ts, agent-adapter.ts |
| `Source` (+ `sourceOf`) | prototype/note-source-adapter.ts:10, :33 | `DocumentSourceLink` / `documentSourceOf` | note-source-adapter.ts, selection-adapter.ts, summary-note-review.ts |
| `WebSource` / `RecordingSource` / `SummarySource` | prototype/summary-source.ts:4-6 | `WebSourceLink` / `RecordingSourceLink` / `SummarySourceLink` | summary-source.ts, summary-note-review.ts, agent-adapter.ts, browser/content-question.ts |
| `WorkflowIntentOwner` | runtime/workflow-intents.ts:7 | `SharedWorkflowIntentOwner` (0 importers) | — (delete) |
| `ActionJournal` | runtime/device-actions.ts:54 | `DeviceActionJournal` | connection-ui.tsx |
| `AlphaTelephonyPlugin` | runtime/aosp-telephony.ts:42 | `TelephonyNativePlugin` | agent-adapter.ts, phone-adapter.ts, sms-adapter.ts, telephony-attention.ts |
| `ClockResult`, `ClockOperation`, `ClockSetRequest`, `ClockDraftRequest` | runtime/clock-contract.ts:19-21 (`export type {X as Y}`) | `ClockHandoffResult`, `ClockHandoffOperation`, `ClockHandoffSetRequest`, `ClockHandoffRequest` | clock-adapter.ts and the other clock-contract importers |
| `VoiceSendPolicy` | runtime/voice-selection.ts:20 | `VoiceTimingPolicy` (or delete with A4 `VOICE_SEND_POLICY`) | voice-selection.ts |
| `Home*` aliases + `presentHome*` wrappers | prototype/home-cards.ts:45-74, :158-161 | `Overview*` / `presentOverview*` | home-cards.ts, home-overview-cards.ts |
| `MapsChatCard` / `MapsShareChoice` (prototype copy) | prototype/maps-chat-adapter.ts:6, :8 | runtime/action-message-presentation.ts (see 1.1) | maps-chat-adapter.ts |
| `ApprovalPosterSession` / `ApprovalPosterNative` (+ `createWorkflowApprovalPoster`) | runtime/workflow-device-contract.ts:100-181 | Upstream `contracts/src/workflow-approval-poster.ts` (live copy, A2) | workflow-adapter.ts |

### 1.3 Renderer — same name, different concept (rename only; do not merge)

| name | sites and shapes | proposed names |
|---|---|---|
| `State` | browser/daily.ts:16 (reminder deletion state + receipts); development-actions.ts:8 (`{version; proposals; journal}`); development-workflows.ts:14; digest-storage.ts:27 (`{slots}`); hosted-results.ts:10; password-provider.ts:7; workflow-notices.ts:11 | Fine as module-private names. Leave them unless exported. `development-*` go to `dev/` (D6). |
| `Binding` | browser/digest-delegation-ui.tsx:6 (delegation run); browser/note-recording-journal.ts:3 (`{ownerDigest; folderId}`); prototype/automations-adapter.ts:17 (see 1.1); prototype/photo-viewport.ts:2 (viewport controller); runtime/paired-voice.ts:6 (see 1.1) | `DigestDelegationRun`, `RecordingJournalOwner`, `AutomationsClient`, `PhotoViewportBinding` (export), `PairedVoiceBinding` |
| `Pending` | prototype/telephony-review.ts:10; prototype/workflow-authoring.ts:17 (see 1.1); runtime/cloud-delegation-ui.tsx:35 (auth wait); runtime/cloud-sign-in-ui.tsx:25 (`'email'\|'phone'\|'resend'\|null`); runtime/hosted-digest-ui.tsx:56 (see 1.1) | `PendingTelephonyReview`, upstream type, `PendingDelegation`, `SignInBusy`, `DigestPending` |
| `Request` | browser/digest-delegation.ts:3 (a delegation request record) vs the three owner-request function types (1.1) | `DelegationRequest` |
| `Selection` | browser/notification-store.ts:5 / notifications.ts:19 (1.1); prototype/selection-adapter.ts:15 (document selection); runtime/connection-ui.tsx:84 (connection selection union, read by 12 files through the `'alpha.connection.selection.v1'` key, C6) | `NotificationSelection`, `SelectedDocument`, `ConnectionSelection` (exported with `readConnectionSelection()` from `runtime/connection/selection.ts`) |
| `Store` | prototype/files-index.ts:12 (`Pick<Storage,…>`, 1.1); prototype/notes-query-executor.ts:11 (`Pick<SecureNotesStore,…>`); startup-permission-flow.ts:51 (`= WalkthroughStore`, an alias) | Delete the storage one and the alias; keep the notes `Pick` |
| `Form` | prototype/calendar-form-inputs.ts:1 vs runtime/calendar-*-draft.ts (1.1) | `CalendarFormDraft` / `Pick<>` |
| `Note` | (1.1) | `NoteRecord` |
| `ReviewResult` | prototype/notes-query-executor.ts:37 (1.1) vs prototype/scan-searchable-review.ts:9 `{status; message; textLayers?}` (matches `{status; message}` in scan-pdf.ts:39) | `NotesReviewReceipt`; `ScanExportResult` exported from scan-pdf.ts |
| `Row` | browser/workflow-notices.ts:5 (notice row); prototype/browser-camera.ts:15 (photo row) | `WorkflowNoticeRow`; the photo row becomes the `native/alpha-photos.ts` record |
| `Run` | browser/development-workflows.ts:13; browser/simulated-workflows.ts:19 | Dev-only; `dev/` (D6) |
| `Session` | browser/audio-capture.ts:8; browser/video-capture.ts:4 | Similar recorder sessions (`generation`, `stream`, `recorder`, `started`, `done`, `reject`, `timer`). A candidate for one `MediaRecorderSession<T>` if the two captures merge. Otherwise keep. |
| `Editor` | prototype/automations-adapter.ts:18; prototype/contacts-adapter.ts:18 | Keep (module-private, unrelated) |
| `Draft` | passwords/password-manager.ts:24; prototype/workflow-authoring.ts:18 | Keep (module-private, unrelated) |
| `Result` | prototype/workflow-notice-question.ts:5 vs runtime/hosted-notice-question.ts:7 | `WorkflowTapResult`, `HostedResultTap` (1.1) |
| `ClockResult` | daily.ts:55 vs clock-contract.ts:19 | (1.1) |
| `Callback` | prototype/native-adapter.ts:15 `(...args: any[]) => any` | §4 |
| `Mode` | prototype/chat-overlay-motion-adapter.ts:82 `'hidden'\|'input'\|'sheet'\|'full'` (chat mode literals are also spelled in main.tsx and model.js) | `ChatMode`, exported from `runtime/chat-release.ts` (chunk app-11) and used by main.tsx |
| `Record_` | passwords/dev-vault.ts:11 | `DevPasswordRecord` |

### 1.4 Scripts — identity shape

| name | sites | identical? | home | importers |
|---|---|---|---|---|
| `AppIdentity` (shape of `app.config.json`) | scripts/android-host.ts:29 `AppConfig`; scripts/app-update-candidate.ts `ProductConfig`; scripts/cloud-readiness.ts:60; scripts/aosp-pixel10a.ts:92; scripts/cloud-deployment.ts:53; plus 31 untyped `JSON.parse(readFileSync('app.config.json'))` readers | Subsets of one 10-line JSON | `scripts/lib/app-identity.ts` (`AppIdentity`, `appIdentity`, `readAppIdentity(root)`) | full list in chunk app-01 §Cross-file actions 1 |
| `PatchManifest` | scripts/prepare-patched-native.ts:22-27; scripts/quint-lib.ts:119 (inline) | Same shape | One exported type, or none once `patches` goes | prepare-patched-native.ts, quint-lib.ts |

### 1.5 Android (Java) — duplicate nested interfaces

All paths are under `android/app/src/main/java/ai/alphacompute/alphaphone/` unless they start with
`androidTest:`.

| concept | declaration sites | shapes identical? | proposed single home | users to update |
|---|---|---|---|---|
| Owner/liveness guard `void check() throws Exception` | NativeDigestSources.java:15 `Guard`; ResidentResultSession.java:14 `Guard`; ResidentCredentialShutdownRetry.java:5 `Guard`; HostedTransport.java:11 `Guard`; HostedInbox.java:11 `Fence`; AlphaCanonicalNotifications.java:192 `ForegroundCheck` (`void current()`); AlphaCredentialStore.java:23 `CloudChangeObserver` (`void changed()`); `Runnable assertOwner` (AlphaCredentialStore.java:28) | Identical apart from the method name: one no-arg, void, throws-`Exception` method. Not a member: `SourceRenewalNotices.Guard` (:12, `JSONObject describe(JSONObject)`), a different concept that should be renamed `Describer`. | One top-level `@FunctionalInterface interface OwnerGuard { void check() throws Exception; }` (file `OwnerGuard.java`) | HostedDelivery.NativeSourceWork (takes `NativeDigestSources.Guard`), every class constructing those guards |
| Secure slot read/write | HostedInbox.java:8 `Store` (read, write, remove); HostedResultNotices.java:14 `Storage` (read, write); NativeDigestSources.java:10 `Storage` (read, write); SourceRenewalNotices.java:11 `Store` (read() and write(v) on one fixed slot); WorkflowNoticeDelivery.java:13 `Storage extends NoticeDelivery.Storage {}` (empty); GoogleWorkspaceReturnFlow.java:16 `Store` (credential, pending, comparePending: a different concept) | The first three are the same port. HostedInbox adds `remove`. SourceRenewalNotices is the same port bound to one slot. | One `SecureSlots` interface (read, write, remove) with `AlphaCredentialStore.asSlots()`. SourceRenewalNotices takes `(slots, key)`. Keep GoogleWorkspaceReturnFlow.Store. | HostedInbox, HostedResultNotices, NativeDigestSources, SourceRenewalNotices, WorkflowNoticeDelivery and their factories (12 adapter glue sites, C4) |
| Background work body | AlphaDeletionsPlugin.java:19 `Task` (`JSONObject run()`); AlphaGmailPlugin.java:17 `Work` (`JSObject run()`); AlphaFilesPlugin.java:36 `StorageWork` (`JSObject run(StorageBrowser)`); AlphaLocalAgentPlugin.java:525 `ProviderChange` (`void apply(AlphaCredentialStore)`); HostedDelivery.java:30 `NativeSourceWork` | Same role, different arity | `java.util.concurrent.Callable<JSObject>` in one base-plugin `background(call, Callable<JSObject>, refused)` helper. Arity-1 variants capture their argument. | the 5 plugins |
| Empty alias interfaces | WorkflowNoticeDelivery.java:13-14 `Storage`/`Poster extends NoticeDelivery.*`; OwnerRoutes.java:7 `Assets extends OwnerRoutePolicy.Assets {}` | Identical (empty extension) | Delete; use the upstream `NoticeDelivery.Storage` / `Poster` and `OwnerRoutePolicy.Assets` | WorkflowNoticeDelivery and OwnerRoutes callers |
| JDK-shaped single-method ports | ResidentCredentialShutdownRetry.java:6-8 `Probe` (→ `Callable<Boolean>`), `Clock` (→ `LongSupplier`), `Pause` (sleep; keep, since it throws `InterruptedException`); CalendarSyncReceiptRecovery.java:18 `Settled` (BiPredicate that throws; keep); InvocationOwnerCache.java:14 `Reader` (→ `Callable<Owner>`) | Identical to JDK types | JDK `java.util.function` / `Callable` | the declaring classes |
| `Poster` | HostedResultNotices.java:15; SourceRenewalNotices.java:13; WorkflowNoticeDelivery.java:14 | **Different** members (allowed/active/post/cancel vs post(key,expiry,now)/cancel) | Keep separate; delete the WorkflowNoticeDelivery empty alias | — |
| `Ports` | NativeOwnerReminderHost.java:8; NativeNotificationSession.java:9 | **Different** members | Keep | — |
| `Reader` | NativeDigestSources.java:11 (calendar, reminders); InvocationOwnerCache.java:14 | **Different** | Keep NativeDigestSources.Reader; replace InvocationOwnerCache.Reader with `Callable<Owner>` | — |
| Test throwing runnables | androidTest:ShareFlowAssertions.java:14 `Action`; androidTest:BrowserReadingFixture.java:99 `Cleanup`; androidTest:VoiceWorkerSettlementInstrumentedTest.java:18 `Body` (takes an arg); androidTest:PasswordBrowserFillInstrumentedTest.java:75 `Match` (→ `Predicate<AccessibilityNodeInfo>`), :92 `DocumentPoint` (→ `Callable<double[]>`) | `Action` and `Cleanup` are identical | JUnit `org.junit.function.ThrowingRunnable` / JDK types | the 4 test files |
| Android JSON schemas (non-Java) | source-lock: aosp/branding/system-entry/SOURCE-INPUTS.json, provision/source-inputs.json, power-voice/SOURCE.json, core-launcher/SOURCE-INPUTS.json, keyboard-dictation/source-inputs.json, home-back-keyboard-inputs.json; patch manifest: system-entry/manifest.json, power-voice/manifest.json, core-launcher/manifest.json, hidden-navigation-handle/manifest.json | **Different** keys (`beforeSha256` vs `sha256`, per-row `project`) | One schema `{project, revision, files:[{path, sha256}]}` read by `packet.py` | `packet.py` and every packet's JSON |

---

## 2. Per-call-site native plugin interfaces (C2)

Every `registerPlugin(name)` call in `apps/app/src`. `[any]` means `registerPlugin<any>` (16
sites). `[none]` means the browser `web:` registration in `browser/register.ts` /
`register-hosted-results.ts`, which carries no type. The method lists come from each site's own
generic. Upstream port names are given where a typed upstream port already exists.

| plugin | call sites (file:line → methods typed there) | upstream type available | proposed module (`apps/app/src/native/`) |
|---|---|---|---|
| **AlphaCalendar** (19) | browser/register.ts:36 [none]; browser/simulated-workflows.ts:24 [any]; browser/workflow-focus.ts:16, :26 [any]; browser/workflow-trigger-runtime.ts:26, :59 [any]; prototype/agent-adapter.ts:876 (`NamedCalendarReadProvider`), :881 (`AvailabilityProvider`), :1033 (requestAccess, requestWorkflowReadAccess), :1034 (cancelAgent, executeAgent), :1099 (readAgenda), :1129 (readWorkflowRange); prototype/calendar-adapter.ts:16 [any]; prototype/maps-adapter.ts:134 (list); prototype/workflow-authoring.ts:21 (requestWorkflowReadAccess, workflowCalendars); runtime/connection-ui.tsx:484 (prepareAgentSource); runtime/hosted-digest-ui.tsx:72 (requestWorkflowReadAccess, workflowCalendars); runtime/native-calendar-sync.ts:8 `NativeBridge` (requestAccess, sync, addListener); startup-permissions.tsx:24 (checkPermissions, requestAccess). Related: browser/workflow-calendar.ts:1 `Calendar {list → {events: any[]}}` | `NamedCalendarReadProvider` (plugin-calendar), `AvailabilityProvider`; the upstream `AppleCalendarPlugin` is a different plugin | `alpha-calendar.ts`: `AlphaCalendarPlugin = NamedCalendarReadProvider & AvailabilityProvider & {requestAccess; requestWorkflowReadAccess; workflowCalendars; cancelAgent; executeAgent; readAgenda; readWorkflowRange; list; prepareAgentSource; sync; checkPermissions; addListener('calendarSyncChanged')}`; `export const alphaCalendar` |
| **AlphaDevice** (18) | browser/device-adapter.ts:6 (setBrightness, setNetwork, setSensor); browser/notifications.ts:230, :237, :238 (openSettings ×3, through `@capacitor/core` directly); browser/register.ts:24 [none]; browser/simulated-workflows.ts:24 [any]; main.tsx:181 `SystemBars` (setSystemBarAppearance), :372 (inline); prototype/agent-adapter.ts:83 (openSettings, snapshot); camera-adapter.ts:103, maps-adapter.ts:51, voice-adapter.ts:77, startup-permissions.tsx:25 (openSettings); prototype/settings-adapter.ts:112-122 (checkForUpdate, diagnosticsFacts, installUpdate, openPasswordProvider, openSettings, setTextScale, shareDiagnostics, snapshot, updateState); prototype/system-shade.ts:75 (openNotificationShade); runtime/accessibility-timeout.ts:20 `TimeoutPort` (recommendedTimeout); runtime/crash-log.ts:52 `CrashLogPort`; runtime/text-share.ts:3 (copyText, shareText) | `CrashLogPort` (`@elizaos/capacitor-system/crash-log`); shade port (`@elizaos/capacitor-system/shade`) | `alpha-device.ts`: `AlphaDevicePlugin = CrashLogPort & ShadePort & {openSettings({page}); snapshot; setSystemBarAppearance; recommendedTimeout; copyText; shareText; checkForUpdate; installUpdate; updateState; diagnosticsFacts; shareDiagnostics; setTextScale; openPasswordProvider}`; dev-only `setBrightness`/`setNetwork`/`setSensor` in a `dev/` extension type |
| **AlphaVoiceCloud** (13 registrations; 16 files type it, counting the `@capacitor/core` probe and `isPluginAvailable` users) | browser/register.ts:21 [none]; local-speech-playback.ts:7, :58 [any]; prototype/voice-adapter.ts:67-76 (addListener, cancel, cancelRecording, getRecordingMetrics, startRecording, stopRecording, transcribeRecording, warmSpeechOutput); runtime/cloud-voice.ts:86-102 (14 methods incl. synthesize*, transcribe*, play, stopPlayback); runtime/local-reply-speech.ts:25 `Bridge` (synthesizeLocal, play, cancel, stopPlayback, hold/releaseSpeechEngine, addListener); runtime/local-voice.ts:7-15 (localSpeechStatus, readiness, releaseLocalSpeech, transcribeLocalAudio/Recording, cancel); runtime/native-live-voice.ts:15 `NativeLiveCapturePort`; runtime/native-reading-voice.ts:7 [any]; runtime/native-voice-turn.ts:12 `NativeVoiceTimingPort`; runtime/note-recorder-driver.ts:16-27 (11 note-recording methods); runtime/paired-voice.ts:7-17 (paired*, synthesizeBrowserReading, play, stopPlayback, cancel, addListener); startup-permissions.tsx:21 (checkPermissions, requestPermissions); runtime/workflow-presentation.ts:46 (workflowPresentationCapabilities, through `@capacitor/core` directly) | `NativeLiveCapturePort`, `NativeVoiceTimingPort` (packages/voice) | `alpha-voice-cloud.ts`: `AlphaVoiceCloudPlugin = NativeLiveCapturePort & NativeVoiceTimingPort & VoiceRecordingPort & SpeechPlaybackPort & LocalSpeechPort & NoteRecordingPort & PairedVoicePort & PermissionPort<'microphone'> & PresentationProbe`. Also exports `VoiceClip`, `VoiceRecordingStopped` and `SpeechRecordingInput` (moved from cloud-voice.ts:83-85) and `voiceCloudAvailable()` (replacing the `available` copies at native-live-voice.ts:16 and native-voice-turn.ts:13). `BrowserVoice` (browser/voice.ts) `implements AlphaVoiceCloudPlugin`. |
| **AlphaMailAttachments** (9) | browser/register.ts:28 [none]; browser/simulated-inbox.ts:6, simulated-messages.ts:6 [any]; prototype/camera-adapter.ts:102 (readPhotoSelected, cancelPhotoSelected); prototype/inbox-cloud-adapter.ts:15 (saveReviewed, openReviewed, cancel); prototype/inbox-drafts.ts:8 (readSelected); prototype/note-source-adapter.ts:11-18 (readSelected, openReviewed, cancel, openSourceReference, retain/releaseSourceReference(s)); prototype/selection-adapter.ts:5 (readSelected, retainSourceReference); runtime/native-recovery-backup.ts:14 `Saver` (saveReviewed) | — | `alpha-mail-attachments.ts` (also exports `MailAttachmentPart` and `SelectedFile`) |
| **AlphaNotifications** (8 + 1 probe) | browser/device-controls.tsx:46 (compose); browser/register.ts:34 [none]; browser/workflow-focus.ts:12 [any]; prototype/agent-adapter.ts:1139 (postWorkflow); prototype/notifications-adapter.ts:17 (canonicalPending, acknowledgeCanonical, list, open, dismiss, clear, addListener); prototype/settings-adapter.ts:123 (11 settings and history methods); prototype/workflow-adapter.ts:144 `WorkflowTapNative` (runtime/workflow-device-contract.ts:55); startup-permissions.tsx:15 (status); runtime/workflow-presentation.ts:46 (probe) | — | `alpha-notifications.ts` (absorbs `WorkflowTapNative`; exports `Notice` row types only if native returns them) |
| **AlphaTelephony** (7) | prototype/agent-adapter.ts:853, :903, :915, :945; phone-adapter.ts:63; sms-adapter.ts:46; telephony-attention.ts:40, all typed `AlphaTelephonyPlugin` | `TelephonyNativePlugin` (already used) | Already typed. Move the singleton into `alpha-telephony.ts` so there is one `registerPlugin` instead of 7, and delete the alias at aosp-telephony.ts:42. |
| **ElizaSystem** (6) | browser/device-controls.tsx:47 (requestRole); browser/register.ts:25 [none]; native.ts:5 (`typeof UpstreamSystem & {getNetworkStatus}`); prototype/agent-adapter.ts:84 (setFlashlight); prototype/settings-adapter.ts:124 (getStatus, getDeviceSettings, getBuildInfo, requestRole); runtime/error-boundary.tsx:50 (getBuildInfo); native.ts:26 cast for `openAppInfo` | `SystemPlugin` (plugin-native-system/src/definitions.ts) covers requestRole, setFlashlight, getStatus, getDeviceSettings, getBuildInfo | `eliza-system.ts` (moved from `native.ts`): `SystemPlugin & {getNetworkStatus; openAppInfo}`; all 5 sites import `System` |
| **AlphaFiles** (6) | browser/register.ts:27 [none]; browser/simulated-workflows.ts:24 [any]; browser/storage-usage.ts:2 (usage); prototype/selection-adapter.ts:221 (inline), :236 (storageSaveMedia); startup-permissions.tsx:26 (storageState, storageRequestAccess) | — | `alpha-files.ts` |
| **AlphaHostedResults** (5) | browser/register-hosted-results.ts:6 [none]; prototype/workflow-adapter.ts:265-266 `ApprovalNoticeNative` (post/withdraw/resume approval notices); runtime/hosted-background.ts:5-13 `NativeInbox` (begin/cancel/configure/disableBackground, inboxHistory, syncInbox); runtime/hosted-digest-ui.tsx:71 (nativeSource*, source-renewal methods, addListener); runtime/hosted-result-notices.ts:5-19 `HostedResultNative` (publish/pending/consume/withdrawResult, releaseResultQuestion?, enable, status, setBackgroundPolling, setResultsShowing, addListener) | — | `alpha-hosted-results.ts`: `AlphaHostedResultsPlugin = ApprovalNotices & HostedInbox & SourceRenewal & ResultNotices`. Make the optional `releaseResultQuestion?` required (B2). |
| **ElizaLocation** (4) | browser/register.ts:19 [none]; browser/workflow-trigger-runtime.ts:53 [any]; maps/native-location.ts:5 `LocationBridge`; startup-permissions.tsx:22 (checkPermissions, requestPermissions) | `LocationBridge` (plugin-maps), `LocationPlugin` (plugin-native-location) | `eliza-location.ts` (or keep maps/native-location.ts as the owner) exporting the one `location` singleton |
| **AlphaConnection** (4) | prototype/workflow-authoring.ts:19 (secureRead, secureCompareExchange); runtime/cloud-delegation-ui.tsx:23-32 (read/clearDelegationCallback, addListener); runtime/mock-admission.ts:9 (pauseNotificationCollection, test-mocks); runtime/native-connection.ts:32/214 `ConnectionPort` (13 methods, several optional `?`) | `GoogleWorkspaceReturnPort` (part) | `alpha-connection.ts` = `ConnectionPort` from native-connection.ts with optional members made required (B2), plus the delegation-callback methods; mock-only methods in a `dev/` extension |
| **DailyApps** (3) | browser/register.ts:30 [none]; daily.ts:56-138 (26 methods); startup-permissions.tsx:16-20 (addListener, checkPermissions, requestPermissions: methods absent from daily.ts's type) | — | `daily-apps.ts`: the daily.ts interface plus the permission methods; daily.ts imports it |
| **AlphaBrowser** (3) | browser/register.ts:40 [none]; passwords/password-manager.ts:80 (loginFillStatus); prototype/browser-adapter.ts:23 [any] | browser-surface types (plugin-native-browser-surface, imported 16×) | `alpha-browser.ts` |
| **AlphaNoteAudio** (2) | browser/register.ts:22 [none]; prototype/voice-adapter.ts:80-88 (describe, play, stop, state, remove, restore, purge, deletionStatus) | — | `alpha-note-audio.ts` (also exports `SavedNoteAudio`) |
| **AlphaDeletions** (2) | browser/register.ts:32 [none]; runtime/deletions.ts:7-13 (pending, receipt, reviewReminder, reviewAgentReminder, undo) | — | `alpha-deletions.ts`; `BrowserDeletions implements` it |
| **AlphaMapsTransport** (2) | maps/regional-provider.ts:33 (inline); prototype/maps-adapter.ts:80 (consume/clearNavigationOpen) | — | `alpha-maps-transport.ts` |
| **DeviceApps** (2) | native.ts:11 (platformCapabilities); runtime/error-boundary.tsx:56 (openHomeChooser) | — | `device-apps.ts` |
| **AlphaContacts** (2) | prototype/agent-adapter.ts:915 [any]; prototype/contacts-adapter.ts:7 [any] | `ContactsPlugin` (plugin-native-contacts) for the shared part | `alpha-contacts.ts` (currently fully untyped) |
| **ElizaCamera** (2) | prototype/camera-adapter.ts:50-63 (11 methods incl. local `setCaptureMode`), :65 (checkPermissions) | `CameraPlugin` (plugin-native-camera/src/definitions.ts) | `eliza-camera.ts`: `CameraPlugin & {setCaptureMode}`, plus camera record types |
| **AlphaPhotos** (2) | prototype/camera-adapter.ts:69-101 (31 methods); prototype/settings-adapter.ts:44 (libraryAccess, requestLibraryAccess, openLibrarySettings) | `PermittedMediaCatalog` (plugin-native-media, part) | `alpha-photos.ts` (exports `PhotoAccess` and the photo records) |
| **AlphaPhotoLibrary** (2) | prototype/photo-library-adapter.ts:16-24 `PhotoLibraryPort` (scope, page, inspect, validate, share, requestChange); startup-permissions.tsx:23 (scope, requestAccess) | — | `alpha-photo-library.ts`; the permission site picks from it |
| **AlphaNoteDocuments** (2) | prototype/notes-document-adapter.ts:5 (importText, exportText); prototype/scan-pdf.ts:6 (exportPdf) | — | `alpha-note-documents.ts` |
| **Agent** (2) | prototype/native-adapter.ts:23 (providerStatus); runtime/local-agent.ts:64 (`Omit<LocalAgentBridge,…> & NativeRequestPort & NativeStreamPort & NativeVoiceEventPort & NativeViewEventPort`, from local-agent.ts:20/35, local-agent-native-stream.ts:3, local-agent-native-events.ts:2, native-view-events.ts:2) | — | `agent.ts` (chunk app-24 calls it `runtime/agent-plugin.ts`): one `AgentPlugin` composed of the four ports; listener payloads typed (§4) |
| **AlphaActionJournal** (2) | runtime/clock-agent-review.ts:4 `ClockReviewBridge`; runtime/connection-ui.tsx:503 `ActionJournal` (= upstream `DeviceActionJournal`) | `ClockReviewBridge`, `DeviceActionJournal` | `alpha-action-journal.ts` = `DeviceActionJournal & ClockReviewBridge` |
| **AlphaCloudSignIn** (2) | runtime/native-connection.ts:29, :30 (`CloudSignInPort`, cloud-sign-in.ts:46, with optional `cancelGoogleSignIn?` and friends) | `NativeCloudSignInPort` | `alpha-cloud-sign-in.ts` (one registration instead of two lines) |
| **ElizaPasswords** (1), **ElizaPasswordTransfer** (1) | passwords/password-manager.ts:46, :59 | `ElizaPasswordsPlugin`, `ElizaPasswordTransferPlugin` | Already typed. Transfer is PRD-excluded (A3), so delete it. |
| **AlphaReset** (1) | prototype/settings-adapter.ts:986 | `DataResetPlugin` | Already typed; move it to `alpha-reset.ts` only for uniformity |
| **AlphaGmail** (1) | runtime/gmail-background.ts:8 | `MailBackgroundNative` | Already typed; keep |
| **AlphaCloudSpeechStream** (1) | runtime/cloud-voice.ts:62 (cloudStreamTiming) | — | Fold into `alpha-voice-cloud.ts` |

Rules that come with the module set:
1. `registerPlugin` is called only in `apps/app/src/native/*.ts` and `browser/register*.ts`. Two files
   currently bypass `platform-plugins.ts` by importing `registerPlugin` from `@capacitor/core`
   directly: browser/notifications.ts:10 and runtime/workflow-presentation.ts:1.
2. Each `browser/*` web implementation (`BrowserVoice`, `BrowserDevice`, `BrowserDaily`,
   `BrowserDeletions`, and so on) `implements` the exported plugin interface, so browser and Android
   are checked against one contract.
3. Members are required unless the native method is genuinely absent on Android (B2). Dev and
   test-mocks-only methods live in a `dev/` extension type, not on the product interface.
4. `Capacitor.isPluginAvailable('X')` and `PluginHeaders` lookups go through one
   `pluginAvailable(name)` / `pluginHasMethod(name, m)` in `platform-plugins.ts` (research n–z §4).

---

## 3. Proposed shared-types layout

### 3.1 `apps/app/src/native/` — one module per Capacitor plugin

Each module exports `XPlugin` (the interface), `x` (the singleton, created through
`platform-plugins.registerPlugin`) and the record types that plugin returns. Files:

| module | exports |
|---|---|
| `alpha-calendar.ts` | `AlphaCalendarPlugin`, `alphaCalendar` |
| `alpha-device.ts` | `AlphaDevicePlugin`, `alphaDevice`, `SystemBarsPort` (from system-bar-appearance.ts) |
| `alpha-voice-cloud.ts` | `AlphaVoiceCloudPlugin`, `alphaVoiceCloud`, `voiceCloudAvailable`, `VoiceClip`, `VoiceRecordingStopped`, `SpeechRecordingInput` |
| `alpha-note-audio.ts` | `AlphaNoteAudioPlugin`, `SavedNoteAudio` |
| `alpha-mail-attachments.ts` | `AlphaMailAttachmentsPlugin`, `MailAttachmentPart`, `SelectedFile` |
| `alpha-notifications.ts` | `AlphaNotificationsPlugin` (includes `WorkflowTapNative`) |
| `alpha-hosted-results.ts` | `AlphaHostedResultsPlugin`, `HostedResultRoute` |
| `alpha-files.ts` | `AlphaFilesPlugin` |
| `alpha-connection.ts` | `AlphaConnectionPlugin` (from `ConnectionPort`) |
| `alpha-cloud-sign-in.ts` | `CloudSignInPort` (moved from cloud-sign-in.ts:46) |
| `alpha-telephony.ts` | `alphaTelephony` (`TelephonyNativePlugin`) |
| `alpha-photos.ts`, `alpha-photo-library.ts`, `eliza-camera.ts` | plugin types plus `Photo`, `PhotoAccess`, `LibraryAccess`, `SavedPhoto`, `EditPreview`, `EditReceipt`, `OwnedAlbum`, `VideoReceipt`, `PreviewReceipt`, `Lens` |
| `alpha-note-documents.ts`, `alpha-deletions.ts`, `alpha-maps-transport.ts`, `alpha-browser.ts`, `alpha-contacts.ts`, `alpha-action-journal.ts`, `alpha-reset.ts` | plugin type plus singleton |
| `eliza-system.ts` (from `native.ts`), `device-apps.ts`, `eliza-location.ts`, `daily-apps.ts` (from daily.ts:56-138) | plugin type plus singleton; `native.ts` keeps `isAndroid` / `launcherBridge` or is folded in |
| `agent.ts` | `AgentPlugin`, `NativeRequestPort`, `NativeStreamPort`, `NativeVoiceEventPort`, `NativeViewEventPort`, typed event payloads |

### 3.2 `apps/app/src/prototype/shell-types.ts`

- `ShellState`: the `S()` object.
- `ShellHost`: the methods adapters use: `S`, `vget`, `vset`, `api`, `setState`, `toast`, `live`,
  `openView`, `goHome`, `later`, `every`, `clear`.
- `ViewApi`: the 33 members listed in 1.1.
- `ViewState<K>`: per-view state, starting with `ViewState = Record<string, unknown>` and narrowing
  per view.
- `ViewDefinition<S>`: `state`, `render`, `back`, `onLeave`, `preset`.
- `ShellPrototype`: the lifecycle hooks.
- `ShellExtensions`: the 241 ad-hoc instance fields, grouped by owner (D3).

`model.d.ts` is retyped with these: `Component: ComponentType<ShellProps>` and
`VIEWS: Record<string, ViewDefinition>`.

### 3.3 `apps/app/src/lib/` (shared non-UI helpers, C3)

| module | exports (types) | replaces |
|---|---|---|
| `lib/parse.ts` | `JsonObject` (`Record<string, unknown>`), `isRecord`, `expectRecord`, `errorCode`; transitional `LooseRecord` | `ObjectValue` ×2, ~37 plain-object guards, the `Reason` extraction in voice-states.ts:4 / voice-selection.ts:76 / startup-browser-permissions.ts:62 |
| `lib/storage.ts` | `KeyValueStore = Pick<Storage,'getItem'\|'setItem'\|'removeItem'>` (only if a seam is kept) | files-index.ts `Store`, gmail-account-selection.ts `Storage`, `GoogleCalendarSelectionStorage` |

### 3.4 Domain owners (types exported where the concept lives; no new module)

| owner module | new exports |
|---|---|
| `runtime/alpha-client.ts` | `OwnerRequest` |
| `runtime/cloud-protocol.ts` | `CloudOwner`; `CloudAuthority = typeof productionCloud` |
| `runtime/google-return.ts` (merge of google-connection-return.ts and google-workspace-return.ts) | `GoogleSessionBinding`, `sameGoogleSession` |
| `runtime/connection/selection.ts` (D1 split of connection-ui.tsx) | `ConnectionSelection`, `readConnectionSelection`, `SELECTION_KEY` |
| `runtime/connection/state.ts` | `ConnectionSnapshot`, `Active`, `CloudBinding`, `AutomationsClient`, `PairedVoiceBinding` (or paired-voice.ts) |
| `runtime/owner-route-policy.ts` | `OwnerRouteMethod` |
| `runtime/telephony-executor.ts` | `OpenThread`, `VoicemailDeleteResult`, `VoicemailState` |
| `runtime/action-message-presentation.ts` | `MapsChatCard`, `MapsShareChoice` (already exported) |
| `runtime/calendar-form-draft.ts` | `CalendarFormDraft` |
| `runtime/hosted-digests.ts` | `DigestPending` |
| `runtime/hosted-result-notices.ts` / `runtime/workflow-device-contract.ts` | `HostedResultTap` / `WorkflowTapResult` |
| `runtime/chat-release.ts` | `ChatMode` |
| `browser/journal-retention.ts` | `JournalIdentity`, `JournalBinding`, `Deletion` |
| `browser/notification-store.ts` | `Notice`, `DeviceEvent`, `NotificationSelection` |
| `browser/json-domain-document.ts` | `BrowserJsonDocument` |
| `prototype/notes-organize-executor.ts` | `NotesRestoreOutcome`, `NotesReviewReceipt` |
| `prototype/workflow-filters.ts` | the one filter union and labels |
| `scripts/lib/app-identity.ts` | `AppIdentity`, `appIdentity`, `readAppIdentity` |
| Java `OwnerGuard.java`, `SecureSlots.java` (or nested in `AlphaCredentialStore`) | `OwnerGuard`, `SecureSlots` |

Upstream types to import instead of re-declaring: `BrowserDocumentSnapshot`, `BrowserDocumentStore`,
`PendingDeletion`, `NoteRecord`, `CalendarFields`, `PhoneWorkflowSpec`,
`PhoneWorkflowSaveExpectation`, `DurableDraftController`, `NotesControllerHooks`, the Shared* inbox
types, `SystemTileKey` / `SystemTileFacts`, `DocumentSourceLink` / `*SourceLink`,
`DeviceActionJournal`, `TelephonyNativePlugin` (and its `VoicemailEntry`, `SmsThread`,
`TelephonyCallLogEntry`), `ClockHandoff*`, `CameraPlugin`, `SystemPlugin`, `LocationBridge`,
`PluginListenerHandle` (Capacitor), and the workflow approval poster.

---

## 4. Single declarations that are too loose (`any` bags), with the proposed real type

`apps/app/src` holds 435 `any` tokens, 970 `Bag` references and 16 `registerPlugin<any>` calls.

| # | declaration | today | proposed real type |
|---|---|---|---|
| 1 | prototype/model.d.ts:2-3 `Component`, `VIEWS` | `ComponentType<any>`, `Record<string, any>` | `ComponentType<ShellProps>`, `Record<AlphaView, ViewDefinition>` (§3.2; `AlphaView` from alpha-client.ts) |
| 2 | prototype/reminder-adapter.ts:13 `Bag` | `any` (worse than the other 59) | `ViewApi` / `ViewState<'reminders'>`; reminder rows as upstream `Reminder` |
| 3 | the other 59 `Bag` sites and `Api` (browser/incoming-simulation.ts:5) | `Record<string, any>` | §1.1 row 1 |
| 4 | runtime/reminder-creations.ts:7 `Bag` (feeds `reminderEvents(): Bag[]`) | `Record<string, any>` | `DeletableReminder[]` / upstream `Reminder` |
| 5 | runtime/maps-event-return.ts:6 `Bag` | `Record<string, any>` | The maps event-return row (`MapsCardSpec`-based) |
| 6 | runtime/canonical-calendar-draft.ts:2 `Bag`; runtime/calendar-form-draft.ts:2 `Form`; runtime/calendar-edit-draft.ts:3 `Form` | `Record<string, any>` | `CalendarFormDraft` (§1.1) |
| 7 | passwords/password-manager.ts:23 `Bag`, :164 `Helpers` (`info → Bag`, `group(rows: Bag[])`, `set(patch: Bag)`, `ic: Bag`) | `Record<string, any>` | `SettingsRow` / `SettingsGroup` (the settings-row presenter in settings-adapter.ts) and `Record<string,string>` for `ic` |
| 8 | runtime/action-message-presentation.ts:5 `Message` | `Record<string, any>` | `RestoredMessage` (connection-ui.tsx:88) or the upstream chat message type: `{role; text; card?: MapsChatCard; choice?: MapsShareChoice; …}` |
| 9 | runtime/automations-protocol.ts:11 `ObjectValue` | `Record<string, any>` | `JsonObject` (`Record<string, unknown>`) plus parsers |
| 10 | prototype/native-adapter.ts:15 `Callback` | `(...args: any[]) => any` | The concrete agent-adapter callback signatures, e.g. `(result: AgentToolResult) => void`; at least `(...args: unknown[]) => unknown` |
| 11 | prototype/subview-accessibility.ts:157 `ReplyShell` | `Record<string, any>` | `Pick<ShellHost, 'S'\|'vget'\|'openView'>` |
| 12 | prototype/voice-adapter.ts:191 `ChatDestination.shell` | `any` | `ShellHost` |
| 13 | prototype/browser-external-handoff.ts:7 `ExternalHandoffDeps` (`shell: () => any`, `state: () => Record<string, any>`) | 2 × `any` | `shell: () => ShellHost`, `state: () => ViewState<'browser'>`; and `Browser: Pick<AlphaBrowserPlugin,'openExternalBrowser'>` |
| 14 | prototype/home-cards.ts:106 `HomeAgendaItem` (`item`, `event` are `Record<string, any>`) | 2 × `any` | `item: DeletableReminder \| CalendarRecord`, `event: CalendarRecord` (or the upstream `Overview*` agenda item) |
| 15 | browser/workflow-calendar.ts:1 `Calendar` (`events: any[]`) | `any[]` | `Pick<AlphaCalendarPlugin,'list'>` returning `CalendarRecord[]` |
| 16 | browser/development-workflows.ts:14 `State.mutations[].receipt` | `Record<string, any>` | `PhoneSaveReceipt` (already used by `receipts` in the same type) |
| 17 | runtime/phone-workflow-authoring.ts:11 `PhoneStep` (`[key: string]: any`) | index signature `any` | Upstream `PhoneWorkflowSpec['steps'][number]` (discriminated by `kind`) |
| 18 | runtime/local-agent-native-events.ts:2 `NativeVoiceEventPort`; runtime/native-view-events.ts:2 `NativeViewEventPort`; runtime/local-agent-native-stream.ts:3 `NativeStreamPort` (`listener: (value: any) => void`) | `any` event payload | `unknown`, parsed at the bridge (B3 trust boundary), or the typed envelopes `VoiceEventEnvelope` / `ViewEventEnvelope` / `StreamChunk` |
| 19 | runtime/local-agent.ts:222 `request(...): Promise<any>` | `Promise<any>` | `Promise<unknown>`; callers parse |
| 20 | the 16 `registerPlugin<any>` sites (browser/simulated-inbox.ts:6, simulated-messages.ts:6, simulated-workflows.ts:24, workflow-focus.ts:12/16/26, workflow-trigger-runtime.ts:26/53/59; local-speech-playback.ts:7/58; prototype/agent-adapter.ts:915, browser-adapter.ts:23, calendar-adapter.ts:16, contacts-adapter.ts:7; runtime/native-reading-voice.ts:7) | `any` plugin | The `native/` module types (§2) |
| 21 | browser/simulated-workflows.ts:19 `Run.workflow: Bag` | `any` bag | `Workflow` (the type used by development-workflows.ts), or a dev type under `dev/` |
| 22 | prototype/notes-organize-executor.ts:98 `shell: any` | `any` | `Pick<ShellHost,…>` |
| 23 | runtime/notes-view.ts:8 `Note` (16 `unknown` members) | Every field `unknown` (loose rather than `any`) | `NoteRecord` |
| 24 | runtime/connection-ui.tsx:1996 `HistoryEntry` (`operation: unknown`, `local.record?: Record<string,unknown>`, `createdAt?: unknown`) | loose | The device-record-presentation row type with upstream `DeviceActionJournal` entry types |
| 25 | runtime/hosted-digest-ui.tsx:56 `Pending` (`body: Record<string, unknown>`, `expectedBinding: Record<string, unknown>`) | loose | `DigestPending`, with the path-discriminated body types from the hosted-digest protocol |
| 26 | runtime/native-calendar-sync.ts:7 `NativeBridge.sync(input: Value): Promise<Value>` | `Value` is a JSON bag | The calendar sync request/response from the shared calendar sync contract |
| 27 | prototype/photo-library-adapter.ts:16 `PhotoLibraryPort` (every method returns `Promise<unknown>`) | `unknown` results, then cast | Upstream `PermittedMediaCatalog` result types |

---

## 5. Order of work (types only; behaviour-neutral)

1. Delete the pure aliases (§1.2) and the empty Java alias interfaces. These are mechanical changes
   that touch only imports.
2. Add `native/` modules (§3.1), one plugin per commit, starting with AlphaVoiceCloud, AlphaDevice
   and AlphaCalendar (the most call sites). Make the browser `web:` classes `implements` the new
   interface.
3. Export the identical-shape types from their owners (§1.1 rows marked "Identical"), then the
   superset merges.
4. Add `prototype/shell-types.ts` and migrate `Shell` / `Bag` one adapter at a time. Each migration
   should also remove the matching `any` entries from §4.
5. Java: add `OwnerGuard` and `SecureSlots`; collapse the background-work interfaces into the base
   plugin helper.
