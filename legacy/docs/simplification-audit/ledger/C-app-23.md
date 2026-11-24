# C-app-23: runtime/ conversation-selection … hosted-background (in-file cleanup)

Files that no longer existed when this unit ran (deleted earlier): `runtime/development-cloud-agents.ts`,
`runtime/google-calendar-selection.ts`. Shared modules (`lib/*`, `native/*`) were not edited.

Note on `lib/` imports: `lib/parse.ts` imports `./ids` and `lib/ids.ts` imports the vendor UUID module without a file
extension, so neither loads under plain Node type stripping. Files that a plain-Node behavioural test imports directly
(`crash-log.ts`, `diagnostics-export.ts`, `google-workspace-return.ts`) keep their local guards; see Skipped. New `lib/`
and `native/` imports in this unit use the `.ts` extension so plain-Node tests can load them.

## Done

- `conversation-selection.ts`: un-exported `conversationSelectionKey` (value unchanged; A7); `isRecord` from `lib/parse`
  and a named `isChoice` predicate instead of the 290-character shape check (C3, D9); deleted the re-validation of the
  value just built (`validate(next)`) and the Android write read-back check (B3).
- `crash-log.ts`: hoisted the schema-limit label map out of `describeCrashEntry` and split the inference branch into
  statements (D8; copy unchanged).
- `deletions.ts`: bridge typed with `AlphaDeletionsPlugin` from `native/alpha-deletions.ts` (receipt kept required, as
  before); removed the local `DeletionEntry` type and the inline `import(...)` type (C2, A7).
- `deletion-undo.tsx`: session identity key via `agentSessionKey` (`lib/session-key`, identical text; C3).
- `deletion-undo.css`: the top offset written twice is one custom property `--alpha-deletion-undo-top` (C3; same
  computed values).
- `development-cartesia-conversation.ts` (dev): `validateUuid` from `lib/ids` instead of the vendor path (B1 map, D13);
  inlined the constant `requireTurnTerminal` (A4); one local `remember()` for the six bounded-set inserts and one
  `asError()` for the seven error fallbacks (C3); one `getSnapshot()` read.
- `device-actions.ts`: removed re-exports/aliases with no importer anywhere (`ContextNotice`, `DeviceJournalIdentity`,
  `ReviewableDeviceOperation`, `WorkflowPresentationOperation`, `PendingReviewItem`, `namedTargetValidators`,
  `selectedNotesRead`, `validateForegroundReviewOperation`, `validateForegroundReviewResult`,
  `ForegroundReviewOperation`, `ForegroundReviewResult`, `NamedTargetExactOperation`) and the unused
  `validateReviewableDeviceOperation` (A7).
- `device-record-presentation.ts`: the nine field-independent cases moved from the `switch` to a `FIXED_COPY` table with a
  `hasFixedCopy` guard (D9; strings byte-identical); default time zone via `deviceTimeZone()` (`lib/civil-date`).
- `device-view-profile.ts`: `isUuidV4` (`lib/ids`) and `expectRecord` (`lib/parse`) replace the local regex and guard
  (B1 map; same message).
- `diagnostics-export.ts`: un-exported `RUNTIME_ASSETS`, `VOICE_TIMING_FORMAT`, `NATIVE_VOICE_TIMING_FORMAT`,
  `NATIVE_CLOUD_STREAM_TIMING_FORMAT`, `DiagnosticsInput`, `DiagnosticsReport` (A7); one local `record()` for the
  plain-object ternaries and loop guards (C3); dropped the `'cloud'` connection kind, which the connection snapshot type
  can no longer produce (A3/D5); removed issue/decision citations and the false "'offline' only parses older exports"
  comment ('offline' is a live snapshot kind and stays) (A8).
- `dock-clearance.ts`: replaced the 23-line history header with a description of what is published (A8); un-exported
  `DOCK_CLEARANCE_PROPERTY`, `DOCK_REST_PROPERTY` (A7).
- `error-boundary.tsx`: un-exported `recoveryDiagnostics`, `homeEscapeAvailable`, `openHomeChooser` (A7); `__APP_VERSION__`
  used directly (Vite and both harnesses define it) and `typeof window` guard removed (B2); plugin shapes typed with
  `Pick<DeviceAppsPlugin,…>` / `Pick<ElizaSystemPlugin,…>` (type-only imports; C2); the duplicated JSX button style is one
  `recoveryButton` constant.
- `gmail-account-selection.ts`: one `validId` predicate for the read and write checks (C3).
- `gmail-background.ts`: removed the unused type re-exports and `gmailBackgroundMessage` (A7).
- `gmail-grants.ts`: removed unused re-exports `gmailConsentCapabilities`, `GmailGrantRequest`, `GmailGrantStep`,
  `GmailGrantTier`, `GmailMailboxAction` (A7); dropped the "P-37, issue #421" citation (A8).
