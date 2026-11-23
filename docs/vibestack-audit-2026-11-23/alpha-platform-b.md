# Alpha parity audit: platform, second half

Slice: `lists/platform.tests.txt` 186-370 (87 real test files, the rest are fixtures and support),
`platform.quint.txt` 41-79 (39 models), `platform.lemma.txt` 86-171 (86 refinement files: Java trace
replays and `.mjs` drivers, no Dafny). Trees: `alpha-develop` dd63c6bc, `alpha-vs` 3d7ca972,
`eliza-vs` (vibestack-dp). Nothing was built or run; every statement below is from reading source.

## Summary

Counts are per behaviour group (one legacy test file or Quint model, or a group of them that state one behaviour).

| Class | Count |
| --- | --- |
| OK (rule and code both read) | 18 |
| OK at rule level only, owned by another area (code not read in depth) | 8 |
| CHANGED | 3 |
| MISSING | 6 |
| UNIMPLEMENTED | 2 |
| UNMODELED | 1 |
| KNOWN (open-items) | 8 |
| RETIRED by #1422 | 3 |
| Tooling removed, recorded only in `scripts/legacy-retirement.json` | 14 test files |
| UNVERIFIED | 4 |

Verdict: **not at parity.** The platform core itself (resident connection, native stream relay, Cloud
transport, crash log, lifecycle, storage) is well ported: each has a spec rule, a Quint model and
shell code that calls the generated functions. Three things break parity. First, the owner's Gmail
changes / Calendar edits switches no longer reach anything that enforces them: the agent's consent
is a static `false` in `android/agent/host.json`, so agent-side Google writes are always refused
whatever Settings shows. Second, the port has only 8 specs and 1 test file for this area because
most of the 370 "platform" tests are not platform behaviour: 234 of this slice's entries are mapped
to `spec/platform/index.md` as a catch-all. The files are still in the tree, byte-identical (81 of
84), but nothing runs them: `scripts/run-tests.ts` and `scripts/check-quint.ts` are gone and
`verify.yml` runs only `pnpm verify`. The Android Java and release scripts they covered are
retained, so that code lost its tests and its Quint replays. Third, a handful of owner-visible
behaviours are gone (device 12/24-hour clock, non-reviewable agent startup failures, the Back
gesture preview, several durable slots at update time).

## Gaps

### 1. CHANGED (high): the agent's Google write switches are written but never enforced; agent writes are always off

- Behaviour: legacy's native Google host read the access file before every agent write, so "a switch
  change applies to the next write without restarting the host", and off/missing/corrupt refused writes.
- Legacy: `test/native-google-agent-host-access.test.mjs:98,113`, `test/google-agent-access.test.mjs:13`,
  `specs/quint/refinement/services/native-google-access-file.md`.
- Port: the renderer half is fine (`apps/app/spec/account/agentAccess.md`, `src/account/agentAccess.vibe`
  calls `Agent.setGoogleAgentAccess`). Android still writes the file and exports
  `ALPHA_GOOGLE_AGENT_ACCESS_FILE` (`android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java:429-433,659-660`).
  Nothing reads that variable: no hit in `alpha-vs/scripts/resident/**` or `eliza-vs/packages/**`. The
  native Google host module is gone (`google-host.mjs` is built by nothing in `alpha-vs/scripts`).
  Upstream takes consent from the launch document only
  (`eliza-vs/packages/agent/src/models/cloud-link.vibe:108-110`, `eliza-vs/spec/agent/models/binding.md:446-462`),
  which Android builds from `host.json` (`eliza-vs/packages/os/android/agent-service/src/main/java/ai/eliza/os/agent/AgentConfig.java:215`),
  and `alpha-vs/android/agent/host.json:19-22` hardcodes `gmailChanges: false, calendarEdits: false`.
- Impact: the agent can never change Gmail or edit Calendar through its Cloud link (`changes-off`,
  `eliza-vs/packages/inbox/src/agent/cloud.vibe:28`), while the Settings switches default to on
  (`agentAccess.md:32`) and report a successful publish. The rule "Settings shows only what the
  agent's Google host actually enforces" is false on the phone.
