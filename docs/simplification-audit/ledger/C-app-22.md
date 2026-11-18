# C-app-22: `apps/app/src/runtime/connection-ui.tsx` in-file cleanup

Scope: chunk summaries app-22-p1/p2, per-file reports `files/apps/app/src/runtime/connection-ui.tsx.part{1,2}.md`, B1/B2
migration maps, types.md. Many report findings were already done by A2/A4 (legacy selection migrations,
`restoreSavedSignIn`, personal/Cloud agent path, un-exporting `membershipReadDiagnostic`/`presentActionEntry`).
The file went from 3,922 to 3,915 lines (about 2.4 KB smaller), with 8 new single-line imports.

## Done

### B1 shared helpers (C3)
- `validateUuid` now comes from `../lib/ids` instead of the deep `vendor/eliza/.../utils/uuid` import.
- Inline `instanceof DOMException && name==='AbortError'` is now `isAbortError(error)` at 4 sites (`readCloudCredential`,
  `membershipReadDiagnostic`, `errorMessage`, the Google commit boundary in `cancelSignIn`).
- The device key generator in `connectRemote` (test-mocks harness) and `connectResident` is now `randomHex(32)`.
- The saved device identity check (a storage trust boundary, kept) is now `isSha256Hex(key)`/`isOpaque36(installationId)`.
  This applies at both enrollment sites.
- `actionScope(JSON.stringify([...]))` tuples are now `sessionKey(...)` at 5 sites (same text, so the derived slot
  scopes are unchanged).
- Proactive-event shape checks are now `isRecord(value)`/`isRecord(message)` (`startConversationEvents`).
- `JSON.stringify(a)!==JSON.stringify(b)` comparisons are now `sameJson` at 9 sites: the 4 conversation-choice
  fences, the voice/reminder session fences and `replyTo.session`.
- The history `beforeId` UUID regex and the two reminder-source UUID regexes are now `isUuid`. These sites use the same
  language as upstream `UUID_PATTERN`, any case.
- `presentActionEntry`: the unused `timeZone` default parameter (one caller) is replaced by a local `deviceTimeZone()`.
- `errorCode(error)==='start-failed'` (resident start retry classification).
- `errorText(error,'Couldn’t connect')` (`errorMessage` fallback).
- The three 10 ms operation-release polling waits are now `await delay(10)`; the map says these are identical.

### B2 typed native modules (C2)
- `registerPlugin<ActionJournal>('AlphaActionJournal')` is replaced by `alphaActionJournal` from
  `native/alpha-action-journal`. The `ActionJournal` import from `device-actions` is dropped; that alias in
  `device-actions.ts` belongs to another unit.
- `calendarAgendaObservation`: `registerPlugin<{prepareAgentSource…}>` is now `AlphaCalendarPlugin`, narrowed on
  `status==='ready'`. Before, a non-ready result failed inside `calendarSource` and became `undefined`; now it throws
  before `calendarSource` and still ends as `undefined`. The browser source returns `status:'ready'`.

### types.md (C1)
- `draftSmsReply(thread: …inline…)` now uses `OpenThread` from `telephony-executor.ts`.

### Dead code, defensive code, indirection (A7, B2, B4)
- Deleted `restoreSavedResidentHistory` and its `void` keep-alive. It had 0 references anywhere and was kept only "for
  existing contract tests".
- Deleted `cancelRecoveryReview()` (0 callers; its slicing test was already gone).
- Deleted the unused `const providerChoice=providerChoiceFor(true)`.
- Deleted the provider dialog's contradictory guard (`purpose!=='provider'` inside `purpose==='provider'`). The block
  never rendered.
- Removed the never-read `saved` flags in `createSelectedConversation` and `newConversation`. In `newConversation` the
  swallowed catch is kept with a best-effort comment. The flag in `restoreConversationHistory` IS read (it drives
  'Restored · not saved'), so it stays.
- Removed the duplicate inner `testMocksEnabled&&` around "Local development agent" (already inside
  `pairingOptions=testMocksEnabled?…`).
- Removed `typeof selected.remote.subscribeConversationEvents!=='function'`: on the resident arm that is
  `LocalAgentProtocol`, which always defines it.
- Removed `typeof window/document/navigator!=='undefined'` guards (browser-only module): the module-level calendar
  epoch listener, `inferenceOffline`, `warmInference` on connect, and the camera capability.
