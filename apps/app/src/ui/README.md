# Alpha UI

Alpha's own renderer UI library: the mobile shell (registration, navigation, Home, app grid),
gestures, the voice session client and its worklets, durable drafts, overview cards, the
permission walkthrough, dock clearance, screen focus, the mailbox folder picker, the Calendar
event-editor policy and command, and the remaining shell helpers.

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
| `calendar/event-editor-command.ts` | `plugins/plugin-calendar/src/components/event-editor-command.ts` | whole module |
| `calendar/event-editor-policy.ts` | `plugins/plugin-calendar/src/components/event-editor-policy.ts` | whole module |
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
| `gestures/constants.ts` | `packages/ui/src/gestures/constants.ts` | subset |
| `gestures/lost-capture.ts` | `packages/ui/src/gestures/lost-capture.ts` | whole module |
| `gestures/recognizers.ts` | `packages/ui/src/gestures/recognizers.ts` | subset |
| `gestures/useRafCoalescer.ts` | `packages/ui/src/gestures/useRafCoalescer.ts` | whole module |
| `logger.ts` | `packages/ui/src/logger.ts` | whole module, without its type and default re-exports |
| `mailbox/MailFolderPicker.tsx` | `plugins/plugin-inbox/src/components/mailbox/MailFolderPicker.tsx` | whole module |
| `mobile-shell/core.ts` | `packages/ui/src/mobile-shell/core.ts` | rewritten: re-exports only the React-free entries Alpha imports |
| `mobile-shell/feature-manifest.ts` | `packages/ui/src/mobile-shell/feature-manifest.ts` | subset: `mobileFeatureManifest` |
| `mobile-shell/InstalledAppsGridDrawer.tsx` | `packages/ui/src/mobile-shell/InstalledAppsGridDrawer.tsx` | whole module; its hold and slop constants are read from `gestures/constants.ts` |
| `mobile-shell/MobileHomeScreen.tsx` | `packages/ui/src/mobile-shell/MobileHomeScreen.tsx` | whole module |
| `mobile-shell/gestures.ts`, `mobile-launcher.ts`, `navigation.ts`, `photos-view.ts`, `view-id-migration.ts`, `view-ids.ts`, `view-registry.ts` | the same file under `packages/ui/src/mobile-shell/` | whole modules |
| `mobile-shell/product-registration.ts` | `packages/ui/src/mobile-shell/product-registration.ts` | subset; the theme types it took from `@elizaos/contracts` are read from `config/theme.ts` |
| `overview/daily-overview.ts` | `packages/ui/src/overview/daily-overview.ts` | subset |
| `overview/OverviewCards.tsx` | `packages/ui/src/overview/OverviewCards.tsx` | whole module |
| `platform/browser-document-store.ts` | `packages/ui/src/platform/browser-document-store.ts` | whole module |
| `state/app-update-gate.ts`, `durable-draft-controller.ts` | the same file under `packages/ui/src/state/` | whole modules |
| `state/durable-draft.ts` | `packages/ui/src/state/durable-draft.ts` | subset |
| `utils/automation-feed-filter.ts`, `chat-attachment-types.ts` | the same file under `packages/ui/src/utils/` | subsets |
| `utils/cron-format.ts`, `reminder-presentation.ts` | the same file under `packages/ui/src/utils/` | whole modules |
| `utils/image-attachment.ts` | `packages/ui/src/utils/image-attachment.ts` | subset: `intakeAttachmentFiles` and what it calls |
| `voice/audio-worklet-module-urls.ts` | `packages/ui/src/voice/audio-worklet-module-urls.ts` | subset: the uplink and downlink worklets (the playback reference tap left out) |
| `voice/voice-chat-playback.ts` | `packages/ui/src/voice/voice-chat-playback.ts` | subset: speakable-text extraction (`toSpeakableText`) |
| `voice/voice-session-pcm.ts` | `packages/ui/src/voice/voice-session-pcm.ts` | subset |
| `voice/batch-conversation.ts`, `browser-audio-runtime.ts`, `end-of-turn.ts`, `tts-playback-activity.ts`, `voice-activity.ts`, `voice-session-client-core.ts`, `voice-session-mic-capture.ts`, `voice-session-ownership.ts`, `voice-session-playback.ts`, `voice-session-protocol.ts`, `voice-session-state.ts`, `voice-session-status.ts` | the same file under `packages/ui/src/voice/` | whole modules |
| `voice/worklets/voice-session-downlink.js`, `voice-session-uplink.js` | the same file under `packages/ui/src/voice/worklets/` | unchanged |

"Whole module" means every declaration was kept; exports that nothing imports were made
module-private.

Alpha's map renderer lives outside this tree, in `../maps/map-plane.ts`. Its `MapLibrePlane`
class and basemap, pin, position and overlay types were copied at the same commit from
`plugins/plugin-maps/src/client/map-plane.ts` (map style, pins, position puck and route line)
without the viewport callback Alpha never used, and merged with Alpha's `MapPlane` wrapper, which
already owned the palette resolution and the world-map opening view. Upstream `maps-screen.ts`
names the renderer's overlay type, so the prepared tree stages `map-plane.ts` as a type-only leaf
(`scripts/prepare-client-features.ts` keeps the upstream type declarations and drops the
`maplibre-gl` import and the renderer class), and `../maps/map-plane.ts` checks at compile time
that its `MapOverlay` is the same type.

## Upstream modules the tree still reads

The tree still imports framework-free upstream contracts, protocol and native-bridge modules
through the `@elizaos/*` aliases in `vite.config.ts` and `tsconfig.json` (for example
`@elizaos/contracts`, `@elizaos/core/speech`, `@elizaos/capacitor-system/launcher`). Those are
shared with the agent, not UI. The one `@elizaos/ui` specifier left, `@elizaos/ui/api/transport`,
resolves to `ui/api/transport.ts` here: upstream `plugin-notes` types its fetch with it.
