# Chunk test-15: journey specs A–F, core loops (production), inbox unsaved recovery

All nine files are Playwright specs that mostly drive real UI. None is a pure delete: each carries cases that
no other spec covers. The work is consolidation into area journeys on one harness, removal of backdoors, and
porting the cases that depend on the legacy Notes source (C1) before or with that deletion.

| File | Lines | Project | Kind | Verdict | Target |
|---|---|---|---|---|---|
| `test/browser/inbox-unsaved-recovery.spec.ts` | 68 | chromium + firefox/webkit | UI journey over in-page provider patch; 1 T6 case | MERGE | `journeys/inbox.spec.ts` "unsaved edits" (stays in the storage list) |
| `test/browser/journey-a-conversation.spec.ts` | 367 | chromium (dev) | UI journey + read-only `/src` reads | KEEP (rename) | `journeys/chat.spec.ts`; voice test → `journeys/voice.spec.ts` |
| `test/browser/journey-b-voice-note-actions.spec.ts` | 402 | chromium (dev) | UI journey on three backdoors (legacy Notes, `main.tsx` rewrite, fiber walk) | REWRITE | `journeys/notes.spec.ts` (record → transcript → summary) + `journeys/calendar.spec.ts` (agent proposals) |
| `test/browser/journey-c-alarms.spec.ts` | 203 | chromium (dev) | UI journey + `/src` reads | MERGE (drop decline test) | `journeys/reminders.spec.ts` |
| `test/browser/journey-core-loops.production.spec.ts` | 931 | production | UI journeys on a private Capacitor stub | KEEP, SPLIT | chat, reminders, browser, notes, calendar/maps, workflows, inbox, camera-photos, files, settings journeys (production project) |
| `test/browser/journey-d-digests.spec.ts` | 271 | chromium (dev) | UI journey, fake clock, `/src` reads | MERGE (fold test 2) | `journeys/workflows.spec.ts` |
| `test/browser/journey-e-browser-credentials.spec.ts` | 278 | chromium (dev) | UI journey, local page server | KEEP (rename) | `journeys/browser.spec.ts` |
| `test/browser/journey-f-email-notifications.spec.ts` | 371 | chromium (dev) | UI journey over in-page provider patch | MERGE | tests 1-4 → `journeys/inbox.spec.ts`; test 5 → `journeys/notifications.spec.ts` |
| `test/browser/journey-f-hosted-result.spec.ts` | 93 | chromium, own Vite server | UI journey + ledger read | MERGE | `journeys/notifications.spec.ts` |

Totals: 9 reviewed, 0 DELETE, 3 KEEP (A, E, core-loops, all renamed/split), 6 MERGE or REWRITE.

## Behaviours that lose coverage if the planned deletions land first

- **C1 (Previous notes) breaks five places here.** `helpers/legacy-notes.ts` and the local/`helpers/native-notes.ts`
  `openRetainedNativeNotes` are the only way these specs reach Notes:
  - core-loops "J05 on Android: … one web-linked note" (only production proof that a reviewed page answer saves one
    note with its web source);
  - core-loops "B / J02 on Android" (only production proof that recording saves audio only and transcription is
    explicit);
  - journey B recording/transcript/summary (only dev-profile proof);
  - journey A decline step (Notes read only; the proposals/journal checks remain).
  The resident stub answers `/api/notes/state` with 503, so canonical Notes need stub handlers before these can be
  ported. These ports must land with C1, not after.
- **Note → Calendar hand-off** is exercised only through `helpers/note-schedule-contract.ts`, which rewrites the
  served `main.tsx` text to add a global hook (the owner removed the menu controls). If the owner keeps the feature
  without a control, it has no honest test; if not, the helper, steps 4a/4b of journey B and
  `note-calendar-handoff.spec.ts` go together.
- **Dev browser calendar access** in journey B and journey F test 5 relies on `helpers/browser-calendar.ts`
  walking React fibers to set `calendarAuthority`; C2 trims that field. A visible dev route is needed.

## Shared helpers worth keeping / creating

- `flag-off-android.ts` should absorb core-loops' private stub: Clock outcomes (`opened|unavailable|unknown`),
  AlphaBrowser tabs/commit/`reviewQuestion`, note recorder + AlphaNoteAudio, `scheduleReminder`/`listReminders`,
  AlphaCalendar save, held resident streams with `cancelStream`. None exist there today (grep).
- New `helpers/mail-provider.ts`: one typed synthetic Gmail boundary replacing 9 hand-written copies
  (`journey-f-email-notifications`, `inbox-unsaved-recovery`, `journey-f-reviewed-send`, `inbox-folders-drafts`,
  `gmail-mvp-scope`, `inbox-owner-fence`, `file-email`, `photo-email`, `use-in-email`, `owner-gmail-read-state-absent`).
- Dev-profile helpers to share: `queueDevelopmentAction` (repeated in A, B, C), `readDevelopmentProposals`
  (A, B, C), `holdAgentReply`, oscillator mic fixture (A, B), clock helpers `tickFor`/`advanceTo` (D), worker-scoped
  `pageServer` (E) and `hostedServer` (F hosted + `dev-hosted-journey`).
- Keep `hosted-harness.ts` while hosted digests stay (owner question Q-HOST-1).

## Cross-file actions

- Delete `installNoteScheduleContract` from core-loops (no-op in the production bundle) and the trailing
  `beforeEach` (move to top).
- Delete core-loops' local copies of `button`, `native`, `residentHome`, `openRetainedNativeNotes`.
- Remove the `toHaveCount(0)` assertions on `Resume unsaved email` (label absent from `apps/app/src`, so vacuous) in
  `inbox-unsaved-recovery` and `journey-f-email-notifications`.
- Verify `Restore my saved edits` (clicked in `inbox-unsaved-recovery` test 6): not found in `apps/app/src` by grep.
- Rename the storage-list entry in `scripts/storage-specs.ts:12` when `inbox-unsaved-recovery` merges.
- One decline case only (chat journey); drop journey C test 2 and the duplicate in `chat-decline.production.spec.ts`
  or keep that one as the production twin.

## Owner questions

1. After C1, what does a development-agent `create_note` proposal write to, and should the production stub serve
   canonical Notes so J05/B-J02 can be ported? (Q-NOTES-2)
2. Is the Notes → Calendar/reminder hand-off still a product feature now that its menu controls are gone? If yes,
   where is its entry point; if no, may `note-schedule-contract.ts` and its cases be deleted?
3. Hosted digest result notices (journey F hosted) stay or go (Q-HOST-1/5)?
4. Should the development Clock's "Alarm saved." stay as a dev-profile claim, given Android only ever reports a
   handoff `opened`?
