# C-app-16 ledger (prototype: phone/prototype/scan CSS, Photos, reminders, scan dialogs, selection)

## Done

- `scan-text-layer.ts`: deleted (D4 one-line `export *` shim). `scan-document.ts`, `scan-pdf.ts`, `scan-searchable-review.ts` import `type ScanTextLine` straight from plugin-files `documents/scan-text-layer.ts`. Source path removed from `specs/quint/services/manifest.json` (ScanDocument `sources`).
- `scan-event.ts`: dropped the unused re-exports `suggestScanEvent`, `ScanEventContext`, `ScanEventFields`, `ScanEventRepeat` (A7/D4; no importer apart from a re-export identity test).
- `scan-event-review.ts`: `deviceTimeZone()` (B1 civil-date) and `errorText` (B1 R20).
- `scan-correction-review.ts`: deleted the hidden, never-filled `help` paragraph (A7); `errorText` ×2.
- `scan-review.ts`: deleted the hidden, never-filled `pdfDisclosure` (A7); moved the stray JSDoc onto `openScanReview` (A8); renamed the block-local `document` that shadowed the global to `multiPage` (D11); `errorText`.
- `scan-searchable-review.ts`, `scan-page-camera.ts`: `error instanceof Error?error.message:x` → `errorText(error,x)` (C3, B1 map). `scan-page-camera.ts`: capture uses the existing `live()` predicate instead of a second inline copy (C5).
- `scan-pdf.ts`: AlphaNoteDocuments registration typed `Pick<AlphaNoteDocumentsPlugin,'exportPdf'>` (C2, type-only import); the retry comment moved from `let systemPickers` to `scanPdfRetryable` (A8).
- `photo-viewport.ts`: no `frame?.`/`||0` after the `if(!frame)return` guard; `setPointerCapture` called directly (B2/B4).
- `photo-library-adapter.ts`: unused `type Bag` deleted; local `PhotoLibraryPort` + `registerPlugin` replaced by `alphaPhotoLibrary`/`AlphaPhotoLibraryPlugin` from `native/alpha-photo-library` (B2 map, singleton); `errorCode()` ×2 (B1); no-op try/catch around `crypto.getRandomValues` removed (B2); issue-number references removed (A8); unused `LibraryChange` type import removed.
- `selection-adapter.ts`: `AlphaMailAttachments` typed `Pick<AlphaMailAttachmentsPlugin,'readSelected'|'retainSourceReference'>`, `AlphaFiles` typed `AlphaFilesPlugin` and `AlphaFilesBrowserMethods` (C2, B2 map); unused `MailAttachment`/`FilesStoragePort` imports removed.
- `reminder-adapter.ts`: three inline SHA-256 hex digests → `sha256Hex(JSON.stringify(operation))` (B1 R1); pass-through `events` alias removed, `reminderEvents` called directly (D4); in `del`'s catch, the count refresh that the `finally` immediately repeats is removed (C5); history comment between imports deleted (A8).
- `phone.css` (A7/C5/A8): deleted dead selectors with 0 references in apps, android, test, specs, scripts and `.eliza/client-features`: `.voice-overlay*`, `.alpha-map-share*`, `.app-header-action-*`/`[data-alpha-header-icon-action]`/`.app-header-context`, `[data-alpha-notes-rec-clock]` (+comment), `.alpha-camera-tools*`, `[data-alpha-notes-cards]`/`.note-card*` (+comment); the cutout rule subsumed by `.standalone-app …,.native-phone [data-alpha-system-cutout]`; the second, byte-identical `[data-alpha-home-clearance]` rule and its comment; two pasted copies of the `.maps-chat-card`/`.maps-chat-choice` block; orphan comments ("Real event titles…", "Loading placeholder…"); issue/PLAN.md/date references. Merged the three `.os:has(<modal>)` pill/composer rules into one `:has(:is(…))` rule and the two consecutive `.alpha-map-privacy > summary` rules.
- `prototype.css` (A7): deleted `.al`, `#stage`, `.alpha-note-speech-control` (+comment): no reference anywhere.
- `scan-dialog.css` (C5/B4): textarea focus ring folded into `.scan-dialog :is(button,input,textarea):focus-visible`; `.scan-dialog button[hidden]` dropped from the `[hidden]` rule it is a subset of.

## Deleted tests and formal artefacts

