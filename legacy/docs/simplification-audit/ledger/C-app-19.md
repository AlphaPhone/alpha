# C-app-19 — prototype: use-in-email, video edit, voice, workflows

All eight files in `chunks/app-19.files.txt` still exist; all were edited in place. No file moved, no test deleted.

## Done

- `prototype/use-in-email-review.ts`: `Shell = any` replaced by `shell-types` imports (`ShellHost`/`ShellState`/`ShellMessage`/`ShellPrototype`/`ViewDefinition`/`RenderValues`) plus three narrow local types (`Message`, `InboxView`, `RenderedMessage`) (C1, B3 map); `fit` alias removed, `fitEmailTarget` called directly (D4); `target()` fallback (`'Inbox unavailable'`) and `useInEmail?.()` probe removed, both members are installed by inbox-cloud-adapter just before this adapter (B2); `shell.toast?.` and `unmount?.apply` made plain calls (B2); redundant `typeof entry.text === 'string'` dropped now that rows are typed (B3).
- `prototype/video-edit-review.ts`: `clock` alias removed, `videoClock` called directly (D4).
- `prototype/voice-activity.tsx`: `voiceBarHeights`, `voiceVisuals` un-exported (A7; no importer anywhere).
- `prototype/voice-adapter.ts`: local `Clip` replaced by `VoiceClip` from `native/alpha-voice-cloud`; inline `AlphaNoteAudio` generic and local `SavedAudio` replaced by `AlphaNoteAudioPlugin`/`SavedNoteAudio` from `native/alpha-note-audio`; `appSettings` typed `Pick<AlphaDevicePlugin,'openSettings'>` (C2, B2 map); identical ternary `cloudMode ? 'Voice unavailable' : 'Voice unavailable'` collapsed (B4); `binding = composerBinding` alias removed (D4); `peaks = r.levels.length ? r.levels : []` → `r.levels` (always an array) (B4); issue number removed from the Clef comment (A8; Clef kept, D7).
- `prototype/workflow-adapter.ts`: inline `interface ApprovalNoticeNative` replaced by `Pick<AlphaHostedResultsPlugin, …4 approval-notice methods>` (C2, B2 map); duplicate import lines from `workflow-device-contract` and `workflow-authoring` merged (single-line, so T2 fixtures still strip them); "legacy workflow list" comment reworded (A8).
- `prototype/workflow-authoring.ts`: `draftStorageDescription` deleted (A7, 0 readers); `deviceTimeZone` alias removed, `workflowDeviceTimeZone` called (D4); two `workflow-local-time` imports merged; inline `AlphaConnection` generic → `AlphaConnectionPlugin`, inline `AlphaCalendar` generic → `Pick<AlphaCalendarPlugin,…>`, `calendars:Bag[]` → `WorkflowCalendar[]` (C2, B2 map); generation error status collapsed to `error instanceof Error ? message.replace(/^Workflow needs clarification: /,'') : 'Failed'` (same results for both arms, D9); duplicated "abort in-flight generation" block extracted to `stopGeneration()` (C3, used twice).
- `prototype/workflow-filters.ts`: `WORKFLOW_TYPES`, `WORKFLOW_STATUSES` un-exported (A7); refresh handler's two `close()` arms collapsed, `current()` still read before `close()` (D9).
- `prototype/workflow-notice-question.ts`: `let abort=()=>{}` placeholder replaced by a hoisted `function abort()` (D9).

## Deleted tests and formal artefacts

None.

## Pins left broken

