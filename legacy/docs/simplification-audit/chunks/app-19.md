# Chunk app-19 — prototype: use-in-email, video edit, voice, workflows

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/use-in-email-review.ts | SIMPLIFY (small) | 84 | 76 |
| apps/app/src/prototype/video-edit-review.ts | SIMPLIFY | 79 | 65 |
| apps/app/src/prototype/voice-activity.tsx | KEEP (unexport, minor) | 86 | 82 |
| apps/app/src/prototype/voice-adapter.ts | SPLIT (after deleting dead paired route, test-only review policy, legacy device-notes deletion) | 1523 | ~1070 across `prototype/voice/*` |
| apps/app/src/prototype/workflow-adapter.ts | SIMPLIFY, then MERGE into `prototype/workflows/` with automations-adapter + clock-adapter | 485 | ~430 |
| apps/app/src/prototype/workflow-authoring.ts | SIMPLIFY | 248 | ~225 |
| apps/app/src/prototype/workflow-filters.ts | SIMPLIFY (small) | 39 | 32 |
| apps/app/src/prototype/workflow-notice-question.ts | KEEP (minor) | 30 | 29 |
| **Total** | | **2574** | **~2009** (pre-format) |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Shell` / `Bag` | type (`any`) | use-in-email-review.ts:5; voice-adapter.ts:54; workflow-adapter.ts:19; workflow-authoring.ts:16 | ~60 copies (research app-prototype §4) | shared `ShellHost`/`ViewApi` (types.md) |
| `deviceVoice` (AlphaVoiceCloud) | const/interface | voice-adapter.ts:67-76 | 14 `registerPlugin('AlphaVoiceCloud')` files | `runtime/plugins/alpha-voice-cloud.ts` |
| `appSettings` (AlphaDevice.openSettings) | const | voice-adapter.ts:77 | maps-adapter.ts:51, agent-adapter.ts:83, settings-adapter.ts:115, browser/notifications.ts:230,238 | `runtime/plugins/alpha-device.ts` |
| `noteAudio` (AlphaNoteAudio) | const | voice-adapter.ts:80-88 | browser/register.ts | `runtime/plugins/alpha-note-audio.ts` |
| `ApprovalNoticeNative` (AlphaHostedResults) | interface | workflow-adapter.ts:265 | 5 files register AlphaHostedResults | `runtime/plugins/alpha-hosted-results.ts` |
| `notificationNative` (AlphaNotifications) | helper | workflow-adapter.ts:144 | 8 files | `runtime/plugins/alpha-notifications.ts` |
| `secure` (AlphaConnection), `calendar` (AlphaCalendar) | const | workflow-authoring.ts:19,21 | 3 / 12 files | `runtime/plugins/*` |
| `Clip` | type | voice-adapter.ts:55 | `VoiceRecordingStopped` (runtime/cloud-voice.ts) | alpha-voice-cloud plugin module |
| `SavedAudio` | type | voice-adapter.ts:79 | `SavedNoteAudio` (note-recorder.ts) | alpha-note-audio plugin module |
| media-unconfirmed idiom | helper (inline ×11) | voice-adapter.ts:158,271,446,518,577,683,824,867,886,921,935 | — | `prototype/voice/voice-media.ts` |
| m:ss clock (inline) | helper | voice-adapter.ts:963,1434 | note-recorder.ts:119 `formatRecordingClock`; camera-adapter.ts:1229,1377,1612 | `formatRecordingClock` |
| read-aloud outcome toasts | helper (inline ×2) | voice-adapter.ts:1339,1396 | — | `notes-voice.ts` |
| `composerBinding` | helper | voice-adapter.ts:449 | use-in-email-review.ts:18-19 `agentSession`/`cloudSession` | `connectionFence()` in runtime/connection-ui |
| `CALL_PAUSED` | const | voice-adapter.ts:56 | literal again at :708 | keep, use everywhere |
| `runOutcomeUnknown`, `runWorkerRunning` | helper | workflow-adapter.ts:22-24 | outcome-unknown checks in automations-adapter.ts, browser/simulated-workflows.ts | runtime/workflow-protocol.ts |
| `READ_ONLY_PHONE_OPERATIONS` | const | workflow-adapter.ts:26 | workflow-authoring.ts:24 `known` | derived from upstream in runtime/phone-workflow-authoring.ts |
| device-op list (inline) | const | workflow-adapter.ts:62 | upstream `PHONE_WORKFLOW_DEVICE_OPERATIONS`; browser/development-workflows.ts:33 | upstream import |
| `known` / `supported` | const/helper | workflow-authoring.ts:24-25 | upstream `PHONE_WORKFLOW_*`, `phoneWorkflowOperationProtocol` | upstream import |
| step limit `32` | literal | workflow-authoring.ts:102,127 | upstream `PHONE_WORKFLOW_MAX_STEPS` | upstream import |
| `Pending` | type | workflow-authoring.ts:17 | upstream `PhoneWorkflowSaveExpectation` | upstream type |
| draft slot `'workflow-draft:v1:'+sha` | const | workflow-authoring.ts:95 | browser/workflow-drafts.ts:11 | `workflowDraftSlot()` in runtime/workflow-device-contract.ts |
| `deviceTimeZone` | alias | workflow-authoring.ts:29 | workflow-local-time.ts:26 | delete |
| `SCHEDULE_POLICY` ('Phone must be on') | const | workflow-authoring.ts:33 | workflow-adapter.ts:57 | runtime/phone-workflow-authoring.ts |
| `showAgentStatus`, `AgentStatusShell` | helper/type | workflow-authoring.ts:241-248 | — (misplaced) | runtime/connection-ui.tsx |
| `Result` (tap result) | type | workflow-notice-question.ts:5 | implicit in workflow-adapter.ts:163 | runtime/workflow-device-contract.ts |
| `WorkflowTypeFilter`/`WorkflowStatusFilter`/`WORKFLOW_TYPES`/`WORKFLOW_STATUSES` | type/const | workflow-filters.ts:3-6 | automations-adapter.ts:32-34 `Filter`/`filterNames` | workflow-filters.ts (one labels record) |
| `glyph` | helper | workflow-filters.ts:19 | media-review-controls.ts:2 `mediaToolIcon`, browser-surface.ts:27, calendar-editor.ts:12 | icon-style.ts `iconSpan()` |
| `button` | helper | workflow-filters.ts:20; video-edit-review.ts:17 | many imperative dialogs | shared DOM helper |
| dialog lifecycle (`close/back/visibility/dispose`) | helper | video-edit-review.ts:64-65; workflow-filters.ts:16-18 | 30+ files adding `alpha-back` listeners | `openOwnedDialog()` in runtime/ |
| `clock` | alias | video-edit-review.ts:18 | browser/video-edit.ts:26 `videoClock` | delete |
| `fit` | alias | use-in-email-review.ts:30 | upstream `fitEmailTarget` | delete |
| `voiceVisuals`, `voiceBarHeights` | const | voice-activity.tsx:32,35 | none (exported needlessly) | unexport |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| Paired/"agent" voice route in voice-adapter (`createPairedVoice` import, `pairedVoice/pairedReady/pairedAsrReady/preparingPaired`, lines 316-331, related labels/operands ~45 lines) | `route==='agent'` iff `selected==='cloud'` iff `cloudMode` (283, 287) but the block needs `!cloudMode` (316); `selectVoiceRoute` never returns `'agent'` (voice-selection.ts:127-134); DECISIONS D8 | High |
| `enter()` `preparedLocal` parameter + line 297 | all 6 call sites pass `undefined` | High |
| Test-only `'review'` voice send policy path (`reviewConversationTurn`, `conversationReview`, review layout 950-954) | only reachable via `setVoiceSendPolicyForTests` (test mocks); PRD P-39 auto-sends; DECISIONS D8; Quint manifest symbol `reviewConversationTurn` must be updated | Medium-High |
| Legacy device voice-note deletion/Trash path in voice-adapter (`deleteVoiceNote`, `refusedVoice`, `deleteVoiceNoteForever`, `reviewAudioDeletion`, `commitAudioNoteDeletion`, legacy `voiceNoteStorage`/`persistNoteRecording`/`addTranscript` branches, ~190 lines) | `vo.del` only `if(!current.canonicalNotes)` (1357); `trashVoiceNoteWithRecording` caller is inside `notesSourceMode==='legacy'` branch (agent-adapter.ts:1047,1074); operates on `notesStore`; DECISIONS D1 | Medium (owner question on `restoreDeletion`/`refreshDeletionStatus`) |
| `draftStorageDescription` (workflow-authoring.ts:20) | `git grep`: 1 hit (its declaration) | High |
| Previous-notes branches in workflow-authoring `noteRows`/`chooseNote` (54, 134) | legacy `notesStore`/`vget('notes')` path; DECISIONS D1 | High (with D1) |
| `!view.automationsManaged` auto-refresh branch + `'scheduled'` phase (workflow-adapter.ts:462,468) | automations-adapter.ts:44 sets it true unconditionally; always installed right after (main.tsx:168,175) | High |
| `view.persist=[];view.reply=()=>null;` (workflow-adapter.ts:66) | A6 undo of model.js prototype workflow behaviour; delete with model.js source | Medium (needs model.js change) |
| Prototype builder template slots returned by the typed editor (`isEvent/isPlace/isMsg/isEmail:false`, `hasApps:false`, `freeTextStyle`, `onText:()=>{}`, metadata editor `steps:[],palette:[]`) | consumed only by model.js prototype builder branches (`template.html:3658,3852,3899-3947`; `model.js:4514-4542`) | Medium (template + model.js) |
| voice-adapter A6 overrides (folder reset 1253, bars flattened 1269/1354, `vo.share` toast 1355, `noSummary`, `lines=[]`) | neutralise model.js Notes prototype features | Medium (template + model.js) |
| `export` on `voiceVisuals`, `voiceBarHeights`, `WORKFLOW_TYPES`, `WORKFLOW_STATUSES` | no importer outside their file | High |
| Identical ternary `cloudMode ? 'Voice unavailable' : 'Voice unavailable'` (voice-adapter.ts:347); unreachable last arm at workflow-authoring.ts:184 | code reading | High |
| Notes API members `voiceNoteActive`, `reviewAudioDeletion`, `commitAudioNoteDeletion` (as API members) | read only inside voice-adapter through `current.` | High (make closures) |

## Cross-file actions
1. **Remove the "agent"/paired voice route** — `prototype/voice-adapter.ts` (finding #1), `runtime/voice-selection.ts` (`selectVoiceRoute` return type, `VoicePreference 'agent'`), `runtime/voice-states.ts` (`transcriptProvenance` `paired` option), `runtime/voice-timing.ts` (`'paired-agent'` route label if typed), tests that slice those lines (`test/fixtures/cloud-voice-view.mjs`, `test/voice-turn-routes.test.mjs`, `test/notes-recorder-controls.test.mjs`), Quint application manifest voice entries. `runtime/paired-voice.ts` stays (native-reading-voice.ts, note-recorder-driver.ts).
2. **Remove the test-only voice send-review policy** — `runtime/voice-selection.ts:14-29` (`setVoiceSendPolicyForTests`, `VoiceSendPolicy`), `runtime/voice-timing.ts` (`sendVoiceEntry` review arm), `prototype/voice-adapter.ts:224,552-559,678-679,950-954`, `specs/quint/application/manifest.json` (symbol `reviewConversationTurn`) and its model, any test calling `setVoiceSendPolicyForTests`.
3. **Previous-notes (legacy notes store) removal, voice + workflow parts** — `prototype/voice-adapter.ts` (#4), `prototype/workflow-authoring.ts` (#2, #3), `prototype/agent-adapter.ts` (legacy branches incl. `:1047-1080`), `prototype/canonical-notes-ui.ts` (source switch), `prototype/notes-trash-adapter.ts` (voice hooks), `runtime/note-audio-deletions.ts`, `runtime/permanent-voice-deletion.ts`, `runtime/notes-trash.ts`, `test/notes-deletion-lease.test.mjs`, `specs/quint/legacy/notes-view/*`; Android `AlphaNoteAudio` native sweep only after owner confirms no canonical producer of `AudioDeletion` rows.
4. **Typed plugin modules (C2)** — create `runtime/plugins/{alpha-voice-cloud,alpha-device,alpha-note-audio,alpha-hosted-results,alpha-notifications,alpha-connection,alpha-calendar}.ts`; update voice-adapter.ts, workflow-adapter.ts, workflow-authoring.ts and every other registrant (14 AlphaVoiceCloud, 14 AlphaDevice, 12 AlphaCalendar, 8 AlphaNotifications, 5 AlphaHostedResults, 3 AlphaConnection files).
5. **Upstream phone-workflow constants** — workflow-adapter.ts:26,62; workflow-authoring.ts:24-25,102,116-127; browser/development-workflows.ts:16,33; import `PHONE_WORKFLOW_DEVICE_OPERATIONS`, `PHONE_WORKFLOW_MAX_STEPS`, `phoneWorkflowOperationProtocol` from `.eliza/client-features/packages/contracts/src/phone-workflow.ts` (via the D13 alias).
6. **Move `showAgentStatus`** — workflow-authoring.ts:241-248 → runtime/connection-ui.tsx; update workflow-adapter.ts:16, automations-adapter.ts:9, test/agent-status-route.test.mjs, test/fixtures/scheduled-task-controls.mjs:28, test/automations-unified.test.mjs:53.
7. **Workflow draft slot helper** — workflow-authoring.ts:95 and browser/workflow-drafts.ts:11 → `workflowDraftSlot(session)` in runtime/workflow-device-contract.ts (bytes unchanged); dev Playwright specs that rebuild the slot (`dev-workflow-authoring.spec.ts:47`, `workflow-generation.spec.ts:49`).
8. **Inject the workflow draft store** — workflow-authoring.ts:19-20,98 (remove dev store selection and the `'alpha.connection.selection.v1'` read), main.tsx / dev module chooses product secure slot vs `developmentWorkflowDraftStore` vs `browserWorkflowDraftStore`.
9. **Workflows view merge (C5/D2)** — workflow-adapter.ts, automations-adapter.ts (`automationsManaged` handshake, `cachedAutomationsHome`, `filterNames`), clock-adapter.ts, workflow-filters.ts, workflow-notice-question.ts, workflow-authoring.ts → `prototype/workflows/`; main.tsx:168,175 collapse to one install.
10. **Filter labels** — workflow-filters.ts:3-6 export one labels record + id unions; automations-adapter.ts:32-34 imports them.
11. **Shared dialog lifecycle (C4)** — new `openOwnedDialog()` in runtime/ (from inline-modal.ts/modal-inert.ts); adopt in video-edit-review.ts, workflow-filters.ts and the 30+ other `alpha-back` dialog modules.
12. **Prototype workflow-builder removal (A5/A6)** — model.js workflow builder + `persist`/`reply` (model.js:4460-4542), template.html:3658,3852,3899-3947; then workflow-adapter.ts:66,479 and workflow-authoring.ts:193-194,231,236 stop returning those slots.
13. **Notes prototype undo removal (A6)** — model.js/template.html Notes folder sheet, fake amplitude bars, share, summary placeholders; then voice-adapter.ts:1253,1265,1269,1273,1351,1354-1355.
14. **Rename `legacyChatRecorder`** → `stackedChatRecorder`: voice-adapter.ts:1465-1466, template.html, test/fixtures/voice-markup.mjs, test/voice-copy-presentation.test.mjs.
15. **Run-state predicates** — workflow-adapter.ts:20-24,46-53,480 → runtime/workflow-protocol.ts; automations-adapter.ts and browser/simulated-workflows.ts reuse.

## Text/path pins
- `test/support/feature-parity.mjs:434-441` lists all eight paths; `:40` names voice-adapter.ts as owner of `runtime/local-reply-speech.ts`.
- use-in-email-review.ts: `test/fixtures/use-in-email-review.mjs:6` (T2, strips `^import .*;\n`), `test/use-in-email-review.test.mjs`, `specs/quint/refinement/application/email-suggestion-review.mjs:4,11`, `specs/quint/application/manifest.json:1168`.
- video-edit-review.ts: `test/quint-video-edit-review.test.mjs:14-18` (**literal substring rewrites** `loaded=false;video.pause();updateControls();` and `busy=true;video.pause();updateControls();status.textContent='Saving video copy…';`), `specs/quint/refinement/native/video-edit-review.mjs:7`, `specs/quint/native/manifest.json:443,3838-3855` (symbols `openVideoEditReview`, `trim`, `commit`, `dispose`), `specs/quint/refinement/application/photos-window.mjs:22`, `test/browser/media-polish.spec.ts:21,46,95`.
- voice-activity.tsx: `test/voice-composer-recovery.test.mjs:7`, `test/fixtures/voice-markup.mjs:13`.
- voice-adapter.ts: Quint `specs/quint/application/manifest.json:3428,4090,4356-4398,4871-4996,8665-8863`, `specs/quint/native/manifest.json:1354,1857,3305-3370`, `specs/quint/legacy/manifest.json:1093` (local symbol names: `generation`, `startingCapture`, `transcribeClip`, `stopVoiceConversation`, `retirement`, `navigationContinuation`, `quietVoiceRetry`, `reviewConversationTurn`, `mediaUnconfirmed`, `MEDIA_UNCONFIRMED_NOTICE`); anchor-slicing harnesses `specs/quint/refinement/application/{quiet-voice-retry,voice-owned-navigation,voice-transcript-follow,notes-recorder-media-admission}.mjs`, `specs/quint/refinement/native/batch-capture-completion.mjs`, `specs/quint/refinement/composition/controllers.mjs`, `specs/quint/legacy/notes-view/check-notes-view-refinement.mjs`; 25 host tests listed in the voice-adapter report (T1/T2), notably `test/voice-recovery-state.test.mjs`, `test/notes-recorder-controls.test.mjs`, `test/fixtures/cloud-voice-view.mjs`.
- workflow-adapter.ts: T2 transplants `test/workflow-adapter-recovery.test.mjs:18`, `test/fixtures/workflow-execution-fixture.mjs:4`, `scripts/workflow-renderer-fixture.ts:131`, `specs/quint/refinement/services/workflow-adapter-fixture.mjs:25`, `workflow-local-source.mjs:147`; `specs/quint/services/manifest.json:481,538,627-676,3692-3722,3996-4023,4245-4311`.
- workflow-authoring.ts: `scripts/workflow-renderer-fixture.ts:18`, `test/workflow-draft-reopen.test.mjs:10`, `test/agent-status-route.test.mjs:9`, `specs/quint/refinement/services/workflow-local-source.mjs:82`, `test/fixtures/scheduled-task-controls.mjs:28`, `specs/quint/services/manifest.json:480,537,3791-3833`.
- workflow-filters.ts: `test/automations-unified.test.mjs:71`, `test/fixtures/scheduled-task-controls.mjs:27`.
- workflow-notice-question.ts: `specs/quint/services/manifest.json:3998,4047-4051`.
- All T2 fixtures above strip `^import .*;\n`: imports in these files must stay single-line (and type imports inline) until the fixtures are retired.

## New patterns
- NEW (candidate C-level): **Re-implementing upstream contract constants.** Operation id lists, step limits and protocol rules are hand-copied from `.eliza/client-features/packages/contracts/src/phone-workflow.ts` (`PHONE_WORKFLOW_DEVICE_OPERATIONS`, `PHONE_WORKFLOW_MAX_STEPS`, `phoneWorkflowOperationProtocol`) into workflow-adapter.ts, workflow-authoring.ts and browser/development-workflows.ts. Treatment: import the upstream constant; never re-list contract ids. (Close to A2/C6 but the source of truth is upstream, so drift is silent.)
- NEW (candidate A4 variant): **Value-aliasing that makes a route permanently dead.** A selector maps `'cloud'` to the label `'agent'` and later branches test `'agent' && !cloud`, so a whole subsystem (paired voice) is compiled, tested and modelled but cannot run. Detect by checking boolean correlations of state assigned on the same line.
- NEW: **Formal/mutation tests pinning exact source substrings** (`test/quint-video-edit-review.test.mjs` `.replace('<exact code>')`). A T10 variant that blocks the D9 formatter commit; must be ported to a behavioural seam or deleted before formatting.

## Owner questions
1. Can canonical (agent) voice notes still produce device `AudioDeletion` rows? If not, the whole device voice-note deletion/Trash/lease subsystem in voice-adapter.ts (plus note-audio-deletions, permanent-voice-deletion, notes-trash voice hooks and the Android native sweep) goes with Previous notes (D1).
2. After Previous notes is removed, `save_note` can never be added in the workflow editor (`offered()` refuses it on canonical Notes). Keep editing support for existing `save_note` steps, or remove the operation from the client until the agent's note create carries a client identity?
3. The workflow palette shows `Send` and `Do` kinds that no `PhoneStep` kind or catalog operation supports; remove them or keep as visible placeholders?
4. Is the test-mocks voice "route choice" UI (`manualChoice`, `routeChoice`, `recordOnly`, `changeRoute`) still needed by a retained dev journey, or can it go with the paired route?