- Smallest fix: `ElizaAgentService.configureLaunch` (or upstream `AgentConfig`) reads
  `GoogleAgentAccessFile` into the launch `google` record and the agent is restarted, or upstream gains
  a live consent source; add the rule to `spec/account/agentAccess.md` ("the launch carries the saved
  switches") and drop the dead env var. Not in open-items.

### 2. MISSING (high, coverage): retained native and release code lost its tests and Quint replays

- Behaviour: legacy `bun run verify` ran every root test and `quint:check`; many compile and run the
  real Java or scripts.
- Legacy: `alpha-develop/package.json:19,49,54`, `.github/workflows/verify.yml:57`.
- Port: `scripts/run-tests.ts`, `scripts/check-quint.ts`, `scripts/prepare-quint-history.ts` absent;
  `alpha-vs/.github/workflows/verify.yml:27` runs `pnpm verify` (turbo over `apps/app` and `cloud`
  only). The only legacy root tests still wired are two in `android.yml:92`
  (`voice-host-record`, `wallet-disabled`). All 39 Quint models and all 86 refinement files of this
  slice are present and inert.
- Code that is still shipped and was covered only by these now-unrun files (class present in
  `alpha-vs/android` or `alpha-vs/scripts`): `SerialStorageTasks.java` (serial-storage-tasks),
  `RendererRecoveryBudget` (renderer-recovery-budget, `MainActivityRecoveryTraces.java`,
  `RendererBackgroundRebuildReplay.java`), `ResidentResultSession/Transport.java`
  (resident-android-json-compile, resident-result-transport), `LocalAgentProviderAdmission.java`,
  `CredentialRequestFence.java` (own-provider), `PluginWorkers.java` (plugin-worker-guard),
  `ReviewedCopies.java` (native-plugin-teardown), `AlphaMediaCopy.java` (native-media-fork), Sense/Power
  entry (power-sense-entry), manifest labels (manifest-label-strings), native UI self-containment
  (native-ui-self-contained), `scripts/pilot-update.ts`, `provision-unit.ts`, `release-blockers.ts`
  (pilot-units), `wireless-install-history.ts`, `audit-production-bundle.ts:98-114` and `apk.ts:155-157`
  (llama-cpp-only), `android-identity.ts` (product-identity), `native-view-policy.ts`,
  `verify-packaged-runtime.py`, `copy-file-clone.ts`, `storage-specs.ts` (playwright-projects).
- Impact: a regression in a native safety gate or a release/pilot admission check would pass CI.
- Smallest fix: a root `test:legacy` task in `verify.yml` that runs the still-valid subset under
  `node --test` (the 30-odd files whose sources all still exist), until each is replaced by an
  androidTest or an area conformance test. Open-items names only owner-route-parity, android-host and
  verify-apks as broken, not the general loss.

### 3. MISSING (medium): the device's locale and 12/24-hour setting are ignored

- Behaviour: every visible time followed Android's "Use 24-hour format" and the device locale, passed
  in from native because a WebView's `Intl` cannot see it.
- Legacy: `apps/app/src/prototype/locale-time.ts:1-4,15-22`, `apps/app/src/main.tsx:382`
  (`System.getLocaleInfo` → `setLocalePreferences`), `test/locale-time.test.mjs:6,18` (7 tests).
- Port: no caller of `getLocaleInfo` in `apps/app/src` or any spec (upstream still offers it,
  `eliza-vs/packages/os/src/bridges/definitions/system.ts:182,213`). Times are formatted with
  `Intl.DateTimeFormat(undefined, …)`, e.g. `src/web/telephony/present.ts:13`,
  `src/web/shell/overviewCopy.ts:5`, `src/web/inbox/MailList.tsx:37`.
- Impact: an owner with a 24-hour phone and an en-US WebView locale sees 12-hour times across Alpha.
- Smallest fix: a rule in `spec/settings/preferences.md` (or `spec/platform/index.md`), a
  `LocalePreferences` service in `src/platform` read at startup, and one shared formatter in `src/web/lib`.

### 4. CHANGED (medium): an agent start that is refused without a reviewable hold is a silent dead end

- Behaviour: legacy told the owner what to do for each refusal: `runtime-identity-unavailable` →
  "Startup check failed" with Try again, `ipc-recovery-required` → "Restart phone", boot reasons →
  "Agent didn't start" / "Update ready" / "Agent restarting", review steps → "Checking restart",
  "Restarting", "Restart blocked", "Restart incomplete"; Settings showed agent Status and Recovery rows.
- Legacy: `apps/app/src/runtime/resident-recovery.ts:14,19-25,56-61`,
  `runtime/connection-ui.tsx:252,869,4012`, `prototype/settings-adapter.ts:1013,1023`,
  `test/resident-recovery.test.mjs` (7 tests).
- Port: `src/platform/resident-live.vibe:146` answers `needs-recovery` for every later call once the
  phase is `Refused`; the only exits are `recovery.restart` and `control.recovered`, and the only caller
  is `src/assistant/restart.vibe:27-49`, which offers Restart only when `reviewRecovery` is reviewable.
  A distrusted verification (`resident-live.vibe:170`) or a non-503 refusal of `/api/auth/me` reaches
  `Refused` with no hold, so nothing is offered until the page restarts. Copy is one generic line
  (`src/assistant/presentation.vibe:66,75-78`); no Settings status row (`spec/settings/*.md`,
  `src/settings/diagnostics.vibe:114` only reads status for the problem log).
- Also: `resident.md` says a launch that `failed` waits for a guarded restart, but
  `resident-live.vibe:150-156` treats every `ResidentUnavailable` as retryable, and `watch()`
  (`:292-300`) retries a `Lost` connection every 5 s with no backoff or cap.
- Smallest fix: `spec/assistant/recovery.md` gains a rule for "refused, nothing held: Try again";
  `restart.vibe` offers it and calls `control.recovered()`; restore the distinct lines in `presentation.vibe`.

### 5. MISSING (medium, durability at update): legacy encrypted slots that nothing adopts

- Behaviour: drafts and pending journals the earlier Alpha kept in `AlphaConnection` secure slots.
- Legacy slot names: `assistant-draft:v1:<sha>` (`runtime/assistant-draft-store.ts:15`),
  `sms-draft:v1:<thread>` (`runtime/native-sms-drafts.ts:23`), `workflow-draft:v1:<sha>`
  (`browser/workflow-drafts.ts:11`), `reminder-deletions:v1:device` (`runtime/reminder-deletions.ts:6`),
  `reminder-creations:v1:device` (`runtime/reminder-creations.ts:11`), `notes-audio-deletions:v1:device`
  (`runtime/note-audio-deletions.ts:15`), `hosted-digests:v1:<scope>` (`browser/digest-storage.ts:18`),
  `stage-session:v1`, `notes-records:v1:device` (`runtime/notes-secure-store.ts:9`).
- Port: `adoptLegacySlot` (`src/platform/legacy-slots.vibe`) has three callers only:
  `src/account/enrollment.vibe:170`, `src/inbox/previous.vibe:82`, `src/notes/slots.vibe:32`
  (folders, origins, trash). None of the names above appears in `apps/app/src` or `apps/app/spec`.
- Impact: on the update, an unsent chat, SMS or workflow draft is lost, and a reminder deletion or
  creation that was pending, or a note-audio deletion awaiting cleanup, is forgotten rather than settled.
- Open-items lists only `inbox-operation:v1`, `notes-draft:v1:device`, `inbox-drafts:v1:chat` and
  `alpha-proposal:v1`; the ones above are not listed. Smallest fix: one adoption pair per slot in the
  owning area's layer, or an explicit owner decision appended to that open-items bullet.

### 6. UNIMPLEMENTED (medium): `spec/platform/rendererRecovery.md` is a model with no consumer and no native check

- Behaviour: three losses a minute recreate, past that Home shows the escape view, a hidden reclaim spends nothing.
- Legacy: `specs/quint/native/RendererRecovery.qnt`, `RendererBackgroundRebuild.qnt`, replayed against
  the real Java by `refinement/native/MainActivityRecoveryTraces.java`,
  `RendererBackgroundRebuildReplay.java`, `test/renderer-recovery-budget.test.mjs`.
- Port: `gen/platform__rendererRecovery` is imported by no file in `src/` or `test/`. The Java
  (`RendererRecoveryBudget`) is retained, but nothing ties it to the new model, and the old replays
  do not run (gap 2). `test/platform/platform.test.vibe:639-660` tests only the renderer restarting
  from stored state.
- Smallest fix: a JVM conformance driver for `platform__rendererRecovery` over `RendererRecoveryBudget`
  (open-items already lists other missing Java host models; add this one).

### 7. CHANGED (low): a cancelled connect no longer withdraws the native start

- Legacy: `test/native-start-cancel.test.mjs:12` (cancelStart with the same requestId),
  `specs/quint/native/ResidentStartCancel.qnt:145-148` (`CancelRetiresOnlyItsOwnLaunch`,
  `CancelledStartNeverLaunches`).
- Port: `ElizaAgent` exposes `start`/`stop`/`restart` only (`src/platform/native-plugins.ts:24-29`,
  `eliza-vs/packages/os/src/bridges/definitions/agent.ts:84-86`); `resident.md` has no cancel event.
  `NoLaunchDuringCredentialShutdown` survives natively (`ElizaAgentService.java:83,99`).
- Impact: a start abandoned by sign-out or a leaving screen still launches the agent; the account
  change then restarts it. Smallest fix: state it as deliberate in `spec/platform/resident.md`, or add
  an upstream `start({id})`/`abortStart`.

### 8. MISSING (low): the held Back gesture previews nothing

- Legacy: `apps/app/src/runtime/predictive-back.ts:27`, installed at `main.tsx:201`;
  `test/predictive-back.test.mjs` (3 tests).
- Port: Android still dispatches `alpha-back-preview` (`MainActivity.java:495-497`); the renderer has
  only the schema (`src/shell/native.schema.vibe:24-25`), no listener in `src/` and no rule in `spec/shell/gestures.md`.
- Smallest fix: rule in `spec/shell/gestures.md`, listener in `src/web/shell`.

### 9. MISSING (low): the owner-language vocabulary check, and three strings that would fail it

- Legacy: `test/user-copy-vocabulary.test.mjs:10` bans receipt, reconcil*, admission, admitted,
  revision, resident, canonical, inference in labels, toasts and Android notification copy.
- Port: no equivalent lint. `src/web/assistant/EmailCardView.tsx:29` ("Check the receipt in Inbox"),
  `src/web/clock/DeletionUndo.tsx:37` ("Refresh receipt"), `src/web/inbox/ReviewSheet.tsx:31`
  ("Check the saved receipt").
- Smallest fix: an eslint rule over `src/web` literals and `src/*/presentation.vibe`.

### 10. MISSING (low): native voice turns carry no trace id

- Legacy: `apps/app/src/runtime/local-agent.ts:191,481` sends `X-Eliza-Trace-Id` on VOICE_DM streams.
- Port: `spec/platform/index.md` "A request carries only the device headers…" admits four headers;
  any other refuses the request (`src/platform/resident-live.vibe:26-31,50-60`). No trace header upstream.
- Impact: voice latency traces cannot be joined to agent-side timing.

### 11. UNMODELED (low): the stream's 60 s idle and 600 s turn limits live only in shell constants

- Legacy: `test/local-agent-native-stream.test.mjs` (heartbeats keep a 150 s turn, 61 s silence ends
  it, 600 s bounds it).
- Port: prose in `spec/platform/nativeStream.md:6-8`; the Quint has only `abort(timedOut)`; values are
  `IDLE_MS`/`TURN_MS` in `src/platform/resident-bridge.vibe:10-11`. No test in
  `test/platform/platform.test.vibe` advances a clock over a stream. The rule "The caller's signal, the
  turn limit or a silent minute…" also has no invariant, as does "A recreated or reloaded page…" in
  `rendererRecovery.md`.

### 12. UNIMPLEMENTED (low): laws in `spec/platform/index.md` that no shell code calls

- `sends(auth, signedIn)` ("A request that needs the session…"): `src/platform/cloud-live.vibe:5`
  imports `adviceOf, cloudOutcomeOf, resetCarried, routeAdmitted` only; the gate is left to native
  (`sign-in-required`).
- `cancelOutcome` ("…a leaving screen cancels only its own call"): no caller in `src/platform`.
- `resetOwner` and `effectOfAction`: no caller anywhere in `src/`.
- Not a behaviour loss; the rules read as enforced by the renderer and are not.

### KNOWN (already in `docs/vibestack-open-items.md`)

- Device headers are admitted by the renderer but dropped on the phone: "Android / native" bullet 3
  and "Upstream (eliza) → os" bullet 1.
- `owner-route-parity` (and its JVM half) targets removed code: "Tooling" last bullet. Port copy of
  the test was rewritten to a reference reader (`test/owner-route-parity.test.mjs:11-43`) but is not run.
- `admitMockMode` has no caller: "Owner decisions" bullet 3 (rule `mockAdmitted` in `index.md`).
- Text zoom / home-start handoff / Settings shortcuts have no renderer path
  (`NativeTextScaleLifecycle.qnt`): "Android / native", `spec/shell/system.md` bullet.
- MMS send settles as unavailable (`NativeMmsDispatch.qnt`, `MmsCompose.qnt`): "Owner decisions → Telephony".
- Legacy slots `inbox-operation:v1`, `notes-draft:v1:device`, `inbox-drafts:v1:chat`, `alpha-proposal:v1`:
  "Owner decisions → Legacy slots not carried over" and "Telephony".
- View registration for chat-opened destinations (`native-view-agent-navigability`): "Tooling",
  `scripts/resident` bullet (`namesAlphaView` is a fixed word list).
- Java host models and the `ElizaAgentService` layer are unbuilt: "Android / native" bullets 1 and 8.

### UNVERIFIED

- Cloud route admission, route by route. Legacy `test/managed-service-routes.test.mjs` pins exact
  query keys, body presence, trailing slashes and percent-encoding per route. The port checks only
  method and pathname (`cloud-live.vibe:33-34`) and leaves the rest to upstream
  `eliza-vs/packages/cloud/src/client/routes.vibe` and
  `packages/os/android/sign-in/.../CloudRequestPolicy.java`. I spot-checked four routes
  (api-keys/current DELETE, subscription/redeem POST, credits and cli-session absent); not the rest.
- Owner route table content. `apps/app/src/platform/owner-routes.json` is the single asset and
  `scripts/apk.ts:280-283` checks the APK copy, but I did not diff its 42 method/path pairs against
  legacy `apps/app/src/product/owner-route-table.ts`.
- Upstream homes of the core models. I located spec files by topic only:
  `CoreSingleFlightMemo` → `eliza-vs/spec/core/memo.md`; `FactWriteScope` → `factWrites.md` (+proof);
  `CoreConnectorCustody` → `connectorRegistries.md` (+proof); `EmbeddingStoreIdentity`,
  `NamedEmbeddingProvenance` → `embeddingSpace.md`; `CoreTaskService`, `TaskServiceLifecycle` →
  `spec/agent/schedule/scheduledTasks.md`; `CoreRuntimeShutdown`, `CoreServiceLifecycle` →
  `spec/core/eagerServices.md`/`concurrency.md`. Invariants were not compared.
- Whether the Vibestack generated names this area assumes exist (`resetCarried`, `adoptionOf`,
  `legacyCleared`, `SlotAdoption`, `headerAdmitted`, `DeviceHeader`): open-items already flags it; no `gen/` in the tree.

### Vibestack usage notes

- No `*.proof.dfy` exists anywhere under `alpha-vs/apps/app/spec` (upstream `eliza-vs/spec` has many).
  This slice's lemma list holds no Dafny, so nothing is owed here, but the legacy
  `specs/lemma/**/*.dfy` files are carried unconverted.
- `scripts/legacy-retirement.json` maps 145 tests, 68 refinement files and 21 Quint models of this
  slice to `spec/platform/index.md`, which states none of them. It also names spec files that do not
  exist (`spec/inbox/digest.md` 42 times, `spec/calendar/sync.md`, `nativeSync.md`, `googleLink.md`,
  `linkedLocal.md`, `spec/maps/voice.md`, …).
- Platform machines use the generated `Machine` service directly, so no `test/drivers/platform__*.ts` is needed.

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Stream relay: listener first, one terminal outcome, 2 MiB body | `NativeStreamBridge.qnt`, `test/local-agent-native-stream.test.mjs` | `platform/nativeStream.md` (all rules) | `src/platform/resident-bridge.vibe:125-210` |
| A busy room is a refusal before dispatch (429) | same test, "room_busy" | `nativeStream.md` "A message is reported not sent only when…" | `resident-bridge.vibe:107-117,195-196`; upstream answers 429 `ROOM_BUSY` (`eliza-vs/packages/agent/src/conversation/turns.vibe:358`) |
| A dropped stream is resent once under the same `clientMessageId`; a 429 on the resend is not accepted | `runtime/local-agent.ts:466-497` | upstream `eliza-vs/spec/agent/client/turns.md:186` | `eliza-vs/packages/agent/src/client/turn-controller.vibe`, used by `src/assistant/composer.vibe` |
| A plain request is withdrawn by its id; outcome unknown unless withdrawn | `NativeRequestWithdrawal.qnt`, `test/native-request-cancel.test.mjs` | `platform/resident.md` "An abandoned request is withdrawn by its id…" | `resident-bridge.vibe:102-105`, `resident-live.vibe:183-199` |
| Liveness read one at a time, at most every 10 s, only a lost launch restarts | `test/resident-recovery.test.mjs` (liveness) | `resident.md` "The agent service's status decides…" | `resident-live.vibe:292-306` (5 s tick, two ticks apart) |
| Recovery review: UUID token, 1 to 64 kept, archive must confirm, nothing replayed | `test/resident-recovery.test.mjs` (review, archive) | `resident.md` "A held start runs again only after…"; `assistant/recovery.md:62` | `resident-live.vibe:343-360`, `src/assistant/restart.vibe` |
| A session is one verified owner with exactly one running agent | `runtime/local-agent.ts:311-317` | `resident.md` "A connection is one verified owner…" | `resident-live.vibe:143-175` |
| An account change rebinds the agent and never stops it | `test/resident-admission-outcome.test.mjs` | `resident.md` "A changed Cloud account restarts…" | `resident-live.vibe:325-331` |
| Owner route table is one asset for renderer and Android | `test/owner-route-parity.test.mjs` | `platform/index.md` "A request crosses to the resident only as the owner route table allows…" | `resident-live.vibe:73-82`, `src/shell/ownerRoutes.vibe`, `scripts/apk.ts:280-283`, `android/.../OwnerRoutes.java` |
| Only a listed Cloud route on the build's own origin is sent | `test/managed-service-routes.test.mjs` | `index.md` "Only a route the Cloud client lists is requested" | `src/platform/cloud-live.vibe:33-37`, `cloud-fetch.ts:48` (per-route detail unverified) |
| 401 ends the session; a refusal keeps `Retry-After` and a future `resetAt` | `runtime/cloud-protocol.ts` | `index.md` "A 401 ends the session…", "A refusal carries the allowance reset…" | `cloud-live.vibe:48-63`, `cloud-fetch.ts:12-36` |
| Eliza Cloud stays live until the cutover flag | develop 28361b1f0 | `index.md` "Eliza Cloud stays the live host…" | `src/platform/build-live.vibe:56` |
| Problem log: 50 entries, 30 days, once a minute per class, no owner text | `NativeCrashJournal.qnt` | `platform/crashJournal.md` | `src/platform/crash-journal.vibe` |
| A return is counted once on the monotonic clock; a disposed watcher is inert | `test/native-adapter-activity.test.mjs` (return watcher, wall time) | `platform/lifecycle.md` "Leaving the app pauses it…", "A disposed watcher's…" | `src/platform/lifecycle.vibe:45-57`, `page-events.ts:11-21` |
| Stale saves never commit; a damaged value is held apart; reset marker blocks startup | `test/serial-storage-tasks.test.mjs` (native half retained) | `platform/storage.md` | `src/platform/device-storage.vibe` |
| Legacy slot moved only where empty, cleared only once held | (new for the port) | `storage.md` "A legacy slot is cleared only once…" | `src/platform/legacy-slots.vibe`; callers in account, inbox, notes |
| Switch queue, revision guard and rollback (renderer half) | `test/google-agent-access.test.mjs` | `account/agentAccess.md` | `src/account/agentAccess.vibe` (enforcement: gap 1) |
| A plugin method is called only when the bridge lists it; AOSP-only plugins | `test/unavailable-controls.test.mjs`, `test/phone-adapter.test.mjs` ("off the image…") | `index.md` first story | `src/platform/native-live.vibe:31`, `native-plugins.ts` |

Rule level only (the rule exists in another area's spec; I did not read that area's code in depth):

| Behaviour | Legacy | Spec |
| --- | --- | --- |
| Protected power launch account | `test/power-launch-state.test.mjs` | `account/session.md:270` |
| Startup permission walkthrough, grant scope labels, earlier record read once | `test/startup-access-flow.test.mjs` | `shell/permissions.md:49-295` |
| Saved mailbox shown before the first read | `ServiceReadCache.qnt`, `test/service-read-cache.test.mjs` | `inbox/mailbox.md:158-167`, `src/inbox/saved.vibe` over `@elizaos/plugin-inbox/mailbox` |
| Phone recents, dial handoff, emergency and role fallbacks, voicemail | `test/phone-adapter.test.mjs` (21) | `telephony/phone.md`, `common.md:140`, `voicemail.md` |
| Phone info page | `test/phone-info-page.test.mjs` | `telephony/phoneInfo.md` |
| App info handoff | `NativeAppInfoHandoff.qnt` | `shell/appInfo.md` |
| Source renewal | `NativeSourceRenewal.qnt`, `test/source-renewal-question.test.mjs` | `workflows/digestSources.md:77,198` |
| Google sign-in MFA, Google settings | `test/google-native-mfa.test.mjs`, `google-connections-resource-budget` | `account/signIn.md`, `account/google.md` |

RETIRED by #1422 (deleted on `develop` itself in 057fdc5a2): `test/login-surfaces.test.mjs`,
`test/native-secure-slots.test.mjs`, `test/white-label-copy.test.mjs`.

Tooling whose script was removed, recorded as `removed` with a replacement in
`scripts/legacy-retirement.json` `scripts[]` (not cited by #1422 or open-items): `host-test-runtime`,
`installed-upgrade-runner`, `local-agent-contracts`, `local-agent-selection`, `mobile-uuid-build`,
`native-patch-admission`, `resident-native-patch-admission`, `runtime-source-clone` (half),
`task-service-stop`, `test-runner`, `strip-types-compat`, `scripts-typescript`, `test-helpers`,
`packaged-runtime.test.py` (half). Their models `ClientFeaturePublication`, `MobileBundleAdmission`,
`PreparedSourceStamp`, `ResidentJavaSourceStage`, `NativeGoogleHostArtifact` go with them.

## Not covered

- Voice: `test/native-cloud-streaming.test.mjs` (16 tests), `native-live-pcm`,
  `native-live-start-cancellation`, `read-aloud-direct`, and models `StreamingPlayback.qnt`,
  `NativeOnDeviceRecognizer.qnt`. I listed the rules of `spec/voice/{speech,capture,conversation}.md`
  but matched no individual test to a rule or to code.
- Files: `test/selection-ask-readiness.test.mjs` (9 tests) against `spec/files/{picker,preview}.md`; `SystemPickerVisibility.qnt` against `spec/camera/scanDialogs.md`.
- Telephony depth: the 21 `phone-adapter` and 6 `phone-info-page` tests one by one (MMI refusal,
  voicemail observer replacement, delete recheck); `MessageThreads.qnt` against `spec/telephony/messages.md`.
- Account depth: `test/provider-configuration-cancellation.test.mjs`, `own-provider`,
  `local-agent-provider-admission`, `resident-admission-outcome` plan views; `GoogleConnect.qnt`
  against `spec/account/google.md`; `ApplicationComposition.qnt` and `ControllerComposition.qnt`
  (`VoiceAccountBound`, `InferenceAccountBound`, `ResetStopsConsumers`, `OwnerAgreement`) against any port rule.
- Resident-side Google host: `test/native-google-agent-host.test.mjs` (6), `native-google-fetch-input` (4),
  `managed-google-agent-broker` (5: 8 KiB / 256 KiB bounds, query length), `managed-google-transport-code` (9)
  against `eliza-vs/packages/{cloud/src/services/google,inbox,calendar}`.
- View host: `test/native-view-host-integration.test.mjs`, `native-view-fallback-installation`,
  `open-view-presentation` against `spec/platform/viewEvents.md` and `eliza-vs/spec/agent/views.md`.
- `test/native-adapter-activity.test.mjs` tests 1-3 (review toast, single in-flight review).
- UI mechanics replaced by Radix: `inline-modal-menu`, `modal-scrim-ownership`, `template-sheet-modality` (not checked in `src/web/components`).
- Models not opened beyond their header: `DeletionJournal.qnt`, `NativeIndicatorProvider.qnt`,
  `AndroidBuildInputReadiness.qnt`, `AndroidGzipAssetStage.qnt`, `AndroidInstallationIdentity.qnt`.
- Harness tests whose scripts I did not trace: `native-campaign-evidence` (11), `native-restart-runner` (7),
  `native-webview-admission`, `python-suites`, `sense-packaging-ndk`, `host-test-json`,
  `task-service-sql-concurrency`, `test/own-provider/OwnProviderTest.java`.
- The 86 refinement files individually; I checked only that all are present in `alpha-vs` and that nothing runs them.
- `spec/platform/viewEvents.md` and `lifecycle.md` network/turn rules were read as headings only.

## Skeptic verdicts

Read from source only (alpha-develop dd63c6bc, alpha-vs 3d7ca972, eliza-vs, and the author's tree `/home/shaw/.cache/vibemig/alpha`, whose uncommitted platform changes are Quint identifier renames only). Nothing was built or run. No gap here is fixed in the author's tree.

| Gap | Verdict | Severity | Evidence |
| --- | --- | --- | --- |
| 1. Google write switches written, never enforced | confirmed | high | Legacy read the file per write (`alpha-develop/scripts/native-google-product-host.ts`, `test/native-google-agent-host-access.test.mjs:98-125`). Port: `AlphaLocalAgentPlugin.java:429-436` writes it and `:660` exports `ALPHA_GOOGLE_AGENT_ACCESS_FILE`; no reader in `alpha-vs/scripts/resident/{entry.vibe,bridges.ts}` or anywhere in `eliza-vs/packages`. Consent comes only from the launch document (`eliza-vs/packages/agent/src/models/cloud-link.vibe:108-110,126-127`), built from `host.json` (`AgentConfig.java:215`); `AgentService.launchDocument` (`AgentService.java:826-841`) lets `configureLaunch` add environment variables only, so Alpha cannot override `google`. `android/agent/host.json:19-22` is false/false. In eliza-vs the refused callers are any non-GET to `/api/v1/eliza/google/{gmail,calendar}/*` over the agent's link (workflow `linkFetch`, `packages/workflow/src/runtime.vibe:84-97`); agent Gmail reads are GET and unaffected. The renderer shows the switches (`src/web/account/GooglePanel.tsx:89`) and nothing else consults them. Open-items names only the missing `NativeGoogleAccessFile` host model, not the lost enforcement. |
| 2. Retained native and release code lost its tests and Quint replays | confirmed | high | `alpha-vs/package.json` `verify` runs turbo over `apps/app` and `cloud` only; `scripts/run-tests.ts` and `scripts/check-quint.ts` absent; the only `node --test` in any workflow is `android.yml:92` (two files). Legacy `verify` ran `test:only` (`alpha-develop/package.json`, `verify.yml:57`). All nine named Java classes and nine named scripts exist in alpha-vs. `android.yml:118` still runs `:app:testLauncherDebugUnitTest` (9 files) and 184 androidTest files exist, so native coverage is reduced, not zero. `scripts/legacy-retirement.json` marks all 1782 tests and 409 models "mapped", none "not run". Open-items lists three broken test groups only. |
| 3. Device locale and 12/24-hour ignored | confirmed | medium | Legacy `main.tsx:382` → `locale-time.ts:16`; still on develop after #1422. Port and author's tree: no `getLocaleInfo`, `hour12` or `hourCycle` caller in `apps/app/src` or `spec` (one fixed `h23` in `src/calendar/time.ts:30`); 32 `Intl.DateTimeFormat(` and 30 `toLocale*` call sites use the WebView default. Upstream still offers `getLocaleInfo` (`eliza-vs/packages/os/src/bridges/system.vibe:513`, `SystemPlugin.kt`). |
| 4. A refused start with nothing held is a dead end | confirmed (wider than stated) | high | `resident-live.vibe:146` answers `needs-recovery` forever once `Refused`; `control.recovered()` has no caller; `restart.vibe:27-31` offers Restart only when `refused && reviewable`. Also: every start failure reaches the port as `Error("StartupFailed")` (`eliza-vs/packages/agent/src/client/index.vibe:233,209`) → `ResidentUnavailable` → `fail(gen, true, …)` (`resident-live.vibe:150-152`) → `Lost`, retried each 5 s by `watch()` (`:292-300`) with no cap. So a launch the service holds for review never reaches `Refused`, `recovery.restart` answers `not-held` (`:353`), and "Restart Alpha" is not offered for the case `spec/assistant/recovery.md:62` describes. Legacy copy and Settings rows confirmed (`resident-recovery.ts:13-25,56-61`, `settings-adapter.ts:1011-1024`). |
| 5a. Legacy drafts and pending journals not adopted (`assistant-draft`, `sms-draft`, `workflow-draft`, `reminder-deletions`, `reminder-creations`, `stage-session`, renderer use of `notes-audio-deletions`) | confirmed | medium | Names verified on develop. None appears in `alpha-vs/apps/app/{src,spec}` or the author's tree; `adoptLegacySlot` has three callers. Native still admits the names (`RendererCredentialSlots.java:45-50`), so adoption is possible. Open-items lists four other slots only. |
| 5b. `notes-records:v1:device` | confirmed (Notes area) | high | Legacy showed it as "Previous notes" (`prototype/legacy-notes-access.ts`, `canonical-notes-ui.ts:390`). The port has no reader: `spec/notes/collection.md:91-96` leaves earlier notes to the agent's import, and that import reads the agent's own earlier file (`eliza-vs/packages/notes/src/prior.vibe:6`, `store.vibe:87-107`), not the phone's secure slot. The slot is not erased (`AlphaNoteAudioPlugin.java:67,106`), but nothing shows it. Not in open-items. |
| 5c. `hosted-digests:v1:<scope>` | refuted on the phone, one point uncertain | low | Native owns the slot (`HostedInbox.java:26`) and the port reads it through `AlphaHostedResults.syncInbox`/`inboxHistory` (`src/workflows/digests.vibe:123-133`). Not checked: that the port's scope hash equals legacy `actionScope(agentOwnerKey(session))`. |
| 6. `rendererRecovery.md` has no consumer or native check | confirmed, coverage only | low | `RendererRecoveryBudget.java` is byte-identical to develop and `MainActivity` still drives it (`:101-102,173-191`), so the behaviour is kept. No `gen/platform__rendererRecovery` import in `src` or `test`; the legacy replays are not run (gap 2). |
| 7. A cancelled connect no longer withdraws the start | confirmed | low | Legacy `local-agent.ts:293`, `AlphaLocalAgentPlugin.java:918`. Port: the `cancelStart` plugin method is gone (comment only at `:915`); `native-plugins.ts:24-29` and upstream `agent.ts` have start/stop/restart only; `resident.md` has no cancel rule. The resident always runs under P-43, so an abandoned start launching it costs little. |
| 8. Held Back gesture previews nothing | confirmed | low | `MainActivity.java:493-507` still dispatches `alpha-back-preview`; the only renderer trace is the unused schema `src/shell/native.schema.vibe:24-25`. Same in the author's tree. |
| 9. Owner-language vocabulary check | confirmed (lint absent); "three strings would fail" mostly refuted | low | No lint in `apps/app`. "Check the receipt in Inbox" and "Check the saved receipt" ship verbatim on develop (`agent-email-card.ts:83`, `review-controller.ts:896`) and pass the legacy test, which reads only aria-label, title/placeholder, `toast('…')` and `info('…')` literals. Only `aria-label="Refresh receipt"` (`DeletionUndo.tsx:37`; visible text on develop) would newly match. |
| 10. Voice turns carry no trace id | confirmed | low | Legacy `local-agent.ts:481-482`. No `trace-id`/`traceId` in `alpha-vs/apps/app`, `alpha-vs/android` or `eliza-vs/packages/{agent,os}/src`. |
| 11. Stream idle and turn limits only in shell constants | confirmed, modelling only | low | The behaviour is present: `resident-bridge.vibe:160-164` bounds each wait by `min(IDLE_MS, TURN_MS − elapsed)` and every frame restarts it. No constant in the Quint and no clocked stream test. |
| 12. Laws no shell code calls (`sends`, `cancelOutcome`, `resetOwner`, `effectOfAction`) | confirmed, not a behaviour loss | low | `cloud-live.vibe:5` imports four other names; no caller of these four in `src` or `test` in either tree (`composer.vibe:423` uses the assistant's unrelated `cancelOutcome`). Signed-out and cancel are enforced natively (`nativeFailureOf`, `signal`). |
| K1. Device headers dropped on native requests | known_open_item | high | "Android / native" bullet 3 and "Upstream → os" bullet 1. Still true at eliza-vs: `packages/os/src/bridges/definitions/agent.ts` has no request headers, while the agent reads `x-eliza-device-id` (`device-actions/enrollment.vibe:26`). |
| K2. owner-route-parity targets removed code | known_open_item | low | "Tooling" last bullet. |
| K3. `admitMockMode` has no caller | known_open_item | low | "Owner decisions" bullet 3. |
| K4. `spec/shell/system.md` has no renderer path | known_open_item | medium | "Android / native" bullet 6. |
| K5. Alpha `mms_send` settles unavailable | known_open_item | medium | "Owner decisions → Telephony". |
| K6. Four legacy slots not carried | known_open_item | medium | "Legacy slots not carried over" and "Telephony"; gap 5a/5b are the unlisted rest. |
| K7. Chat-opened view registration | known_open_item | low | "Tooling", `scripts/resident` bullet; `entry.vibe:24-31` already calls `registerMapsViews`/`registerMapsSavedPlaces`. |
| K8. Java host models and `ElizaAgentService` layer unbuilt | known_open_item | high | "Android / native" bullets 1 and 8. |
| U1. Cloud route admission, route by route | uncertain (paths resolved) | low | Every legacy method/path in `managed-service-routes.ts` is in `eliza-vs/packages/cloud/src/client/routes.vibe` except calendar `sync-v1` (capabilities, event) and `POST /api/v1/credits/checkout`, both in open-items "Upstream → cloud". Not resolved: legacy's query/body/trailing-slash strictness; `cloud-live.vibe:33-41` admits by pathname and forwards any query, and `CloudRequestPolicy.java` was not read route by route. |
| U2. Owner route table content | refuted | low | Scripted diff: all 38 legacy method/path pairs are in `owner-routes.json` with identical query lists, ids and `unsafe`; the port adds four Notes routes and two prefixes. |
| U3. Upstream homes of the core models | uncertain | low | Invariants not compared; belongs to the eliza-side audit. |
| U4. Generated names | known_open_item | medium | "Unverified in the code-only phase → Generated names: platform". |
| N1. No `*.proof.dfy` under `apps/app/spec` | confirmed | low | Zero in alpha-vs and the author's tree. |
| N2. `legacy-retirement.json` points at spec files that do not exist | confirmed | low | 104 entries name 11 missing files (`spec/inbox/digest.md` 38, `spec/calendar/sync.md` 17, `googleLink.md` 12, `spec/maps/voice.md` 9, …); 484 platform entries point at `spec/platform/index.md`. |