- `test/scan-event.test.mjs`: case "Alpha uses the shared poster suggestion rules, not a copy" deleted (feature deleted: it tested the removed re-export's identity, T5). File kept.
- `specs/quint/services/manifest.json`: source entry `apps/app/src/prototype/scan-text-layer.ts` (file deleted).

## Pins left broken

None introduced by this unit (see Verification for failures caused by other units).

## Skipped

- Shared scan dialog shell (`openScanDialog`, `scanButton`, on-device chip, object-URL helper, `data-scan-child` instead of aria-label lookups): new cross-file module with Quint anchors (`scan-review-dialogs.mjs`), manifest symbols and keyboard specs; structural, left for stage F.
- Merge `scan-event.ts` into `scan-event-review.ts`; split `selection-adapter.ts`; move system-picker counter to `runtime/system-picker.ts`; move video-editor CSS out of `scan-dialog.css`; split `phone.css`; shared `.sr-only`/`.alpha-mask-icon`/`.alpha-status-dot`/`.alpha-dialog` utilities: file moves/splits (stage F).
- `errorText` in `scan-document.ts`: `specs/quint/services/scan-source-conformance.mjs` allow-lists every import of that file and rejects `../lib/error-text` ("Unreviewed scan dependency"); reverted there, left for the stage-E harness port.
- `scanPdfFailure` in `scan-searchable-review.ts`/`scan-document.ts`: not identical (AbortError → 'Cancelled', message trim/300-char cut) — visible-copy change.
- `isAbortError` at `scan-pdf.ts` (B1 map): a value import breaks the source transplant `test/scan-review-pdf-errors.test.mjs` (string-replaced import specifiers); left for stage E port.
- B2 map says `alphaNoteDocuments` singleton for `scan-pdf.ts`, but this site registers AlphaNoteDocuments with a `web:` BrowserNoteDocuments fallback; the singleton would drop it. Typed with the interface only (map wrong for this site).
- `reminder-adapter.ts`: `deviceTimeZone()` at the create path (`zone:`) — the vm transplant `scripts/test-reminder-time-flow.ts` strips imports and runs that path; `?.()` on `calendarForm*` hooks — same harness's Shell lacks them; `runReminderOperation`/`pendingFor` extraction (Quint mutation anchors, ~45 manifest symbols); merging the two `vset` calls (tests index `patches.at(-1)`); `surfaceInfo` cast (`daily-apps.ts` type lacks `reminderTodoVersion`, not owned); `Bag = any` → shell types (B3 per-adapter migration, large); locale-time conversion (Q-UI-10 Open); journal rename (Q-UI-9 Open); DailyApps web guard (Q-UI-28 Open).
- `scan-page-camera.ts` copy "Captured Nothing…" (Q-UI-12 Open); try/catch around `getUserMedia` request (synchronous `clone()`/`MediaStream` throws not excluded).
- `phone.css` 538 vs 831 camera-mode rules (Q-UI-13 Open); `prototype.css:3` `.os` tokens (Q-UI-14 Open); `prototype.css` `body`/`html,body` rules (in-page specs that import only prototype.css would change background); Public Sans `@font-face` collapse to weight ranges (a range face renders intermediate weights such as 450 at that weight instead of snapping to 400/500 — not provably identical); `.rail` dev rules (dev stylesheet is a move).
- `photo-library-adapter.ts` `readScope` swallow (changes refusal reason, visible); `typeof document` guards (Q-DEV-17); busy predicate (pinned slices in `photo-library.test.mjs`).
- `photo-viewport.ts` named constants / exported binding type (camera-adapter not owned; low value).
- `selection-adapter.ts` `grantedUri`, MIME list constant, `findBySelection`/`recordAndRelease` (Quint `files-recent-index.mjs` exact sequences), `Selection`/`Bag` renames, template placeholder defaults.
- `scan-link-review.ts`: inline styles (visual) and link cap (Q-UP-4).

## Verification

- `npx tsc --noEmit`: no errors in owned files (26 lines of errors, all in other units' files: agent-calendar-adapter, calendar-adapter, calendar-confirmation, calendar-edit/form-draft-adapter, runtime/cloud-voice).
- `node --test` (tap): scan-event 3/3, scan-all-day-draft 3/3, scan-review-pdf-errors 6/6, scan-page-camera 1/1, photo-viewport 4/4, photo-library 19/19 (includes the Node photo-library fixture), selection-ask-readiness 5/5, theme-palette 3/3, font-license 9/9, home-inset-layout 4/4, product-identity 8/8.
- `node --import tsx scripts/test-reminder-time-flow.ts`: PASS.
- `test/calendar-view-rules.test.mjs`: 4 pass, 3 fail — `civilDayDiff is not defined` (calendar draft adapters' vm transplant, another unit's civil-date migration) and "tomorrow is today now" (device calendar / calendar-adapter path, not owned). The reminder-adapter case passes.
- `test/quint-files-recent-index.test.mjs`: fails with `index.revokeTree is not a function` (files-index.ts / Quint driver, not owned; unrelated to scan-pdf).
- Pass: scan-document-drafts 6/6, quint-system-picker-visibility 3/3, quint-scan-conformance 1/1 (after reverting errorText in scan-document.ts), quint-scan-review-dialogs 2/2, quint-photos-window 2/2, locale-time-usage 2/2, quint-reminder-decision 2/2, quint-reminder-intents 2/2, quint-reminder-refresh 2/2, quint-reminder-todo-attempt 2/2, reminder-open-intent 10/10, retained-reminder-tap-admission 6/6.
- Fail, not caused by this unit: quint-reminder-tap-tokens 0/2 — the `quint run specs/quint/application/ReminderTapTokens.qnt` child process fails after ~150 s, before the adapter is loaded (the sibling reminder replays that bundle the same adapter pass); quint-canonical-calendar-draft-handoff 0/1 — `page.goto` timeout starting the dev server in `test/fixtures/calendar-mounted-editor.mjs` (machine under parallel load / other units mid-edit). Neither was re-run in isolation on a quiet machine.
- Not run: Playwright specs, `npm run build`/`audit:bundle` (parallel stage), Android (no Java touched).