- `gmail-mailbox.ts`: removed the unused `GmailFailure` re-export (A7). Lemma-annotated code untouched.
- `google-accounts.ts`: un-exported the eight types with no outside reference (A7); `linkOperationKey` uses `sha256Hex`
  (`lib/hash`, prefix kept; B1 map).
- `google-agent-access.ts`: un-exported `GOOGLE_AGENT_ACCESS_PATH` (A7); removed the Web Locks presence probe (B2).
- `google-authorization.ts`: callback origins named before the check (D8).
- `google-connection-ui.tsx`: removed the `serviceName` computation that only fed an ignored argument (NEW-2); the
  `cloud-protocol` import is now type-only.
- `google-workspace-return.ts`: removed the re-test of `result.result` after it was already narrowed (B4).
- `home-calendar-selection.ts`: the inline IIFE is a named `startsAtLocalMidnight` with a `periodStart` constant (D9).
- `hosted-background.ts`: local `NativeInbox` interface replaced by `Pick<AlphaHostedResultsPlugin,…>` (B2 map, C2).

## Deleted tests and formal artefacts

- `test/shared-deletion-window.test.mjs`: deleted the source-text case "Alpha binds the shared coordinator with its
  installed slots, bridge and work names…" (regexes over `runtime/deletions.ts` and `runtime/deletion-undo.tsx`; T1),
  with its now-unused helper and imports. The behavioural JVM case in the same file stays.

## Pins left broken

None found. No Quint manifest `symbols` entry names a file of this unit (checked all four manifests). Lemma:
`gmail-mailbox.ts` changed only in its re-export list; `lsc extract` still reads both verified functions. `lsc gen-check`
was not run (it covers every Lemma file and other units are mid-edit).

## Skipped

- Merges, moves and file deletions (stage F or cross-file with many pins): `deletion-owner.ts` → `browser/`,
  `google-authorization.ts` → `browser/`, `digest-inbox.ts` → `hosted-background.ts`, `development-cartesia-flag.ts` and
  `development-cloud-voice.ts` → `build-flags.ts`, `development-cartesia-conversation.ts` → `src/dev/`,
  `google-connection-return.ts` + `google-workspace-return.ts` → `google-return.ts`, the `google-accounts.ts` split,
  the `deletions.ts` notice-policy move (`test/deletion-notice-policy.test.mjs` imports it from `deletions.ts` with tsx,
  and `deletion-undo.tsx` pulls React/CSS), shim deletion of `gmail-grants.ts` / `gmail-read-ahead.ts` and the re-export
  part of `gmail-mailbox.ts` (importers in other units, scripts, Quint manifests; chunk action 5 waits for the D13 alias).
- Open owner questions: Q-UI-32 (`negotiateEnabledViews` undefined version, and void result needs `connection-ui.tsx`
  callers), Q-CONN-3 (two conversation-selection shapes), Q-HOST-7/Q-CONN-4 (dev paths inside production modules,
  including the dev Google access POST `.catch(()=>{})`), Q-VOICE-9.
- `lib/parse` / `lib/ids` not adopted where a plain-Node behavioural test imports the file (the shared modules use
  extensionless imports): `crash-log.ts` (`isRecord`; `test/diagnostics-export.test.mjs`), `diagnostics-export.ts`
  (`isRecord`/`asRecord`, `UUID_LOWER_PATTERN`, `OPAQUE_ID_36`, `SHA256_HEX`), `google-workspace-return.ts`
  (`isOperationId`; `test/google-connection-return.test.mjs`). A local `record()` was used in diagnostics-export instead.
- `development-cartesia-conversation.ts:68` UUID regex → `isUuidRfc`: two transplant tests
  (`test/development-cartesia-conversation.test.mjs`, `test/development-voice-navigation.test.mjs`) inject
  `validateUuid` only; switching would force deleting the dev voice coverage for one line.
- `crash-log.ts`: dropping the storage `try/catch` wrappers (corrupt storage would start throwing from `readCrashLog`) and
  the `?.` on the native `crashLog()` result (plugin trust boundary).
- `diagnostics-export.ts`: the `try/catch` in `sanitizeNativeInferenceTiming` is pinned by a behavioural case (a throwing
  getter must return `undefined`); `VOICE_ROUTES`/`CONNECTIONS` sharing with `voice-timing.ts` is cross-file;
  `'remote','local'` stay while the connection snapshot type has them.
- `device-actions.ts`: `typeof document/window` guards (Node behavioural tests import the module), constructor options
  object and `filesIdentity` injection (cross-file), `JournalEntry`/`ActionJournal` aliases (importers in other units),
  `deviceJournalContext`/`FOREGROUND_OPERATION_TYPES`/`proposalContextNotice` (used by retained behavioural tests).
- `dock-clearance.ts`: the `installed` re-entrancy guard (Quint `dock-clearance-ownership` and a Playwright spec
  uninstall).
