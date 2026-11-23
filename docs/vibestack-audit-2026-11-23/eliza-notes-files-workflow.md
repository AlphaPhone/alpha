# eliza-notes-files-workflow: develop → vibestack parity findings

Slice: develop `plugins/plugin-{notes,files,native-filesystem,pdf,workflow,native-eliza-tasks}` (7a124190a1)
against vibestack `packages/{notes,files,workflow}` and `spec/{notes,files,workflow}` (eliza-vs 769b4f00d, branch vibestack-dp).
Read-only audit. Nothing was built, generated, run or installed. Paths under `D:` are in
`/home/shaw/.cache/vibeaudit/eliza-develop`, under `V:` in `/home/shaw/.cache/vibeaudit/eliza-vs`,
under `A:` in `/home/shaw/.cache/vibeaudit/alpha-vs`.

## Summary

- Items checked: 71. OK 36, NOT_APPLICABLE 13, gaps 22.
- Gaps by class: MISSING 8, CHANGED 9, UNIMPLEMENTED 1, UNVERIFIED 4.
- Gaps by severity: high 4, medium 12, low 6. Two are already named in wave3.md (#39922, #40215).
- Develop PRs since 2026-11-13 touching the slice: 20 (+ #39860, test only). 15 are present, 2 do not apply
  (#39737, #40034), #40037 is test only, #39922 is missing (wave 3 E), #39898's workflow routing rule is missing
  and not listed anywhere.
- Verdict: **not at parity**. The rule-level ports (Notes records and Trash, Files contract and Trash, typed
  workflow authoring, admission, lifecycle, approvals, digests routes) are faithful. The losses are at the edges
  the phone actually touches: two routes Alpha's port calls do not exist (`/api/automations`,
  `/api/workflow/hosted/cloud-delegation/*`), three result-shape contracts Alpha's port reads are not emitted
  (`[WORKFLOW]` block, `error` code, Notes effect receipts), chat-created workflows can no longer be scheduled or
  turned on, and nothing imports the workflows a phone already has.

## Gaps

### 01. MISSING, high: `GET /api/automations` is not served
- Behaviour: one list of the owner's workflows and prompt automations, with partial-read notes.
- Develop: `D:plugins/plugin-workflow/src/routes/automations.ts:52-60`, `lib/automations-builder.ts` (754 lines).
- Vibestack: no route. `V:packages/workflow/src/routes.vibe:73-116` lists every workflow route; a tree-wide search
  for `api/automations` finds nothing.
- Phone: `A:apps/app/src/workflows/automations.vibe:143` reads it (`AutomationList`, `wire.schema.vibe:6-24`). The
  Workflows list loses its workflow and prompt rows and shows the source as failed.
- Fix: add the route (workflow plugin or agent schedule routes) returning
  `{automations[{id,type,title,description?,status?,enabled,system?,workflowId?,triggerId?}], workflowFetchError?, executionFetchErrors?}`.

### 02. MISSING, high: `/api/workflow/hosted/cloud-delegation/*` is not served and its client is gone
- Behaviour: start, poll, complete, cancel and revoke the Google delegation a hosted digest source needs.
- Develop: client `D:plugins/plugin-workflow/src/client/hosted-digests.ts:555-592,768-772`; server in
  `D:packages/app/src/api/cloud-google-delegation-routes.ts` (outside this slice).
- Vibestack: no `delegation` in `V:packages/workflow/src/digests/inbox.vibe` (paths at :228-314), no route in
  `routes.vibe`, no server anywhere (`cloud-delegation` appears only as secure-store slot names in `packages/os`).
- Phone: `A:apps/app/src/workflows/sources.vibe:151,280` posts to all five paths. Adding or revoking a Google
  account for digests fails.
- Fix: port the delegation routes (agent or cloud package) and re-add `HostedDigestProtocol.delegation`, or
  dispose it with the owner and remove the calls from Alpha.

### 03. MISSING, high: workflows saved under develop are not imported
- Behaviour: an upgraded phone keeps its workflows, schedules, digest loops, sources and run history.
- Develop: `D:plugins/plugin-workflow/src/db/schema.ts:23` (`pgSchema('workflow')`: workflows, revisions, executions).
- Vibestack: new tables `workflow_definitions`, `workflow_runs`, `workflow_receipts`, `workflow_digest_sources`
  (`V:packages/workflow/src/service/store.vibe:103-110`) and no import. Notes has one
  (`V:spec/notes/records.md:150-156`, `packages/notes/src/prior.vibe`); workflow has no counterpart and no rule.
  Engine identity also changed (`smthrs` → `eliza-typed`, compiler `phone-workflow-compiler-4` → `typed-workflow-engine-1`,
  `V:packages/workflow/src/service/workflows.vibe:27`, `client/workflow-client.vibe:11`).
- Phone: after the upstream move, existing workflows and digests vanish and scheduled ones stop without a notice.
  Not checked on a device.
- Fix: a one-time import with a rule like the Notes one, or an owner-approved disposition plus a notice.

### 04. CHANGED, high: a chat-created workflow cannot be scheduled or turned on
- Behaviour: "every morning at 8, summarise X" creates a workflow with a schedule in the owner's zone; "turn it
  on" works from chat.
- Develop: draft carries `schedule {cron,timezone,enabled}` in the owner's zone
  (`D:plugins/plugin-workflow/src/services/workflow-service.ts:87,103`); chat activates any non-typed workflow
  (`actions/workflow.ts:524-557`); create says "It is off until you turn it on" (`:366`).
- Vibestack: the draft is `{name,description,source}` with no trigger (`V:packages/workflow/src/service/generated.vibe:31-35,52-71`);
  create saves it manual (`agent.vibe:111-118`); `activate` is always refused (`agent.vibe:153-161`); activation
  over HTTP needs a code review first (`service/workflows.vibe:374`, `spec/workflow/generated.md:22`).
- Phone: Alpha's port never calls `/workflows/{id}/review` or `/source` (no match in `A:apps/app/src`), so a
  chat-created workflow can only be run by hand. Turning it on in the Workflows view is refused with
  "Review the current workflow code before turning it on".
- Fix: decide the product shape. Either let the draft carry an owner-zone trigger and give Alpha the review
  surface, or keep manual-only and say so in the create reply and the action description.

### 05. CHANGED, medium: Notes action results drop the receipts and flags core and the phone read
- Behaviour: every Notes write returns a durable `notes.note.<op>` receipt; lookups that need a choice are marked
  as waiting on the owner; an empty inventory is marked as a verified empty state.
- Develop: `D:plugins/plugin-notes/src/action.ts:175-252` (effectReceipts, `modelReplyRequired`,
  `transcriptVisibility:"internal"`, `promptData`), `:312-337` (`awaitingUserInput`, `requiresInput`, `candidates`),
  `:372-376` (`coachingFailure`), `:710-721` (`emptyTrackedState`); view receipts `interact.ts:258,458`.
- Vibestack: `V:packages/notes/src/agent.vibe:62-76` (`failureOf`, `noteResult`) and `:427-478` (`interactWith`)
  return none of them. Core still checks for them: `V:packages/core/src/actions/task-extraction-context.vibe:1497-1531`
  expects `data.op`, `data.noteId` and a `notes.note.<op>` receipt.
- Phone: `A:apps/app/src/workflows/changes.vibe:59-64` and `spec/workflows/vocabulary.md:151-156` read
  `notes.note` / `notes.note-collection` receipts to add the "Notes changed" row (`assistant/composer.vibe:489`).
  The row never appears. What core does with a Notes write that carries no receipt was not traced.
- Fix: emit the receipt in `noteResult` and `interactWith`, set `data.op`, and carry the three flags in `failureOf`.

### 06. CHANGED, medium: WORKFLOW refusals carry no `error` code and call every refusal "nothing was changed"
- Develop: `D:plugins/plugin-workflow/src/actions/workflow-reference.ts:10-26` (`error: code`, `failureProvenance`
  with `retryable`); `workflow.ts:685-713` separates not-applied refusals (retryable) from
  `WORKFLOW_OPERATION_FAILED_RECONCILE_BEFORE_RETRY` (not retryable).
- Vibestack: `V:packages/workflow/src/agent.vibe:46-48` puts the code only in `data.code`; `:281-284` appends
  "Nothing was changed." to every service refusal of a write and never marks one as needing reconciliation.
- Phone: `A:apps/app/src/workflows/changes.vibe:53` tests `viewRefusal(result.error)` for `WORKFLOW_EDIT_IN_VIEW`
  and `WORKFLOW_ACTIVATE_IN_VIEW`. The "Open Workflows" row never appears.
- Fix: add `error: code` and `failureProvenance` to `notApplied`; keep an unknown-outcome code for store failures.

### 07. CHANGED, medium: a chat-started run no longer returns the `[WORKFLOW]` block
- Develop: `D:plugins/plugin-workflow/src/actions/workflow.ts:594-618` ("Submitted a run of …" + block with
  `workflowId`, `runId`, `title`, steps; `data.widget`).
- Vibestack: `V:packages/workflow/src/agent.vibe:184-192` replies "Started X. Its result appears in its run history."
- Phone: `A:apps/app/src/assistant/reply-lines.vibe:23-24,54-58` and `payloads.schema.vibe:113` build the run
  card from that block. No card opens the run.
- Fix: emit the block, or have Alpha build the card from the `workflow.run.submit` receipt (`agent.vibe:191`).

### 08. CHANGED, medium: the chat dossier starts a run and does not return the briefing
- Develop: `workflow.ts:373-405` waits for the run and replies with its summary; `workflow-service.ts:298-342`
  needs exactly one current reviewed source or asks which (`NATIVE_DOSSIER_SOURCE_REVIEW_REQUIRED` with the list),
  and binds the mutation to the message id.
- Vibestack: `V:packages/workflow/src/agent.vibe:225-233` picks `sources.at(-1)` (expired ones included), derives
  the mutation id from the time, and replies "Started the on-demand dossier…"; `service/digests.vibe:284-314`
  launches and returns at once.
- Phone: "give me today's briefing" answers with "Started…"; with two sources one is chosen silently; a retried
  tool call runs a second model pass.
- Fix: wait (bounded) for the terminal run and return its text; ask when the source is not unique; key the
  mutation on the message id.

### 09. MISSING, medium: no whole-message routing rule for WORKFLOW (#39898)
- Develop: `D:plugins/plugin-workflow/src/actions/workflow-request.ts:105-134` (`workflowRequestOwned`,
  `registerWorkflowRequestRouting`: replaces VIEWS/VIEWS_SHOW, whole-request owner, "show my workflows" stays view
  navigation), registered in `src/index.ts` init.
- Vibestack: `V:packages/workflow/src/index.vibe` init registers no rule; `registerDirectActionRoutingRule` is
  called only by maps and notes. The handler-side binding exists (`agent.vibe:266-274`).
- Phone: "create a workflow called Alpha device test" can again end as a Stage 1 clarification or
  `STAGE1_ROUTING_CONFLICT` (the v610 Pixel failure this fixed). parity-results.json records it as left undone;
  wave3.md does not list it.
- Fix: register the rule from `authoredWorkflowRequest` in the plugin's init, with the `viewWording` case.

### 10. MISSING, medium (wave 3 E): #39922, a closing single quote stays in a quoted workflow name
- Develop: `workflow-request.ts:26-32,68-72` (`CLOSING_QUOTE`, capture includes the opening quote).
- Vibestack: `V:packages/workflow/src/request.vibe:10,27-32` still has the pre-#39922 pattern.
- Phone: `create a workflow called 'Morning brief'` or `Parents' Day` names it wrongly or misses.
- Fix: port the two-line change. Already wave 3 item E.

### 11. MISSING, medium: delete and update by name leave byte-identical copies behind
- Develop: `D:plugins/plugin-notes/src/service.ts:811-846,879-938` (delete trashes every identical copy),
  `:745-809` (update by lookup consolidates copies).
- Vibestack: `V:packages/notes/src/collection.vibe:260-274` and `:249-257` change one row. Only move takes copies
  (`spec/notes/records.md:91`, `collection.vibe:314-328`).
- Phone: "delete the milk note" leaves identical survivors after confirming the deletion; an edit leaves a stale twin.
- Fix: extend the copies rule to delete and update by lookup.

### 12. MISSING, medium: NOTES_UPDATE by a planner-chosen ID is not re-resolved by the title the owner named
- Develop: `action.ts:255-280`, used at `:540-557` and `:941-954`.
- Vibestack: `agent.vibe:211-220` → `collection.vibe:249-257` updates the ID as given. Delete has the rule
  (`spec/notes/records.md:65`, `collection.vibe:261-262`); update does not.
- Phone: with two notes titled "Groceries", an edit lands on the planner's pick instead of asking which.
- Fix: an `idUpdateByTitle` rule mirroring `idDeleteByTitle`.

### 13. UNIMPLEMENTED, medium: a calendar draft is never bound to the note it came from
- Rule: `V:spec/notes/records.md:107`. Code: `V:packages/notes/src/service.vibe:145-155`.
- No path reaches it: no package outside notes calls `sourceReference`/`assertSourceReference`, and reads do not
  return `sourceNote` (`agent.vibe:144-149,166`). Develop returned it on every read (`action.ts:704-707`) and
  calendar checked it (`D:plugins/plugin-calendar/src/internal/note-source.ts`).
- Phone: an event made from a note is not refused when the note changed in between.
- Fix: return `sourceNote` in NOTES_LIST/NOTES_GET data and assert it in the calendar create path.

### 14. UNVERIFIED, medium (wave 3 A): workflow device offers and the reconciliation route shapes (#40215)
- wave3.md item A already names this. `V:packages/agent/src/device-actions/workflow-offer.vibe` exists after
  7c4fa6ef0 and HEAD; its body shapes against Alpha were not re-derived here.

### 15. UNVERIFIED, medium: worker run limits and isolation
- Develop: `D:plugins/plugin-workflow/src/services/smithers-runtime.ts:84-92` (30 min run timeout, 30 s control
  timeout, 1 MiB protocol line, 1 s termination grace, stderr tail), `workflow-worker-lease.ts`,
  `workflow-process-host.ts`.
- Vibestack: `V:packages/workflow/src/runtime.vibe:38-58` reads unbounded lines, has no run or control timeout
  and kills only on close; the spawn, environment and lease are in `packages/agent/src/host/workflow-worker.vibe`
  (not in this slice). Guest code has a 2 s budget and 256 KB JSON cap (`worker/guest.vibe:7-8`).
- Phone: a hung worker may hold a run open. Not established either way.
- Fix: confirm in the agent slice; add a run deadline in `runtime.vibe` if the host has none.

### 16. UNVERIFIED, medium: hosted Google and native digest reads
- `D:plugins/plugin-workflow/src/services/hosted-google-source.ts` (437 lines), `hosted-native-source.ts`,
  `hosted-digest.ts` against `V:packages/workflow/src/service/{google,digests}.vibe` were compared only by route,
  constant and rule title, not line by line.

### 17. MISSING, low: note timestamps are no longer shown in the owner's zone
- Develop: `action.ts:493-514,629-689` (`displayTimeZone`, `noteTimestampDisplay`, `selection.display` from `uiTimeZone`).
- Vibestack: `agent.vibe:118-150` returns UTC instants only; the notes package never reads a zone.
- Phone: "when did I write X" or "my latest note" can name the wrong day near midnight.

### 18. CHANGED, low: a rejected chat workflow draft is not repaired once
- Develop: `workflow-service.ts:464-480`. Vibestack: `generated.vibe:52-71`, `agent.vibe:111-112` fail on the
  first rejected draft with "I couldn't write workflow code that passes its check".

### 19. CHANGED, low: a removed workflow is reported as not found
- Develop: `workflow.ts:437-452` (`WORKFLOW_REMOVED`: "was removed. Restore it before you change or run it.",
  `WORKFLOW_NOT_REMOVED`). Vibestack: `request.vibe:188-189` drops an ID in the other scope and answers
  `WORKFLOW_NOT_FOUND` with the current list.

### 20. CHANGED, low: Notes prompt guidance is cut down and the actions left the `general` context
- Develop: `D:plugins/plugin-notes/src/plugin.ts:74-140` (literal-content rules for create, date-window and
  latest-basis rules for list, patch guidance), `action.ts:392,414-419` (`contexts: ["notes","general"]`, routing hint).
- Vibestack: `agent.vibe:93` (`contexts: ["notes"]`), `:120,177,199` (one or two sentences each).
- Phone: model-dependent. The removed sentences each fixed an observed fault (added checklists, kept delimiting
  quotes, a read in place of an edit).

### 21. CHANGED, low: Notes folder and lookup refusal codes changed
- Develop: `NOTES_FOLDERS_UNAVAILABLE`, `NOTES_INVALID_FOLDER`, `NOTES_FOLDER_NOT_FOUND`, `NOTES_CONFLICTING_*`,
  `NOTES_MISSING_TEXT` (`action.ts:84-92,564-570,743-750,843-861`). Vibestack: `NOTES_FOLDER_UNKNOWN` and plain
  text refusals without a code (`agent.vibe:110-113,266-270`). Alpha's port reads none of them.

### 22. UNVERIFIED, low: Vibestack evidence for the slice
- `V:spec/lock.json` holds 5 template specs; none of the 39 notes, files and workflow spec files is locked, so no
  rule is accepted and no proof is recorded (simulated or otherwise).
- Every `###` rule in the slice has a Quint block.
- Proof files exist only for `spec/workflow/{admission,approvals,index,lifecycle}` and `spec/files/archive`.
- Conformance drivers exist for 8 workflow machines (`V:packages/workflow/test/drivers`); none for
  `index`, `intents`, `runScope`, none for the 4 Notes machine specs or the 11 Files machine specs.
- No `gen/` output is checked in, so the generated names the code imports were not checked.

## Contract mismatches with Alpha's port

1. `GET /api/automations` (`A:apps/app/src/workflows/automations.vibe:143`): no such route in eliza-vs.
2. `POST /api/workflow/hosted/cloud-delegation/{start,status,complete,cancel,revoke}`
   (`A:apps/app/src/workflows/sources.vibe:151,280`): no such route in eliza-vs.
3. `[WORKFLOW]…[/WORKFLOW]` reply block (`A:apps/app/src/assistant/reply-lines.vibe:23-24`): never emitted
   (`V:packages/workflow/src/agent.vibe:190`).
4. `ActionResult.error` equal to `WORKFLOW_EDIT_IN_VIEW` or `WORKFLOW_ACTIVATE_IN_VIEW`
   (`A:apps/app/src/workflows/changes.vibe:53`, `spec/workflows/vocabulary.md:139`): eliza-vs sets only `data.code`
   (`agent.vibe:46-48`).
5. Effect receipts of kind `notes.note` / `notes.note-collection` with a numeric `resource.version`
   (`A:apps/app/spec/workflows/vocabulary.md:151-168`, `changes.vibe:26-33`): Notes emits no receipts.
6. `A:apps/app/src/platform/owner-routes.json` still lists `/api/views/notes/interact`; eliza-vs serves
   `/api/notes/interact` only (`V:packages/notes/src/agent.vibe:515`). Harmless: the upstream client uses the new path.
7. Notes error bodies: eliza-vs answers `{success:false,error:{code,message}}` on state and Trash routes
   (`agent.vibe:493-495`) and puts an interact code at `result.code` (`:524`). `A:apps/app/src/notes/transport.ts:22-23`
   reads `error` as a string and a top-level `code`. Whether `@elizaos/agent/client` flattens the body first was
   not traced; if not, `priorNeedsReview` (`A:apps/app/src/notes/collection.vibe:9`) never sees `NOTES_STORE_UNAVAILABLE`.
8. Export names: every name `alpha-vs` imports from `@elizaos/plugin-notes{,/client,/format,/types,/organize}`,
   `@elizaos/plugin-files{,/client,/contract}` and `@elizaos/plugin-workflow{,/client,/digests,/scope}` (123 names)
   is exported by eliza-vs. Type shapes were not compared.
9. Workflow client and routes are consistent inside eliza-vs: each path `client/workflow-client.vibe:368-650` and
   `digests/inbox.vibe:228-314` calls is in `routes.vibe:73-116`; status flags match develop (`workflows.vibe:1333-1337`).

## Confirmed OK

| Behaviour | Spec | Code |
|---|---|---|
| #39855 move by name takes identical copies | notes/records.md:91 | notes/src/collection.vibe:314-328 |
| #39860 delete by text only when the owner named the title | notes/records.md:65 | collection.vibe:266-268 |
| #39990 delete by planner ID re-resolved by title | notes/records.md:65 | collection.vibe:261-262 |
| #39994 owner words from the bound request | notes/records.md:65 | lookup.vibe:78-86 |
| #39872 `notesRequestEffect` wording and parse | notes/records.md:126 | request-effect.vibe:98-133 |
| #39957 named-note read routed to NOTES_GET | notes/records.md:126 | request-effect.vibe:138-161 |
| #39945 `creationId` made once, retired on erase | notes/records.md:39 | collection.vibe:103-129,398 |
| #39950 host recording-cleanup verifier, literal true | notes/trash.md:201 | service.vibe:60,192,277-285 |
| #39842 restore, move, folder rows in providers | notes/organize.md:84 | agent.vibe:234-287 |
| Notes direct routes `notes.create`, `notes.read` | (code only) | request-effect.vibe:164-179 |
| SAVED_NOTES, NAMED_NOTES, NAMED_NOTE_ROUTING | notes/records.md:65 | agent.vibe:295-366 |
| Notes state, Trash erase, recording cleanup routes | notes/trash.md:110-174 | agent.vibe:511-541 |
| Notes view capabilities incl. clear-notes confirm | notes/records.md:15 | agent.vibe:369-409,470-473 |
| Three-day Trash and its setting | notes/trash.md:104-133 | service.vibe:63,275 |
| Earlier Notes document imported once | notes/records.md:150-156 | prior.vibe, store.vibe:87-107 |
| Literal edit: unique match, no revision; others need it | notes/records.md:15 | collection.vibe:204-242 |
| Shared phone-note read replies (edit, delete) | notes/read.md:256, trash.md:232 | device-proposals.vibe:344-349 |
| #39683 20 MiB chat attachment, 5 MiB mail | files/library.md:63-76 | storage/library-volume.vibe:455,478-479 |
| #39740 filter cleared on leaving Files | files/requests.md:59 | storage/view.vibe:81,131 |
| #39944 shown-target capability and forms | files/shownTargets.md:17 | contract.vibe:8,76-78,150-174 |
| #39693 unreadable Trash journal (now one record per entry) | files/reviewedOperations.md:45 | storage/local-volume.vibe:132-140 |
| #39948 Android StorageBrowser/StorageCatalog | os/android/files/storageWatch.md | os/android/filesystem/…/StorageCatalog.java (identical) |
| Files Trash 30 days | files/reviewedOperations.md:56 | storage/model.vibe:44 |
| Files chat proposals only unlocked, change only in Files | files/shownTargets.md:41 | device-proposals.vibe |
| #39903 WORKFLOW bound to the owner's command | workflow/lifecycle.md:73 | agent.vibe:266-274 |
| #39990 workflow name tiers, descriptive words, pronoun clauses | workflow/lifecycle.md:112 | request.vibe:11-14,68-82,180-232 |
| Workflow name never shared; drafted name numbered | workflow/lifecycle.md:157 | agent.vibe:103-113,140-141 |
| #39882 no-notification sentence, owner's create name | (code only) | agent.vibe:23-24,105,117 |
| Typed workflow edited and switched on only in the view | workflow/admission.md:70 | agent.vibe:123,153-161 |
| Status protocol flags | workflow/index.md:26 | service/workflows.vibe:1333-1337 |
| Typed authoring, save receipts, exact-version run | workflow/authoring.md:13,62; admission.md:14 | routes.vibe:77-98 |
| Metadata and lifecycle mutations with retained receipts | workflow/lifecycle.md:12 | routes.vibe:93-96 |
| Approvals and phone review | workflow/approvals.md:13,142 | routes.vibe:102-106 |
| Typed generation prompt and scope check | workflow/authoring.md:13 | service/workflows.vibe:229-260 |
| Hosted digest sources, loops, results, ack | workflow/hostedDigest.md:15-190 | routes.vibe:107-116 |
| Digest window, texts, 168 h source, 100 retained | workflow/schedule.md:12 | contract/digest.vibe:7-34 |

Not applicable (13): plugin-native-eliza-tasks (iOS only, no Alpha reference); plugin-pdf `PdfService` (never
loaded by Alpha; the phone reads PDFs through its own code); plugin-native-filesystem's TypeScript bridge (Alpha
took only the Android sources); #39737 (desktop tab flag); #40034 (Quint case inventories); #40037 (test file
only); `/api/workbench/todos` and `/api/triggers/health`; workflow revisions, evaluation-samples and DELETE
routes (never called by the phone; revisions and restore remain chat operations); per-owner scoping (single
owner); Windows worker lease; NOTES_MOVE through `notesFolders` message metadata (neither Alpha app sends it);
plugin-notes and plugin-files React and browser-adapter UI (Alpha owns its renderer); `WORKFLOW_DISPATCH`
trigger service (replaced by `WORKFLOW_SCHEDULE` tasks).