None caused by this unit. Pre-existing (from stage A, not this unit's edits), observed while verifying:
- `specs/quint/application/manifest.json` model `VoiceTurnReview` names `reviewConversationTurn` and `conversationReview` in `voice-adapter.ts`; both were removed by A3 (test-only review policy). Needs the manifest/model update A3 describes.
- `specs/quint/refinement/native/batch-capture-completion.mjs` needs the anchor `  /** Holds a finished transcript`, which A3 removed with the review path (`test/quint-batch-capture-completion.test.mjs` fails: "Cannot bind the current renderer capture observer"). Needs a new end anchor or an import-based port.

## Skipped

- voice-adapter #1 (paired route) / #3 (review policy) / #4 (legacy voice-note deletion): #1 and #3 were done by A3/A4; #4 is Open owner question Q-NOTES-4.
- voice-adapter #2 `enter(preparedLocal, …)` unused parameter: `test/private-preview-cartesia-route.test.mjs:82` rewrites the literal `enter(undefined,'default',chat)` (21 passing route cases); the gain is one parameter, so it waits for stage E to port that test instead of deleting the coverage.
- voice-adapter #5 split, #13 dev-route move, #15 hook registry, #20 `legacyChatRecorder` rename (template + fixtures): stage F / cross-file.
- voice-adapter #6 media-unconfirmed helpers, #7 read-outcome toasts, #11 `voiceStopped` table, B1 map (`isNamedAbortError` :137, `delay` :677): each adds a module-level identifier that the T2 fixture `test/fixtures/cloud-voice-view.mjs` (strips imports, evals with a fixed box) and the anchor-sliced Quint harnesses do not provide; `voice-recovery-state.test.mjs` regex-extracts `onState`/`onError`. Wait for stage E ports.
- voice-adapter #8 `formatRecordingClock`: not identical (it prints `h:mm:ss` from one hour; the inline clocks print `mm:ss`), so it would change visible copy.
- voice-adapter #12 `deviceVoice` → `AlphaVoiceCloudPlugin`: the native `transcribeRecording` type requires `environment`/`credentialId`, which this site does not pass; only `Clip` was migrated.
- voice-adapter #14 (A6 Notes undo layer), workflow-adapter #1 / workflow-authoring #8 (prototype builder slots): need `model.js`/`template.html` changes outside this unit.
- voice-adapter #16, #17, #22 (shell typing / `?.()` probes on adapter-attached members): this file still needs `Bag`; R5 migrates one adapter per change, and the probes target members other adapters attach.
- voice-activity #2 `typeof element.animate`: jsdom-based fixtures (`voice-markup.mjs`, `voice-composer-recovery`) may run without WAAPI; #3/#4/#5 readability/typing deferred (callers pass computed strings); #6 rename is stage F.
- video-edit-review #1/#3 shared dialog helper (`ui/owned-dialog.ts` does not exist yet), #6 format: blocked by `test/quint-video-edit-review.test.mjs` literal-substring rewrites.
- use-in-email-review: the `typeof inbox?.useInEmail === 'function'` gate in `renderVals` kept: `test/use-in-email-review.test.mjs:17-18` drives "no Inbox adapter, no control"; the `emailTarget` fallback was removed since `open`/`confirm` are only reachable through that gate. #6 D2 hook registry: later.
- workflow-adapter #2 (`!view.automationsManaged` auto-refresh and `'scheduled'` phase): dead in the product, but `scripts/workflow-renderer-fixture.ts:171` installs the adapter with `views={workflows:{}}` and the four `scripts/test-workflow-*-ui-flow.ts` suites depend on that render-triggered refresh. Remove when stage E ports those suites.
- workflow-adapter #3/#4 and workflow-authoring #4 (upstream `PHONE_WORKFLOW_*` constants): importing them adds identifiers the T2 transplants (`workflow-renderer-fixture.ts`, `workflow-execution-fixture.mjs`, Quint `workflow-adapter-fixture.mjs`, `workflow-local-source.mjs`, `workflow-draft-reopen.test.mjs`) do not provide; workflow-authoring #4 also needs the protocol-number mapping checked (report: Medium).
- workflow-adapter #5 (run-state predicates to runtime), #7, #9, #10, #14, #18, #19: Quint harnesses and the services manifest pin these names/shapes; cross-file (stage E/F). #8 `replaceFlow`: one of the four sites matches on `id`, not `current.id`; not provably identical, skipped. #13 `typeof BroadcastChannel`: transplant contexts may not provide it.
- workflow-authoring #2 (previous-notes branches): already removed by A2. #3 (`save_note`) and #18 (`Send`/`Do` palette): owner questions (app-19 Q2, Q3). #6/#7 draft-store injection and slot helper: cross-file (main.tsx, browser/workflow-drafts.ts). #9 `calendar_range` `Intl…timeZone` → `workflowDeviceTimeZone()`: adds a `'UTC'` fallback, a behaviour change. #11 fences, #16 `showAgentStatus` move: cross-file / harness-pinned. #17 `Bag`: deferred with the adapter migration.
- workflow-filters #2 (one labels record shared with automations-adapter), #3 dialog helper, #4 theme-token copy, #5 `iconSpan`: cross-file or visual.
- workflow-notice-question #5 `WorkflowTapResult`: the owner (`runtime/workflow-device-contract.ts`) does not export it; #6 alias: stage F.

## Verification

- `npx tsc --noEmit -p .` (whole repo, run after the last edit): no errors.
- Host tests that pin these files (31 files), run before and after the edits with `node --test` (Node v26.13.0). Identical results, except:
  - `test/notice-owner-startup.test.mjs`: passed at baseline, now fails to load `apps/app/src/runtime/calendar-approval-client.ts` (TypeScript parameter property not supported in strip-only mode). That file was changed by another implementer; this unit did not touch it.
  - `test/quint-video-edit-review.test.mjs`: timed out at baseline (6 tests in parallel); after the edits it passes 3/3.
  - `test/notes-recorder-controls.test.mjs`: 1 failure both before and after (pre-existing).
  - `test/use-in-email-review.test.mjs`: 18/18 after keeping the inbox gate (17/18 with it removed).
- Quint harness tests that load these files: `quint-approval-decision` 2/2, `quint-email-suggestion-review` 1/1, `quint-photos-owned-album` 4/4, `quint-photos-window` 2/2, `quint-quiet-voice-retry` 1/1, `quint-voice-owned-navigation` 1/1, `quint-voice-transcript-follow-refinement` 1/1, `quint-workflow-lifecycle-change` 1/1, `quint-workflow-local-source` 4/4. `quint-batch-capture-completion` fails on an anchor A3 removed (see Pins). `quint-workflow-execution-audit-admission` fails because its input set changed while it ran: first "Refinement input changed during checking", then ENOENT on `test/camera-preview-recovery.test.mjs`, which another unit deleted. `notes-recorder-media-admission` timed out in `page.goto` of its Vite page, twice. Neither result proves anything about this unit.
- Manifest symbols that point at these eight files, checked with the same regex `scripts/quint-lib.ts` uses: all resolve except the two A3 entries listed under Pins.
- Not run: `npm run --ignore-scripts build`, `npm run audit:bundle`, Playwright specs, Android build (no Java touched).