- `error-boundary.tsx`: `isPluginAvailable('DeviceApps')` probe (behavioural case `{available:false}` in
  `test/error-boundary-home-escape.test.mjs`); the outer `try`s; CSS-class move of the recovery styles (global
  stylesheet not owned); importing `System`/`deviceApps` singletons (would pull `native.ts` and the launcher bridge into
  the recovery bundle and the Quint `recovery-ui` build).
- `google-accounts.ts`: required `privacyCurrent`/`pause`/`retireCallbacks` and constant observation budgets (Quint
  `google-calendar-disconnect.mjs` and lifecycle harnesses pass/omit them); required `initiateGoogleWithReturn`
  (`scripts/test-google-accounts.ts` client lacks it, and the scripts typecheck would fail); `_serviceName` parameter
  (`prototype/settings-adapter.ts` passes it); `typeof window` guard (Node bundle tests call the default `changed`);
  UUID regex (transplant in `test/google-connection-return.test.mjs`); closing-block indentation (formatter, D9).
- `google-connection-ui.tsx`: `typeof BroadcastChannel` probe, binding unification, modal hook, inline styles, notice tone
  refactor and component split (sliced by `test/google-connection-return.test.mjs` markers and bundled by the panel
  fixture and Quint harnesses; medium-risk accessibility behaviour); inline 350 ms wait (resolves on abort, `delay`
  rejects).
- `google-workspace-return.ts`: `nativeGoogleWorkspaceReturnAvailable` probe (imported by `native-connection.ts`);
  `GOOGLE_WORKSPACE_CALLBACK` export (test and Quint import it).
- `hosted-background.ts`: re-throwing a failed `cancel()` in the configure catch, and renaming the reassigned `signal`
  (Quint `hosted-background-admission` models cancel faults).
- `conversation-selection.ts`: `isAndroid` from `../native` (adds a plugin-registering import to a module used before
  connection setup; no test covers it).
- `home-calendar-selection.ts`: `DAY_MS` (two tests stub `require` and reject unexpected imports).
- `device-record-presentation.ts`, `dock-clearance.ts`: `@eliza/*` alias (D13, not available yet).

## Verification

- `npx tsc --noEmit`: no errors in this unit's files. Remaining errors at the time are in other units' files
  (`prototype/workflow-authoring.ts`, `runtime/image-preview.ts`, `runtime/view-navigation.ts`).
- `node scripts/typecheck-scripts.ts`: one error, in `scripts/test-agent-context-browser.ts` (not caused by this unit).
- `node --test` (each file listed passed unless noted): `device-record-presentation`, `reminder-card-presentation`,
  `diagnostics-export`, `deletion-notice-policy`, `live-voice` (1 failure in `native-live-voice` source text, another
  unit's file), `voice-turn-routes`, `error-boundary-home-escape`, `quint-dock-clearance-ownership`,
  `quint-hosted-background-admission`, `quint-recovery-ui-refinement`, `home-calendar-selection`, `home-cards`,
  `shared-deletion-window` (JVM case passed before the source-text case was removed); batch of
  `development-cartesia-conversation`, `development-voice-navigation`, `voice-progress-state-forwarding`,
  `voice-request-provenance`, `private-preview-cartesia-route`, `committed-device-changes`, `files-reviewed-proposal`,
  `photo-library`, `reminder-capability-negotiation`, `browser-receipt-order`, `calendar-day-context`, `files-agent-patch`,
  `gmail-background-binding`, `gmail-grants`, `inbox-operation-guards`, `google-calendar-connect`,
  `google-connection-return`, `google-connections-resource-budget`, `google-workspace-return`, `google-accounts`,
  `google-calendar-link-status`, `google-agent-access`, `google-authorization`, `deletion-window`: 340 pass, 5 fail, all
  five in `browser-receipt-order` with `ReferenceError: agentOwnerKey is not defined` from another unit's sliced adapter.
- Quint harness tests: `quint-device-action-review`, `quint-google-access-publication`,
  `quint-google-calendar-access-choice`, `quint-google-calendar-disconnect`, `quint-google-calendar-link-flow`,
  `quint-google-calendar-link-publication`, `quint-google-consent-admission`, `quint-hosted-digest-refresh`,
  `quint-renderer-digest-queue`, `quint-voice-transcript-follow-refinement`, `quint-inbox-coordinator`: pass.
  `quint-services-refinement` fails at manifest load on `prototype/files-index.ts revokeTree` (another unit).
- `node --import=tsx scripts/<x>` (the `adapter-contracts` children touching this unit): `test-device-actions.ts`,
  `test-gmail-mailbox.ts`, `test-inbox-cloud-flow.ts`, `test-inbox-grant-withdrawal.ts`, `test-inbox-sent-cleanup.ts`,
  `test-gmail-read-ahead.ts`: all exit 0. `dev-surface-gates`, `settings-refresh-text-scale`, `theme-palette`: pass.
  `adapter-contracts` (whole) and `quint-settings-session` were cut off by a 110 s wrapper timeout, not judged.
- Not run: Playwright specs, `npm run build`, `npm run audit:bundle`, `npm run quint:check`, `npm run lemma:check`, any
  Android build.
