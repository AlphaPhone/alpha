# B2 migration map: call sites to move onto `apps/app/src/native/*`

Stage C applies this. Paths are under `apps/app/src/`; line numbers are for this worktree when B2 ran and may
drift (re-find by the `registerPlugin('<Name>')` text). "Replace" means: delete the local generic/interface and
import the named type (or singleton) from the module.

Singleton rule used: a module exports a singleton only when no site registers that plugin with a `web:`
implementation (`browser/register.ts`, `browser/register-hosted-results.ts`, `runtime/native-connection.ts`).
Where a web implementation exists, the web registration must stay first (`browser/register.ts` is main's first
import, `platform-plugins` keeps the first registration), so the module exports the interface only and call sites
keep their own `registerPlugin<XPlugin>('X')` (or the existing owner's export) typed with it.

Browser-only and test-mocks-only methods are in separate `*BrowserMethods` / `*TestMethods` types in the same
module, never on the product interface (types.md §2 rule 3). A call site that uses one types its registration as
`XPlugin & XBrowserMethods` (only inside a `!Capacitor.isNativePlatform()` / dev-gated branch).

Members left optional on purpose (`?`): the browser implementation lacks them and the call site guards them.
Make them required only after the web class gains a no-op member (cross-file-actions U-L2 "Order").

## AlphaCalendar → `native/alpha-calendar.ts` (interface only: web `BrowserCalendar`)

Exports `AlphaCalendarPlugin`, `AlphaCalendarBrowserMethods`, `WorkflowCalendar`, `WorkflowCalendarEvent`,
`CalendarListRow`, `CalendarDeletionTarget`.

| site | replaces |
|---|---|
| startup-permissions.tsx:24 | inline `{checkPermissions; requestAccess}` → `Pick<AlphaCalendarPlugin,'checkPermissions'\|'requestAccess'>` |
| runtime/connection-ui.tsx:484 | inline `{prepareAgentSource(): Promise<CalendarAgendaSourceObservation>}`; result is now the status union, narrow on `status==='ready'` (the local `CalendarAgendaSourceObservation` at :457 becomes `AndroidCalendarSource`) |
| runtime/hosted-digest-ui.tsx:72 | inline `{requestWorkflowReadAccess; workflowCalendars}`; `workflowCalendars()` is a status union, read `calendars` after `status==='ready'` |
| prototype/workflow-authoring.ts:21 | inline `{workflowCalendars → calendars: Bag[]; requestWorkflowReadAccess}` (drops one `Bag`) |
| prototype/agent-adapter.ts:876 | `registerPlugin<NamedCalendarReadProvider>` (AlphaCalendarPlugin extends it) |
| prototype/agent-adapter.ts:881 | `registerPlugin<AvailabilityProvider>` (extends it) |
| prototype/agent-adapter.ts:1033 | inline `{requestAccess; requestWorkflowReadAccess}` |
| prototype/agent-adapter.ts:1034 | inline `{executeAgent(operation: unknown…); cancelAgent}`; `operation` is now `CalendarOperation` (the site already narrows with `isCalendarOperation`) |
| prototype/agent-adapter.ts:1099 | inline `{readAgenda}` → `AlphaCalendarBrowserMethods['readAgenda']`; readAgenda has no Android method (BrowserCalendar only) — owner of that branch should confirm it is browser-only |
| prototype/agent-adapter.ts:1129 | inline `{readWorkflowRange …}` |
| prototype/maps-adapter.ts:134 | inline `{list → {status; events?: unknown[]}}` |
| prototype/calendar-adapter.ts:16 | `registerPlugin<any>` → `AlphaCalendarPlugin & AlphaCalendarBrowserMethods` (`edit`, `editSeries`, `removeSeries`, `editResponse`, `joinMeeting`, `changePreferences` are browser-only, already guarded by `!Capacitor.isNativePlatform()`) |
| browser/workflow-calendar.ts:1 | local `Calendar {list → events: any[]}` → `Pick<AlphaCalendarPlugin,'list'>` (types.md §4 row 15) |
| browser/simulated-workflows.ts:24, browser/workflow-focus.ts:16/:26, browser/workflow-trigger-runtime.ts:26/:59 | `registerPlugin<any>` → `Pick<AlphaCalendarPlugin,'list'>` (dev simulator; moves to `dev/` in stage F) |
| browser/register.ts:36 | unchanged registration; `BrowserCalendar` may `implements AlphaCalendarPlugin` once it has `checkPermissions`, `inspectDeletion`, `removeScoped`, `saveOptions` and two more (tsc probe, see B2.md) |

## AlphaDevice → `native/alpha-device.ts` (interface only: web `BrowserDevice`)

Exports `AlphaDevicePlugin`, `AlphaDeviceBrowserMethods`, `DeviceSnapshot`, `DiagnosticsFacts`,
`PasswordProviderStatus`, `AppUpdateInstall`, `SystemBarsPort`.

| site | replaces |
|---|---|
| main.tsx:181 | `registerPlugin<SystemBars>` → `SystemBarsPort` |
| main.tsx:372 | `Parameters<typeof watchMountedAppUpdates>[0]` (AlphaDevicePlugin is assignable; probed) |
| prototype/system-bar-appearance.ts:1 | `export type SystemBars` → import `SystemBarsPort` (types.md §1.1 `SystemBars` row) |
| prototype/agent-adapter.ts:83 | inline `{snapshot → Record<string,unknown>; openSettings}` |
| prototype/settings-adapter.ts:112 | inline 9-method generic (`snapshot(): Bag`, `diagnosticsFacts(): Bag`, local `AppUpdate` pick) |
| prototype/camera-adapter.ts:103, prototype/maps-adapter.ts:51, prototype/voice-adapter.ts:77, startup-permissions.tsx:25 | inline `{openSettings}` → `Pick<AlphaDevicePlugin,'openSettings'>` |
| prototype/system-shade.ts:75 | inline `{openNotificationShade}` |
| runtime/accessibility-timeout.ts:11/:20 | local `TimeoutPort` → `Pick<AlphaDevicePlugin,'recommendedTimeout'>` |
| runtime/crash-log.ts:52 | `CrashLogPort` (AlphaDevicePlugin extends it) |
| runtime/text-share.ts:3 | inline `{shareText; copyText}` |
| browser/notifications.ts:230/:237/:238 | inline `{openSettings}`; this file imports `registerPlugin` from `@capacitor/core` directly — switch to `platform-plugins` (types.md §2 rule 1) |
| browser/device-adapter.ts:6 | inline `{setSensor; setNetwork; setBrightness}` → `AlphaDeviceBrowserMethods` |
| browser/simulated-workflows.ts:24 | `registerPlugin<any>` (dev) → `AlphaDevicePlugin & AlphaDeviceBrowserMethods` |

## AlphaVoiceCloud → `native/alpha-voice-cloud.ts` (interface only: web `BrowserVoice`)

Exports `AlphaVoiceCloudPlugin` (= `NativeLiveCapturePort & NativeVoiceTimingPort & AlphaVoiceCloudMethods`),
`AlphaVoiceCloudMethods`, `AlphaVoiceCloudBrowserMethods`, `VoiceClip`, `VoiceRecordingStopped`,
`SpeechRecordingInput`, `SpeechPlaybackEvent`, `LocalReadingBinding`, `voiceCloudAvailable()`.

| site | replaces |
|---|---|
| runtime/cloud-voice.ts:83-85 | local `VoiceClip`, `VoiceRecordingStopped`, `SpeechRecordingInput` (delete, import) |
| runtime/cloud-voice.ts:86 | 15-method inline generic; the two `*DevelopmentCloud*` methods come from `AlphaVoiceCloudBrowserMethods` |
| runtime/local-reply-speech.ts:13/:25 | local `Bridge` → `Pick<AlphaVoiceCloudPlugin,'synthesizeLocal'\|'play'\|'cancel'\|'stopPlayback'\|'addListener'\|'holdSpeechEngine'\|'releaseSpeechEngineHold'>`; keep the optional calls |
| runtime/local-voice.ts:7 | inline 6-method generic |
| runtime/native-live-voice.ts:15/:16 | `NativeLiveCapturePort` (unchanged type) and local `available` → `voiceCloudAvailable` |
| runtime/native-voice-turn.ts:12/:13 | `NativeVoiceTimingPort` and local `available` → `voiceCloudAvailable` |
| runtime/native-reading-voice.ts:7 | `registerPlugin<any>` (uses `synthesizeLocalBrowserReading`, `play`, `stopPlayback`, `cancel`, listeners) |
| runtime/note-recorder-driver.ts:16 | 10-method inline generic (paired parts at :84-93 are deleted by A4/D5 first) |
| local-speech-playback.ts:7, :58; `speakChunk(voice:any…)` at :15 | `registerPlugin<any>` / `voice:any` |
| prototype/voice-adapter.ts:55/:67 | local `Clip` → `VoiceClip`; 8-method inline generic |
| browser/audio-capture.ts:3 | local `Clip` → `VoiceClip` |
| startup-permissions.tsx:21 | inline `{checkPermissions; requestPermissions}` |
| runtime/workflow-presentation.ts:46 | inline `{workflowPresentationCapabilities}` for both `AlphaNotifications` and `AlphaVoiceCloud`; also imports `registerPlugin` from `@capacitor/core` directly — switch to `platform-plugins` |
| runtime/paired-voice.ts:7 | **not migrated**: paired voice is deleted (D5, U-R5); its methods are not on the interface |

## AlphaNoteAudio → `native/alpha-note-audio.ts` (interface only: web `BrowserVoice`)

Exports `AlphaNoteAudioPlugin`, `SavedNoteAudio`, `NoteAudioDeletionReceipt`.

| site | replaces |
|---|---|
| prototype/voice-adapter.ts:79/:80 | local `SavedAudio` → `SavedNoteAudio`; 8-method inline generic (`remove`/`restore` results become `NoteAudioDeletionReceipt` instead of `unknown`) |
| prototype/note-recorder.ts:23 | `export type SavedNoteAudio` (identical) → re-point importers (voice-adapter.ts:44, note-recorder-driver.ts:9) to `native/alpha-note-audio` |

## AlphaMailAttachments → `native/alpha-mail-attachments.ts` (interface only: web `BrowserMailAttachments`)

Exports `AlphaMailAttachmentsPlugin`, `SelectedFile`, `SelectedDocument`, `ReviewedFile`.

| site | replaces |
|---|---|
| prototype/camera-adapter.ts:102 | inline `{readPhotoSelected; cancelPhotoSelected}` (`MailAttachment&{size;sha256}` → `SelectedFile`) |
| prototype/inbox-cloud-adapter.ts:15 | inline `{openReviewed(Record<string,unknown>); saveReviewed(Record<string,unknown>); cancel}` |
| prototype/inbox-drafts.ts:8 | inline `{readSelected}` |
| prototype/selection-adapter.ts:5 | inline `{readSelected; retainSourceReference}` |
| prototype/file-email-review.ts:5 | local `SelectedFile` → `native/alpha-mail-attachments` `SelectedFile` (types.md §1.1) |
| browser/simulated-inbox.ts:6, browser/simulated-messages.ts:6 | `registerPlugin<any>` (dev) → `Pick<AlphaMailAttachmentsPlugin,'openReviewed'>` |
| prototype/note-source-adapter.ts:11 | **not migrated**: file deleted by A2 (D1, previous-notes chain). `openSourceReference` and `releaseSourceReferences` are therefore not on the interface |
| runtime/native-recovery-backup.ts:14 | **not migrated**: deleted by A3 (D3) |

## AlphaNotifications → `native/alpha-notifications.ts` (interface only: web `BrowserNotifications`)

Exports `AlphaNotificationsPlugin`, `AlphaNotificationsBrowserMethods`, `NotificationRow`,
`NotificationDeliveryStatus`, `CrossAppStatus`, `NotificationPolicyChange`, `NotificationHistoryRow`,
`CanonicalNotificationTap`.

| site | replaces |
|---|---|
| startup-permissions.tsx:15 | inline `{status}` |
| prototype/agent-adapter.ts:1139 | inline `{postWorkflow}` (`status: unknown` → `string`) |
| prototype/notifications-adapter.ts:16/:17 | local `Notice` → `NotificationRow`; 7-method inline generic |
| prototype/settings-adapter.ts:123 | 11-method inline generic with 7 `Bag`s; `setAlertPreferences`/`openAppSettings` come from `AlphaNotificationsBrowserMethods` (already guarded by `!Capacitor.isNativePlatform()`) |
| prototype/workflow-adapter.ts:144 | `WorkflowTapNative` |
| runtime/workflow-device-contract.ts:55 | `export interface WorkflowTapNative` → `Pick<AlphaNotificationsPlugin,'pendingWorkflowTap'\|'consumeWorkflowTap'\|'addListener'>` (keep `WorkflowTap` there; the module imports it) |
| browser/device-controls.tsx:46 | inline `{compose}` → `AlphaNotificationsBrowserMethods` |
| browser/workflow-focus.ts:12 | `registerPlugin<any>` (dev, `focusSnapshot`) → `AlphaNotificationsBrowserMethods` |
| runtime/workflow-presentation.ts:46 | see AlphaVoiceCloud |

## AlphaHostedResults → `native/alpha-hosted-results.ts` (interface only: web `browserHostedResults`)

Exports `AlphaHostedResultsPlugin`, `HostedResultRoute`, `ApprovalNotice`.

| site | replaces |
|---|---|
| runtime/hosted-result-notices.ts:4/:5 | `HostedResultRoute`, `HostedResultNative` (AlphaHostedResultsPlugin is assignable to it; probed) |
| runtime/hosted-background.ts:5 | `interface NativeInbox` → `Pick<AlphaHostedResultsPlugin,…>` |
| runtime/hosted-digest-ui.tsx:71 | 7-method inline generic |
| prototype/workflow-adapter.ts:265/:266 | `interface ApprovalNoticeNative` |
| browser/hosted-results.ts | before `implements`: needs `withdrawResult`, `setResultsShowing`, `releaseResultQuestion` (U-L2 Order); until then they stay optional |

## AlphaFiles → `native/alpha-files.ts` (interface only: web `BrowserFiles`)

Exports `AlphaFilesPlugin` (= `FilesStoragePort<NativeResult>` plus the `settings` option), `AlphaFilesBrowserMethods`.

| site | replaces |
|---|---|
| prototype/selection-adapter.ts:221 | `FilesStoragePort<NativeResult>` |
| prototype/selection-adapter.ts:236 | inline `{storageSaveMedia}` → `AlphaFilesBrowserMethods` (browser-only branch) |
| startup-permissions.tsx:26 | inline `{storageState; storageRequestAccess}` |
| browser/storage-usage.ts:2 | inline `{usage}` → `AlphaFilesBrowserMethods` |
| browser/simulated-workflows.ts:24 | `registerPlugin<any>` (dev) |

## AlphaConnection → `native/alpha-connection.ts` (interface only: browser factory in native-connection.ts)

Exports `AlphaConnectionPlugin`, `AlphaConnectionTestMethods`, `ConnectionRequest`, `ConnectionResponse`, `DelegationCallback`.

| site | replaces |
|---|---|
| runtime/native-connection.ts:32/:214 | `export interface ConnectionPort` (AlphaConnectionPlugin is assignable to it; probed). Google Workspace return members stay optional: `createBrowserConnection`/`BrowserCloudConnection` lack them and :217-220 guard them |
| runtime/cloud-delegation-ui.tsx:23 | inline `{addListener('cloudDelegationCallback'); readDelegationCallback; clearDelegationCallback}` |
| prototype/workflow-authoring.ts:19 | inline `{secureRead; secureCompareExchange → status: string}` |
| runtime/mock-admission.ts:9 | inline `{pauseNotificationCollection}` → `AlphaConnectionTestMethods` |

## AlphaCloudSignIn → `native/alpha-cloud-sign-in.ts` (interface only: web `BrowserCloudSignIn`)

| site | replaces |
|---|---|
| runtime/native-connection.ts:29, :30 | `CloudSignInPort` |
| runtime/cloud-sign-in.ts:46 | `export type CloudSignInPort` → `AlphaCloudSignInPlugin`. `savedSignInRecoveryStatus?`/`restoreSavedSignIn?` are not on the new type: they are the legacy Cloud sign-in recovery deleted by A5 (D1, U-A8). Re-point `CloudSignInPort` importers |

## DailyApps → `native/daily-apps.ts` (interface only: web `BrowserDaily`; `daily.ts` keeps the one registration)

Exports `DailyAppsPlugin`, `DailySurfaceInfo`. Record types (`Action`, `NativeResult`, `ClockRequest`, `ClockResult`,
`Reminder`) stay in `daily.ts` and are imported type-only.

| site | replaces |
|---|---|
| daily.ts:56 | 26-method inline generic → `registerPlugin<DailyAppsPlugin>("DailyApps")` |
| startup-permissions.tsx:16 | inline `{checkPermissions; requestPermissions; addListener('appResumed')}` → `DailyApps` from daily.ts (now typed with the permission methods) |

## ElizaSystem → `native/eliza-system.ts` (interface only: web `BrowserDevice`; `native.ts` keeps the one registration)

Exports `ElizaSystemPlugin` (= upstream `SystemPlugin` + `getNetworkStatus` + `openAppInfo`), `AppInfoTarget`.

| site | replaces |
|---|---|
| native.ts:5 | `typeof UpstreamSystem & {getNetworkStatus}` (drops the `vendor/…/index` import) |
| native.ts:26 | the `as unknown as {openAppInfo}` cast in `openAppInfo` |
| prototype/agent-adapter.ts:84 | inline `{setFlashlight}` → use `System` from native.ts |
| prototype/settings-adapter.ts:124 | inline `{getDeviceSettings(): Bag; getStatus(): {roles?: Bag[]}; requestRole; getBuildInfo}` → `System`; `requestRole` takes `AndroidRoleName`, not `string` |
| runtime/error-boundary.tsx:50 | inline `{getBuildInfo}` → `System` |
| browser/device-controls.tsx:47 | inline `{requestRole}` → `System` |

## Singleton modules (no web implementation anywhere)

| plugin → module (singleton) | sites | replaces |
|---|---|---|
| AlphaTelephony → `alpha-telephony.ts` (`alphaTelephony`) | prototype/agent-adapter.ts:853, :903, :915, :945; phone-adapter.ts:63; sms-adapter.ts:46; telephony-attention.ts:40 | seven `registerPlugin<AlphaTelephonyPlugin>('AlphaTelephony')`; then delete the alias `AlphaTelephonyPlugin` at runtime/aosp-telephony.ts:42 (§1.2) and import `TelephonyNativePlugin` |
| AlphaContacts → `alpha-contacts.ts` (`alphaContacts`) | prototype/contacts-adapter.ts:7; prototype/agent-adapter.ts:915 | two `registerPlugin<any>`. Results are `unknown`: contacts-adapter.ts:37-43/:73 read `access.available`, `value.contacts`, `value.more` directly and must parse with `parseAddressBookStatus` / `parseAddressBookPage` from native-address-book.ts (note: the upstream page has `next`, the adapter reads `more`; check before changing) |
| AlphaPhotos → `alpha-photos.ts` (`alphaPhotos`) | prototype/camera-adapter.ts:69 (31 methods); prototype/settings-adapter.ts:43/:44 | inline generics; local `LibraryAccess`, `SavedPhoto`, `EditPreview`, `EditReceipt`, `OwnedAlbum` (camera-adapter.ts:128-135) and `PhotoAccess` (settings-adapter.ts:43, identical in role to `LibraryAccess`) |
| AlphaPhotoLibrary → `alpha-photo-library.ts` (`alphaPhotoLibrary`) | prototype/photo-library-adapter.ts:16/:24; startup-permissions.tsx:23 | `export type PhotoLibraryPort`; inline `{scope; requestAccess}` |
| ElizaCamera → `eliza-camera.ts` (`elizaCamera`) | prototype/camera-adapter.ts:50, :65 | 11-method inline generic and `{checkPermissions}`; local `Photo`, `VideoReceipt`, `PreviewReceipt` (camera-adapter.ts:41-46). `setCaptureMode` is required (Kotlin has it); the `typeof … !== 'function'` guard at :863 can go when the site migrates |
| AlphaNoteDocuments → `alpha-note-documents.ts` (`alphaNoteDocuments`) | prototype/notes-document-adapter.ts:5; prototype/scan-pdf.ts:6 | inline `{importText; exportText}` and `{exportPdf}` |
| AlphaMapsTransport → `alpha-maps-transport.ts` (`alphaMapsTransport`) | maps/regional-provider.ts:33; prototype/maps-adapter.ts:80 | `RegionalOptions['transport']`; `NavigationBridge & {consumeNavigationOpen; clearNavigationOpen}` |
| AlphaActionJournal → `alpha-action-journal.ts` (`alphaActionJournal`) | runtime/clock-agent-review.ts:4; runtime/connection-ui.tsx:503 | `ClockReviewBridge`; `ActionJournal` (= `DeviceActionJournal`), then delete the alias at runtime/device-actions.ts:54 (§1.2) |
| DeviceApps → `device-apps.ts` (`deviceApps`) | native.ts:11 (`export const DeviceApps`); runtime/error-boundary.tsx:56 | native.ts's export (re-point its importers to `deviceApps`) and inline `{openHomeChooser}` |
| Agent → `agent.ts` (`agent`) | runtime/local-agent.ts:64; prototype/native-adapter.ts:23 | `Omit<LocalAgentBridge,'subscribeVoiceEvents'> & NativeRequestPort & NativeStreamPort & NativeVoiceEventPort & NativeViewEventPort` and inline `{providerStatus}`. Move `NativeRequestPort` (local-agent.ts:20), `NativeStreamPort` (local-agent-native-stream.ts:3), `NativeVoiceEventPort` (local-agent-native-events.ts:2), `NativeViewEventPort` (native-view-events.ts:2) to imports from `native/agent`; listener payloads are now `unknown` instead of `any` (§4 row 18). `cancelRequest` is required (Java has it); the `port.cancelRequest!` assertion at local-agent.ts:31 can drop the `!` |

## Plugins with no new module (and why)

| plugin | sites | decision |
|---|---|---|
| AlphaBrowser | browser/register.ts:40 (web), prototype/browser-adapter.ts:23 (`any`), passwords/password-manager.ts:80 | The interface is exactly upstream `BrowserTabHostPlugin` (`.eliza/client-features/plugins/plugin-native-browser-surface/src/tab-host.ts:119`), and a web implementation exists, so a module would be a pure alias without a singleton (D4). Migrate browser-adapter.ts:23 to `registerPlugin<BrowserTabHostPlugin>` and password-manager.ts:80 to `Pick<BrowserTabHostPlugin,'loginFillStatus'>`; browser-external-handoff.ts:11 to `Pick<BrowserTabHostPlugin,'openExternalBrowser'>` |
| ElizaLocation | browser/register.ts:19 (web), maps/native-location.ts:5, startup-permissions.tsx:22, browser/workflow-trigger-runtime.ts:53 (`any`) | Exactly upstream `LocationBridge` (plugin-maps native-location.ts:22) with a web implementation: no module. Migrate the two inline/any sites to `Pick<LocationBridge,…>` |
| AlphaReset | prototype/settings-adapter.ts:979 | Single site, already typed with upstream `DataResetPlugin`; a module would be a new abstraction for one caller |
| AlphaGmail | runtime/gmail-background.ts:8 | Single site, already typed `MailBackgroundNative` (types.md: keep) |
| ElizaPasswords | passwords/password-manager.ts:46 | Single site, already typed upstream `ElizaPasswordsPlugin` |
| AlphaCloudSpeechStream | runtime/cloud-voice.ts:62 | Single site, typed `CloudStreamPort & {cloudStreamTiming}`; no second caller to share a module |
| ElizaPasswordTransfer | passwords/password-manager.ts:59 | Deleted feature (D3) |
