# Chunk test-08: Playwright specs camera-tools-layout … cloud-account-panel

21 files, all in `test/browser/`. All 21 exist; one report each under `files/test/browser/`.

| File | Lines | Project | Kind | Verdict | Target |
|---|---|---|---|---|---|
| camera-tools-layout.spec.ts | 28 | chromium | UI journey (layout) | MERGE | `journeys/camera-photos.spec.ts` |
| canonical-calendar-form-review.spec.ts | 31 | chromium | UI + React-fiber state reads | MERGE | `journeys/calendar.spec.ts` |
| canonical-icons.spec.ts | 59 | chromium (dev, mock) | rendered-asset check | REWRITE | `journeys/home-shell.spec.ts`, `journeys/accessibility.spec.ts`, `journeys/camera-photos.spec.ts` |
| canonical-notes-checklist-labels.spec.ts | 26 | chromium | UI journey | MERGE | `journeys/notes.spec.ts` |
| canonical-notes-design.spec.ts | 184 | chromium | UI + mock-parity geometry | MERGE | `journeys/notes.spec.ts`, accessibility sweep |
| canonical-notes-draft-copy.spec.ts | 39 | chromium | UI journey | MERGE | `journeys/notes.spec.ts` |
| canonical-notes.spec.ts | 550 | chromium | UI journeys + 4 module-in-page + 1 `main.tsx` rewrite | KEEP (basis) | becomes `journeys/notes.spec.ts`; delete 1 legacy case, rewrite 5 |
| chat-continuity.production.spec.ts | 490 | production | UI journeys | KEEP (basis) | becomes `journeys/chat.spec.ts` |
| chat-continuity.spec.ts | 691 | chromium | UI over remote-agent bridge + imports | MERGE (unique cases) / DELETE rest | `journeys/chat.spec.ts` |
| chat-decline.production.spec.ts | 171 | production | UI journey, inline bridge | MERGE | `journeys/chat.spec.ts` |
| chat-dictation-api.spec.ts | 138 | chromium | API without entry point, build-flags rewrite | DELETE | none (product: dictation mode is unreachable) |
| chat-header-home.spec.ts | 10 | chromium | shell capture + transport attach (T6) | REWRITE | `journeys/chat.spec.ts` |
| chat-message-polish.spec.ts | 27 | chromium | shell setState seed + UI + CSS pins | MERGE (Copy) / DELETE rest | `journeys/chat.spec.ts` |
| chat-reply-announcement.spec.ts | 33 | chromium | patched `alphaClient.send` + UI | MERGE | `journeys/chat.spec.ts` |
| chat-system-notices.production.spec.ts | 48 | production | UI journey | MERGE | `journeys/chat.spec.ts` |
| chat-system-notices.spec.ts | 102 | chromium | UI over remote-agent bridge | DELETE (carry 1 case) | `journeys/chat.spec.ts` |
| chat-voice-mode.spec.ts | 169 | chromium | UI after heavy prototype surgery | REWRITE | `journeys/voice.spec.ts` |
| clock-dialog-accessibility.spec.ts | 37 | chromium (mock, dev) | UI + backdoor text scale/readback | MERGE | `journeys/reminders.spec.ts`, accessibility sweep |
| clock-repeat.production.spec.ts | 109 | production | UI journey | MERGE | `journeys/reminders.spec.ts` |
| cloud-account-migration.spec.ts | 14 | chromium + firefox/webkit | module-in-page (dev simulator, legacy key, backup) | DELETE | none; also remove `scripts/storage-specs.ts:38` |
| cloud-account-panel.spec.ts | 62 | chromium | UI + remote pairing + CLI sign-in | MERGE (2 tests) / DELETE (2) | `journeys/connection-cloud.spec.ts` |

Counts: KEEP 2, MERGE/REWRITE 16, DELETE 3.

## Behaviours that lose coverage if the DELETEs happen without replacement

- **Idempotent voice-note save after a lost reply** (`canonical-notes.spec.ts:61-89, 480-515`): the only checks of the
  `claim`/reconcile path in `CanonicalNotesUi.saveVoice`. They are module-in-page today. Replace with a journey (record
  with `failAfterApplied`) or a Node integration test before deleting.
- **Recording summary save / "Source changed" refusal** (`canonical-notes.spec.ts:517-550`): rewrite through an agent
  reply that carries the summary card; the current version breaks on any edit to `main.tsx`.
