# C-app-25: runtime n–v in-file cleanup

Scope: the existing files in `chunks/app-25.files.txt`. Already deleted by stage A (skipped): `native-calendar-sync.ts`,
`native-recovery-backup.ts`, `note-dates.ts`, `paired-voice.ts`. Many findings (legacy readers, paired voice, unexports
B165/B209…, `allowanceText`, `void copy`, `PendingReminderDeletion`) were already done by A1–A4; they are not repeated here.

Constraint found while doing this: plain `node --test` imports several of these modules directly (no bundler), so any
value import must use a `.ts` specifier, and `lib/ids.ts`, `lib/parse.ts` and `lib/abort.ts` cannot be used from a
Node-imported module (they import `vendor/.../uuid`, `./ids` and `../runtime/abort-signal` without an extension).
`lib/hash.ts` works. Sites where that applies keep their local code (listed under Skipped).

## Done

- `native-live-voice.ts`: `available` → `voiceCloudAvailable` from `native/alpha-voice-cloud` (B2, C3); header comment cut to 3 lines (A8).
- `native-voice-turn.ts`: `available` → `voiceCloudAvailable` (B2); dropped "Issue #395" (A8); dropped the `installed` flag (B4: one caller, setting the sink twice is idempotent).
- `native-reading-voice.ts`: `registerPlugin<any>` → `AlphaVoiceCloudPlugin` (B2/C2); early return instead of wrapping block (D9); `abortError()` (B1 map); model-name comment noise dropped (A8).
- `native-view-events.ts`: `NativeViewEventPort` now the `native/agent` type (re-exported once for `local-agent.ts`); listener payload `any` → `unknown` narrowed through a local frame type (C1/types.md §4 row 18).
- `native-connection.ts`: deleted `memorySecretBackend` and `durableSecretsWithFallback` (A7, never called); moved the misplaced `cloudSignIn` doc comment to `cloudSignIn` (A8).
- `note-origin.ts`: removed unused re-exports `recordNoteOriginOf`, `NoteOrigin`, `RecordNoteOrigin` (A7); `sha256Hex` (C3, B1 map).
- `note-default-title.ts`: prefix hoisted out of the loop.
- `notes-secure-store.ts`: new `readSavedNotesRaw()` (the one copy of the saved-notes readback, helpers.md C3).
- `note-audio-deletions.ts`: uses `readSavedNotesRaw`; dropped an unused import; module variable `document` → `browserDocument` (NEW-SHADOWING).
- `notes-trash.ts`: uses `readSavedNotesRaw`; `document` → `browserDocument`; deleted the unused `withNotesDeletionLock` re-export (lock note moved onto `editNotesTrash`); `NOTES_TRASH_SLOT` unexported; issue-number comment noise dropped.
- `notes-trash-policy.ts`: deleted forwards with no product caller (`emptyNotesTrash`, `validateNotesTrash`, `notesTrashDaysLeft`, `notesTrashOverflows`, `planNotesTrash`, `restoreNotesTrashEntry`, `NotesTrashPlan`, upstream re-exports `NOTES_TRASH_FULL_CODE`/`NotesTrashFull`/`isNotesTrashFull`) (A7, D4); constants and `NotesTrashEntry` unexported; "PLAN.md decision N2" dropped (A8).
- `notes-folders-model.ts`: add/rename/remove no longer re-validate their typed input document (B3; output still validated); `NOTES_FOLDER_NAME_MAX` unexported; PLAN.md pointer dropped.
- `notes-folders.ts`: inline browser-document shape → `BrowserJsonDomainDocument` type (C1).
- `notes-view.ts`: `KIND_LABEL` exported (owner per helpers.md) and PLAN.md/test-note comment trimmed.
- `notes-organize-contract.ts`: describe uses `KIND_LABEL` (C6); deleted unused `NOTES_ORGANIZE_CAPABILITY`; `NOTES_ORGANIZE_TYPES` unexported; PLAN.md pointer dropped.
- `permanent-voice-deletion.ts`: deleted unused re-exports/aliases `PERMANENT_DELETION_LEASE_MS`, `PermanentDeletionEvidence`, `PermanentDeletionStep`, `DeletionLease`, `claimDeletion`, `releaseDeletionClaim` (their caller went with A2); "(MVP-15)" dropped.
- `owner-reminder-notification-port.ts`: `abortActions()` and `settledStatus()` replace 3 and 2 copies (C3); `isRecord` for the markRead ack (B1 map).
- `owner-reminder-notification-protocol.ts`: `sha256Hex`, `UUID_PATTERN` (identical), `expectRecord` (same error) (C3). Bundled by its harnesses, not Node-imported.
- `phone-context.ts`: SIM revision grammar from `sms-subscription-revision.ts` `SMS_SUBSCRIPTION_REVISION` (C6); `DeviceCapabilityProfile` unexported.
- `sms-subscription-revision.ts`: exports `SMS_SUBSCRIPTION_REVISION`.
- `phone-workflow-authoring.ts`: deleted unused `zoneOffsetMinutes` re-export and the `PhoneTrigger` alias (D4); `asRecord` for the two inline guards (B1 map).
- `prepared-view-navigation.ts`: anchored `exec(...)?.[0]===x` → `.test(x)` (equivalent).
- `reminder-journal-store.ts`: inline `BrowserDocument` → `BrowserJsonDomainDocument` type (types.md row).
- `remote-protocol.ts` (D5 harness, kept): unexported `RemoteIdentity`, `RemoteAuthStatus`, `droppedResponse`; inlined the `abort()` pass-through (D4).
- `resident-recovery.ts`: one `REASON_COPY` table for the two copy functions (C6); every string unchanged; `//@ verify` function untouched.
- `service-read-cache-store.ts`: `sha256Hex` (slot text unchanged); `document` → `browserDocument`.
- `share-panel.ts`: deleted the dead disabled-row branch and `reason` parameter (no caller passes either since A3 removed `emailUnavailable`); icon passed with each action instead of derived from the label (D10).
- `sms-agent-contract.ts`, `phone-dial-contract.ts`, `telephony-actions-contract.ts`, `reviewed-mail-context.ts`: re-export lists trimmed to the names something imports (A7); `smsAgentHash` → `sha256Hex`.
- `subscription-entitlement.ts`: `copy` built only on the path that uses it.
- `telephony-executor.ts`: exported `OpenThread` and `VoicemailDeleteResult` (types.md owner) and used them in `TelephonyPorts`; long comment line wrapped.
- `text-scale.ts`: `LARGE_TEXT_AT` constant for the literal 1.5.
- `text-share.ts`: `Pick<AlphaDevicePlugin,'shareText'|'copyText'>` (B2); `nativeTextSharing` inlined; `abortError`/`isAbortError`.
- `toast-layer.ts`: one `bump()` replaces four "move to end of modal order" copies (C3).

