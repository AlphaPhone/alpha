# C-app-15 ledger (stage C, chunk app-15)

Owned files: the 18 paths in `chunks/app-15.files.txt`. Already deleted by A2 (skipped): `note-source-adapter.ts`,
`note-web-source-adapter.ts`, `notes-query-executor.ts`, `notes-query-review.ts`, `notes-trash-adapter.ts`.
Unchanged by this unit: `note-recorder.ts`, `notes-recorder-control.ts`, `own-notice-question.ts` (reasons under Skipped).

## Done

- `mvp-features.ts`: dropped the `(issue #420)` narration (A8); `deferredMvpPrompt` double negation over a ternary
  rewritten as an early return plus a direct ternary, same truth table (D9).
- `native-adapter.ts`:
  - deleted the `installed` WeakSet, the `restore[]` list and the returned disposer, so the function returns `void`. Its
    one caller (`main.tsx`) and the one test ignore the return value (B4/A7).
  - deleted the `settings && typeof settings.render === 'function'` guard: the Settings view always exists with a
    render (B4).
  - local `registerPlugin<{providerStatus}>('Agent')` replaced by the `agent` singleton from `native/agent` (B2 map,
    identical method type) (C2).
  - the three `try { api.set(...) } catch { /* view closed */ }` copies became one local `repaint` (C3).
  - dropped the unused re-exports `tileAccessibleName`, `tileStateText`. They stay imported for `honestTiles`, and no
    file imports them from here (A7).
  - corrected the `residentModelLabel` doc comment, which still said "Exported" (A8).
- `note-origin-adapter.ts`: local `CREATION_ID` regex replaced by `isUuidV4` from `lib/ids` (B1 map, identical
  pattern) (C3). `readNoteOrigins` un-exported (no importer left; its Playwright user was deleted earlier) (A7).
  `eventNoteOriginId` parameter narrowed from `Bag` to `{creationId?;seriesId?;id?: unknown}` (C1). The `let
  opening, shell` declaration moved above the mount hook that assigns `shell` (D9). Dropped the
  `elizaOS/eliza#35912` issue reference (A8).
- `notes-share-adapter.ts`: `Bag` replaced by `shell-types` (`ViewRegistry`, `ViewApi`, `ViewOutput` plus local narrow
  output/state types), following B3 worked example 1. The inline AbortError test became `isAbortError` from `lib/abort`
  (B1 map row) (C1/C3).
- `notes-document-adapter.ts`: `Bag` replaced by `shell-types`. The inline plugin interface became
  `Pick<AlphaNoteDocumentsPlugin,'exportText'>` from `native/alpha-note-documents`. `perform` is generic instead of
  `any`. Quint text anchors are unchanged (C1/C2).
- `notes-folders-adapter.ts`: `Bag`/`Shell=any` replaced by `shell-types` following B3 worked example 2, with a local
  `NotesShell` (`live`) and `NotesApi` (`notesFolders`) (C1).
- `notes-organize-executor.ts`: `shell:any` in `notesOrganizeShellHost` became a local
  `Pick<ShellHost,'S'|'vget'|'openView'> & {live?; vset(..., {exact?})}` (types.md row 22; C1).
- `notifications-adapter.ts`: the 400-character inline `AlphaNotifications` generic became `AlphaNotificationsPlugin`.
  The local `Notice` became `NotificationRow` from `native/alpha-notifications` (B2 map row; same fields plus an
  optional `redacted`). Only types changed. The text-eval script strips import lines, so it is unaffected (C1/C2).
- `phone-adapter.ts`:
  - `registerPlugin<AlphaTelephonyPlugin>('AlphaTelephony')` replaced by the `alphaTelephony` singleton (B2 map).
  - local `Voicemail` type replaced by the contract's identical `VoicemailEntry`, and the carrier union by
    `VoicemailCarrierState` (types.md rows 54-55) (C1).
  - deleted the `api` variable (written, never read).
  - deleted the render outputs `nativeStatusDot` and `nativeContacts`: nothing binds them in `template.html` or
    `model.js` (NEW-4/A7).
- `phone-info-page.ts`: the voicemail union is now `VoicemailCarrierState` (2 sites). `PhoneInfoClient` is
  `Pick<TelephonyClient,'status'|'phoneInfo'|'voicemailStatus'|'requestAccess'>` instead of a hand copy (C1/C2).

## Deleted tests and formal artefacts

- `test/phone-adapter.test.mjs`: removed the case "Contacts opens only where Contacts is admitted", because it covered
  only the deleted `nativeContacts` output. The rest of the file is unchanged and passes.

## Pins left broken

- None caused by this unit.
- Already broken before this unit (A3 changed `installNotesDocumentAdapter(Component, views)` to `(views)` and deleted
  import): `specs/quint/refinement/application/notes-document-transfer.mjs`, which still calls it with
  `({prototype}, views)` and drives `view.importText()`. `test/quint-notes-document-transfer.test.mjs` is affected
  with it. The text anchors this unit could have touched (`if(token===epoch&&api.isActive())api.toast(message);`,
  `if(busy){api.toast('Busy');return;}`) are unchanged. Not run here.

## Skipped

