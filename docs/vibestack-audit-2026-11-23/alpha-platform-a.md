# Alpha parity audit: `platform`, first half

Slice: `lists/platform.tests.txt` 1-185, `platform.quint.txt` 1-40, `platform.lemma.txt` 1-85.
Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-vs`.
Read-only; nothing was built or run. Paths are relative to the tree named.

How the slice breaks down (mechanical checks, before reading behaviour):

- 185 listed test files: 20 no longer exist on `develop` itself (retired before the port), 162 are
  byte-identical in the port, 3 differ (`test/alpha-client-after-request-settles.test.mjs`,
  `test/browser/agent-keypad-direct.spec.ts`, `test/comms-alpha.test.mjs`).
- Of the 165 that exist: 38 import a renderer or script module the port deleted (dead in the port),
  ~100 are Playwright specs/helpers that drive the legacy DOM, and ~27 still resolve every path they
  reference. None of them is run by the port's `pnpm verify` (gap 6).
- The area name is a catch-all: about two thirds of these files test assistant, telephony, account,
  shell, settings, camera, voice or build tooling, not platform. I looked for each behaviour in every
  port area and upstream, not only `spec/platform`.
- The port's platform spec is real: 8 files, 64 rules, 64 Quint blocks, 51 laws, 23 `always`,
  16 `sometimes`; 6 of its 7 state machines are imported by shell code.

## Summary

Inventory is at behaviour-group level (about 110 groups for ~870 legacy test titles, 40 Quint models,
3 Dafny proofs and the refinement harness).

| Class | Count |
| --- | --- |
| OK (spec rule and shell code both read) | 31 |
| UNVERIFIED (spec rule found in the port or upstream; shell code not read, or could not be decided) | 37 |
| UNMODELED | 3 |
| UNIMPLEMENTED | 4 |
| MISSING | 8 |
| CHANGED | 4 |
| KNOWN (open-items bullet named) | 9 |
| RETIRED (gone on `develop` itself, or #1422 / open-items) | 14 |

Verdict: **not at parity.** The platform core itself (resident connection, liveness and guarded
restart, native stream relay, Cloud host/environment/session gating, compare-and-swap storage, crash
log, lifecycle) is faithfully modelled and wired, and I found no regression in it. The gaps are at the
edges this area owns: what a phone updated from the legacy app keeps (only two legacy page-storage
keys and a handful of encrypted slots are adopted; saved places, theme, drafts and more are orphaned),
two security/compatibility properties the legacy build enforced and the port silently dropped (the
production CSP, the WebView 113 `AbortSignal.any` fallback), one November fix that upstream turned into
a host setting Alpha does not set (rate-limit hold), and test coverage: every legacy root test that
still applies to code the port kept has lost its runner, there is no conformance driver for any
platform machine, and there is no `.proof.dfy` anywhere under `apps/app`.

## Gaps

Most severe first.

### 1. MISSING — legacy page-storage state is not adopted on update

- Behaviour: what the legacy app kept in the WebView's `localStorage` is still there after the update.
- Legacy: `apps/app/src/prototype/settings-adapter.ts:302` (`alpha.appearance.v1`),
  `apps/app/src/maps/saved-places.ts:10` (`alpha.maps.saved-places.v1`),
  `apps/app/src/runtime/conversation-selection.ts:5` (`alpha.connection.conversations.v1`),
  `runtime/media-copy-intent.ts` (`alpha.photos.pending-copy.v1`), `runtime/voice-selection.ts`
  (`alpha:voice-preferences`), `prototype/calendar-adapter.ts` (`alpha:calendar-preferences`),
  `runtime/gmail-account-selection.ts` (`alpha.gmail.account-choice.v1:`),
  `runtime/google-agent-access.ts` (`alpha.google-agent-access.v1`), `runtime/workflow-intents.ts`
  (`alpha.workflow.pending.v1:`), `prototype/workflow-adapter.ts` (`alpha.workflow.run-accounts.v1`),
  `prototype/files-index.ts` (`alpha.files.recent.v1`, `alpha.files.open.v1`), `runtime/crash-log.ts`
  (`alpha.crash-log.v1`), `runtime/connection-ui.tsx` (`alpha.connection.plan-admission.v1`).
- Port: every store is a new key `alpha/<namespace>/<key>` (`apps/app/src/platform/storage.vibe:7`,
  e.g. `src/maps/saved.vibe:10`, `src/settings/appearance.vibe:11`). `rg` over `apps/app/src` and
  `apps/app/spec` finds only two legacy keys read: `alpha.launcher.favorites.v1`
  (`src/shell/launcher.vibe`) and `alpha.startup-permissions.v1` (`src/shell/permissions.vibe:22`).
  `spec/platform/storage.md:104` covers encrypted slots only. Not in the open-items doc.
- Impact: after the cutover the owner's saved Maps places are gone, the theme falls back to light,
  the open conversation choice, voice and calendar preferences, Gmail account choice and a pending
  photo copy are forgotten. Saved places are the only copy ("live only on this phone").
- Smallest fix: a rule in `spec/platform/storage.md` ("A legacy page key is moved once, and removed
  only after the new key holds a state") plus one `src/platform/legacy-keys.vibe` helper called from
  `maps/saved.vibe`, `settings/appearance.vibe`, `assistant/conversations.vibe`, voice and calendar
  preference layers; or an explicit owner decision per key in the open-items doc.

### 2. MISSING — the renderer ships no Content-Security-Policy

- Behaviour: the production page carries `default-src 'self'; script-src 'self' 'wasm-unsafe-eval';
  object-src 'none'; base-uri 'none'`, with no `unsafe-eval` and no inline script.
- Legacy: `vite.config.ts:89-93` (`alpha-production-csp` plugin),
  `test/browser/production-surface.spec.ts:41-48`.
- Port: `apps/app/vite.config.ts` has no such plugin; `apps/app/src/web/index.html` has no meta;
  `scripts/audit-production-bundle.ts` does not check for one. The only CSP left is
  `apps/app/public/delegation-return.html`. The open-items doc mentions only that route.
- Impact: a WebView that renders mail HTML, web content and agent text loses its script-source
  restriction.
- Smallest fix: restore the `transformIndexHtml` plugin in `apps/app/vite.config.ts`, add the rule under
  "Ship only what this build allows" in `spec/platform/index.md`, and assert the meta in
  `scripts/audit-production-bundle.ts`.

### 3. MISSING — no fallback for a WebView without `AbortSignal.any`

- Behaviour: cancellation is composed with a listener fallback on WebView 113, which has no
  `AbortSignal.any`.
- Legacy: `apps/app/src/runtime/abort-signal.ts:1-16`, `apps/app/src/lib/abort.ts:1`, used in about
  14 modules; `test/abort-signal-compat.test.mjs:7,27`.
- Port: unguarded `AbortSignal.any` at `apps/app/src/browser/page-text.ts:74`, upstream
  `packages/agent/src/client/index.vibe:227,249,265,393,394,428` and
  `packages/os/src/bridges/page-source.vibe:15`. The renderer reaches the first of the client calls at
  `apps/app/src/platform/resident-live.vibe:151` (`client.request("/api/auth/me")`).
- Impact: on a WebView below Chromium 116 the resident never verifies (TypeError at startup), so the
  agent never connects. If WebView 113 is no longer a supported floor this is a decision to record,
  not a bug; nothing in the port states the floor.
- Smallest fix: an `anySignal` helper in upstream `packages/agent/src/client` and
  `packages/os/src/bridges`, used by `page-text.ts` too; or a stated minimum WebView in
  `spec/platform/index.md` enforced at startup.

### 4. CHANGED — a rate limit now holds the account for the provider's whole retry time

- Behaviour: a hosted-model 429 holds the account for under five seconds, so the turn's one re-send
  (after five seconds) is admitted (fix of 2026-11-20/22, #1417/#1428/#1448).
- Legacy: `test/agent-launch-token-budget.test.mjs:36-42` (built-in hold of 1-5 s, hold settings
  retired at `:14`).
- Port: upstream made the hold a host setting, default the provider's whole retry time
  (`eliza-vs/spec/agent/models/binding.md:296`, `packages/agent/src/models/binding.vibe:116-122`).
  `android/agent/host.json` has no `environment` key, so nothing sets it.
- Impact: after one Cerebras "retry in 59 s" refusal every agent call fails locally for a minute
  ("a held account fails every call in that minute without asking the model").
- Smallest fix: `"environment": { "CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS": "4" }` in
  `android/agent/host.json` (check upstream `environmentAdmitted` accepts it).

### 5. MISSING (partly KNOWN) — more legacy encrypted slots are dropped than the open-items doc lists

- Behaviour: drafts and pending records kept in `AlphaConnection` slots survive the update.
- Legacy slot names: `assistant-draft:v1:*` (the composer's saved copy, including its `sending` mark;
  see `test/browser/resident-failures.production.spec.ts:35`), `sms-draft:v1:*`
  (`runtime/native-sms-drafts.ts`), `workflow-draft:v1:*` (`browser/workflow-drafts.ts`),
  `reminder-deletions:v1:device`, `reminder-creations:v1:device`, `hosted-digests:v1:*`,
  `stage-session:v1`, `connected-read-cache:v1:*`, `voice-content:v1`.
- Port: `adoptLegacySlot` is called only for inbox drafts (`src/inbox/previous.vibe:82`), enrollment
  (`src/account/enrollment.vibe:170`) and three Notes slots (`src/notes/slots.vibe:32`). The slots
  above appear nowhere in `apps/app/src`; `RendererCredentialSlots.java` still admits most of them.
  The open-items doc lists only `inbox-operation:v1`, `notes-draft:v1`, `inbox-drafts:v1:chat` and
  `alpha-proposal:v1`.
- Impact: an unsent chat message, an SMS draft, a workflow draft and queued reminder
  deletion/creation receipts vanish at the update, and their encrypted values stay on disk unread.
- Smallest fix: add the list to the "Legacy slots not carried over" owner bullet, and adopt
  `assistant-draft` in `src/assistant/draft.vibe`, `sms-draft` in `src/telephony/drafts.vibe`,
  `workflow-draft` in `src/workflows/definitions.vibe` under `spec/platform/storage.md`'s existing rule.

### 6. MISSING (tooling, partly KNOWN) — legacy tests that still apply have no runner

- Behaviour: `npm run verify` ran every root test (`test:only` → `scripts/run-tests.ts`).
- Port: `pnpm verify` is spec check + app vitest + cloud + build + bundle audit (`package.json`).
  `scripts/run-tests.ts` and `run-node-only-tests.ts` are deleted; workflows run three root tests
  (`.github/workflows/android.yml:92`, `resident-android.yml:182`). `scripts/legacy-retirement.json`
  marks all 1,782 tests "mapped". `promotion.yml:120,151` calls `pnpm upstream:prepare-client`, which
  no longer exists. The open-items doc names six tests that target removed code, not this.
- Still-valid tests in this slice that silently stopped running: `connection-routes` and the JVM
  fixtures `ConnectionRoutesTest`, `OwnerRoutesTest`, `PluginWorkersTest`,
  `RendererRecoveryBudgetTest`, `ResidentResultTransportTest`, `SerialStorageTasksTest`,
  `AlphaMediaCopyTest` (their Java classes are unchanged or differ by 1-2 lines);
  `agent-always-local`, `avatar-initials-audit` (bundle audit rules); `agent-cache-probe`;
  `agent-launch-token-budget` (first test); `android-consumer-build`; `assetlinks-cloud-config`;
  `developer-archive`; `embedding-abi-package`, `embedding-host-preparation`,
  `embedding-library-source`, `embedding-native-contract`; `ci-pin-bound-scripts`,
  `ci-ruleset-readback`; `docs-links`.
- Impact: Android route admission, the renderer recovery budget and the production bundle audit rules
  are no longer checked by anything.
- Smallest fix: a `test:host` script (`node --test` over the kept list) added to `verify`, and
  `legacy-retirement.json` statuses split into `kept` / `removed`.

### 7. UNIMPLEMENTED — owner namespaces and the storage reset are modelled but not what the code does

- Behaviour: every stored key lies in its owner's namespace and a reset removes exactly those keys;
  a second account never sees the first's state.
- Legacy: `test/browser/dev-cloud-identity.spec.ts:8`, `specs/quint/application/Application.qnt`
  (`ResetStopsInitialization`, `CurrentOwnerCache`).
- Port: `spec/platform/index.md:310` and `spec/platform/storage.md:84`. But `DeviceStorage.reset()`
  has no caller (`src/settings/reset.vibe:39` goes to native `AlphaReset` only), `resetOwner` is
  imported nowhere, and 34 stores use a literal namespace instead of the bound owner: `device` ×30
  (all Workflows stores, inbox drafts/operations, clock, calendar presentation, shell navigation,
  account session/plan), `dev` ×2, `phone`, `notes`, plus `alpha/camera/copy-intent`
  (`src/camera/layer.vibe:42`). `finishReset` clears only `alpha/<bound owner>/`
  (`src/platform/device-storage.vibe:45`).
- Impact: UNVERIFIED per machine, but workflow runs, digests, hosted results and inbox drafts of one
  Cloud account are stored where the next account on the same phone reads them, unless each machine
  checks the owner itself.
- Smallest fix: state in `spec/platform/storage.md` which keys are device-wide on purpose, move the
  rest to `session.ownerKey` (as `src/telephony/owner.vibe` does), and either call
  `DeviceStorage.reset()` from `src/settings/reset.vibe` or delete the dead transitions.

### 8. MISSING — nothing holds Home until sign-in or the agent is ready

- Behaviour: first run shows a neutral loading screen, never Home, until the sign-in page opens; cold
  start keeps the logo until the saved account's agent is ready (#1357).
- Legacy: `test/browser/resident-first-run.production.spec.ts:101`,
  `resident-failures.production.spec.ts:319`, `connection-boundaries.production.spec.ts:346`,
  `signed-out-page.production.spec.ts:37`.
- Port: `apps/app/src/web/main.tsx:16-30` renders `ShellRoot` at once; `spec/account/signIn.md:52`
  gives `NoEntry` until `startupResolved`; no rule or component holds the shell. Send is disabled
  while unconnected (`src/web/assistant/ComposerBar.tsx:120`), which is the only part carried.
- Impact: Home flashes before the mandatory sign-in page, and is usable before the agent is.
  Not run, so the visual result is inferred from the code.
- Smallest fix: a rule in `spec/shell/landing.md` (or `shell/index.md`) and a gate in
  `src/web/shell/ShellRoot.tsx` on `startupResolved` and the resident phase.

### 9. MISSING (likely) — a note or event the agent changed in chat does not refresh its open app

- Behaviour: each committed chat change to a note refreshes Notes at the committed revision, once,
  when the session is idle; likewise Calendar.
- Legacy: `test/app-record-completion.test.mjs:25`, `test/committed-device-changes.test.mjs:23`.
- Port: `src/workflows/changes.vibe` `settle` refreshes the Workflows list only;
  `src/assistant/composer.vibe:489-490` adds a "Notes changed" / "Calendar changed" row. No call
  reaches `src/notes/collection.vibe:66` `refresh`; Notes re-reads on foreground changes
  (`src/notes/layer.vibe:70`), and Notes under the chat sheet is already in front.
- Impact: the list under the chat keeps showing the old note until the owner leaves and returns.
- Smallest fix: an assistant port filled from `notes/collection.vibe` and the calendar read, called
  from `changes.settle`; rule in `spec/assistant/receipts.md`.

### 10. UNIMPLEMENTED / MISSING (developer builds only) — device tools and the simulator

- Behaviour: a test-mocks build off the phone shows device controls with `?tools=1` (HOME, power,
  unlock, sensors, display, simulated calls and messages) over isolated, writer-leased fixture state.
- Legacy: `DevelopmentDevice.qnt`, `DevelopmentHost.qnt`, `DevelopmentSurfaces.qnt`,
  `FixtureBusyLatch.qnt`; `test/browser/dev-controls-accessibility`, `dev-display`, `dev-sensors`,
  `dev-phone-messages`, `dev-connection-*`, `simulator-concurrency`, `simulator-recovery`,
  `simulator-save`, `dev-reload`.
- Port: `spec/platform/index.md:336` states `toolsShown`, but `developerToolsShown` and `fixturesOn`
  (`src/platform/build-live.vibe:27,32`) have no caller, and no device-controls component exists.
  Mock mode is KNOWN (below).
- Impact: none for owners; the team loses the off-phone device simulator the legacy suite relied on.
- Smallest fix: owner decision alongside the mock-mode bullet; otherwise drop the unused rule.

### 11. Vibestack usage in this slice

- **No proofs.** `find alpha-vs/apps/app -name '*.proof.dfy'` is empty. Legacy proofs in this slice:
  `specs/lemma/apps/app/src/runtime/cloud-environment-selection.dfy` (8 postconditions; the port
  restates 3 as laws, `spec/platform/index.md:219-227`; missing: staging off a development server
  needs test mocks *and* the choice with test mocks on, the full characterisation of staging, and
  "test mocks + chose staging ⇒ staging"), `resident-recovery.dfy` (lost ⇔ dead | restarting |
  booting; the port has `bootLost` but only `lawListeningIsNeverLost`, `spec/platform/resident.md:150`),
  `browser/journal-retention.dfy` (200 rows / 30 days / 127 settled; no bound is stated in
  `spec/clock/reminderJournal.md`, `clock/deletions.md` or `calendar/deletions.md`). The legacy `.dfy`
  files remain under `alpha-vs/specs/lemma` with their checker deleted.
- **No conformance for any platform machine.** `apps/app/test/drivers` has ten drivers, none
  `platform__*`; no `test/traces`. `gen/platform__rendererRecovery` is imported by no source or test:
  it describes `RendererRecoveryBudget.java`, which nothing now checks against it. The legacy native
  harness (`specs/quint/refinement/native/CrashJournalTraces.java`, `DeletionCoordinatorTraces.java`,
  `CanonicalTapTraces.java`, `AppInfoHandoffTraces.java`, `ComponentTraces.java`,
  `FinitePolicyTraces.java`, and `refinement/application/*.mjs`) is still in the tree with no runner.
- **Rules whose Quint states no property:** `nativeStream.md:120` (signal, turn limit or silent minute
  ends the relay unknown) and `rendererRecovery.md:104` (a recreated page is created under every
  counted death).
- **Model functions no shell code uses:** `resetOwner`, `effectOfAction` (`spec/platform/index.md`),
  besides `toolsShown`/`fixturesAllowed` above.
- **Generated names unchecked** (`resetCarried`, `adoptionOf`, `legacyCleared`, `SlotAdoption`,
  `headerAdmitted`, `DeviceHeader`): KNOWN, "Unverified in the code-only phase".
- **UI without `.meta.tsx`** (so no story and no axe check): shell 7 of 16 components, telephony 7 of
  23, assistant 6 of 12, maps 3 of 12; telephony and maps are KNOWN.

### 12. UNMODELED

- Scrim and press ownership of modal sheets (`ModalScrimOwnership.qnt`: `ExactPress`, `ModalOwns`,
  `NoEscapedActivation`): no spec rule; behaviour comes from Radix in
  `src/web/components/ui/Sheet.tsx` and `src/web/shell/InlineSheet.tsx`.
- Reduced motion (`test/browser/reduced-motion-harness.spec.ts`): `motion-reduce` classes in five
  components, no rule.
- App-level accessibility sweeps (names, roles, contrast, 200 %/300 % text, landscape, reading order,
  focus under the dock, live regions: `accessibility-*.spec.ts`, `large-text-*`, `responsive-surfaces*`,
  `native-insets`, `compact-viewport`): the port checks axe per story only, and Bombadil properties
  per area; nothing sweeps the composed app.

### 13. CHANGED (minor)

- The agent's character now has its own `system` prompt and style (`android/agent/character.json`);
  legacy asserted there was none so upstream's persona applied (`test/agent-identity.test.mjs:20`).
- The Cloud environment choice is build-time only (`VITE_ALPHA_CLOUD_ENVIRONMENT`,
  `src/platform/build-live.vibe:45`); legacy honoured a saved runtime choice in a test-mocks build
  (`test/cloud-environment-selection.test.mjs`).
- Failure and recovery wording: "Billing declined" / "Reply failed" / "AI offline" and
  "Restart incomplete" / "Checking restart" are replaced by new sentences or collapsed into
  "Restart blocked" (`src/assistant/presentation.vibe:113-150`, `src/platform/resident-live.vibe:354-357`).

### 14. KNOWN (open-items bullet)

| Behaviour (legacy evidence) | Bullet |
| --- | --- |
| Device capabilities offered to the agent (`test/device-capability-selection.test.mjs`) | Shell: fill `AdvertisedCapabilities.names()` |
| Browser page sent with a turn; the reply's own page move (`alpha-client-own-page-change`, #1444) | Shell: `AssistantHost.peer()` must set `browserPage`; upstream agent/client |
| Device headers on native requests (`enabled-view-transport`) | Android/native: channel takes no headers |
| Mock mode (`mvp.spec`, `mock-readiness`, `mock-background-admission`, `native-mock-chrome`) | Owner: mock-mode runtime, `admitMockMode` has no caller |
| Browser-build reminders, notifications, deletions (`dev-parity`, `durable-delete-undo`, `journal-retention.dfy`) | Owner: browser build has no such store |
| Bar approval through review (`comms-alpha` AC-26) and `alpha-proposal:v1` slot (AC-30) | Telephony consuming assistant changes; Owner: Telephony |
| Peer learn/compare helpers copied locally (`client-observation-handshake`) | Shell: `learnPeer`/`comparePeer` not re-exported |
| Owner route parity tests, `owner-routes.json` stale rows (`OwnerRoutesTest`) | Tooling; After merging develop |
| Java host models for Google access / consent (`GoogleAccessPublication.qnt`, `GoogleConsentAdmission.qnt`) | Android/native: Java-side host models missing |

### 15. UNVERIFIED (spec rule found; shell code not read, or undecidable without running)

Assistant: a view change that shows an outcome waits for its reply (`spec/telephony/actions.md:216`
for `alpha-client-after-request-settles`); thread selection retiring a proposal without sending the
thread id (`alpha-client-sensitive:32`; port context key is `view:route`,
`src/shell/assistantHost.vibe:126`); handshake cancellation; proposal recovery after an interrupted
reply; selected-content review. Account: membership code and plan presentation, phone sign-in and
method discovery, identity-read reachability (`spec/account/plan.md:109`), service terms, own keys
(17 legacy cases), voice key removal, sign-in return queueing (`ConnectionController.qnt` ↔
`spec/account/session.md:204`). Telephony: AC-19/20/24/25/31, Messages, call card, Recents
(`PhoneRecents.qnt` ↔ `spec/telephony/phone.md:46`). Browser: `AddressInput.qnt` ↔
`spec/browser/page.md:62,73`; `FindInPage.qnt` ↔ `spec/browser/session.md:439,453`; autofill reporter.
Shell: `BackDispatch.qnt` ↔ `spec/shell/navigation.md:151`; `InertHold.qnt` ↔ `navigation.md:370`;
`AppInfoHandoffComposition.qnt` ↔ `spec/shell/appInfo.md`; `DayAnchor.qnt` ↔
`spec/shell/overview.md:103` (rows only; form re-anchoring not found). Voice: `ReadAloud.qnt`, read-aloud
route, typed replies never spoken. Workflows: `HostedBackgroundAdmission.qnt`,
`SourceRenewalQuestion.qnt`. Image-only views revoked while open (`ViewAdmission.qnt`). Upstream:
deletion window (`eliza-vs/spec/os/android/deletionWindow.md`), `OS*.qnt` ↔ `spec/os/image/*`,
`Core*.qnt` ↔ `spec/core/*`, agent launch, model selection and redaction defaults
(`spec/agent/host/launch.md`, `models/binding.md`), "no output cap on any agent call" (#1448).

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Start begins a generation; stale answers change nothing | `ConnectionController.qnt`, `resident-first-run` | `platform/resident.md:54` | `src/platform/resident-live.vibe:143-176` |
| One verified owner, one running agent | `connection-boundaries.production.spec` | `resident.md:109` | `resident-live.vibe:151-172` |
| Lost = dead, restarting or booting; checked every 10 s | `runtime/resident-recovery.ts:47-66`, `ResidentLiveness.qnt` | `resident.md:140` | `resident-live.vibe:20,292-305` |
| Automatic restart after loss, not while a turn settles | `resident-recovery.production.spec:121,154` | `resident.md:54,170` | `resident-live.vibe:297-299` |
| Guarded restart: review token, 1-64 kept, archive confirmed (#1302) | `resident-recovery.ts:30-43`, spec `:62-99` | `resident.md:89`, `assistant/recovery.md:62` | `resident-live.vibe:342-360`, `src/assistant/restart.vibe:20-49` |
| Account change rebinds, never stops; agent runs without a plan (P-43) | `production-surface.spec` (P-43) | `resident.md:205` | `resident-live.vibe:323-329` |
| Deferred record read retried, a write never | (resident startup) | `resident.md:230` | `resident-live.vibe:227-228` |
| Stop confirmed only when the launch serves nothing | `local-agent-stop.spec` | `resident.md:185` | `resident-live.vibe:330-335` |
| Streamed reply over native; not-sent vs unknown | `local-agent-native-stream.spec` | `platform/nativeStream.md:50-127` | `src/platform/resident-bridge.vibe` |
| Only rooted, table-admitted paths cross | `OwnerRoutesTest.java` | `platform/index.md:87,100` | `resident-live.vibe:212-214,280-281` |
| 429 advice in whole seconds only | (refusals) | `index.md:149` | `resident-live.vibe:95-101` |
| Eliza Cloud until the cutover flag (#1264) | commit 38fe464a8 (#1264) | `index.md:188` | `src/platform/build-live.vibe:55-58` |
| Staging only with test mocks and the choice, or the resident preview | `cloud-environment-selection.ts:11-25` | `index.md:201` | `build-live.vibe:39-47` |
| Authenticated Cloud call only signed in; 401 ends the session; cancel by id | `cloud-reachability`, Cloud tests | `index.md:230,243,254,288` | `src/platform/cloud-live.vibe` |
| Allowance reset carried only while ahead | (limits) | `index.md:270` | `cloud-live.vibe`, test `platform.test.vibe:762` |
| Variant and plugin reach; unlisted method never called | `native-plugin-startup.spec`, `ViewAdmission.qnt` | `index.md:21,39,60` | `src/platform/native-live.vibe`, `native-capacitor.ts` |
| A save commits only over the version it read; a bad value is held | `DurableStore.qnt` | `platform/storage.md:36,59` | `src/platform/device-storage.vibe:60-110` |
| Listed legacy slots move without loss | (slot migration) | `storage.md:109` | `src/platform/legacy-slots.vibe:16-52` |
| One return counted once; send refused only when Android says offline | `resident-failures.production.spec` (offline) | `platform/lifecycle.md:41,80` | `src/platform/lifecycle.vibe` |
| Turn in flight at process death: unknown, never resent | `resident-failures` (restart cases) | `lifecycle.md:108` | `lifecycle.vibe`, test `:626` |
| Problem log: once a minute, 50 entries, 30 days, no content | `runtime/crash-log.ts` | `platform/crashJournal.md:43-101` | `src/platform/crash-journal.vibe` |
| Renderer loss budget, escape view | `RendererRecoveryBudgetTest.java`, `RendererFailureUI.qnt` | `platform/rendererRecovery.md:48`, `shell/recovery.md:25` | `RendererRecoveryBudget.java` (unchanged), `src/web/main.tsx:16-30` |
| Toast time follows Android's accessibility timeout, re-read on resume | `test/accessibility-timeout.test.mjs` | `shell/toasts.md:49` | `src/shell/notices.vibe:33-58` |
| A request's own view keeps its reply whole (#1433) | `alpha-client-own-view-open`, `agent-keypad-direct.spec` | `assistant/conversation.md:96-113` | `src/assistant/composer.vibe:258-266,590-600`, `src/maps/agent.vibe:162` |
| A private screen refuses send and sends nothing | `alpha-client-sensitive.test.mjs:18` | `assistant/conversation.md:21` | `composer.vibe` (`canSend`), `assistantHost.vibe:119-124` |
| Failure kinds say what failed and offer the next step | `resident-failures.production.spec:44-51` | `assistant/reply.md:143-176` | `src/assistant/presentation.vibe:113-150` |
| One pending saved-copy request, compare-and-swap | `MediaCopyIntent.qnt` | `camera/copyIntent.md:16-64` | `src/camera/layer.vibe:42`, `editor.vibe` |
| Mock mode opens only after both collectors pause | `mock-background-admission.spec` | `index.md:370` | `build-live.vibe:61-73` (no caller: KNOWN) |
| Agent launched with secret and PII swap | `agent-launch-token-budget.test.mjs:23` | `eliza-vs/spec/os/agentService/config.md` | `android/agent/host.json:15-18` |
| Agent presents as Alpha | `agent-identity.test.mjs:17` | (bundle) | `android/agent/character.json:2` |
| Android route admission, plugin workers, result transport, serial storage tasks, media copy | JVM fixtures | (native) | Java classes unchanged or ±2 lines |

RETIRED before the port (absent on `develop` dd63c6bc): `test/accessibility-coverage`,
`accessibility-visible-bounds`, `cloud-personal-protocol`, `cloud-prewarm`,
`connection-step-contracts`, `feature-manifest`, `fixtures/AccessibilityBoundsTest.java`, and
`test/browser/cloud-personal-intent-storage`, `cloud-personal-onboarding`, `cloud-setup-migration`,
`connection.production`, `dev-cloud-scenarios`, `dev-cloud-setup`, `dev-wallet`,
`device-storage-migration`, `domain-initialization`, `execution-storage-migration`,
`legacy-list-identity`, `recording-question`, `render-error-recovery`. Also retired by design: saved
remote-agent pairing (the port has only the resident) and the launcher scripts
(`start-local-remote.ts`, `agent-identity.ts`, `core-state-patch.ts`, `prepare-client-features.ts`,
`cloud-resident-host.ts`; `scripts/legacy-retirement.json` "removed").

## Not covered

Titles were inventoried for all of these; the bodies were not read against port code.

- Layout and accessibility specs, case by case: `test/browser/accessibility-audit.spec.ts`,
  `accessibility-lifecycle`, `accessibility-resilience`, `accessibility-sweep(.production)`,
  `large-text-layout`, `large-text-overlap`, `responsive-surfaces(.production)`, `native-insets`,
  `compact-viewport`, `drawer-full-height`, `root-view-states`, `subview-accessibility`,
  `remaining-subview-accessibility`, `startup-access`, `design`, `canonical-icons`,
  `unavailable-controls.production`.
- Telephony specs against `src/telephony` code: `comms-alpha.spec`, `comms-header-search`,
  `comms-messages`, `comms-phone`, `test/comms-alpha.test.mjs`, `device-record-presentation`,
  `checkin-choice-presentation`.
- Journeys and media: `journey-core-loops.production`, `journey-f-hosted-result`,
  `journey-j04-android.production`, `media-polish`, `media-copy-intent-storage` (browser half),
  `native-video-library-change`, `video-timestamp-boundaries`, `login-field-reporter` (the Java
  `SCRIPT`), `source-reference-integrity`, `storage-usage`, `selected-content-*`, `speak-replies`,
  `message-read-aloud-route`, `fixtures-empty-runtime`, `shaw-ui-fixtures`, `confidentiality-claims`.
- Account specs case by case: `own-provider.production` (17), `provider-key-reconnect.production`,
  `signed-out-page(.production)`, `cloud-membership-presentation`, `cloud-membership-ui`,
  `cloud-phone-login`, `cloud-service-info`, `connection-activity-presentation`,
  `connection-startup-presentation`, `composer-dispatch`, `proposal-recovery`,
  `resident-background-results`.
- Developer-surface specs beyond the tooling-level finding: `dev-cloud-identity`,
  `dev-content-question`, `dev-hosted-journey`, `dev-hosted-results`, `dev-local-resident-recovery`,
  `dev-parity`, `dev-search-question`, `dev-surface-copy`, `domain-recovery-lifecycle`,
  `product-recovery-entry`, `test/dev-surface-gates.test.mjs`.
- Script and build tests against the port's changed scripts (each script differs from legacy and the
  diff was not read): `agent-cache-probe`, `agent-embedding-overrides`, `agent-model-selection`,
  `agent-executor-not-started`, `fixtures/agent-identity-canonical.test.ts`,
  `android-consumer-build`, `android-dependency-fingerprint`, `assetlinks-cloud-config`,
  `ci-required-checks`, `ci-ruleset-readback`, `ci-pin-bound-scripts`, `client-feature-preparation`,
  `cloud-resident-host`, `cloud-resident-embedding-route`, `core-runtime-transform`,
  `core-state-patch`, `developer-archive`, `docs-links`, `embedding-*` (6), and
  `scripts/audit-production-bundle.ts` rule by rule.
- The three test files that differ between trees (what the port removed from them, beyond the first
  hunk of `alpha-client-after-request-settles`).
- Quint models line by line against their counterparts: `Application`, `ClientObservationSupport`,
  `CommittedViewObservation`, `GoogleAccessPublication`, `SavedServiceRead`, `OSDefaults`,
  `OSProvisioning`, `OSRoleUpgrade`, `OSSourceStaging`, and the nine `legacy/Core*.qnt` against
  `eliza-vs/spec/core`.
- `platform.lemma.txt` 8-85 file by file: the `specs/quint` READMEs and manifests,
  `legacy/core/check-*.mjs`, `refinement/application/*.mjs`, `refinement/composition/*.mjs`,
  `refinement/native/*.java` (only their loss of a runner is reported).
- Whether upstream `eliza-vs` enforces "no output cap" (#1448) and the legacy launcher's model,
  redaction and embedding selection rules.
- Per-machine owner checks for the 30 `alpha/device/*` stores (gap 7).
