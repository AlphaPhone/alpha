# Chunk app-23 — runtime/ conversation-selection … hosted-background (31 files, 2,756 lines)

Per-file reports: `docs/simplification-audit/files/apps/app/src/runtime/<file>.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| runtime/conversation-selection.ts | SIMPLIFY | 40 | 32 |
| runtime/crash-log.ts | SIMPLIFY | 113 | 95 |
| runtime/deletion-owner.ts | MOVE to browser/deletion-owner.ts | 10 | 10 |
| runtime/deletion-undo.css | SIMPLIFY (format, one custom property) | 1 | 20 (formatted) |
| runtime/deletion-undo.tsx | SIMPLIFY (absorb notice policy) | 19 | 55 |
| runtime/deletions.ts | SIMPLIFY | 64 | 25 |
| runtime/development-cartesia-conversation.ts | MOVE to src/dev/ (dynamic import) + SIMPLIFY | 183 | 150 |
| runtime/development-cartesia-flag.ts | MERGE into build-flags.ts | 3 | 0 |
| runtime/development-cloud-agents.ts | DELETE (owner) | 149 | 0 |
| runtime/development-cloud-voice.ts | MERGE into build-flags.ts | 8 | 0 |
| runtime/device-actions.ts | SIMPLIFY | 93 | 70 |
| runtime/device-record-presentation.ts | KEEP (lookup table) | 177 | 145 |
| runtime/device-view-profile.ts | SIMPLIFY | 39 | 30 |
| runtime/diagnostics-export.ts | SIMPLIFY | 309 | 250 |
| runtime/digest-inbox.ts | MERGE into hosted-background.ts | 10 | 0 |
| runtime/dock-clearance.ts | SIMPLIFY | 99 | 75 |
| runtime/error-boundary.tsx | SIMPLIFY | 146 | 105 |
| runtime/gmail-account-selection.ts | SIMPLIFY | 14 | 10 |
| runtime/gmail-background.ts | SIMPLIFY | 18 | 8 |
| runtime/gmail-grants.ts | DELETE (shim) | 24 | 0 |
| runtime/gmail-mailbox.ts | SIMPLIFY (keep Lemma helpers) | 59 | 45 |
| runtime/gmail-read-ahead.ts | DELETE (shim) | 2 | 0 |
| runtime/google-accounts.ts | SPLIT + SIMPLIFY | 429 | 325 (two files) |
| runtime/google-agent-access.ts | SIMPLIFY | 60 | 50 |
| runtime/google-authorization.ts | MOVE to browser/ | 16 | 18 |
| runtime/google-calendar-selection.ts | DELETE (A2) | 75 | 0 |
| runtime/google-connection-return.ts | MERGE into google-return.ts | 50 | 45 (merged) |
| runtime/google-connection-ui.tsx | SPLIT + SIMPLIFY | 332 | 250 |
| runtime/google-workspace-return.ts | MERGE into google-return.ts | 51 | 40 (merged) |
| runtime/home-calendar-selection.ts | KEEP | 121 | 115 |
| runtime/hosted-background.ts | SIMPLIFY (absorb digest-inbox) | 42 | 50 |
| **Total** | | **2,756** | **~2,068 (≈690 removable)** |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `member` | helper | crash-log.ts:37 | `one` diagnostics-export.ts:129 | `runtime/parse.ts` `oneOf` |
| `text` | helper | diagnostics-export.ts:128 | string parsers cloud-protocol.ts:128-142 | `runtime/parse.ts` |
| plain-object guard (inline ~25×) | helper | diagnostics-export.ts (19×), crash-log.ts:39,59, conversation-selection.ts:9,13, google-calendar-selection.ts:24,49 | `object` device-view-profile.ts:8 and ~14 named copies | `runtime/parse.ts` `isRecord`/`expectRecord` |
| `object` | helper | device-view-profile.ts:8 | as above | `runtime/parse.ts` |
| UUID regex | const | device-view-profile.ts:4, google-accounts.ts:52, google-calendar-selection.ts:9, diagnostics-export.ts:73, development-cartesia-conversation.ts:68 | many | shared UUID helper / upstream `validateUuid` |
| `Request` (owner request fn) | type | device-view-profile.ts:7; inline device-actions.ts:89 | view-navigation.ts:12, maps/resident-relay.ts:7 | `alpha-client.ts` `OwnerRequest` |
| `linkOperationKey` SHA-256 hex | helper | google-accounts.ts:336 | 28 copies app-wide | shared `sha256Hex` |
| `observe` (timeout race) | helper | google-accounts.ts:74 | abort-signal.ts, alpha-client.ts:321 | shared race helper |
| inline abortable 350 ms sleep | helper | google-connection-ui.tsx:113 | upstream `abortablePause` | upstream |
| `VOICE_ROUTES`, `VOICE_MARKS` | const | diagnostics-export.ts:30-31 | voice-timing.ts:43, scripts/aggregate-voice-latency.ts:39 | export from `voice-timing.ts` |
| `CONNECTIONS` | const | diagnostics-export.ts:27 | `ConnectionSnapshot['kind']` in connection-ui.tsx | derive from the union |
| `Owner` / `GoogleCalendarAccountKey` | type | gmail-account-selection.ts:3, google-calendar-selection.ts:5 | `googleCalendarAccountKey()` google-connection-ui.tsx:37 | one `CloudOwner` in cloud-protocol.ts |
| owner/session tuple keys `JSON.stringify([...])` | helper | gmail-account-selection.ts:6, deletion-undo.tsx:10, google-connection-ui.tsx:219, deletion-owner.ts:9 (parse) | connection-ui.tsx:1647, agent-calendar.ts:14 | `sessionKey`/`cloudOwnerKey` helper |
| `Storage` / `GoogleCalendarSelectionStorage` | type | gmail-account-selection.ts:4, google-calendar-selection.ts:7 | DOM `Storage` | delete |
| `GoogleConnectionReturnBinding` + comparator | type/helper | google-connection-return.ts:2-7 | `GoogleWorkspaceBinding`/`sameGoogleWorkspaceBinding` google-workspace-return.ts:5,20; `sameLease` google-accounts.ts:55 | `google-return.ts` `GoogleSessionBinding` |
| `Listener {remove()}` | type | google-connection-return.ts:8 | google-workspace-return.ts:12,40 | `google-return.ts` |
| `lucide`, `icon` | helper | google-connection-ui.tsx:19,313 | `iconStyle` connection-ui.tsx | `<Icon>` component |
| `srOnly`, `dotStyle`, `spinStyle` | const | google-connection-ui.tsx:20-22 | hosted-digest-ui.tsx:5-9, calendar-sync-settings.ts:10-13 | CSS classes |
| `recoveryStyle` | const | error-boundary.tsx:20 | same styles as JSX objects error-boundary.tsx:137-142 | CSS classes |
| modal Tab trap / Escape / alpha-back | helper (inline) | google-connection-ui.tsx:167-177 | connection-ui.tsx, hosted-digest-ui.tsx, view-focus.ts | `useModalSheet` hook |
| `NativeInbox` (AlphaHostedResults) | interface | hosted-background.ts:5 | hosted-result-notices.ts:19, hosted-digest-ui.tsx:71, workflow-adapter.ts:266 | `hosted-results-plugin.ts` |
| `ResultInbox` | interface | digest-inbox.ts:2 | implemented in hosted-background.ts | hosted-background.ts |
| `GoogleAgentAccess` | type | google-agent-access.ts:7 | scripts/gmail-agent-dev-broker.ts, scripts/gmail-agent-read-host.ts | keep; scripts import |
| `GOOGLE_AGENT_ACCESS_PATH` | const | google-agent-access.ts:9 | scripts/local-agent-dev-bridge.ts:299 literal | dev-bridge route constants |
| `GMAIL_ACCOUNTS_CHANGED` | const | gmail-mailbox.ts:15 | `GOOGLE_ACCOUNTS_CHANGED` google-accounts.ts:202 (always dispatched/listened together) | one event |
| `CanonicalCalendarSyncSettings` | type | (imported) google-accounts.ts:5, google-connection-ui.tsx:17 | defined in dead calendar-sync-settings.ts:8 | `google-calendar-link.ts` or agent-calendar.ts |
| bounded-set insert (6×), `asError` (7×) | helper | development-cartesia-conversation.ts | prototype adapters | local helpers |
| dev flags | const | development-cartesia-flag.ts:3, development-cloud-voice.ts:5,8 | browser-cloud-resident.ts:5, local-agent.ts:69-72 | `build-flags.ts` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `runtime/google-calendar-selection.ts` + `google-connection-ui.tsx:224` clear call | only writer `saveGoogleCalendarSelection` is called by `calendar-sync-settings.ts`; readers/listener only in `calendar-sync-host.ts`; neither has a product importer (git grep: only each other + type imports) | High |
| `runtime/gmail-read-ahead.ts` | one-line re-export, 1 product importer | High |
| `runtime/gmail-grants.ts` | pure re-export, 4 importers | High |
| `runtime/development-cloud-agents.ts` | header "DEVELOPMENT INFRASTRUCTURE ONLY"; PRD excludes hosted pairing; only connection-ui testMocks branch | High (owner OK for test-mocks) |
| `development-cartesia-flag.ts`, `development-cloud-voice.ts` | flags belong in build-flags.ts | High |
| `digest-inbox.ts` (merge) | 10 lines, 1 caller, interface implemented in hosted-background | High |
| crash-log `INFERENCE_*` exports, `CRASH_LOG_MAX_ENTRIES`/`RETENTION_MS` re-export, `CrashSource` | 0 references outside file | High |
| device-actions `ContextNotice`, `DeviceJournalIdentity`, `ReviewableDeviceOperation`, `WorkflowPresentationOperation`, `ForegroundReviewOperation`, `NamedTargetExactOperation`, `selectedNotesRead`, `validateForegroundReviewOperation`, `PendingReviewItem`, `validateReviewableDeviceOperation`; un-export `alphaDeviceActionProfile` | 0 references anywhere outside file | High |
| device-actions `proposalContextNotice`, `FOREGROUND_OPERATION_TYPES`, `deviceJournalContext` | test/script-only | Medium (with T3 tests) |
| gmail-background type re-exports (line 4), `gmailBackgroundMessage` | 0 / test-only | High |
| gmail-mailbox `GmailFailure`, `setGmailReadState` | 0 / script-only | High |
| google-accounts `_serviceName` param and caller's `serviceName`/`cloudServiceName` | parameter ignored | High |
| google-accounts optional-port fallbacks, observation-budget options, `initiateGoogleWithReturn?` fallback | only caller always supplies them; CloudProtocol implements the method | High |
| google-workspace-return `nativeGoogleWorkspaceReturnAvailable` header probe | renderer and AlphaConnectionPlugin ship in one APK | High |
| device-view-profile `legacy` const and string result | every path returns '' | High |
| diagnostics-export `'offline'` (now), `'remote','local','cloud'`, `'paired-agent','development-agent'` (with hosted-path removal); try/catch in `sanitizeNativeInferenceTiming` | only live state is passed; nothing parses old exports | High / Medium |
| error-boundary `typeof __APP_VERSION__`, `typeof window`, `isPluginAvailable('DeviceApps')` probe | Vite defines it; browser-only; plugin ships in APK | High |
| conversation-selection `validate(next)` re-check, write read-back | self re-validation | High |
| google-connection-ui `googleCalendarAccountKey` export | only dead caller | High |
| `GMAIL_ACCOUNTS_CHANGED` (merge into Google event) | dispatched together settings-adapter.ts:493-494, listened together inbox-cloud-adapter.ts:1041 | Medium (check `detail` use) |
| dock-clearance header history comment, property exports | A8; test-only exports | High |

## Cross-file actions
1. **Delete the client-side Calendar sync stack**: `runtime/calendar-sync-host.ts`, `runtime/calendar-sync-settings.ts`, `runtime/google-calendar-selection.ts`; move `CanonicalCalendarSyncSettings` into `google-accounts.ts` (or new `google-calendar-link.ts`); update `google-connection-ui.tsx` (imports, line 224, un-export `googleCalendarAccountKey`), `google-accounts.ts:5`; pins: `scripts/test-google-calendar-selection.ts`, `specs/quint/application/manifest.json` (Calendar sources), `specs/quint/native/manifest.json`, `specs/quint/refinement/composition/ports.mjs`, `specs/quint/refinement/application/google-calendar-link-publication.mjs`, `test/browser/calendar-sync-fixture.ts`, `test/browser/one-calendar.spec.ts`, `test/calendar-sync-settings-navigation.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/google-connections-resource-budget.test.mjs`, `test/support/feature-parity.mjs`.
2. **Hosted/paired/personal path removal**: `development-cloud-agents.ts` + `connection-ui.tsx` testMocks branch + `cloud-personal-*` + `diagnostics-export.ts` `CONNECTIONS`/`VOICE_ROUTES` + `voice-timing.ts:43` + `voice-states.ts:55` + `note-recorder-driver.ts:92` + `scripts/aggregate-voice-latency.ts:39` + `device-view-profile.ts:24` undefined-version branch; tests `scripts/test-cloud-personal-flow.ts`, `scripts/test-cloud-protocol.ts`, `test/automations-transport.test.mjs`, `test/browser/connection-preference-storage.spec.ts`; `scripts/audit-production-bundle.ts` marker list.
3. **Dev flags into build-flags.ts**: delete `development-cartesia-flag.ts`, `development-cloud-voice.ts`; edit `prototype/local-speech-playback.ts`, `prototype/voice-adapter.ts`, `prototype/settings-adapter.ts`, `runtime/cloud-voice.ts`, `runtime/local-agent.ts`, `runtime/note-recorder-driver.ts`, `runtime/development-cartesia-conversation.ts`; tests listed in those reports.
4. **Move dev realtime voice to src/dev/**: `development-cartesia-conversation.ts` → dynamic import from `prototype/voice-adapter.ts:633`; move `RealtimeVoiceNavigation` type for `prototype/agent-adapter.ts`; tests `test/development-cartesia-conversation.test.mjs`, `test/development-voice-navigation.test.mjs` (T2), Quint `voice-transcript-follow.mjs`, application manifest.
5. **Shim removal**: `gmail-grants.ts`, `gmail-read-ahead.ts`, re-export part of `gmail-mailbox.ts` → importers `prototype/inbox-cloud-adapter.ts`, `prototype/settings-adapter.ts`, `runtime/cloud-protocol.ts`, `runtime/google-connection-ui.tsx`, `runtime/google-accounts.ts`, `scripts/inbox-adapter-fixture.ts`, `scripts/test-gmail-read-ahead.ts`, `scripts/test-inbox-*.ts`, `scripts/test-gmail-mailbox.ts`; best done with the D13 `@eliza/*` alias.
6. **Merge Google return modules** into `google-return.ts`: `google-connection-return.ts`, `google-workspace-return.ts`; importers `google-connection-ui.tsx`, `native-connection.ts` (also drop PluginHeaders probe at :217), `cloud-protocol.ts`; Quint `google-accounts.mjs`, `google-accounts-lifecycle.mjs`; tests `google-connection-return`, `google-workspace-return`, `google-calendar-connect`, `google-connections-resource-budget`, fixture `google-account-panel.mjs`; manifests.
7. **Split google-accounts.ts** (Calendar link → `google-calendar-link.ts`) and make disconnect ports required: `google-connection-ui.tsx`, Quint `google-calendar-disconnect.mjs`, `google-calendar-link-flow.mjs`, `google-calendar-link-publication.mjs`, `google-accounts*.mjs`, `scripts/test-google-accounts.ts`.
8. **Deletion notice policy move**: `deletions.ts` → `deletion-undo.tsx`; `test/deletion-notice-policy.test.mjs`.
9. **digest-inbox → hosted-background**: `hosted-digest-ui.tsx`, Quint `hosted-digest-refresh.mjs`, `renderer-digest-queue.mjs`, `renderer-hosted-inbox.mjs`, application manifest, `scripts/test-local-digest-storage.ts`.
10. **AlphaHostedResults typed once**: `hosted-background.ts`, `hosted-result-notices.ts`, `hosted-digest-ui.tsx`, `prototype/workflow-adapter.ts`, `browser/register-hosted-results.ts`.
11. **DeviceActions options constructor / files identity**: `device-actions.ts`, `connection-ui.tsx`, `prototype/agent-adapter.ts`, `test/files-reviewed-proposal.test.mjs`.
12. **gmailBackground bound object**: `gmail-background.ts`, `inbox-cloud-adapter.ts`, `settings-adapter.ts`, `google-accounts.ts`, `google-connection-ui.tsx`, `scripts/inbox-adapter-fixture.ts`, Quint `inbox-coordinator-ports.mjs`, `google-accounts*.mjs`.
13. **One accounts-changed event**: `gmail-mailbox.ts`, `google-accounts.ts`, `settings-adapter.ts:493-494`, `inbox-cloud-adapter.ts:1041,1049`, `test/browser/mail-review.production.spec.ts`, `scripts/test-inbox-cloud-flow.ts`.
14. **Voice route/mark constants shared**: `diagnostics-export.ts`, `voice-timing.ts`, `scripts/aggregate-voice-latency.ts`.
15. **Moves to browser/**: `deletion-owner.ts` (6 importers, `specs/quint/native/manifest.json`), `google-authorization.ts` (`browser/cloud-connection.ts`, `specs/quint/services/manifest.json`).
16. **negotiateEnabledViews → void**: `device-view-profile.ts` + `connection-ui.tsx:1176,1497,1573`.

## Text/path pins
- `test/support/feature-parity.mjs` allowlists every file in this chunk by path (lines ~494-530): update on every move/delete.
- `LemmaScript-files.txt:16` + `specs/lemma/apps/app/src/runtime/gmail-mailbox.dfy(.gen)`, `specs/lemma/README.md`: pin `gmail-mailbox.ts` and the names `newestWithinBudget`, `sizeFrom`, `//@` annotations.
- Quint manifests listing paths: `specs/quint/application/manifest.json` (conversation-selection, crash-log, development-cartesia-conversation, development-cloud-agents, device-actions, digest-inbox, dock-clearance, error-boundary, gmail-grants, google-accounts, google-agent-access, google-calendar-selection, google-connection-return, google-connection-ui, home-calendar-selection, hosted-background), `specs/quint/services/manifest.json` (gmail-*, google-*), `specs/quint/native/manifest.json` (deletion-owner, deletions, google-calendar-selection), `specs/quint/legacy/manifest.json` (dock-clearance, google-connection-ui).
- Quint refinement harnesses importing/slicing these files: `recovery-ui.mjs`, `dock-clearance-ownership.mjs`, `device-action-review.mjs`, `hosted-digest-refresh.mjs`, `hosted-background-admission.mjs`, `renderer-digest-queue.mjs`, `renderer-hosted-inbox.mjs`, `voice-transcript-follow.mjs`, `google-calendar-disconnect.mjs`, `google-calendar-link-flow.mjs`, `google-calendar-link-publication.mjs` (+ `-fixture.jsx`), `google-calendar-access-choice.mjs`, `google-consent-admission.mjs`, `google-access-publication.mjs`, `services/google-accounts.mjs`, `services/google-accounts-lifecycle.mjs`, `services/inbox-coordinator-ports.mjs`, `composition/ports.mjs`, `legacy/google-connect/check-google-connect-refinement.mjs`, `native/CrashJournalTraces.java`.
- Source-text tests (T1/T2) that break on edits: `test/fixtures/google-account-panel.mjs` (slices google-connection-ui), `test/google-connections-resource-budget.test.mjs`, `test/google-agent-access.test.mjs`, `test/gmail-background-binding.test.mjs`, `test/settings-truth.test.mjs`, `test/login-surfaces.test.mjs`, `test/calendar-connect-policy.test.mjs`, `test/development-cartesia-conversation.test.mjs`, `test/development-voice-navigation.test.mjs`, `test/private-preview-cartesia-route.test.mjs`, `test/cloud-resident-authority.test.mjs`, `test/error-boundary-home-escape.test.mjs`, `test/home-calendar-selection.test.mjs`, `test/home-cards.test.mjs`, `test/accessibility-coverage.test.mjs`, `test/native-deletion-admission.test.mjs`, `test/dev-surface-gates.test.mjs`, `test/browser-receipt-order.test.mjs`, `test/diagnostics-export.test.mjs`, `test/deletion-window.test.mjs`.
- Scripts by path: `scripts/prepare-client-features.ts` (crash-log, device-record-presentation, dock-clearance), `scripts/audit-production-bundle.ts` (markers `alpha:force-render-error`, `alpha:render-error-check`, hosted-agent markers), `scripts/test-*.ts` listed per report, `scripts/local-agent-dev-bridge.ts:299` (`/__alpha-agent-google-access`).
- Literal storage keys in tests/specs: `alpha.crash-log.v1` (`recovery-ui.mjs:73`), `alpha.google-calendar-selection.v1` (`test/browser/one-calendar.spec.ts:32`).
- `android/app/product.gradle` comment tying `ELIZAOS_APP_LINK_HOST` to `GOOGLE_WORKSPACE_CALLBACK`.

## New patterns
- NEW-1 **Constant-result function**: a function whose every non-throwing path returns the same value, but callers still assign its result (`negotiateEnabledViews` always `''`). Treatment: return `void`, keep the caller's reset explicit.
- NEW-2 **Ignored parameter kept for call-site compatibility**: `googleDisconnectConfirmation(label,_serviceName)` with the caller computing a value only to pass it. Treatment: delete parameter and caller computation. (Close to A7, but the dead code is in the caller.)
- NEW-3 **Twin events always fired and handled together**: `alpha:gmail-accounts-changed` + `alpha:google-accounts-changed`. Treatment: one event. (Fits D3/C6; worth a catalogue line.)
- NEW-4 **Same UI rendered twice in two paradigms** (plain DOM recovery screen + React boundary, styles copied as CSS strings and JSX objects). Treatment: shared CSS classes; keep the second renderer only where it is required (React-failure fallback). (Sub-case of D12.)

## Owner questions
1. May test-mocks builds stop demonstrating hosted/paired/personal Cloud agents so `development-cloud-agents.ts` and the `remote/local/cloud` connection kinds (and `paired-agent`/`development-agent` voice routes) can be deleted?
2. Confirm the client-side Calendar sync stack (`calendar-sync-host.ts`, `calendar-sync-settings.ts`, `google-calendar-selection.ts`) is retired in favour of the agent's `LinkedCalendarControl` so it can be deleted with its tests and Quint entries.
3. Can `negotiateEnabledViews` treat an agent without `viewProfileVersion` as an error, given the resident agent ships in the same APK?
4. Conversation selection persists a bare string on Android and `{id,revision}` in the browser: unify on one shape, or keep both current formats?
5. Should the browser dev-only paths inside production modules (realtime Cartesia voice, browser Cloud resident Calendar writes in `google-connection-ui.tsx`, dev-host Google access POST) move to a `src/dev/` module loaded by dynamic import?
6. Is upstream willing to accept a header selector in `installSharedDockClearance` and export `getZonedDateParts` publicly, so Alpha drops its header measurer and the internal-path import?
