# Alpha UI

Alpha's own renderer UI library: the mobile shell (registration, navigation, Home, app grid,
installed launcher, notification shade), gestures, the voice session client and its worklets,
durable drafts, overview cards, the permission walkthrough, dock clearance, screen focus, and every
screen controller, view-model and owner-facing copy Alpha used to take from elizaOS plugins: the
Maps screen, the Files browser, the Notes controller and editor, the mailbox drafts and review
controllers, the Calendar event editor, availability review and sync host, the scan document and
scan poster flows, the device-action review coordinator and its review cards, Settings tiles, the
hosted digest labels, the SMS session, the Cloud sign-in failure copy, subscription copy, deletion
notices and workflow messages.

Every module started as a copy of elizaOS source at commit
`49d8b466043ca6c3316127b616362c9d80836084`, under the MIT licence recorded from
`vendor/eliza/LICENSE` in the generated notices. They are now Alpha-owned: change them here, not
upstream, and never re-import elizaOS UI. Modules Alpha does not reach, exports nothing imports,
and Eliza's product registration and default theme were left out; files marked "subset" below
keep only the declarations Alpha uses, and copied comments were reworded where they described
removed code.

## Provenance

Unless the table says otherwise, `ui/<path>` was copied from `packages/ui/src/<path>`.