## Not covered

- `embedded-workflow-service.ts` (3,258 lines), `smithers-runtime.ts`, approval receipts, schedule and
  missed-occurrence engine: compared by routes, flags, constants and rule titles only.
- Hosted digest internals and the digest inbox client's parsing.
- Files documents (scan, OCR, searchable PDF, source links) and `files.ts` / `files-browser-adapter.ts`.
- Notes client modules (audio store, recording deletion, drafts, secure store, Trash policy) against
  `spec/notes/{audioCustody,draftRecovery,client}.md`.
- `validation.ts` field limits against `records.schema.vibe`, beyond title, body and `creationId`.
- The Notes, Files and workflow device-proposal families, whose develop side is `plugin-assistant/device-actions`
  (another slice); only the fixed reply texts were checked. The porter's stated changes there (notes_move only on
  the open note, owner-word grounding) were not re-verified.
- `packages/agent/src/host/workflow-worker.vibe` and `device-actions/workflow-offer.vibe`.
- Type shapes of the client exports; `/api/triggers` routes in `packages/agent`.
- Nothing was run: no tests, gen, Quint, Dafny, build or device.

## Skeptic verdicts

Checked against eliza-vs 769b4f00d, develop 7a124190a1 and the seven w3-* checkouts (w3-notesworkflow at d4df4028557). `VS` = eliza-vs, `W3` = ~/.cache/vibecut/w3-notesworkflow. Nothing was run.

