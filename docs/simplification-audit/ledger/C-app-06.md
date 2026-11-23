# C-app-06: in-file cleanup, apps/app/src/browser (development-workflows … video-edit)

Owned files: `docs/simplification-audit/chunks/app-06.files.txt` (71 files, all still present). Stage A
(A2/A3) had already removed the legacy readers, the Wallet simulation, the identical `'Posted'` ternary and most
unused exports in these files; this unit applied what remained in-file. No file was moved, merged, split or
deleted (stage F).

## Done

- `device-adapter.ts`: dead `devSurfacesEnabled ? … : 'Device settings unavailable…'` branch replaced by the live
  literal (adapter installed only under `devSurfacesEnabled`, main.tsx:150); build-flags import dropped; inline
  plugin type replaced by `AlphaDeviceBrowserMethods` (B2 map). A4/B4, C2.
- `device-controls.tsx`: inline `{compose}` type → `AlphaNotificationsBrowserMethods`; inline ElizaSystem
  `requestRole` registration → `System` from `native.ts` (B2 map; role list typed `as const` for `AndroidRoleName`). C2.
- `device.ts`: `validateRoles` uses `isRecord` (B1 map); `buildInfo` alias deleted, `getBuildInfo` returns the
  value directly (no caller of `buildInfo` in apps/.eliza/test/specs). B1/D4/A7.
- `digest-authorization-document.ts`: `isOpaque36`, `isSha256Hex` (B1 map); the now-redundant `typeof … string`
  checks folded into the predicates. C3.
- `digest-delegation.ts`: `isOpaque36` (B1 map); `DevelopmentGrant` un-exported (0 importers). C3/A7.
- `digest-live-sources.ts`: `isSha256Hex` (B1 map). C3.
- `digest-storage.ts`: `agentOwnerKey(session)` (B1 session-key map); two inline record checks → `isRecord`. C3.
- `focus-state.ts`: `activeFocusBlocks` un-exported (0 importers); inline record check → `isRecord`. A7/C3.
- `hosted-results.ts`: local `hash`/`canonical` deleted → `sha256Hex`, `canonicalJson`; scope tuple →
  `agentOwnerKey(route)` (B1 map rows, all "identical"). C3.
- `revision.ts`: body → `randomHex(32)` (B1 map). C3.
- `local-transcription.ts`: the selection/session staleness check written three times → one `assertSelected`. C3.
- `location-simulation.ts`: read-back after synchronous `localStorage.setItem` deleted (NEW-b/B3);
  `LocationSimulation` type un-exported (0 importers). A7.
- `simulator-writer.ts`: read-backs after `setItem`/`removeItem` deleted (NEW-b/B3).
- `simulator-recovery.ts`: local `object` guard → `isRecord` (B1 map). C3.
- `mail-attachments.ts`, `sensor-policy.ts`: `new DOMException(…,'AbortError')` → `abortError(…)` (B1 map). C3.
- `file-picker.ts`, `simulated-workflows.ts`: inline AbortError test → `isAbortError` (B1 map). C3.
- `simulated-workflows.ts`: `registerPlugin<any>('AlphaDevice')` → `AlphaDevicePlugin & AlphaDeviceBrowserMethods`
  (B2 map). C2.
- `simulated-inbox.ts`, `simulated-messages.ts`: `registerPlugin<any>('AlphaMailAttachments')` →
  `Pick<AlphaMailAttachmentsPlugin,'readSelected'|'openReviewed'|'cancel'>` (the map's `'openReviewed'` pick is
  too narrow: both files also call `readSelected` and `cancel`). C2.
- `storage-usage.ts`: inline `{usage}` type → `AlphaFilesBrowserMethods` (B2 map). C2.
- `development-workflows.ts`: three inline UUID-v4 regexes → `isUuidV4` (B1 map). C3.
- `domain-document.ts`, `note-recording-journal.ts`: local `Snapshot`/`Documents` → upstream
  `BrowserDocumentSnapshot` / `Pick<BrowserDocumentStore,…>` (type-only imports; types.md). C1.
- `note-recording-journal.ts`: local `Binding` renamed `RecordingJournalOwner`; `digest-delegation-ui.tsx`: local
  `Binding` renamed `DigestDelegationRun` (types.md §1.3). C1.
- `notification-store.ts`: owns and exports `Notice`, `DeviceEvent`, `NotificationSelection` (types.md);
  two inline record checks → `isRecord`. `notifications.ts` imports them and drops its three copies; `apps` alias
  for `browserApps` removed; `registerPlugin` now from `platform-plugins` with
  `Pick<AlphaDevicePlugin,'openSettings'>` (B2 map, types.md §2 rule 1). C1/C2/D4.
- `journal-retention.ts`: exports `JournalIdentity` and `JournalBinding` (types.md owner row);
  `reminder-deletions.ts` uses `JournalBinding` and one `pendingTarget()` replaces the twice-written
  "row still suspended and unchanged" check. C1/C3.
- `preference-documents.ts`: local factory `document` (shadowed the global) renamed `observedDocument`. D11.
- `reading-review.ts`: `readPublicPageSource as browserReadingSource` alias removed; double assignment of
  `field.disabled` in `stopSpeech` reduced to the effective one. D11/B4.