- `typeof foregroundExecutor==='function'` is now `!!foregroundExecutor`.
- `Capacitor.getPlatform()==='android'` is now `isAndroid` at 3 sites. Same expression as `native.ts`.
- Sign-out: dropped the `as CloudProtocol` cast and the `typeof client.revokeSession==='function'` probe.
  `CloudProtocol.revokeSession` always exists; the try/catch for an unconfirmed revocation is kept. `result?.` is now
  `result.`.
- `aiOffMessage()` (a zero-argument function returning 'AI off') is deleted; its 2 uses read `NEEDS_PLAN_NOTICE`
  (same string).

### Comments (A8, NEW-STALE-NOTE)
- Stripped issue numbers and dates (`#410`, `#406`, "owner directive 2026-10-13/14", "owner, 2026-11-03", "owner
  report 2026-10-30", "Owner decision (2026-10-30)"). PRD IDs P-43/P-26 are kept. None of these is an
  `audit-production-bundle.ts` anchor (checked; the matching strings there are that file's own comments).
- Moved the `webCloudUnavailable` comment onto its declaration (it sat above `announcedProposals`).
- Moved the `readConversation` paging comment from `turnReplyRow` onto `readConversation`.
- Moved the "Shared controller for the chat adapter" doc comment from `ownerReminderBindingCache` onto
  `export const connectionController`, and deleted the 3 blank lines.
- Deleted orphaned comments: the sign-in dialog note above `providerStatusGeneration`, and the Cartesia note above
  `OWN_KEY_BUSY`.
- Fixed the misleading "production browser build" comment above the final generic panel.

## Deleted tests and formal artefacts
Each was broken by the changes above. All are T1/T2 (they slice `connection-ui.tsx` text and run it in a vm without
the new imports, or regex the source). None is referenced by any runner list or manifest.
- `test/cloud-prewarm.test.mjs`: source-text regex on `if(typeof document!=='undefined'&&!document.hidden)`.
- `test/cloud-protocol-error-copy.test.mjs`: transplant of `errorMessage` (`isAbortError` not in its sandbox).
- `test/connection-recovery-state.test.mjs`: transplant (`sameJson`); it also used the deleted orphan comment as a
  slice end.
- `test/conversation-restore-safety.test.mjs`: transplant of `restoreConversationHistory` (`sameJson`).
- `test/resident-auto-retry.test.mjs`: source regex on the `start-failed` code read, plus a transplant.
- `test/restored-history-limits.test.mjs`: transplant (`isRecord`/comment slice anchor).
- `test/notice-owner-startup.test.mjs`: whole-controller transplant (no `window`/`isAbortError`). It was already
  failing before this unit.
- `test/context-selection.test.mjs`: deleted only the case "calendar source discovery coalesces per owner…". It
  transplanted `calendarAgendaObservation` with a status-less fake `prepareAgentSource`. The file's other 8 cases are
  unrelated and kept.

## Pins left broken
- None known among the live Quint refinement harnesses that read this file. I ran these check functions directly (see
  Verification): ObservationTurnDispatch, ResidentLiveness, CloudPlanRecheck, ClientObservationSupport,
  CanonicalNotificationTapAdmission, CanonicalNotesFeedback, GoogleCalendarAccessChoice,
  GoogleCalendarLinkPublication, GoogleConsentAdmission, HostedDigestRefresh, PlanAdmissionGrace, InboxCoordinator
  (all OK). Two did not pass, apparently for reasons outside this unit:
  - AccountSheet: a Playwright click is intercepted by `<dialog class="alpha-startup-permissions">`, the startup
    permission dialog owned by another unit.
  - CloudConnectionNotices: "Redeem code owns its rendered center instead of undefined" is a hit-test.
    `connection-ui.css` is being edited by another unit, and this unit changed no notice JSX.
- I did not run the legacy `specs/quint/legacy/*` harnesses or the `composition` family.

## Skipped
- `conversationKey` → `agentOwnerKey` (B1 map). The output is identical, but the Quint harness
  `specs/quint/refinement/application/observation-turn-dispatch.mjs` slices `^function conversationKey\(`, and 6
  transplant tests/scripts inject `conversationKey`. I left it until those are ported (T10).
- `errorCode` at the `LOCAL_AGENT_EPOCH_CHANGED` site in `send`: I applied it, then reverted it because it broke
  `checkObservationTurnDispatch` (the harness sandbox has no `errorCode`). Port the harness first.
- `errorCode` in `errorKindOf`, and the reply/failure `code` reads (`terminalCodeOf` etc.): the map says leave local or
  low value.
- `errorText` at `console.warn(…error instanceof Error?error.message:error)`: the fallback is not a string.
- The loose `/^[0-9a-f-]{36}$/i` agent-id check in `remoteIdentity`: the map says leave local.
- `residentRebindQueue ??=` lazy init (B4): sliced verbatim by `test/quint-connection-controller.test.mjs`
  (`let residentRebindQueue: ResidentRebindQueue | null = null;`), a Quint trace replay. Port first.
- Operation release / teardown / enrollment / plan-end / credential-assertion dedupes (C3, NEW-TRIPLICATED-PROTOCOL):
  `work()`, `manageProviderKey`, `releaseOperation` and the enrollment ordering are sliced by
  `quint-connection-controller.test.mjs`, the application manifest and `plan-admission-ports.mjs`. These are
  stage F/T10 work.
- `selectCloudProvider` inline: kept. `test/own-provider-cancel-readback.test.mjs` calls it, and inlining saves one
  line.
- `residentSignInExpired` / `pairingRetired` as constants: transplant tests inject `residentSignInExpired`; low value.
- `residentQa` / `RESIDENT_QA` / gate-QA UI: Q-HOST-4 (Open).
- Browser sign-in hand-off folding (`signInBrowser`/`residentBrowserLogin`/`browserCloudLogin`): Q-HOST-8 (Open).
- Test-mocks Android Cerebras form + `confirmRemove`: Q-HOST-10 (Open).
- Hosted/paired harness (`hosted`, `pairedRequest`, `connectRemote`, pairing JSX) and the legacy text envelope in
  `send`: kept by D5 while retained e2e specs drive them (A4 ledger).
- `cloudSignIn?.addListener` ×3 loop and optional `CloudSignInPort` members: require `cloud-sign-in.ts` /
  `native-connection.ts` changes (other owners).
- `DeviceRequest` → `OwnerRequest`: `alpha-client.ts` does not export `OwnerRequest` yet.
- `HistoryEntry` → `device-record-presentation.ts`, `PairedVoiceBinding`, `AutomationsClientBinding`,
  `SELECTION`/storage-key exports, `cloudEnvironmentAllowed` move, `trapFocus`, `<Icon>`, `formatShortDate`,
  `captureConnection` fences, `send()` split, `ConnectionChooser` panels, dev-surface moves: these need edits in other
  files or a file split (stage F).
- `captureConversationChoice` sync/async ternary: the fix belongs in `conversation-selection.ts` (Q-CONN-3).
- `fundingNeeded()` `setTimeout` side effect, `errorMessage` table, nested status ternaries: these would change
  behaviour or ordering without a behavioural test.
- Kept the orphaned "Eliza Cloud's API answers credentialed browser requests…" comment above `pairingError`.
  `test/checkin-choice-presentation.test.mjs` (passing) uses it as a slice end marker. Delete it when that test goes.

## Verification
- `npx tsc --noEmit` (whole repo, run twice at the end): 0 errors, none in `connection-ui.tsx` or
  `test/context-selection.test.mjs`.
- Host tests: all 57 `test/*.test.mjs` files that mention `connection-ui` pass (`node --test <file>`, one at a time,
  final run). Two earlier transient failures re-ran green: `quint-connection-controller` (timeout under load) and
  `inbox-draft-copies` (stubs connection-ui; another unit's file).
- Quint refinement check functions called directly via `npx tsx` (results listed under Pins left broken).
- Scripts:
  - `npx tsx scripts/test-agent-camera-flow.ts`: PASS.
  - `scripts/test-inbox-multiple-drafts.ts`: PASS.
  - `scripts/test-calendar-availability-flow.ts`: fails on `=await deviceCapabilities(` count 2 !== 3. The count is
    already 2 before this unit (stage A removed the Cloud path), so this pin was already broken.
  - `scripts/test-agent-context-browser.ts` and `scripts/test-inbox-drafts-browser.ts` need a dev server on :5188.
    Not run.
- Not run: `npm run build`, `npm run audit:bundle`, Playwright specs, Android build (other units are mid-edit; no
  Android files touched).
