# Alpha Phone parity audit: workflows

Slice: resident workflows, enable/disable toggle, generation, the workflow worker, device steps and
native bridge, digests, hosted results, notices, run history, workflow calendar ranges.

Trees read: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-vs`
(`vibestack-dp` 769b4f00d; the port's lock pins c84e5d68e37, an ancestor), legacy pin `eliza-develop`.
Everything below is from reading code. Nothing was built, generated or run, so every statement about
what happens on a phone is a code-reading conclusion, not a runtime observation.

Paths are relative to the tree named. `vs:` = `alpha-vs`, `dev:` = `alpha-develop`, `up:` = `eliza-vs`.

## Summary

| Class | Count |
|---|---|
| OK | 28 |
| UNMODELED | 2 |
| UNIMPLEMENTED | 11 |
| MISSING | 7 |
| CHANGED | 6 |
| RETIRED | 2 |
| KNOWN | 7 |
| UNVERIFIED | 3 (gaps 3, 12 and 21 carry a part that could not be verified; they are counted under their class) |

**Verdict: this slice is not at parity, and by code reading it does not work end to end.** The
models and most of the renderer services are there and are careful, but the slice fails at its
edges in four independent places, each of which alone stops the feature:

1. **No workflow worker is built or staged.** `agent:build-workflow-worker` has no counterpart, and
   `agent:stage-android` never passes a worker. Upstream refuses every run without one (503).
2. **An admitted phone step never executes.** Nothing calls `DeviceReview.workflowStep`. Upstream's
   approval route waits on the phone for up to ten minutes, then fails the step, and the screen can
   then read "Done."
3. **The Workflows list reads routes the Vibestack resident does not serve** (`/api/automations`,
   `/api/lifeops/reminders`, `/api/lifeops/definitions`). No workflow is listed, so none can be opened.
4. **Most background followers have no caller**: approval notices, hosted result notices, background
   delivery, the Home brief, and the account-switch cleanup are implemented as service methods that
   only tests call.

On top of that, several legacy screens were not ported and are not in the open-items doc: the
workflow on/off switch, the Removed filter (Restore is unreachable), the manual step editor,
creating or editing a digest schedule, and the run's output.

Only gap 2 is in `docs/vibestack-open-items.md`. The rest are new.

## Gaps

Most severe first.

### 1. MISSING: the workflow worker is never built or staged (the `agent:build-workflow-worker` counterpart)

- **Behaviour:** the Android build packages a verified workflow worker, without which no workflow runs.
- **Legacy:** `dev:package.json:32` (`agent:build-workflow-worker`), `:39` (`android:build:local`
  runs it between `agent:prepare` and `agent:stage-android`); `dev:scripts/build-workflow-worker.ts`,
  `dev:scripts/prepared-workflow-worker.ts`, `dev:scripts/stage-workflow-worker.ts` (stages to
  `android/app/src/main/assets/agent/workflow-worker`); preflight row
  `dev:scripts/android-build-preflight.ts:194-198`; CI `dev:.github/workflows/resident-android.yml:288-291,319`
  (`agent:build-workflow-worker`, `agent:test-workflow-compiler`, `agent:test-workflow-worker`,
  `agent:test-mobile-workflow-bundle`).
- **Port:**
  - `vs:package.json:25`: `android:build:local` is preflight → `agent:build-embedding-host` →
    `agent:bundle` → `agent:stage-android` → licenses → `android:build`. No worker step. No script
    in `vs:package.json` or `vs:scripts/` builds a worker.
  - `vs:scripts/stage-agent-runtime.ts:20,35-37` accepts `--workflow-worker DIR --workflow-executable PATH`
    and forwards it to upstream `stageRuntimePayload`, but nothing passes those flags: not
    `package.json`, not `vs:.github/workflows/resident-android.yml:218-220` ("Stage the resident
    runtime payload (pinned Node, agent bundle)").
  - `vs:scripts/android-build-preflight.ts:158,233` still takes `workerDirectory` and never reads it;
    the "workflow worker artifact" input row is gone, so the preflight cannot report it missing.
  - Upstream rule `up:spec/os/build/runtimePayload.md:105-121` (`workerStaging`): a pin without an
    artifact refuses the payload; no pin and no artifact stages no worker. The pin comes from
    `vendor/eliza/packages/workflow/dist/workflow-worker.json` if it exists when the bundle is built
    (`up:packages/agent/src/bundle/build.vibe:158-170,329`). So the port either refuses the payload
    (dist was built by `turbo ^build`) or ships no worker (dist absent). Which one depends on build order.
  - With no worker, upstream answers every run `503 "No verified workflow worker is installed"`
    (`up:packages/workflow/src/service/workflows.vibe:865`) and digests do not run
    (`up:packages/workflow/src/service/digests.vibe:266,292`).
  - The Android consumer still expects the legacy layout: `vs:android/.../AlphaLocalAgentPlugin.java:644-652`
    opens `agent/workflow-worker/files.sha256` and treats its absence as "older payload, no worker";
    `WorkflowWorkerAssets.java` is byte-identical to legacy. Upstream stages
    `assets/agent/workflow-worker/<files>` with no `files.sha256` index, and names the worker in the
    launch document instead. `vs:apps/app/src/settings/diagnostics.vibe:43` also reads the legacy
    `manifest.json`/`files.sha256`.
  - Upstream has the pieces (`up:packages/workflow/src/worker/artifact.vibe:244 build`, `:320 stage`,
    `:397 verifyWorkerArtifact`); no Alpha script calls them.
- **Also lost with it:**
  - `vs:.github/workflows/android.yml:126` runs `pnpm agent:test-digest-restart`; no such script
    exists in `vs:package.json` and `scripts/test-local-digest-restart.ts` is gone. That CI step fails.
  - `vs:scripts/ci/export-browser-proof.ts:93` imports `../workflow-worker-artifact.ts`, which does not exist.
  - `vs:scripts/generate-sbom.ts:228` and `vs:scripts/stage-embedding-host.ts:163` tell the reader to
    run `pnpm agent:build-workflow-worker` / `pnpm agent:prepare`, which do not exist.
  - The three legacy worker checks (compiler, worker, mobile bundle) have no port counterpart; upstream
    `up:packages/workflow/test/workflows.test.vibe` may cover them (not read).
- **Open-items:** only "`agent:stage-android` must produce the payload layout upstream PayloadCheck
  expects". The worker is not mentioned.
- **Impact:** on an APK from `android:build:local`, no workflow and no digest can run, or the build
  stops at staging.
- **Smallest fix:** add `agent:build-workflow-worker` (a script over `@elizaos/plugin-workflow/worker`
  `build` + `verifyWorkerArtifact`), put it in `android:build:local` and `resident-android.yml` before
  `agent:bundle`, and have `agent:stage-android` pass `--workflow-worker <artifact> --workflow-executable src/worker/main.js`.
  Restore the preflight row. Replace the `files.sha256` lookup in `AlphaLocalAgentPlugin.java` with
  the launch document's `workflowWorker`. The rules already exist in `vs:apps/app/spec/workflows/scheduling.md`
  ("A staged worker is published only from a verified source…", "A prepared worker is reused only when…")
  but no code implements them.

### 2. KNOWN, with two additions: an admitted phone step never executes, and the screen can still say "Done."

- **Behaviour:** after the owner approves a phone step twice, the phone performs it once and reports what it did.
- **Legacy:** the renderer's device executor, `dev:apps/app/src/prototype/agent-adapter.ts:1349-1410`
  (`read_calendar_range`, `read_selected_reminders`, `read_selected_notes`, `post_notification`,
  `speak_text`, `create_note`), guarded by `workflowStepScreenCurrent`
  (`dev:apps/app/src/runtime/workflow-device-contract.ts:40`); `dev:test/workflow-step-screen-guard.test.mjs`,
  `dev:test/browser/workflow-presentation-execution.spec.ts`.
- **Port:**
  - The resident offers every step except `read_calendar_range` to the phone as a workflow-bound
    device proposal (`vs:scripts/resident/bridges.ts:136-158`, upstream `workflowDeviceOffer`).
  - The only code that runs such a proposal is `DeviceReview.workflowStep`
    (`vs:apps/app/src/assistant/review.vibe:496`). Its only callers are
    `vs:apps/app/test/assistant/integration.test.vibe:100-103`. `DeviceReview.pending()` deliberately
    skips workflow proposals (`review.vibe:475`, `proposal.workflow === undefined`).
  - `vs:apps/app/src/workflows/notices.vibe:165-175` (Executing): sends `execute` to the model,
    then counts the step settled when the run finished or the approval reads `approved`. It performs nothing.
  - The speech and notification executors exist and are registered
    (`vs:apps/app/src/workflows/operations.vibe:58`, `vs:apps/app/src/shell/compose/executors.vibe:12`),
    so the missing part is only the call.
- **Addition A (not in open-items): the suggested fix deadlocks.** The open-items bullet says to call
  `workflowStep` "in its Executing phase". Upstream's approval route performs the device step inside
  the request and only then answers (`up:packages/workflow/src/service/workflows.vibe:980-986`,
  `performDevice` is awaited; the offer polls up to 600 s, `up:packages/agent/src/device-actions/workflow-offer.vibe:33,66-82`).
  The port awaits that same request in the Admitting phase (`notices.vibe:156-163`,
  `client.decideApproval`), so Executing is reached only after the offer has already expired. The
  call has to run while the decision request is in flight. The assistant's `stepDecisions`
  (`vs:apps/app/src/workflows/decisions.vibe:27`) has the same shape.
- **Addition B (not in open-items): a false "Done."** When the decision request finally returns
  (the step failed with `DEVICE_STEP_EXPIRED`), the approval still reads `approved`, so `notices.vibe:167-172`
  sends `receiptSent`, the model records `effects: 1`, and `vs:apps/app/src/web/workflows/PhoneStepReview.tsx:22`
  shows "Done.". This breaks the port's own rule "The receipt reports exactly the journal"
  (`vs:apps/app/spec/workflows/deviceSteps.md`).
- **Impact:** every reminder read, note read, note save, notification and read-aloud step hangs for
  up to ten minutes and fails; the owner is told it was done.
- **Smallest fix:** in `notices.vibe`, fork `DeviceReview.workflowStep(runId, stepId)` (retrying until
  the proposal is listed) alongside `decideApproval` in the Admitting phase, and derive
  `receiptSent`/journal from that call's `Approval` outcome, not from the approval status. State the
  ordering in `deviceSteps.md` ("The agent admits the exact issue it proposed…"). Needs the pin moved
  past `c8f273cec1b` (already listed).

### 3. UNIMPLEMENTED (UNVERIFIED at runtime): the Workflows list reads routes the Vibestack resident does not serve

- **Behaviour:** the list shows the owner's workflows, prompts, scheduled items, reminders, routines and goals.
- **Legacy:** `dev:apps/app/src/runtime/automations-protocol.ts` (four sources), served by the legacy
  agent (`eliza-develop/packages/agent/src/api/server.ts`); `dev:test/automations-unified.test.mjs`
  "unified read uses all four canonical sources".
- **Port:** `vs:apps/app/src/workflows/automations.vibe:143` (`GET /api/automations`), `:152`
  (`/api/scheduled-tasks`), `:156` (`/api/lifeops/reminders`), `:165` (`/api/lifeops/definitions`),
  and `/api/lifeops/occurrences/{id}/snooze`. Rule: `vs:apps/app/spec/workflows/automations.md`.
- **Upstream:** a grep of every `"/api/…"` literal under `up:packages/{agent,assistant,workflow,core}/src`
  finds `/api/triggers`, `/api/scheduled-tasks`, `/api/workflow/workflows`,
  `/api/personal-assistant/routines`, but no `/api/automations`, no `/api/lifeops/reminders`,
  no `/api/lifeops/definitions`, no `/api/lifeops/occurrences`. The only hit for those strings in
  `eliza-vs` is a baseline JSON listing legacy files.
- **Why it matters more than a missing source:** workflow rows come only from `/api/automations`
  (`automations.vibe:143-149`). With a 404 the list shows "Automations aren't available on this agent"
  and no `WorkflowRow`, so the workflow view is reachable only from a notice deep link. Home's
  workflows card reads the same route (`vs:apps/app/src/shell/overview.vibe:56`) and never shows.
- **UNVERIFIED because:** no resident was run. A route could be assembled from parts the grep missed;
  I found none.
- **Smallest fix:** read workflows from `client.workflows()` (`/api/workflow/workflows`, already in
  `familyOf`), prompts from `/api/triggers`, routines from `/api/personal-assistant/routines`; or add
  the aggregate route upstream. Update `automations.md` ("Each source is read on its own…") and the
  `familyOf` table in `vs:apps/app/src/workflows/api.vibe:30-41`. Add to the open-items "Upstream" list.

### 4. CHANGED: a Calendar range step fails for any range that contains an event

- **Behaviour:** an approved `read_calendar_range` step returns the events of the reviewed range.
- **Legacy:** the renderer read the range and added each row's revision before validating:
  `dev:apps/app/src/prototype/agent-adapter.ts:1382-1386` (`revision: await workflowSha([...])`,
  then `validateWorkflowResult`).
- **Port:** `vs:android/.../WorkflowBridgeHost.java:122-131` returns
  `{kind:"calendar", events}` straight from `SelectedCalendarReader.readWorkflowRange`, whose rows are
  `id, calendarId, title, start, end, allDay` (`up:packages/os/android/calendar/.../SelectedCalendarReader.java:189`).
  `vs:scripts/resident/bridges.ts:154-156` returns the bridge's answer unchanged. Upstream then
  requires exactly `id, calendarId, revision, title, start, end, allDay` with a matching hash
  (`up:packages/workflow/src/contract/device.vibe:275-283`) and fails the step
  (`up:packages/workflow/src/service/workflows.vibe:922-924`).
- **Also:** the legacy foreground guard for this read is gone (the bridge reads in-process whether or
  not Alpha is in front). That half is KNOWN ("`WorkflowBridgeHost.perform` still reads
  `read_calendar_range` in-process").
- **Impact:** agenda and digest-style workflows fail whenever the day has events; an empty day passes.
- **Smallest fix:** add the revision in `bridges.ts` (`workflowSha(workflowCalendarRevisionInput(row))`)
  or forward the read to Calendar's `operationPorts` as open-items already proposes. Rule goes in
  `deviceSteps.md` under "A run-day read needs protocol 5…".

### 5. UNIMPLEMENTED + UNMODELED: a workflow cannot be turned on or off

- **Behaviour:** the workflow detail has an on/off switch; turning a schedule on is reviewed, names
  the version, and states the missed-run window.
- **Legacy:** `dev:apps/app/src/prototype/workflow-adapter.ts:720` (`detail.active ? pause() : activate()`,
  `confirmToggle: reviewActivation`); #1316 and #1403 ("Expose workflow on/off toggles as switches");
  `dev:test/workflow-typed-schedule.test.mjs` "turning a schedule on names the reviewed version…";
  `dev:test/browser/workflow-missed-run-now.spec.ts` "the typed schedule enable review states the delay window without enabling".
- **Port:** `WorkflowDefinitions.setActive` exists (`vs:apps/app/src/workflows/definitions.vibe:257-265`)
  with no caller in `src/` or `test/`. The workflow view renders `PhoneStepReview`, `RunPanel` and
  `LifecycleControls` only (`vs:apps/app/src/web/workflows/WorkflowsScreen.tsx:158-184`). No rule in
  `spec/workflows/*.md` covers activating a workflow (lifecycle covers remove, restore, rename).
  The automation switch (`AutomationDetail.tsx:78-81`) applies to prompts, reminders and routines, not workflows.
- **Impact:** a saved workflow is "Saved paused. Turn it on when you are ready." with no way to turn
  it on. Scheduled workflows never run.
- **Smallest fix:** add an activation rule to `lifecycle.md` (reviewed, version-bound, refused for a
  manual trigger), a `Switch` in the workflow view header calling `setActive` through a `ReviewDialog`
  that shows `scheduleNote`.

### 6. MISSING: no check that notifications are on when a workflow is turned on

- **Legacy (#1403, 2026-11-20):** `workflow-adapter.ts:720,732` (`notificationsOff`, `openNotificationSettings`);
  `dev:test/workflow-adapter-recovery.test.mjs` "turning a workflow on checks notifications and offers
  settings only when they are off", "opening a workflow that is already on says when notifications are off…".
- **Port:** no match for it in `src/workflows`, `src/web/workflows` or `spec/workflows`.
- **Impact:** an owner can enable a schedule whose approvals would never be shown.
- **Smallest fix:** rule in `notices.md`; a line under the switch from gap 5.

### 7. UNIMPLEMENTED: approval notices are never posted, and "Waiting for you" never appears

- **Legacy:** `workflow-adapter.ts:732` (`poster.poll(true)`); `dev:test/workflow-approval-poster.test.mjs`
  (7 tests), `dev:test/workflow-approval-notice.test.mjs`.
- **Port:** `ApprovalNotices.sweep` and `.bind` (`vs:apps/app/src/workflows/notices.vibe:84-125`) have
  no caller outside `vs:apps/app/test/workflows/stories.test.vibe:316-317`. The list's "Waiting for you"
  label reads `notices.state.waiting` (`WorkflowsScreen.tsx:133`), which only `sweep` fills.
  Rules exist: `vs:apps/app/spec/workflows/notices.md`.
- **Impact:** a run waiting on the owner posts no notification; the owner finds out only by opening the run.
- **Smallest fix:** a follower in `vs:apps/app/src/workflows/layer.vibe` `background` that sweeps the
  listed workflow ids on resume, on list refresh and on a timer.

### 8. UNIMPLEMENTED: digest result notices are never published, and nothing polls for results

- **Legacy:** `dev:apps/app/src/runtime/hosted-digest-ui.tsx` (a one-minute `setInterval` inbox read
  while the panel is closed, `publishHostedResult` after each sync); `dev:apps/app/src/runtime/hosted-result-notices.ts:16`.
- **Port:** `HostedResults.publish` (`vs:apps/app/src/workflows/results.vibe:90-110`) has no caller.
  `Digests.poll` runs only when the sources sheet opens or changes (`place.vibe:113`, `sources.vibe:268,277`);
  `flight()` (`digests.vibe:144-164`) does not publish. Rules exist: `hostedResults.md`
  "Publishing a retained result posts it once…".
- **Impact:** "Be told when my digest is ready" does not happen from the app.
- **Smallest fix:** call `results.publish(results)` at the end of `flight()`, and add a poll follower to `layer.vibe`.

### 9. UNIMPLEMENTED: background delivery is never configured, and its switches have no screen

- **Legacy:** `dev:apps/app/src/runtime/hosted-background.ts:13-30` (`configureHostedBackground`),
  called from `hosted-digest-ui.tsx`; the panel's "Background checks" and "Notifications" switches.
- **Port:** `HostedResults.background` and `.setNotifications` (`results.vibe:162,187`) have no caller;
  `DigestPanel.tsx` has neither switch. Rule exists: `hostedResults.md` "Background delivery is
  configured only on Android, by one attempt that a pause retires".
- **Impact:** results are not delivered while Alpha is in the background, and the owner cannot turn
  result notifications on or off.
- **Smallest fix:** two `Switch` rows in `DigestPanel.tsx`; call `background(true)` when the panel
  binds an owner on Android.

### 10. UNIMPLEMENTED: Home's brief card never shows

- **Legacy:** `dev:test/browser/home-attention.spec.ts:76` "a retained brief appears next to the
  attention items…", `dev:test/quint-retained-home-brief.test.mjs`.
- **Port:** `Overview.reportBrief` (`vs:apps/app/src/shell/overview.vibe:98`) has no caller;
  `Digests` computes `brief` (`digests.vibe:158-162`) and keeps it in the panel. Rules exist in
  `digests.md` ("Home's brief is the newest result that ran…") and `spec/shell/overview.md:125`.
- **Smallest fix:** call `overview.reportBrief` from `flight()` in `digests.vibe`.

### 11. UNIMPLEMENTED: nothing in Workflows follows an account change

- **Legacy:** `dev:test/workflow-account-switch.test.mjs` (21 tests), #1128/#1207
  ("cancel a previous account's workflow run", 2026-11-12).
- **Port:** `WorkflowRuns.bind` (`vs:apps/app/src/workflows/runs.vibe:245-253`, the only place that
  sends `cancelPrevious` and cancels the previous owner's run) has no caller. Neither do
  `ApprovalNotices.bind`, `HostedResults.bind`. `layer.vibe:28-32` forks only the renewal, foreground
  and route followers. Owners are rebound lazily when the owner opens something.
  Rules exist: `runs.md` "The previous account's unfinished run is asked to stop at most once",
  `notices.md` "Another owner's notices are suspended…", `hostedResults.md` "Another owner withdraws every notice…".
- **Impact:** after a sign-out or account switch, the previous account's run keeps going and its
  notices stay posted until someone opens Workflows.
- **Smallest fix:** one follower over the account's session stream in `layer.vibe` that calls each `bind()`.

### 12. UNIMPLEMENTED (UNVERIFIED at runtime): Google-through-Cloud read grants call routes absent upstream

- **Port:** `vs:apps/app/src/workflows/sources.vibe:151,280` call
  `/api/workflow/hosted/cloud-delegation/{start,status,complete,cancel,revoke}`.
- **Upstream:** `up:packages/workflow/src/routes.vibe:104-114` lists the hosted routes; none is
  `cloud-delegation`. No file under `up:packages` (outside one os bridge comment) mentions delegation.
  Legacy served them from `eliza-develop/packages/app/src/api/cloud-google-delegation-routes.ts`.
- **Impact:** "Let my digest read Google through Cloud only as I authorized" cannot start a grant.
- **Smallest fix:** upstream route, or move the grant to Account's delegation service
  (`vs:apps/app/src/account/delegation.vibe`); note it in open-items under "Upstream (eliza) / cloud".

### 13. MISSING: a digest schedule cannot be created, retimed, moved to another zone, or removed

- **Legacy:** `hosted-digest-ui.tsx` `schedule(template, enabled)` (Morning/Evening, time, zone),
  the Schedules list with Remove, "Share a snapshot" sources; #1403 "Pick the digest time zone from a list".
- **Port:** `DigestPanel.tsx` offers pause/resume, Run now, retry/discard. `Digests.change` is called
  only for sources (`sources.vibe:320,343`). The rule `zoneChoices` exists in `digests.md` and is
  used nowhere in Workflows. `DigestSourcesService.validGoogle`, `.consent`, `.revokeImpact`, `.tick`
  have no caller, so a Google selection cannot be saved and a waiting grant request never expires by clock.
- **Impact:** a new owner has no way to set up a digest; the add sheet's "Scheduled digest" row opens an empty panel.
- **Smallest fix:** a schedule form in `DigestPanel.tsx` (template, time, zone from `zoneChoices`,
  source) sending `Digests.change({path:"loops",…})`; a rule in `digests.md` for creating one.

### 14. MISSING: no filters, no Removed list, so Restore is unreachable

- **Legacy (#1403, 2026-11-20):** `dev:apps/app/src/prototype/workflow-filters.ts`,
  `automations-adapter.ts` (`listRemoved`, `removedRow`); `dev:test/automations-unified.test.mjs`
  "the Removed filter lists removed workflows, opens one for Restore…".
- **Port:** `AutomationList.tsx` has no filter. `/api/workflow/removed-workflows` (served upstream,
  `routes.vibe:79`) is not in `familyOf` (`api.vibe:30-41`), so it would be refused as `NotSent`.
  `automations.md:114` cites #1316 and stops there; #1403 came later.
- **Impact:** once the owner leaves a removed workflow, nothing lists it. `LifecycleControls` has a
  Restore button that cannot be reached.
- **Smallest fix:** a status filter in `AutomationList.tsx`, `client.removed()` behind it, the route in `familyOf`.

### 15. MISSING: the manual step editor, and editing an existing workflow

- **Legacy:** `dev:apps/app/src/prototype/workflow-authoring.ts` (palette Read/If/Write/Send/Notify/Speak/Do,
  per-step settings, Manual/Time trigger with weekday chips, "From run day"/"Fixed dates");
  `dev:test/browser/workflows.production.spec.ts` "protocol 5 saves the selected run-day scope…",
  "an older peer retains a run-day draft and can explicitly switch it to fixed dates";
  `dev:test/browser/dev-workflow-execution.spec.ts` "rendered manual workflow editing preserves steps…".
- **Port:** `DraftSheet.tsx` is describe → draft → save. The review lists each step by its operation
  label only (`DraftSheet.tsx:47-51`), not which notes, calendars, text or notification it uses.
  `WorkflowDefinitions.save(workflowId?)` supports editing, but the screen always calls `save()`
  with no id (`WorkflowsScreen.tsx:253`), and nothing loads an existing spec into the draft.
- **Impact:** the owner approves a draft without seeing what each step reads or says, and cannot
  change a saved workflow. Not listed as a decision in open-items.
- **Smallest fix (if the editor is meant to be gone):** show each step's reviewed scope in
  `DraftSheet.tsx`, add "Change" to the workflow view that calls `save(workflowId)`, and record the
  retirement of the manual editor in open-items as an owner decision.

### 16. UNIMPLEMENTED: the run view shows no output, no steps, no error, and no workflow details

- **Legacy:** `workflow-adapter.ts` receipt (output, `workflowEventLabel` timeline, `workflowRunErrorText`);
  `dev:test/workflow-output-contract.test.mjs` "execution receipts present typed final text…";
  `dev:test/browser/dev-workflow-execution.spec.ts` "reviewed agent workflow runs and shows its durable output and history".
- **Port:** `RunPanel.tsx` renders when, status word and buttons. `WorkflowRun.output`, `.events`,
  `.error` (`up:packages/workflow/src/client/workflow-client.vibe:45-49`) are read nowhere in `src/`.
  The workflow view has no name, description, steps, schedule or state. The rule exists:
  `vocabulary.md` "…only a workflow's own output is shown as it is".
- **Impact:** a manual workflow that drafts text shows "Finished" and nothing else.
- **Smallest fix:** output and error in `RunPanel.tsx` for the selected run; a header in the workflow view.

### 17. CHANGED: Stop run sends on the first tap

- **Legacy:** `dev:test/browser/workflows.production.spec.ts:219-229` ("Cancel run" → "Confirm cancel").
- **Port:** `RunPanel.tsx:60` → `WorkflowRuns.cancel()` (`runs.vibe:234-241`) immediately. `runs.md`
  "Cancel is asked only for the shown, unfinished run…" has no confirmation.
- **Smallest fix:** a `ReviewDialog` in `RunPanel.tsx`; a `confirmingCancel` field in `runs.md`.

### 18. MISSING: the open run is not sent to chat as the selected object

- **Legacy:** `workflow-adapter.ts` (`selectedObject: {kind:'workflow-run', id, revision: versionId}`);
  `dev:test/browser/workflow-run-context.spec.ts`.
- **Port:** no `workflow-run` anywhere in `src/`; Workflows has no screen-context provider.
- **Impact:** "ask Alpha about this run" loses its subject.
- **Smallest fix:** a context export from `place.vibe` consumed by the assistant's screen ports; rule in `runs.md`.

### 19. CHANGED: the agent's clarifying question is dropped

- **Legacy:** `dev:test/browser/workflow-scope-refusal.spec.ts:32-41` (a 422 clarification is shown; draft and request kept).
- **Port:** `definitions.vibe:273` catches every `generatePhone` failure as `unavailable`
  ("A draft isn't available from your agent right now"). The transport also strips the error body
  (`api.vibe:78-82` forwards status and code only), so upstream's `clarification` parse
  (`workflow-client.vibe:151`) can never match.
- **Smallest fix:** carry the body's `error` through `workflowHttpError`; a `clarify` case in `Described`.

### 20. CHANGED: the prompt editor asks for a raw cron line, has no review, and does not bind the delivery conversation

- **Legacy:** presets with a time and weekday chips (`automations-adapter.ts`, `CRON_PRESETS`,
  `scheduleDays`); review before save; `dev:test/automations-unified.test.mjs:37` "prompt creation is
  paused and preserves its delivery conversation"; "resident prompt reviews disclose the timed window…".
- **Port:** `PromptSheet.tsx:57` (`placeholder="0 9 * * 1-5"`), Save submits directly.
  `automations.vibe:345-353` sends no `deliveryConversationId` and calls
  `saveConfirmed(creating, id, title, instructions, "", saved)`. The rule in `agentSchedules.md`
  says the save is confirmed against "the delivery conversation it was sent for"; with `""` that
  check is vacuous.
- **Smallest fix:** presets in `PromptSheet.tsx`; pass the current conversation id through `savePrompt`.

### 21. MISSING: creating or editing a reminder from Workflows; changing a scheduled item's days

- **Legacy:** `automations-adapter.ts` (`createReminder`, `createDeviceReminder`, reminder edit);
  tests "once and reminder edit inputs use local time…", "acknowledged reminder keeps edit/cancel…",
  `dev:test/browser/unified-automations.spec.ts` "schedule time, days and instructions change only after confirmation".
- **Port:** add sheet has Workflow, Prompt, Scheduled digest, Digest sources, Alarm in Clock
  (`WorkflowsScreen.tsx:210-214`). A reminder row offers Snooze and Cancel only. A scheduled item's
  edit says "The days and time zone stay as they are" (`AutomationDetail.tsx`).
- **UNVERIFIED:** whether the Clock area's reminders screen covers reminder create/edit. Not my slice.

### 22. CHANGED: Home's workflows card shows a count, not names and states

- **Legacy:** `dev:test/browser/home-workflows.spec.ts` "Home shows actual workflow names and states…".
- **Port:** `vs:apps/app/src/web/shell/overviewCopy.ts:101-107` ("N workflows on"). It also depends on gap 3.

### 23. CHANGED (minor): one pending approval at a time

- **Legacy:** each pending approval of a run has its own review region (`workflows.production.spec.ts:198-213`).
- **Port:** `notices.vibe:138` takes the first pending supported approval; the second appears after
  the first is decided. An unsupported pending approval is not shown at all.

### 24. UNIMPLEMENTED (browser and test-mock builds only): the simulator and request recovery have no screen

- **Port:** no file outside `src/workflows` uses `SimulatedWorkflows`, `SimulatedTriggers`
  (except `arrive` from Maps) or `RequestRecovery` (except `capture` from Camera). Their rules and
  drivers exist (`simulator.md`, `simulatedTriggers.md`, `recovery.md`).
- **Legacy:** `dev:test/browser/dev-workflow-{authoring,dates,execution,focus,history,messages,receipts}.spec.ts`,
  `workflow-notice-{history,lifecycle}.spec.ts`, `workflow-notices.spec.ts`,
  `workflow-notification-recovery.spec.ts`, `workflow-intent-storage.spec.ts` (about 90 tests).
- **Related KNOWN bullet:** "Should there be a mock-mode runtime…". The missing simulator screen itself is not listed.

### 25. KNOWN items confirmed in code

| Item | Open-items bullet | Confirmed at |
|---|---|---|
| `WorkflowCalendar` has no consumer | Areas consuming assistant changes / Workflows | no user outside `calendarRanges.vibe`; `WorkflowCalendar.inMeeting` uncalled |
| `post_notification` binding hash omits the proposal digest | same | `operations.vibe:51-53` |
| Calendar range read stays in-process | Android / native | `WorkflowBridgeHost.java:122-131` |
| Pin must move past `c8f273cec1b` for `workflowDeviceOffer` | Tooling | `vs:upstream.lock.json` pins `c84e5d68e37`; `bridges.ts:8` imports it |
| Phones may register workflow protocol 1, not 5 | Unverified / Native | `account/enrollment.vibe:142,191` |
| `android-workflow-native.ts` harness not rewritten | Tooling | file present, untouched |

One open-items bullet looks **stale**: "`scripts/resident` must register the `workflow-device` and
`workflow-native-digests` runtime services". `vs:scripts/resident/bridges.ts:161-176` defines both
and `entry.vibe` passes `runtimeServices: residentServices`.

### 26. Vibestack usage in this slice

- **Dead models (UNIMPLEMENTED):** these spec functions have no caller in Alpha code, so nothing
  conforms to them: `scheduling.md` `decideOccurrence`, `nativeReadAdmitted`, `boundedDelay`,
  `wakeTarget`, `admissionOf`, `fireReplyWellFormed`, `stageResult`, `reusable`; `deviceSteps.md`
  `runDayReadAdmitted`; `digests.md` `zoneChoices`. Most restate upstream or native behaviour
  (upstream enforces the run-day grace at `contract/device.vibe:332-333`), which is fine as
  documentation but is not checked against anything.
- **UNMODELED:** `WorkflowDefinitions.setActive` (no rule); the resident bridge's split between native
  and offered operations (`bridges.ts:136`, `NATIVE_DEVICE_OPERATIONS`) and `WorkflowBridgeHost.java`
  (no Alpha rule; cites upstream `approvals.md` only).
- **Shell deciding what the model should:** `notices.vibe:167-172` decides "settled" from the
  approval status instead of from an outcome the model is given (gap 2B).
- **Conformance drivers:** present for `clockDraft`, `deviceSteps`, `digestInbox`, `hostedResults`,
  `place`, `recovery`, `simulatedTriggers` (`vs:apps/app/test/drivers/workflows__*.ts`). None for the
  stateful `automations`, `authoring`, `digests`, `digestSources`, `lifecycle`, `notices`, `runs`,
  or the native `resident`. Their tests (`test/workflows/stories.test.vibe`) step the generated
  Machine through the services but do not run generated conformance cases.
- **Proofs:** no `*.proof.dfy` under `vs:apps/app/spec/workflows`. Legacy had
  `dev:specs/lemma/apps/app/src/browser/workflow-triggers.dfy` (cursor monotone, reaches now, place
  change symmetric) and `dev:specs/lemma/apps/app/src/runtime/workflow-device-contract.dfy`
  (a ready tap never opens twice, tap recheck priority). Both files are still in
  `vs:specs/lemma/…` but verify TypeScript that no longer exists.
- **Rules without a property** (the block defines steps only): `deviceSteps.md` "Leaving Alpha suspends
  the step…"; `digestSources.md` "Revoking a grant is confirmed…"; `hostedResults.md` "Turning
  notifications off or on…" and "A result shown in the panel withdraws its notice…"; `lifecycle.md`
  "Opening a workflow reads its version…"; `recovery.md` "Opening a review retires the one before it…";
  `resident.md` "A reboot locks the phone until unlock…"; `simulatedTriggers.md` "Messages arrive and leave…".
  Every rule has a Quint block; every stateful module has at least one witness.
- **No `.meta.tsx`:** `WorkflowsScreen.tsx`, `ResultNoticeSurface.tsx` (not in the open-items "No meta file" list).
- **Dead bridge op:** `WorkflowBridgeHost.enrollment` / `PROTOCOL = 1` and `bridgeEnrollment`
  (`bridges.ts`, `bridgeEnrollment`) are served but unused; the resident reads enrollment from its own store.

## Confirmed OK

Spec rule stated and shell or UI code implements it. "Client side" means the renderer half is right
but depends on a gap above to be reachable.

| Behaviour | Legacy | Spec rule | Code |
|---|---|---|---|
| Run is reviewed, one submission saved before send | `test/browser/workflow-interruption-recovery.spec.ts` | `runs.md` "Run is reviewed first…" | `runs.vibe:201-214`, `RunPanel.tsx:52-56` |
| Lost answer keeps the request; reconcile by submission; resend only after review | same, `test/workflow-adapter-recovery.test.mjs` | `runs.md` "An unknown outcome is settled by asking for the same submission…" | `runs.vibe:215-233` |
| A version the agent did not admit abandons the request | `workflow-interruption-recovery.spec.ts` | `runs.md` "A version the agent did not admit…" | `runs.vibe:140-158` |
| Open unfinished run refreshes after 2 s then every 5 s (#1004) | `workflow-adapter.ts` | `runs.md` "Only an open, unfinished run…" | `runs.vibe:160-168`, `place.vibe:145-156` |
| A notice or deep link opens exactly the run it names | `test/browser/workflow-notice-taps.spec.ts` | `runs.md` "A notice opens exactly the run it names" | `runs.vibe:128-138,175-186`, `place.vibe:181-191` |
| Missed typed occurrence: Run now returns to a fresh confirmation | `test/browser/workflow-missed-run-now.spec.ts` | `runs.md` "Run now of a missed typed occurrence…" | `RunPanel.tsx:63-68`, `runs.vibe:242-244` |
| Remove, restore, rename: reviewed, kept under a mutation id, resent only after review | `test/workflow-lifecycle-resend.test.mjs` | `lifecycle.md` (all rules) | `definitions.vibe` (`review`, `confirm`, `resend`), `LifecycleControls.tsx` |
| Removal waits for a going run; unknown-outcome run is stopped first | `workflow-lifecycle-resend.test.mjs` | `lifecycle.md` "A change is reviewed before it is kept…" | `LifecycleControls.tsx:46,52` |
| Out-of-scope description refused before generation | `test/workflow-scope.test.mjs`, `test/browser/workflow-scope-refusal.spec.ts` | `authoring.md` "A description asking for calls, texts, payments…" | `definitions.vibe:269-271` |
| Unsent description kept per owner | `test/browser/workflow-generation.spec.ts` | `authoring.md` "The unsent description is kept…" | `definitions.vibe:335-347`, `DraftSheet.tsx:42` |
| Draft saved once; recover, resend, two-tap discard | `test/browser/dev-workflow-authoring.spec.ts` | `authoring.md` "The agent's receipt saves the draft…" | `definitions.vibe:287-325`, `DraftSheet.tsx:60-65` |
| A generated draft that changes the schedule is refused | `test/workflow-definition-bounds.test.mjs` | `scheduling.md` "A generated draft that changes the schedule…" | `definitions.vibe:275` |
| Draft review states the 30-minute missed window and a skipped local time (#1018) | `test/workflow-typed-schedule.test.mjs` | `scheduling.md` first two rules | `definitions.vibe:327-334`, `DraftSheet.tsx:51-54` |
| Each list source fails on its own with a note (client side) | `test/automations-unified.test.mjs` | `automations.md` "Each source is read on its own…" | `automations.vibe:180-194`, `AutomationList.tsx:24-31` |
| One held change per owner; Allow another only after confirm | `test/browser/unified-automations.spec.ts` | `automations.md` "Allow another releases…" | `AutomationList.tsx:57-62`, `automations.vibe:371` |
| Automation, routine, prompt: on/off switch through review (#1316) | `automations-adapter.ts` | `automations.md` "A change is held before it is sent…" | `AutomationDetail.tsx:78-81`, `automations.vibe:259-268` |
| Scheduled item verbs; ended item offers only Reopen; Complete vs Dismiss explained (#1403) | `test/scheduled-task-controls.test.mjs` | `agentSchedules.md` "An ended item offers only Reopen…" | `AutomationDetail.tsx:33-38,53` |
| Snooze 10 minutes from the next scheduled time | `test/quint-scheduled-snooze-admission.test.mjs` | `agentSchedules.md` "Snooze 10 minutes defers…" | `automations.vibe:297-316` |
| New prompt saved paused; history read on open (#1403) | `automations-unified.test.mjs` | `agentSchedules.md` "A new prompt is saved paused…" | `automations.vibe:345-349`, `WorkflowsScreen.tsx:113` |
| Phone step: two taps of the same choice, reread before acting, moved anchor asks again | `workflows.production.spec.ts:193-217` | `deviceSteps.md` rules 2 to 4 | `notices.vibe:141-164,180-199`, `PhoneStepReview.tsx` |
| Speech and notification executors guard the screen; cut-off speech is unknown (client side) | `test/workflow-step-screen-guard.test.mjs` | `deviceSteps.md` "Speech and notices run only on the visible…" | `operations.vibe:66-117` |
| Digest pause/resume keeps time, zone, source; Run now of a missed digest is reviewed | `hosted-digest-ui.tsx` | `digests.md` "Pausing or resuming keeps…", "Run now is offered only…" | `digests.vibe:232-258`, `DigestPanel.tsx:63-64,84-98` |
| Kept digest change: retry, discard only in review | `test/browser/workflow-intent-storage.spec.ts` | `digests.md` "A kept request is restored…" | `digests.vibe:208-231`, `DigestPanel.tsx:49-55` |
| Phone source consent, renewal reminder tap opens its review | `hosted-digest-ui.tsx` | `digestSources.md` renewal rules | `sources.vibe:304-358,384-394` |
| Google access removal shows every affected source and digest first (client side) | commit c609192f2 | `digestSources.md` "Removing Google access first shows…" | `sources.vibe:265-288`, `SourceReview.tsx` |
| Reply's workflow block becomes a run card | `test/workflow-reply-markup.test.mjs` | assistant spec (other slice) | `assistant/reply-lines.vibe:53,98`, `web/assistant/ReplyText.tsx:52` |
| One card per workflow a reply changed; a refusal offers Workflows | `test/automation-completion.test.mjs`, `test/browser/workflow-chat-changes.spec.ts` | `vocabulary.md` "Each changed workflow gets one card…" | `changes.vibe:45-75`, `assistant/composer.vibe:488-491` |
| Device registration steps down protocol only on 409; presentation probe | `test/workflow-device-registration.test.mjs`, `test/workflow-presentation-probe.test.mjs` | account spec (other slice) | `account/enrollment.vibe:140-200` |

Native classes unchanged from legacy (byte-identical): `WorkflowNoticeDelivery`, `WorkflowNoticeTaps`,
`WorkflowNoticeTapsFactory`, `NativeDigestHost`, `NativeDigestSources`, `ResidentScheduleRearm`,
`ResidentScheduleReceiver`, `HostedInbox`, `HostedResultNotices`, `WorkflowWorkerAssets`.
`WorkflowNoticePoster` differs by two `StoreChanges.changed(NOTIFICATIONS)` calls. The receiver is
still registered (`vs:android/app/src/main/AndroidManifest.xml:131-132`). Whether these classes are
still reached now that the agent service moved upstream was not checked.

RETIRED (alpha #1422): `test/browser/dev-workflow-{agent,background-agent,concurrency,executor,phone,result,triggers,urgency}.spec.ts`
(deleted on develop; still in the legacy list); the DEV-bridge half of `test/automations-transport.test.mjs`.

## Not covered

- **Upstream engine parity.** Whether `up:packages/workflow` and `up:spec/workflow/*.md` carry the
  behaviour of these legacy models and tests was not read beyond the routes and the approval path:
  `WorkflowEngineAdmission`, `WorkflowExecution`, `WorkflowExecutionAuditAdmission`, `WorkflowAuthoring`,
  `WorkflowMetadataEdit`, `WorkflowLifecycleChange`, `WorkflowScheduleTasks`, `TriggerCursor`,
  `TaskSchedulerRuntime`, `CoreTaskScheduler`, `LifeOpsScheduledTaskRoute`,
  `PersonalAssistantScheduledTaskCustody`, `PreparedWorkflowWorker`, `WorkflowWorkerStaging`, and
  their `test/quint-*.test.mjs` and `specs/quint/refinement/services/*.mjs` drivers.
- `test/workflow-source-publication.test.mjs` against `up:spec/workflow/sourcePublication.md`.
- `test/workflow-definition-bounds.test.mjs`, `test/workflow-output-contract.test.mjs` (second test),
  `test/workflow-typed-schedule.test.mjs` (occurrence reporting) against the upstream client.
- **Notice taps and the notice question** (`vs:apps/app/src/clock/workflow-notices.vibe`,
  `clock/notifications.vibe`): `test/browser/workflow-notice-taps.spec.ts`,
  `test/workflow-notice-return.test.mjs`, `test/workflow-notice-delivery.test.mjs`,
  `test/fixtures/WorkflowNotice*Test.java`, `WorkflowNoticeTaps.qnt`, `WorkflowNoticeDelivery.qnt`.
  I confirmed only that the layer exists and calls `runs.open`.
- **Digest inbox retention and storage**: `digestInbox.md` against legacy `digest-storage.ts`,
  `HostedInbox.java`, and the three deleted `scripts/test-*digest*.ts`. Not read.
- **Resident scheduling at runtime**: `resident.md` against `ResidentScheduleRearm.java` and
  `test/quint-resident-scheduling-admission.test.mjs`; whether the unchanged Java still starts the
  agent under the upstream agent service.
- **Android instrumented tests** (`ResidentWorkflowCrash`, `WorkflowApprovalNotice*`, `WorkflowDraftNative`,
  `WorkflowLegacyReminderUpgrade`, `WorkflowPhoneNative`): whether they still compile against the port.
- **Simulator rules in detail** (`simulator.md`, `simulatedTriggers.md`) against
  `dev:apps/app/src/browser/workflow-*.ts`; I checked only that no screen reaches them.
- **Request recovery** (`recovery.md`) against `dev:apps/app/src/runtime/workflow-request-recovery.ts`.
- **Clock draft** (`clockDraft.md`) against legacy `workflow-clock-admission`; only the wiring was read.
- `test/polish-automation-when.test.mjs` (hour-cycle and device-local time formatting) against `words.ts` `when`.
- `test/browser/journey-j04-schedule-travel.spec.ts`, `test/quint-automatic-app-update-schedule.test.mjs`
  and `AutomaticAppUpdateSchedule.qnt`: listed under workflows but belong to Calendar/Maps and Settings.
- `scripts/legacy-retirement.json` entries for this area were not checked against these findings.
- Wording parity (#1288 "only Alpha's own wording") beyond the strings quoted above.