- `review.ts`: inline `whiteSpace='pre-wrap'` deleted (review.css already sets it on the same `<p>`). B4.
- `files.ts`: "PLAN section 4" reference removed (A8); reviewed-identity check written twice → private
  `assertReviewed`; `storageSelect` uses `mediaId()`. C3.
- `register.ts`: the false "must be the first import in main" comment restated accurately (A8).

## Deleted tests and formal artefacts

None.

## Pins left broken

- `specs/quint/refinement/application/browser-hosted-result-notice.mjs` (via
  `test/quint-browser-hosted-result-notice.test.mjs`): transplants `hosted-results.ts` and `revision.ts` with
  imports stripped and reads `actual.canonical`. It now needs `sha256Hex`, `canonicalJson`, `agentOwnerKey` and
  `randomHex` supplied (or the harness ported to an esbuild import, T10), and `canonical` → `canonicalJson`.
  See Verification for the observed result.

## Skipped

- Owner/structural (stage F or Open): dev-boundary moves and inner dev gates (Q-DEV-1, U-R1); dialog kit,
  `observedDocument()` sharing, `foreground.ts` (`noticeActionBlocked`/`locked`/`blocked`/`foreground` twins),
  recovery table, generic deletion journal, `register-hosted-results` fold (late `web` attach), CSS merges,
  one-line re-export deletions (`file-archive`, `scan-correction`, `scan-edges`: need the `@eliza/*` alias),
  `video-codecs` merge, `json-domain-document`/reminder-document merges.
- A1 items still behind owner questions: envelope format (`legacy:null` stays byte-identical, Q-LEG-9),
  journal "no time" branch (Lemma ensures), video MIME sniffing (already removed by A2), `migrateAudio` (A2).
- Copy/behaviour: sensor-policy "device controls" vs "quick settings" (Q-UI-12); generic `domain-document`
  conflict text; `location.ts` dev copy fork; simulated-inbox email regex → `address()` (adds a 254-char limit:
  a visible acceptance change); empty `catch{}` in simulated-inbox (would surface errors that are now silent).
- Pins not worth breaking for a one-token gain: `device-preferences.ts` `isRecord` (sliced by
  `test/agent-action-preferences.test.mjs`, which has 11 unrelated cases); `notifications.ts`
  `notificationAction` alias and `locked` (transplant names in `test/browser-notification-clear.test.mjs`,
  Quint `boundaries.mjs`, and `locked` is a manifest symbol); `video-capture.ts`/`speech-errors.ts`
  `abortError` (transplanted by `test/video-capture-limit.test.mjs`, `test/browser-voice-cancellation.test.mjs`);
  `local-transcription.ts` `abortError` (the behavioural test imports it under plain Node, which cannot resolve
  the extensionless `lib/abort` → `runtime/abort-signal` chain).
- B2 rows not applied: `simulated-workflows.ts` `AlphaCalendar` (`AlphaCalendarPlugin.list` returns a status
  union that `workflow-calendar.ts`'s local `Calendar` type, owned elsewhere, does not accept) and `AlphaFiles`
  (`workflowFiles`/`saveWorkflowAttachment` are on no interface); `hosted-results.ts` `implements` (map: after
  U-L2 order).
- Not available in `lib/` this stage: `bytesToBase64`/`base64ToBytes`/`blobToDataUrl`/`withTimeout`
  (incoming-simulation, note-recording-journal, mail-attachments, video-edit), `readConnectionSelection`,
  `isEmailAddress`.
- `device.ts` repeated `alpha:device-settings`/`focus` dispatches after edits: refresh only dispatches on a value
  change, so removal changes event timing (report: medium risk, no test run here).
- `files.ts` `Array.isArray(result.entries)` guards: the volume result is loosely typed upstream output.
- `note-audio-store.ts` `audioMetadata` alias: removing it needs more than a one-line change in `voice.ts`
  (owned elsewhere).

## Verification

- `npx tsc --noEmit` (before): 0 errors. After: 2 errors, both in `apps/app/src/prototype/browser-adapter.ts`
  (another implementer's file, unrelated to these changes); none in owned files or their importers.
- `node --test` on 14 host tests touching these files (browser-local-transcription, reminder-deletions,
  browser-notification-clear, workflow-reminder-midnight, agent-action-preferences, browser-note-pending-audio,
  scan-document-drafts, browser-camera-storage, video-capture-limit, browser-voice-cancellation,
  google-agent-access, locale-time-usage, voice-progress-state-forwarding, voice-request-provenance):
  69 pass, 0 fail.
- `node --test` on 12 Quint replay tests touching these files (quint-bookmarks-hydration, browser-album-storage,
  browser-deletion-poll, browser-hosted-result-notice, browser-note-recording-journal,
  browser-reminder-orphan-refinement, browser-reviews, google-access-publication, hosted-digest-refresh,
  password-provider-dialog, selected-document-viewer, web-reading-review): 13 tests, 11 pass, 2 fail.
  `quint-browser-hosted-result-notice` fails with `ReferenceError: randomHex is not defined` (the pin above).
  `quint-browser-reminder-orphan-refinement` fails with `Cannot read properties of null (reading 'reminders')`
  in its `legacy` scenario, which reads the localStorage legacy import removed by A2 (already listed in
  A2.md:134); not caused by this unit.
- Not run: vite build, `npm run audit:bundle`, Playwright, Gradle (no Android files owned).