- **Chat continuity cases only in the remote-agent spec** (`chat-continuity.spec.ts`): first-message Restore, assistant
  surface sharing the draft through Close, create failure/hang/429 keeping the text, confirmed cancel and its
  non-repetition, history paging to the first message. Each needs a resident-stub option before the file goes.
- **Per-owner draft isolation** (`chat-continuity.spec.ts:660-691`): only covered for the remote kind. If it matters for
  Cloud accounts, add one step to the account-replacement journey.
- **Combined notice copy** (`chat-system-notices.spec.ts:93-102`): carry to the chat journey.
- **`interruptSpeech` capture accounting** (`chat-dictation-api.spec.ts:94-122`): the reopen-one-capture count has no
  other check; `voice-stop-speaking.spec.ts` covers the visible Stop speaking result only.
- Chat dictation and the development Cloud account simulator lose all coverage, which is intended: the first has no
  entry point, the second is deleted by D19/D1/D3.

## Shared helpers worth keeping

- `flag-off-android.ts` + `resident-stub.ts`: the basis of the production lane. They need options for the carried
  cases: `createFails`, `createHangs`, `createLimited`, `abortResult`, `seedHistory`, a `proposals` plugin, `DailyApps.clockHandoff`
  with `clockRepeatDaysVersion`, assistant `surfaceInfo`.
- `helpers/canonical-notes.ts` (10 importers): keep, but stop patching `CanonicalNotesController.prototype.refresh` and
  `BrowserDaily.prototype.perform`; record accepted reads at the transport.
- `helpers/canonical-calendar.ts`, `helpers/browser-calendar.ts` (`chooseCalendarEventAction`), `app-navigation.ts`
  (`returnToApps`, 97 importers), `accessibility-states.ts` (`setTextScale`).
- `voice-assistant-fixture.ts`, `native-speech-fixture.ts`, `voice-fixture-failure-metadata.ts`: survive the dictation
  delete (other importers: `voice-assistant.production`, `voice-stop-speaking`, `listener-invocation.production`,
  `native-speech.production`).
- Repeated inline locators/events worth one home in `harness/nav.ts`: `composer`, `conversation`, `home()`
  (`launcher-home`), `back()` (`alpha-back`), `keyboard(visible)` (`alpha-keyboard-visibility`).
- `harness/a11y.ts` candidates found here: `expectReachable(locator)` (elementFromPoint hit test, camera-tools-layout)
  and `recordAnnouncements(locator)` (MutationObserver, chat-reply-announcement).

## Cross-file actions

- Remove `test/browser/cloud-account-migration.spec.ts` from `scripts/storage-specs.ts:38` with the file.
- `chat-dictation-api.spec.ts` replaces `/src/build-flags.ts` with a body listing `updateChannelCheckEnabled`; deleting
  that flag (D8) breaks this spec, so delete the spec in the same change.
- `chat-voice-mode.spec.ts:97-112` uses `setVoiceSendPolicyForTests` (`apps/app/src/runtime/voice-selection.ts:25`), which
  D8 deletes; delete that test with it.
- Product delete candidate: the chat dictation mode in `apps/app/src/prototype/voice-adapter.ts` (`startTranscription`
  at :913, exposed only as a render value at :1447; no template or control calls it).
- Merge the twins: `chat-continuity` and `chat-system-notices` dev specs into their production twins; `canonical-notes-*`
  micro-specs into the notes basis file.

## Owner questions

1. Chat dictation ("Transcribe") has no user entry point (`startTranscription` is only exposed as a render value). Is it
   planned? If not, delete the dictation mode in `voice-adapter.ts` with `chat-dictation-api.spec.ts`.
2. D5: does the `{kind:'remote'}` paired-agent connection stay for the e2e harness? That decides whether the remote-only
   cases of `chat-continuity.spec.ts` (identity admission, owner A to B draft isolation) are deleted or ported.
3. Should e2e pin the agent-facing `data-agent-id` attributes on Notes screens (one containment check per screen is the
   proposal), and is a mock-vs-live Notes layout parity check wanted at all?
4. Does the production native sign-in journey already assert that account-only sign-in makes no hosted-agent discovery or
   provisioning calls (`/agents`, `upgrade-tier`)? `cloud-account-panel.spec.ts` test 3 is the only check today.
