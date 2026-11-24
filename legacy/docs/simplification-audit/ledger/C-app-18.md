# C-app-18: apps/app/src/prototype/template.html (in-file cleanup)

## Done
- `template.html`: deleted the three Home date lines (`<sc-if value="{{homeShowDate}}">…` on Home, in the app layer and in the
  development shade). Its only producer, `installHomeCardVisibility` (`data-adapter.ts`), hard-sets `homeShowDate:false`;
  no other producer exists (git grep apps/scripts/test/specs and `.eliza/client-features`). Part 1 #8 / NEW-TPL-FALSE, A5/A7.
- `template.html`: deleted dead Notes "Recently deleted" controls whose only producer is `canonical-notes-ui.ts`, which sets
  them to constants: the `{{notes.trashCanErase}}` "Empty" header button and "Delete now" button (`trashCanErase:false`),
  the `{{notes.trashError}}` status line (`trashError:''`) and the whole `{{notes.trashConfirmOpen}}` dialog
  (`trashConfirmOpen:false`, `trashFullOpen:false`; its other bindings `trashConfirmTitle/Text/Text2/Label/trashFullReview`
  lost their producer when stage A2 deleted `notes-trash-adapter.ts`). model.js produces none of these keys. A7 (found
  by a binding-vs-producer scan of the template).
- `template.html`: deleted tombstone/history comments: "No heads-up banner…" (A8), "MVP-DEFERRED … restore after…" in the
  Files Share sheet (A8), and the issue number "(#416)" in the development shade comment.
- Already done by earlier stages (not repeated): Wallet region (A3, D2), `r.kCalendarDisplay` row (A3 B227), legacy-notes
  recovery/Return/Older controls (A2).

## Deleted tests and formal artefacts
- None.

## Pins left broken
- None observed. Absence assertions on `[data-alpha-home-date]` (`home-attention.production.spec.ts`,
  `home-daily-overview*.spec.ts`, `home-inbox.spec.ts`, `large-text-overlap.spec.ts`, `mail-review.production.spec.ts`)
  and `check-notes-view-refinement.mjs:137` ("Empty Recently deleted" count 0) stay true. Refinement harnesses that list
  `template.html` as a source file (`calendar-form-controls`, `dock-clearance-ownership`, `modal-scrim-ownership`,
  `modal-toast-forwarding`, `notes-recorder-media-admission`, `photos-owned-album-dialog`, etc.) were not run here.
- Cross-file follow-ups (other owners): `data-adapter.ts` `homeShowDate/homeShowSetup/homeDateLabel/connectGoogle` and
  `main.tsx` `openGoogle` argument, `phone.css` `.home-date-*` rules, `test/final-ui-lifecycle.test.mjs:17-19`,
  `specs/quint/legacy/home-layout/check-home-layout-refinement.mjs:127`; `canonical-notes-ui.ts` constant fields
  `trashCanErase/trashError/trashEmptyDisabled/trashConfirmOpen/trashFullOpen/emptyTrash/trashConfirmGo/trashAskDelete`
  and the `trashConfirmOpen` read in `subview-accessibility.ts:69` now have no template consumer.
- Unbound template keys found but kept: `{{agentReminderStatusVisible}}`, `{{agentReminderStatusText}}`,
  `{{agentReminderRefresh}}` and `{{n.openDisabled}}` in the development stand-in shade have no producer in the repo; they
  sit in the region stage F moves to `development-system-surfaces.html`, so they are left for that move.

## Skipped
- Dev-region splice (prototype Phone/Messages, canned Browser pages/Nopa booking/permission sheet, calendar invites/RSVP,
  Photos people/place, Maps `notNative`, shade, fixture voice panel, canned chat cards, prototype Contacts, Settings
  consent/password sheets, Files fixtures and Move/Share sheets, Workflows History): needs a new file, `template-source.ts`
  and adapter edits (U-R11, stage F); Q-DEV-1 open on which parts stay.
- Photos in-app share sheet and the "Back to apps" single mechanism: Q-UI-17 open.
- `<sc-if test="{{review.canOpen}}">` → `value=`: Q-UI-6 open (visible behaviour change).
- "Ask Alpha" → `{{name}}`: Q-UI-11 open (copy change).
- Storage warning single form (part 1 #9): changes markup/accessibility of a visible alert.
- Style classes (switch, sheet, avatar, app header, lucide mask, file tile, skeleton, compute mark, browser menu item),
  icon literals into `IC`, calendar block / photo tile / notes detail / note row / Maps row / composer / draft-notice
  dedup, calendar draft rows merge, `homeEditStyle`: need `phone.css`, `model.js` or presenter changes owned by others,
  or are restyling.
- `data-alpha-app-header="detail"` on the workflow step free-text row (part 2 #20): removing it changes standalone-app
  CSS (`margin-top/height !important`) and dock clearance, a visible change.
- `notes.audioDeletionUnknown`/`notes.canRecord` rows: `voice-adapter.ts` also writes `audioDeletionUnknown`; not proven
  constant.
- Whitespace-only lines: formatter commit (D9).

## Verification
- `node --test` on 21 host tests that read the template (home-cards, home-shell, chat-stop-controls,
  chat-transcript-window, voice-assistant, gesture-zones-single-instance, dc-lite-keys, theme-palette, product-identity,
  quint-shell-screen, notes-recorder-controls, files-browser, automations-unified, final-ui-lifecycle,
  browser-reading-capability, voice-in-chat-only, voice-denied-recovery, photos-view, phone-adapter,
  aosp-secure-camera-policy, android-instrumentation-runner): 262 tests, 261 pass, 1 fail. The failure
  (`notes-recorder-controls.test.mjs:105`, `ReferenceError: isOperationId is not defined` inside a transplanted
  `canonical-notes-ui`/voice decorator) is in another implementer's file, not template markup.
- Tag balance checked before/after: `div`, `button`, `svg`, `sc-for` open/close counts stay equal; `sc-if` keeps the
  same pre-existing open/close offset.
- Not run: `npx tsc` (no TS owned), renderer build, `npm run audit:bundle`, Playwright, Quint harnesses (other files are
  mid-edit in parallel).