- eliza-notes-files-workflow-01 — **confirmed**. Develop serves it (plugins/plugin-workflow/src/routes/automations.ts:50-60). No `/api/automations` route in VS packages or spec, nor in any w3-* checkout; the only hits are the notification deep link `/automations` (packages/core/src/services/notification.vibe:117) and the develop baseline JSON. alpha-vs still reads it (apps/app/src/workflows/automations.vibe:143, shell/overview.vibe:56).
- eliza-notes-files-workflow-02 — **confirmed**. Develop registers the routes in packages/app/src/api/server.ts:554-556. VS and every w3-* checkout hold `cloud-delegation` only as a secure-store slot namespace (packages/os); VS google.vibe reads one managed Cloud Google connection instead (service/google.vibe:47-58). alpha-vs posts to the paths at apps/app/src/workflows/sources.vibe:151,280 and apps/app/src/account/delegation.vibe:55.
- eliza-notes-files-workflow-03 — **confirmed**. VS service/store.vibe:103-110 only creates new `workflow_*` tables; nothing reads develop's `workflow.embedded_workflows` (plugins/plugin-workflow/src/db/schema.ts:23-40). The only `prior*.vibe` in VS packages is packages/notes/src/prior.vibe; no import rule in spec/workflow; none in any w3-* checkout. Whether the phone keeps the same database across the move was not checked.
- eliza-notes-files-workflow-04 — **confirmed**. Develop drafts `schedule {cron,timezone,enabled}` (services/workflow-service.ts:86-103) and activates non-typed workflows from chat (actions/workflow.ts:524-557). VS draft returns no trigger (service/generated.vibe:52-71), activate is always refused (agent.vibe:153-161), activation needs a review (service/workflows.vibe:374). Neither the upstream client (client/workflow-client.vibe) nor alpha-vs calls `/workflows/{id}/review` or `/source`. W3 is the same (agent.vibe:143-152,186-194). The create reply already says it runs only when started.
- eliza-notes-files-workflow-05 — **confirmed**. No `effectReceipts`, `awaitingUserInput`, `emptyTrackedState` or `coachingFailure` anywhere in VS packages/notes/src or in any w3-* notes package (agent.vibe:62-76 `failureOf`/`noteResult`). Develop emits them (plugin-notes/src/action.ts:185-248,330-331,375,713). Core still expects the receipt (packages/core/src/actions/task-extraction-context.vibe:1497-1531); alpha-vs reads it (apps/app/src/workflows/changes.vibe:52-63).
- eliza-notes-files-workflow-06 — **confirmed** (half in flight). `error: code` and `failureProvenance` are absent in VS (agent.vibe:46-48) and still absent in W3 (agent.vibe:64-66), so alpha-vs changes.vibe:51 never sees a view refusal. The reconcile-before-retry half is in W3 only: agent.vibe:32-45,336-344 (`WORKFLOW_OPERATION_FAILED_RECONCILE_BEFORE_RETRY`), rule spec/workflow/lifecycle.md:222.
- eliza-notes-files-workflow-07 — **in_flight_wave3**. Absent in VS (agent.vibe:184-192); W3 packages/workflow/src/agent.vibe:222-229 emits `[WORKFLOW]` with id, workflowId, runId, title and steps, as develop does (actions/workflow.ts:594-610).
- eliza-notes-files-workflow-08 — **in_flight_wave3**. W3 agent.vibe:263-289 takes the one current reviewed source or asks, keys the mutation on the message id (:277), waits with `service.settle` (service/workflows.vibe:810) and replies with the briefing; rules at W3 spec/workflow/hostedDigest.md:39,45,70. VS still launches and returns (agent.vibe:225-233).
- eliza-notes-files-workflow-09 — **confirmed**. Develop registers `workflow.authored-request` (actions/workflow-request.ts:122-134, index.ts:56). In VS and all seven w3-* checkouts `registerDirectActionRoutingRule` is called only by maps, notes and (w3-surfaces) the device proposal module; none in packages/workflow. parity-results.json lists it as missing for #39898 and #39903; wave3.md does not list it.
- eliza-notes-files-workflow-10 — **in_flight_wave3**. W3 packages/workflow/src/request.vibe:13-14,33-36 (commit 88544f8637e) matches develop workflow-request.ts:26-32; rule text at W3 spec/workflow/lifecycle.md:83-86. VS request.vibe:10 has the old pattern.
- eliza-notes-files-workflow-11 — **confirmed**. Develop trashes every copy with the same content key (plugin-notes/src/service.ts:811-846) and consolidates on update by lookup (:745-809). VS `deleteIn` and `updateIn` change one row (packages/notes/src/collection.vibe:249-274); the copies rule covers move only (spec/notes/records.md:91-102, collection.vibe:314-328). Same in every w3-* notes package.
- eliza-notes-files-workflow-12 — **confirmed**. Develop `updateNoteFromChatReference` (plugin-notes/src/action.ts:254-279). VS NOTES_UPDATE passes the ID straight to `notes.update` and its `run` never receives the message (agent.vibe:211-220); spec has `idDeleteByTitle` only (spec/notes/records.md:86-88). No `idUpdateByTitle` in any w3-* checkout.
- eliza-notes-files-workflow-13 — **confirmed**. Rule spec/notes/records.md:107 and code packages/notes/src/service.vibe:145-155 exist, but no file outside packages/notes calls `sourceReference`/`assertSourceReference`, packages/calendar has no note reference in VS, w3-calendar or w3-surfaces, and Notes reads return no `sourceNote`. Develop: plugin-notes/src/action.ts:704-707, plugin-calendar/src/actions/calendar-handler.ts:4536.
- eliza-notes-files-workflow-14 — **refuted**. VS HEAD has the shapes Alpha sends: packages/agent/src/device-actions/proposal-review.vibe:18-21 (`{digest,decision}`, `{digest}`, `{digest,attemptId,receipt}`, `{digest,attemptId,review}`), routes `/api/client-devices/proposals/{id}/{decision|claim|receipt|reconciliation}` (:214-250), claim answer `{digest, proposal.execution.attemptId}` (:114-116,201-206); rules spec/agent/deviceActions/index.md:161,187,205. alpha-vs sends exactly these (apps/app/src/assistant/review.vibe:180-196, payloads.schema.vibe:71-74,126-132) and uses `workflowDeviceOffer` (scripts/resident/bridges.ts:8,162; VS packages/agent/src/device-actions/workflow-offer.vibe:114). What remains is Alpha's pin (upstream.lock.json c84e5d68e37 predates it), not an upstream gap.
- eliza-notes-files-workflow-15 — **confirmed**. Read the host slice: VS awaits `connection.next` with no deadline (service/workflows.vibe:800), has no control timeout, and reads lines unbounded (runtime.vibe:39, worker/main.vibe:16); packages/agent/src/host/workflow-worker.vibe:113-139 only spawns. Develop has 30 min run, 30 s control and 1 MiB line limits (services/smithers-runtime.ts:84-90) and a lease. VS's only parent tie is the worker exiting on stdin end (worker/main.vibe:34-36) and SIGKILL on close (runtime.vibe:52-55); guest code is capped at 2 s and 32 MB (worker/guest.vibe:8-9). No w3-* checkout changes this.
- eliza-notes-files-workflow-16 — **confirmed** (line-by-line pass done). Same: Google selection limits, mail query `in:inbox after:<at − window>`, calendar window [at, at + window], field limits, 6000-char/12000-byte bound, 30 s read timeout (VS service/google.vibe:29-112 vs develop hosted-google-source.ts:109-355). Different: (a) accounts — develop lists delegation grants plus owner-bound connector accounts (hosted-google-source.ts:197-246), VS lists one managed Cloud connection (google.vibe:47-58); (b) native evening digest — develop passes `template` to the read (embedded-workflow-service.ts:2452-2458, hosted-native-source.ts:105-113), VS's port is `read(selection, at)` (service/host.vibe:44, service/digests.vibe:223) and alpha-vs WorkflowBridgeHost.java:149-151 sends no template, so NativeDigestHost.java:29 uses the morning window and completed-today reminders never arrive; (c) develop checks and projects the native snapshot to display labels (hosted-native-source.ts:114-197), VS passes the bridge's raw text; (d) calendar list returns `timeZone: ""` (google.vibe:76).
- eliza-notes-files-workflow-17 — **confirmed**. Develop formats in `displayTimeZone` or the turn's `uiTimeZone` (plugin-notes/src/action.ts:493-514,629-661). VS packages/notes/src never reads a zone; NOTES_LIST prints raw instants (agent.vibe:147). `latestBy` selection itself exists (collection.vibe:443-446). No w3-* notes package adds it.
- eliza-notes-files-workflow-18 — **confirmed**. Develop repairs once (services/workflow-service.ts:464-480). VS and W3 refuse on the first failed check (service/generated.vibe:52-71; VS agent.vibe:111-112, W3 agent.vibe:143-144).
- eliza-notes-files-workflow-19 — **in_flight_wave3**. W3 packages/workflow/src/request.vibe:200-209,235 (`answeredByState`: WORKFLOW_NOT_REMOVED, WORKFLOW_REMOVED with develop's wording), rule W3 spec/workflow/lifecycle.md:165-173. It covers a workflow reached by ID; a removed one named only by name is still looked up in the current list (request.vibe:220). VS drops the other scope (request.vibe:188-189).
- eliza-notes-files-workflow-20 — **confirmed**. Develop NOTES is in `["notes","general"]` (plugin-notes/src/action.ts:392); VS actions are `contexts: ["notes"]` (packages/notes/src/agent.vibe:93) and core gates on that when no contextGate is set (packages/core/src/runtime/action-gate.vibe:184). Only the two providers are in general (agent.vibe:301,325). Descriptions are one or two sentences (agent.vibe:120). Same in every w3-* checkout.
- eliza-notes-files-workflow-21 — **not_applicable_to_phone**. The codes differ (develop NOTES_FOLDER_NOT_FOUND, NOTES_FOLDERS_UNAVAILABLE, NOTES_INVALID_FOLDER, NOTES_CONFLICTING_*, NOTES_MISSING_*; VS NOTES_FOLDER_UNKNOWN, NOTES_VALIDATION_FAILED), but a search of alpha-vs and alpha-develop outside vendor/ finds no reader of any of them; legacy `NOTES_ACTION_REFUSALS` is keyed on client messages, not these codes.
- eliza-notes-files-workflow-22 — **confirmed**. VS spec/lock.json lists 5 specs (spec/app/{echo,index,tally,words}.md, spec/index.md). Proof files: spec/workflow/{admission,approvals,index,lifecycle}.proof.dfy and spec/files/archive.proof.dfy only. Drivers: 8 under packages/workflow/test/drivers, none for notes or files. No gen/ is tracked. W3 and w3-surfaces are the same.