- Open owner questions:
  - Q-NOTES-7: note-recorder live transcription and segment pump (report #1, #2).
  - Q-NOTES-5: the organise host's dead record/move/restore members. `ready()` is constant false since A2, and
    `notes-recorder-control` exists only for it.
  - Q-NOTES-6: the folder UI.
  - Q-NOTES-8: the export failure copy "Import failed".
  - Q-DEV-1: native-adapter `replacement()` branches for phone, messages, inbox, browser, maps and contacts, plus
    `smsPayload`, `mailPayload` and `browser()`.
  - Q-DEV-9: simulated shade notices and tiles (dev move is stage F).
  - Q-UI-2: the Settings honesty pass and the Privacy and Models rows.
- Needs another owner's file:
  - Dropping native-adapter's unused `_Component` parameter needs the `main.tsx` call changed.
  - Deleting the `tileSettingsPages`, `tileFactsFromSnapshot`, `TileKey` and `TileFacts` aliases needs
    `agent-adapter.ts` to import the upstream names.
  - Moving the `broaderPageNotice`, `handoffGate` and `switchValue` re-export needs `agent-adapter.ts` and
    `settings-adapter.ts` changed.
  - The organise `showFolders` dedupe.
- Needs a file move or split (stage F): `returnGate`/`watchReturnToApp` to `runtime/return-to-app.ts`; the egress module;
  `mvp-features` to `product/view-admission.ts`; `note-recorder` to `runtime/`; the notes view owner merge
  (share/document/folders); `notes-recorder-control` merge; `wavWindows` to `runtime/wav.ts`; `phone-info-page` to
  `runtime/`.
- Pinned by live formal harnesses (D11):
  - `phoneRows`, `CALL_TYPE`, `nativeRows` and the `formatDateTime` import in `phone-adapter.ts`. `nativeRows[0].dial()`
    is the dial surface of `phone-session-replay.mjs`, `test/quint-phone-recents.test.mjs` and
    `test/phone-adapter.test.mjs`, and `phoneRows` is a services manifest symbol. Drop them once those harnesses
    dial through `recents[].call`.
  - `alphaCanonicalTap`/`alphaCanonicalWake` instance fields: driven by the canonical tap Quint harness and script.
- Source-text pins:
  - The commented-out members in `ENABLED_MVP_VIEWS`: `test/aosp-sms.test.mjs:255` asserts `// "messages",`, and a
    4-line comment does not justify deleting that mixed file.
  - `note-recorder.ts` SHA-256 to `sha256Hex`: the module is loaded dependency-free by
    `test/fixtures/cloud-voice-view.mjs` (text transplant) and by Node type stripping (`test/notes-recorder*.test.mjs`).
    An import would break both.
- Kept because tests depend on them (behavioural bundle tests, not dead guards):
  - Optional calls `mount?.call`, `update?.apply`, `unmount?.call`, `viewApi.set?.`, `open?.`, `toast?.` in
    phone-adapter and notifications-adapter. Test shells have no lifecycle methods and pass `{}` as the api.
  - `typeof definition.render !== 'function'` in native-adapter.
- Map entries wrong for a site:
  - B2 "AlphaNoteDocuments → singleton" does not fit `notes-document-adapter.ts`. That site registers the
    `web: BrowserNoteDocuments` implementation, and the singleton module has none, so switching would drop the
    browser export. The site was typed with the interface instead.
  - types.md row 67 (`Pick<NoteRecord,'id'|'folderId'>`): `NoteRecord` has no `folderId`, so the local `Note` stays.
  - types.md row 53 `VoicemailDeleteResult`: the owner (`telephony-executor.ts`) does not export it yet, so the local
    `DeleteResult` stays.
- Not applied:
  - `own-notice-question.ts`: verdict KEEP. A named options type would add a type for one caller; no dead code.
  - `noteRecorderError` lookup table: copy-bearing, and the reasons stay under Q-NOTES-7.
  - `Bag` in native-adapter, phone-adapter and note-origin-adapter's installer: a wide retype is risky without a test
    harness for the shell; left for the D3 work.
  - `views.phone.reply/suggestions/status` undo layer: needs the `model.js` source change first, and
    `test/phone-adapter.test.mjs` asserts them.

## Verification

- `npx tsc --noEmit -p .` (before and after): no errors in any owned file. After the change, the only errors are in
  calendar files other units are editing (`agent-calendar-adapter.ts`, `calendar-adapter.ts`,
  `calendar-confirmation.ts`, `calendar-edit-draft-adapter.ts`, `calendar-form-draft-adapter.ts`,
  `canonical-calendar-drafts.ts`). None of them reference an owned file's types.
- `node scripts/typecheck-scripts.ts`: no output mentioning owned files or errors.
- `node --test` on these 12 files: 108 pass, 0 fail. `test/phone-adapter.test.mjs`,
  `test/native-adapter-activity.test.mjs`, `test/shade-tile-facts.test.mjs`, `test/comms-settings.test.mjs`,
  `test/phone-info-page.test.mjs`, `test/notes-organize.test.mjs`, `test/quint-phone-recents.test.mjs`,
  `test/dev-surface-gates.test.mjs`, `test/aosp-image-capability.test.mjs`, `test/aosp-sms.test.mjs`,
  `test/contacts-adapter.test.mjs`, `test/telephony-attention-lifecycle.test.mjs`.
- `node --test` on these 5 files: 4 pass, 1 fail. Passing: `test/canonical-notification-navigation.test.mjs`,
  `test/quint-canonical-notification-tap-admission.test.mjs`, `test/quint-phone-session.test.mjs`,
  `test/quint-contacts-session.test.mjs`. Failing: `test/notes-recorder-media-admission.test.mjs`, with
  `page.goto: Timeout 120000ms exceeded` while the Vite dev page loaded (domcontentloaded). It drives `note-recorder.ts`
  and `notes-recorder-control.ts`, which this unit did not change. The timeout is at page load in a worktree other
  units are editing. Not re-run.
- Not run: `vite build`, `npm run audit:bundle`, the Playwright suites, the Quint notes-document-transfer replay
  (already broken by A3, see Pins), Lemma (`note-recorder.ts` untouched). Android: no Java touched.