| Module | Upstream source | Kept |
| --- | --- | --- |
| `accessibility/screen-focus.ts` | `packages/ui/src/accessibility/screen-focus.ts` | subset |
| `api/conversation-turn-controller.ts` | `packages/ui/src/api/conversation-turn-controller.ts` | subset: stopped-reply matching (`findStoppedUserTurn`) |
| `api/transport.ts` | `packages/ui/src/api/transport.ts` | subset: the `ElizaClientFetch` surface and `SseEventFramer` |
| `auth/native-cloud-sign-in-copy.ts` | `packages/auth/src/auth/native-cloud-sign-in.ts` | subset: the failure-code union, `NativeCloudSignInCopy` and `nativeCloudSignInFailureMessage` (owner-facing copy); the bridge port types, failure-code set, `NativeCloudSignInError` and strict parsers stay staged, and `runtime/cloud-sign-in.ts` checks at compile time that the restated code union equals the staged one |
| `browser/page-reading.ts` | `plugins/plugin-native-browser-surface/src/page-reading.ts` | subset: the user-facing wording (`READING_UNSUPPORTED_MESSAGE`, `SENSITIVE_READING_MESSAGE`). The reading policy (credential heuristics, reject codes, `createReadingSupport`, `pageQuestionReading`/`pageQuestionExcerpt`, `MAX_READING_EXCERPT`) stays staged, and `prototype/browser-adapter.ts` refuses a sensitive released excerpt itself, in this wording, before the shared rule does |
| `calendar/availability-review.ts` | `plugins/plugin-calendar/src/client/availability-review.ts` | subset: the reviewed read flow (`executeCalendarAvailability`) and its owner-facing sentences; the provider port, review hook contract, source and event parsers and retry constants are read from `@elizaos/plugin-calendar/client/availability-review` |
| `calendar/event-editor-command.ts` | `plugins/plugin-calendar/src/components/event-editor-command.ts` | whole module |
| `calendar/event-editor-policy.ts` | `plugins/plugin-calendar/src/components/event-editor-policy.ts` | whole module |
| `calendar/sync-host.ts` | `plugins/plugin-calendar/src/linked-sync/sync-host.ts` | subset: the foreground host (`createCalendarSyncHost`) with its status text and failure and report messages; the shared sync refusals (controller, Google port, reader and checkpoint store raise plain errors) are worded by a table keyed on their reviewed text, Alpha's own runtime and device bridge raise `CalendarSyncNotice`, and the plain refusals of Alpha's browser calendar source, sync field mapping, deletion journal, checkpoint storage and device bridge reply checks are worded by a second table keyed on their text (pinned in `test/calendar-sync-failure-copy.test.mjs`); the saved opt-in parser, target match, settings slot, checkpoints, controller and data types are read from `@elizaos/plugin-calendar/linked-sync` |
| `camera/host-ports.ts` | `plugins/plugin-native-camera/src/host-ports.ts` | subset: resume restart policy (`restartAfterResume`); denial classification, Keep outcome and capture identity stay staged |
| `camera/scan-document.ts` | `plugins/plugin-native-camera/src/scan-document.ts` | subset: scan compose and review state (`createScanDocument`, `createScanCapture`) and the page admission messages (`admitScanImage`, `admitScanDimensions`); image types, limits, page and export shapes, export retry rule and draft port are read from the staged module through `@elizaos/capacitor-camera/scan-document` |
| `clock/clock-handoff-presentation.ts` | `plugins/plugin-assistant/src/services/device-actions/clock-handoff.ts` | subset: the review sentence (`describeClockHandoff`), repeat-day names (`CLOCK_DAY_NAMES`, `describeClockDays`) and the phone form (`clockHandoffFormDays`, `buildClockHandoffRequest`); capability policy, dispatch validation, time-zone checks and receipts stay staged |
| `cloud/subscription-presentation.ts` | `packages/cloud/sdk/src/subscription-entitlement.ts` | subset: the owner-facing copy (`describeSubscription`, `allowanceText`, plan labels, `serviceLimitMessage`, `retryDuration`, redemption messages, `subscriptionSummary`, `serviceLimitNextChange`); the plan view, verification, admission, refusal parsing and `SubscriptionRedeemError` stay staged and are read through `@elizaos/cloud-sdk/subscription-entitlement` |
| `components/chat/message-maps-parser.ts` | `packages/ui/src/components/chat/message-maps-parser.ts` | whole module |
| `components/composites/deferred-deletion-notice.tsx` | `packages/ui/src/components/composites/deferred-deletion-notice.tsx` | whole module, without upstream's default Tailwind class: the host passes its own `className` |
| `components/permissions/permission-walkthrough.ts` | `packages/ui/src/components/permissions/permission-walkthrough.ts` | subset |
| `components/settings/cloud-subscription-summary.tsx` | `packages/ui/src/components/settings/cloud-subscription-summary.tsx` | subset: `useCloudSubscriptionSummary` |
| `components/shell/chat-overlay-motion.ts` | `packages/ui/src/components/shell/chat-overlay-motion.ts` | subset |
| `components/shell/chat-panel-layout.ts` | `packages/ui/src/components/shell/chat-panel-layout.ts` | subset: `resolveChatPanelLayout` |
| `components/shell/dock-clearance.ts` | `packages/ui/src/components/shell/dock-clearance.ts` | whole module |
| `components/shell/responsive-layout.ts` | `packages/ui/src/components/shell/responsive-layout.ts` | whole module |
| `components/shell/use-pull-gesture.ts` | `packages/ui/src/components/shell/use-pull-gesture.ts` | whole module |
| `config/theme.ts` | `packages/contracts/src/contracts/theme.ts` and `packages/ui/src/config/theme.ts` | the theme declarations, CSS variable map and shape check (`validateThemeDefinition`) from contracts, combined with `themeCssVariables` from the UI theme; Eliza's default theme, the CSS variable name list, the font link id and the document helpers left out |
| `deletions/deletion-notice.ts` | `packages/contracts/src/deletion-window.ts` | subset: notice text, row presentation and review refusals; the deletion window itself stays staged |
| `device-actions/client-coordinator.ts` | `plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts` | subset: the review screen (`DeviceActionCoordinator` with its screen binding, `ContextNotice`, `proposalContextNotice`, review text and receipt summaries); the wire, journal and port types, operation validation, action scopes, device statuses, `DeviceActionNotStarted`, committed-change publication and the journal context are read from the staged module, which `scripts/prepare-client-features.ts` stages without the screen |
| `device-actions/device-record-presentation.ts` | `plugins/plugin-assistant/src/services/device-actions/device-record-presentation.ts` | whole module |
| `digests/hosted-digests.ts` | `plugins/plugin-workflow/src/client/hosted-digests.ts` | subset: occurrence and loop labels (`digestStatusLabel`, `digestLoopState`), `digestSummaryText`, `digestZoneNote` and the retained Home brief (`RetainedBriefStore` with its selection and clipping); the wire types, parser, protocol client, inbox, renewal and Run now selection, and the occurrence policy are read from the staged upstream files through the `@elizaos/plugin-workflow/*` aliases |
| `documents/scan-event.ts` | `plugins/plugin-files/src/documents/scan-event.ts` | whole module (poster suggestion rules with their disclosure and review copy) |
| `documents/scan-correction-messages.ts` | `plugins/plugin-files/src/documents/scan-correction.ts` and `scan-edges.ts` | Alpha's wording for the page detection and correction refusals, keyed on their reviewed text; detection and correction stay staged |
| `documents/scan-pdf-messages.ts` | `plugins/plugin-files/src/documents/scan-pdf.ts`, `scan-text-layer.ts` and `scan-draft.ts` | Alpha's wording for the scan PDF conversion and text-line refusals, keyed on their reviewed text, with 'PDF failed' for anything else; conversion stays staged |
| `documents/local-ocr-messages.ts` | `plugins/plugin-files/src/documents/local-ocr.ts` | Alpha's wording for the on-device text recognition refusals, keyed on their reviewed text; recognition stays staged |
| `files/files-browser-adapter.ts` | `plugins/plugin-files/src/browser/files-browser-adapter.ts` | whole module; storage rules and the Files agent contract are read from the staged plugin-files modules through `@elizaos/plugin-files/browser/storage-model` and `@elizaos/plugin-files/browser/files-agent-contract`, labels from `files/storage-presentation.ts` |
| `files/files-operation-presentation.ts` | `plugins/plugin-assistant/src/services/device-actions/files-browser-contract.ts` | subset: the review card (`describeFilesOperation`) |
| `files/storage-presentation.ts` | `plugins/plugin-files/src/browser/storage-model.ts` | subset: `CATEGORIES`, `SORT_LABELS`, `breadcrumbs`, `formatSize`, `formatFree`, `filterLabel`; plus Alpha's `storageResultText`, which words a storage result by the reviewed backend sentence that identifies its outcome (`STORAGE_OUTCOMES`, the share limit count kept as data), else by its status code, and `selectedPreviewText` for the selected-document preview (the backend's `message` is never shown) |
| `gestures/constants.ts` | `packages/ui/src/gestures/constants.ts` | subset |
| `gestures/lost-capture.ts` | `packages/ui/src/gestures/lost-capture.ts` | whole module |
| `gestures/recognizers.ts` | `packages/ui/src/gestures/recognizers.ts` | subset |
| `gestures/useRafCoalescer.ts` | `packages/ui/src/gestures/useRafCoalescer.ts` | whole module |
| `logger.ts` | `packages/ui/src/logger.ts` | whole module, without its type and default re-exports |
| `mailbox/background-notices.ts` | `plugins/plugin-inbox/src/mailbox/background-notices.ts` | subset: `mailBackgroundMessage` |
| `mailbox/drafts-controller.ts`, `preview.ts`, `review-controller.ts`, `use-in-email.ts` | the same file under `plugins/plugin-inbox/src/mailbox/` | whole modules; their non-UI dependencies are read through the `@elizaos/plugin-inbox/mailbox/*` aliases |
| `mailbox/failures.ts` | `plugins/plugin-inbox/src/mailbox/failures.ts` | subset: `GmailFailureKind`, `GmailFailure`, `classifyGmailFailure`, `disconnectMessage` |
| `mailbox/grants.ts` | `plugins/plugin-inbox/src/mailbox/grants.ts` | subset: `googleAccountAccessLabel`, `gmailGrantLabel` |
| `mailbox/mailbox-list.ts` | `plugins/plugin-inbox/src/mailbox/mailbox-list.ts` | subset: `MAILBOX_CHANGED_NOTICE`, `mailboxListStatus`, `InboxAttention`, `inboxAttentionFor` |
| `mailbox/MailFolderPicker.tsx` | `plugins/plugin-inbox/src/components/mailbox/MailFolderPicker.tsx` | whole module |
| `mailbox/read-state.ts` | `plugins/plugin-inbox/src/mailbox/read-state.ts` | subset: `mailReadStateMessage` |
| `mailbox/review-binding-refusal.ts` | `plugins/plugin-inbox/src/mailbox/operation-journal.ts` | subset: the `reviewBindingRefusal` table |
| `maps/cloud-provider.ts` | `plugins/plugin-maps/src/client/cloud-provider.ts` | subset: `describeMapsDisclosure` |
| `maps/guidance.ts` | `plugins/plugin-maps/src/client/guidance.ts` | subset: maneuver icons, distance/duration formatting and `guidanceView` (step advance and `atStep` stay staged) |
| `maps/map-plane.ts` | `plugins/plugin-maps/src/client/map-plane.ts` | subset: `MapPin`, `MapPosition`, `MapOverlay` |
| `maps/maps-screen.ts` | `plugins/plugin-maps/src/client/maps-screen.ts` | whole module without the React handle (`createMapsScreen`, `MapsScreenHandle`) |
| `maps/maps-messages.ts` | the `MapsFailure` text of `plugins/plugin-maps/src/client/` (`contracts.ts`, `cloud-provider.ts`, `cloud-session.ts`, `native-location.ts`, `saved-places.ts`, `regional-provider.ts`, `state.ts`) | Alpha's wording for every Maps refusal, keyed on the failure code and the reviewed sentence that identifies the outcome (the Cloud reset or retry time is kept as data); the screen never shows a failure's own text |
| `maps/state.ts` | `plugins/plugin-maps/src/client/state.ts` | whole module: the Maps view-model (`MapsController`, `MapsState`, `RoutePlanReceipt`); `../maps/state.ts` composes it with Alpha's storage, location bridge and provider rules. The parsers, `MapsFailure`, `transitDetails` and `unavailableCapabilities` are read from `@elizaos/plugin-maps/client/contracts`. Upstream's copy stays staged only for upstream's own device-navigation types and navigation tests |
| `maps/share.ts` | `plugins/plugin-maps/src/client/share.ts` | subset: `MapShare`, `placeShare`, `routeShare` |
| `messages/sms-session.ts` | `packages/contracts/src/native-telephony-session.ts` | whole module, without the unused messages option |
| `mobile-shell/core.ts` | `packages/ui/src/mobile-shell/core.ts` | rewritten: re-exports only the React-free entries Alpha imports |
| `mobile-shell/feature-manifest.ts` | `packages/ui/src/mobile-shell/feature-manifest.ts` | subset: `mobileFeatureManifest` |
| `mobile-shell/gestures.ts`, `mobile-launcher.ts`, `navigation.ts`, `photos-view.ts`, `view-id-migration.ts`, `view-ids.ts`, `view-registry.ts` | the same file under `packages/ui/src/mobile-shell/` | whole modules |
| `mobile-shell/installed-launcher.ts` | `plugins/plugin-native-system/src/client/launcher.ts` | subset: the drawer view-model, favorites store and observer; the bridge (`LauncherBridge`, `createSystemLauncherBridge`, refusal codes) and `InstalledApp` stay in the staged module |
| `mobile-shell/InstalledAppsGridDrawer.tsx` | `packages/ui/src/mobile-shell/InstalledAppsGridDrawer.tsx` | whole module; its hold and slop constants are read from `gestures/constants.ts` |
| `mobile-shell/MobileHomeScreen.tsx` | `packages/ui/src/mobile-shell/MobileHomeScreen.tsx` | whole module |
| `mobile-shell/product-registration.ts` | `packages/ui/src/mobile-shell/product-registration.ts` | subset; the theme types it took from `@elizaos/contracts` are read from `config/theme.ts` |
| `notes/note-schedule-draft.ts` | `plugins/plugin-notes/src/client/note-schedule-draft.ts` | subset: `noteScheduleDraft` and its owner-facing copy; the draft text, limit and record link stay in the staged module |
| `notes/note-document-messages.ts` | `plugins/plugin-notes/src/client/note-documents.ts` | the import and export result wording, keyed on the result status, or on the status and the reviewed `AlphaNoteDocumentsPlugin` sentence when one status covers several reasons. The browser file input and download are Alpha's (`runtime/browser-note-documents.ts`, `browser/file-picker.ts`, `browser/download.ts`); the result shapes, limits, file name and text and PDF checks stay staged, and the staged copy is projected without upstream's browser implementation |
| `notes/notes-controller.ts`, `notes-editor.ts`, `notes-snapshot-state.ts` | the same file under `plugins/plugin-notes/src/client/` | whole modules |
| `notes/notes-organize-presentation.ts` | `plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts` | subset: the review card (`describeNotesOrganizeOperation`) |
| `notes/notes-query-explanation.ts` | `plugins/plugin-notes/src/client/notes-query.ts` | subset: the Share note review sentence, keyed on the query `basis`, the candidate count and the query (and, for `owner-choice-uncertain`, the query's reviewed explanation); the selection stays staged |
| `overview/daily-overview.ts` | `packages/ui/src/overview/daily-overview.ts` | subset |
| `overview/OverviewCards.tsx` | `packages/ui/src/overview/OverviewCards.tsx` | whole module |
| `passwords/passwords-presentation.ts` | `plugins/plugin-native-passwords/src/client.ts` and `bindings.ts` | subset: the failure-code sentences (`passwordsError`), the website and vault validation wording and `filterEntries`; the bridge client, its failure codes, the transfer client and `normalizeWebsite` are read from the submodule as reviewed non-UI logic |
| `photos/library-presentation.ts` | `plugins/plugin-assistant/src/services/device-actions/photo-library-contract.ts` | subset: the owner-facing copy (`scopePresentation`, `reviewText`, `describeLibraryOperation`); parsing, limits, validation and the review freeze stay staged |
| `photos/photos-view-presentation.ts` | `plugins/plugin-assistant/src/services/device-actions/photos-view-contract.ts` | subset: the review card (`describePhotosViewOperation`) |
| `platform/browser-document-store.ts` | `packages/ui/src/platform/browser-document-store.ts` | whole module |
| `reminders/reminder-refusal-message.ts` | `plugins/plugin-assistant/src/services/device-actions/reminder-journal.ts` | subset: `reminderRefusalMessage` |
| `settings/crash-entry.ts` | `plugins/plugin-native-system/src/crash-log.ts` | subset: `describeNativeCrashEntry` |
| `settings/data-reset.ts` | `plugins/plugin-native-system/src/reset.ts` | subset: `reviewDataReset`; the `DataResetPlugin` bridge type stays staged |
| `settings/system-settings.ts` | `plugins/plugin-native-system/src/settings.ts` | subset: tile and switch wording, handoff gate and role label; the parsers stay staged |
| `shell/completed-action-navigation.ts` | `packages/core/src/views/completed-action-navigation.ts` | whole module except the test-only reset name (its body is `dispose`); the completed-action event contract (`NAVIGATE_VIEW_EVENT`, `NavigateViewDetail`, `normalizeCompletedActionHandoffId`) is read from the staged `packages/core/src/events.ts` through `@elizaos/core/events` |
| `shell/notification-shade.ts` | `plugins/plugin-native-system/src/client/shade.ts` | whole module without the unused `ShadeOutcome` type |
| `state/app-update-gate.ts`, `durable-draft-controller.ts` | the same file under `packages/ui/src/state/` | whole modules |
| `state/durable-draft.ts` | `packages/ui/src/state/durable-draft.ts` | subset |
| `telephony/telephony-receipt-text.ts` | `plugins/plugin-assistant/src/services/device-actions/telephony-actions-contract.ts`, `packages/contracts/src/telephony-actions.ts` and `packages/contracts/src/phone-dial.ts` | subset: `telephonyActionResultText` with every per-kind sentence (`phoneCallResultText`, `contactWriteResultText`, `smsComposeResultText`, `smsReplyResultText`, `voicemailDeleteResultText`) and `phoneDialResultText`; the receipt outcomes, validators and capabilities stay staged |
| `utils/automation-feed-filter.ts`, `chat-attachment-types.ts` | the same file under `packages/ui/src/utils/` | subsets |
| `utils/cron-format.ts`, `reminder-presentation.ts` | the same file under `packages/ui/src/utils/` | whole modules |
| `utils/image-attachment.ts` | `packages/ui/src/utils/image-attachment.ts` | subset: `intakeAttachmentFiles` and what it calls |
| `voice/audio-worklet-module-urls.ts` | `packages/ui/src/voice/audio-worklet-module-urls.ts` | subset: the uplink and downlink worklets (the playback reference tap left out) |
| `voice/batch-conversation.ts`, `browser-audio-runtime.ts`, `end-of-turn.ts`, `tts-playback-activity.ts`, `voice-activity.ts`, `voice-session-client-core.ts`, `voice-session-mic-capture.ts`, `voice-session-ownership.ts`, `voice-session-playback.ts`, `voice-session-protocol.ts`, `voice-session-state.ts`, `voice-session-status.ts` | the same file under `packages/ui/src/voice/` | whole modules |
| `voice/voice-chat-playback.ts` | `packages/ui/src/voice/voice-chat-playback.ts` | subset: speakable-text extraction (`toSpeakableText`) |
| `voice/voice-session-pcm.ts` | `packages/ui/src/voice/voice-session-pcm.ts` | subset |
| `voice/sense-invocation.ts` | `plugins/plugin-native-system/src/sense.ts` | subset: the invocation controller (`createSenseInvocationController`) with its modal selector, session key and bridge serialization; the plugin interface, parsers, start rule (`listenerStartsVoice`), voice entry policy and bridge timeout stay staged, and the staged copy is projected without the controller |
| `voice/worklets/voice-session-downlink.js`, `voice-session-uplink.js` | the same file under `packages/ui/src/voice/worklets/` | unchanged |
| `workflows/phone-trigger-note.ts` | `packages/contracts/src/phone-workflow.ts` | subset: `phoneTriggerClockChangeNote`, with Alpha's zone-free wording folded in |
| `workflows/workflow-messages.ts` | `packages/contracts/src/workflow-client.ts` and `packages/contracts/src/phone-workflow.ts` | Alpha's message map for the workflow client error classes, the client's plain-error checks (keyed on their reviewed text), the `PhoneWorkflowSpecError` checks, the phone's own Calendar and Notes refusals the editor reaches (keyed on their reviewed text) and the sentences Alpha's own authoring and local date checks raise; an unknown error reads as a failed request, or as the caller's local sentence for an edit that sent nothing, never as its own text |
| `workflows/workflow-scope.ts` | `packages/contracts/src/workflow-scope.ts` | subset: operation labels and refusal wording; the classifier stays staged |

"Whole module" means every declaration was kept; exports that nothing imports were made
module-private.

Alpha's map renderer lives outside this tree, in `../maps/map-plane.ts`. Its `MapLibrePlane`
class and basemap were copied at the same commit from `plugins/plugin-maps/src/client/map-plane.ts`
(map style, pins, position puck and route line) without the viewport callback Alpha never used,
and merged with Alpha's `MapPlane` wrapper, which already owned the palette resolution and the
world-map opening view. It takes its pin, position and overlay types from `maps/map-plane.ts`
here, the same types the Maps screen draws with; no upstream renderer or map type is staged.

## Upstream modules the tree still reads

The tree still imports framework-free upstream contracts, protocol, data rules and native-bridge
modules through the `@elizaos/*` aliases in `vite.config.ts` and `tsconfig.json`. Each alias names
one staged file, so no alias reaches an upstream screen: `@elizaos/contracts` and its subpaths,
`@elizaos/core/*` (including `@elizaos/core/events`), `@elizaos/voice/turn`,
`@elizaos/host/voice/ui-context`, `@elizaos/cloud-sdk/subscription-entitlement`, the native
bridges `@elizaos/capacitor-system/*` and `@elizaos/capacitor-camera/*`, and the plugin data and
protocol modules `@elizaos/plugin-maps/client/*`, `@elizaos/plugin-files/browser/*`,
`@elizaos/plugin-notes/*`, `@elizaos/plugin-calendar/client/availability-review`,
`@elizaos/plugin-calendar/linked-sync`, `@elizaos/plugin-inbox/mailbox/*`,
`@elizaos/plugin-workflow/*` and `@elizaos/plugin-assistant/*`. Those are shared with the agent,
not UI; `test/ui-self-contained.test.mjs` rejects a staged module that presents a screen. The one
`@elizaos/ui` specifier left, `@elizaos/ui/api/transport`, resolves to `ui/api/transport.ts` here:
upstream `plugin-notes` types its fetch with it.

Two pieces of upstream text deliberately stay staged because they are content, not screen copy.
The text a note is shared, copied or exported as (`noteShareText` in
`plugins/plugin-notes/src/client/note-share-text.ts`, with its "Transcript", "Summary" and
"Action items" headings) is a portable document format another app or person reads, shared with
the agent's own Notes export; a note it cannot export is worded by Alpha
(`prototype/notes-share-adapter.ts`). The `when` value the legacy Notes migration writes into a
stored note is record data. Every caller of `noteOriginTitle` passes Alpha's own fallback label.

Browser download links and file inputs are Alpha's too (`../browser/download.ts`,
`../browser/file-picker.ts`): the staged Files backend takes the download as a host option, like
the picker and document viewer, and the staged Notes document module keeps no browser code.