## Deleted tests and formal artefacts

- `test/connection-step-contracts.test.mjs` (transplant: sliced `memorySecretBackend`…`SECRET_DATABASE` and `durableSecretsWithFallback` out of `native-connection.ts`, plus connection-ui slices).

## Pins left broken

- `specs/quint/refinement/application/contracts.mjs` `notesLifecycle`: already broken by A2 (`NotesStore` from `notes-store.ts`, `addNotesTrashEntry`); now also uses deleted `emptyNotesTrash`, `restoreNotesTrashEntry`, `planNotesTrash`. Port: call `notesTrashPolicy.empty/add/restore/remove/plan` (still exported) or the upstream policy directly; the store half needs the A2 decision.
- `specs/quint/application/README.md:25` names `claimDeletion` as a source of `PermanentVoiceDeletion` (doc only; the claim export had no caller after A2).
- `specs/quint/application/README.md:15` names `planNotesTrash` (doc only).

## Skipped

- Open owner questions: Q-NOTES-4 (voice deletion subsystem: `note-audio-deletions`, `permanent-voice-deletion`, Trash voice hooks), Q-NOTES-5 (`notes-organize-contract` deletion/upstream switch; also needs `agent-adapter.ts` signature change), Q-UI-22 (`photo-library.ts` wrappers), Q-UI-23 (subscription credits branch), Q-UI-24 (`phone-context` folder kind), Q-UI-31 (`ServiceReadCache.clear()` silent give-up), Q-UI-32 (`phoneContextMessage`).
- Cross-file/structural (stage F or other owners' files): shim deletions (`notes-contract.ts`, `notes-store.ts`, `note-audio-lock.ts`, `reviewed-mail-context.ts`, telephony contract merge), notes bindings module, `durableSlot` generalisation, moving UI installers to `ui/`, `native-connection`/`remote-protocol` splits, alias collapse of journal method exports (callers in voice-adapter/reminder specs), `OWN_NOTIFICATION_SOURCE` reuse (would pull phone-context into source-renewal-question), D10 label-keyed lock/voice detection in `text-share.ts`/`view-focus.ts` (needs shell data attributes).
- Node-import constraint (lib modules without `.ts` specifiers): kept local code in `phone-context.ts` (`isSha256Hex`), `power-launch-state.ts` (`isUuidRfc`), `prepared-view-navigation.ts` (`isRecord`), `native-network.ts` (`abortError`), `share-panel.ts` (`isAbortError`; `test/share-panel-watch.test.mjs` evaluates the stripped file from a data URL), `remote-protocol.ts` (`UUID_PATTERN`, `expectRecord`), `resident-recovery.ts` (`isLowerUuid`; also a LemmaScript file), `native-connection.ts` (`abortError`). A later change can switch these once `lib/` uses `.ts` specifiers.
- `native-connection.ts` `ConnectionPort` → `AlphaConnectionPlugin`: not assignable (browser factory lacks the delegation members); kept. Optional Google members kept (browser connections lack them, per B2 map).
- `owner-reminder-notification-protocol.ts` `canonical` → `canonicalJson`: B1 caveat (undefined/Date handling); kept local.
- `reminder-creations.ts` (`dueOf` alias, status set, `Bag`): the region is sliced by transplant fixtures (`reminder-open-intent.mjs`, `retained-reminder-tap.mjs`, `reminder-lifecycle-pure.test.mjs`) that inject `dueOf`; left for stage E.
- `phone-context.ts` `CALENDAR_AVAILABILITY_CAPABILITY` from upstream: pinned by text in `scripts/test-calendar-availability-flow.ts`, which also holds behavioural cases.
- `subscription-entitlement.ts` explicit re-export list: `test/subscription-entitlement.test.mjs` pins the `export *` line; `clock()` try/catch kept (fallback differs when Intl formatting throws).
- `native-live-voice.ts` keeps the local name `available` (text pinned by `test/live-voice.test.mjs`).
- `service-read-cache.ts` parameter properties: not supported by Node type stripping used by tests.
- `phone-workflow-authoring.ts` `parsePhoneCatalog`: used by `test/workflow-definition-bounds.test.mjs`. `note-origin.ts` test-only re-exports kept for `test/note-origin.test.mjs`.
- `owner-route-policy.ts` load-time table check, `view-focus.ts`, `status-ui.tsx`, `source-renewal-question.ts`, `native-network.ts` race: no safe in-file change.
- Observation (not changed): after A2 removed the only `claimDeletion` caller, nothing claims voice deletion rows, so `deletionClaimedElsewhere` can only see claims from no one; worth a look with Q-NOTES-4.

## Verification

- `npx tsc --noEmit -p tsconfig.json`: exit 0, no errors (whole project, after final edits).
- `node --test` on 20 tests importing the changed modules (prepared-navigation-route, workflow-*, power-launch-state, native-network*, browser-reading-capability, native-reading-voice-profile, cloud-maps-session, diagnostics-export, live-voice, native-live-start-cancellation, native-resident-capture, voice-assistant, note-origin, inbox-operation-guards, native-browser-view-binding, adapter-contracts, aosp-sms, device-capability-selection, telephony-agent-flow): all pass except `optional-view-channel-chat.test.mjs`, which fails on `connection-ui.tsx` text (`function conversationKey` removed by its owner), not on these files.
- `node --test` on Quint wrappers and related tests (modal-toast-forwarding, native-view-subscription, reminder-decision, reminder-intents, resident-liveness, screen-focus-ownership, service-read-cache, share-panel-admission, resident-recovery, notes-view, notes-organize, subscription-entitlement, share-panel-watch, reminder-lifecycle-pure): 49 pass, 0 fail.
- A broad run of ~210 tests mentioning these files: failures seen are `browser-receipt-order.test.mjs` (`agentOwnerKey is not defined`, connection-ui transplant, other owner) and the ones above that were fixed and re-run green. That run had not finished all slow child suites when this ledger was written.
- Not run: vite build, `audit:bundle`, Playwright, Quint `contracts.mjs`/`portable.mjs` harnesses, Lemma (resident-recovery's verified function is unchanged), Android (no Java touched).
