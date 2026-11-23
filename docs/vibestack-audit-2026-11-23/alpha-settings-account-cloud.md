# Alpha parity audit: settings, account, cloud

Trees: legacy `alpha-develop` (dd63c6bc), port `alpha-vs` (3d7ca972), upstream `eliza-vs`.
Everything below is from reading code. Nothing was built or run, so every finding is a static reading.
Paths are relative to the tree named (`L:` = alpha-develop, `P:` = alpha-vs, `U:` = eliza-vs).

## Summary

| Class | Count |
| --- | --- |
| OK | 18 |
| KNOWN (in `docs/vibestack-open-items.md`) | 9 |
| MISSING | 8 |
| CHANGED | 10 |
| UNIMPLEMENTED | 1 |
| UNMODELED | 1 |
| UNVERIFIED | 3 |
| RETIRED | 0 |

Verdict: **this slice is not at parity, and the sign-in and update paths are not safe to ship as they stand.**
The native side is intact: `AlphaDevicePlugin` (updater), `AlphaResetPlugin`, `AlphaCredentialStore` and
`AlphaCloudSignInPlugin` differ from legacy only by package renames, so APK admission, staging, the commit barrier and
the stored Cloud key survive. The renderer side is where it breaks. (1) Renderer Cloud requests now go through upstream
`ElizaCloud`, which reads a different credential store from the one Alpha's sign-in writes, so no sign-in can be adopted
by the session; the open-items doc lists this as an owner decision but understates it. (2) Every existing phone silently
loses its saved "ask before Alpha acts", location, Browser-page, Gmail, Calendar and mail-image choices at the cutover,
because the port reads new keys and adopts nothing. (3) The required sign-in page can be left blank with no control.
(4) The update machine can wedge in `Installing`/`Polling` until the process restarts, and the activation overlay has
no readback loop, so "Continue" can be missing for up to 15 minutes behind a full-screen modal. The Vibestack shape is
present (every rule has a Quint block, shells call generated machines) but there are no `.proof.dfy` files, no
conformance drivers for either area, and `spec/settings/native.md` is a model nothing calls.

## Gaps

### 1. KNOWN (blocker, understated) — a completed sign-in is never adopted, because Cloud requests use a different key store

- Behaviour: after sign-in, Alpha reads the account from Cloud with the stored key and every Cloud feature uses that key.
- Legacy: renderer Cloud calls went through `AlphaConnection.request`, which attached the key from Alpha's credential
  store (`L:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaConnectionPlugin.java`, methods `request`/`cancel`).
- Port: `request`, `cancel`, `secureWrite`, `secureRemove` are removed from `P:android/.../AlphaConnectionPlugin.java`.
  `P:apps/app/src/platform/cloud-live.vibe:77-81` sends every request through upstream `ElizaCloud`.
  `U:packages/os/android/sign-in/.../ElizaCloudPlugin.java:43-45` takes its key from `DeviceCustody.cloud(...)`, and
  `U:.../DeviceCustody.java:88-101` builds that from `NativeSecureStore`/`DeviceCredentialStore`, which only upstream
  `ElizaSignIn` writes. Alpha signs in with `AlphaCloudSignIn` (`P:android/.../AlphaCloudSignInClient.java:159,169-174`),
  which writes `AlphaCredentialStore` slots. `P:android/.../MainActivity.java:379` registers `ElizaCloudPlugin` as is;
  nothing overrides `custody(...)` and nothing in `P:android` references `DeviceCustody`.
- Consequence: `GET /api/v1/user` is refused `sign-in-required`, so `readAccount` returns undefined
  (`P:apps/app/src/account/session.vibe:79-87`), `adopt` returns without an event (`:132-137`) and startup `restore` is
  skipped (`:179-180`). The session stays `SignedOut`: the required sign-in page returns at every start, and plan,
  entitlement, inference binding, Google and Maps never bind. Sign-out's revocation (`:104-112`) cannot reach Cloud either.
- Open-items: "Owner decisions" bullet "With no Cloud account the resident runs under a local account … ElizaCloud keeps
  its own DeviceCustody key … Write a custody bridge". It says requests "carry no device key"; it does not say sign-in
  cannot complete.
- Smallest fix: subclass `ElizaCloudPlugin` in `P:android` and override `custody(...)` to read Alpha's
  `cloud:<environment>` slot (the hook is `protected`), register the subclass in `MainActivity`, and add a rule to
  `P:apps/app/spec/account/session.md` ("Cloud requests carry the key the sign-in stored") with a journey test that
  signs in through the fake native and reads `/api/v1/user` through the same store.

### 2. MISSING — the owner's saved safety and privacy choices are dropped at the cutover

- Behaviour: "Ask before Alpha acts", "Location for Alpha", "Browser page for Alpha", Gmail changes, Calendar edits,
  email images and the appearance choice persist across updates.
- Legacy: `L:apps/app/src/browser/device-preferences.ts:4` (fields `askBeforeAgentActions`, `agentLocationEnabled`,
  `agentBrowserPageEnabled`, `agentGmailChanges`, `agentCalendarEdits`, `autoLoadMailImages`), stored in the domain
  document `alpha.browser.device.v1` (`L:apps/app/src/browser/preference-documents.ts`, `devicePreferencesDocument`);
  appearance in `localStorage['alpha.appearance.v1']` (`L:apps/app/src/prototype/settings-adapter.ts:302-307`).
- Port: `P:apps/app/src/settings/preferences.vibe:7` reads only `alpha/device/settings/preferences` with new field
  names; `P:apps/app/src/settings/appearance.vibe:11` reads only `alpha/device/settings/appearance`. No file under
  `P:apps/app/src/{settings,platform,shell}` mentions `alpha.browser.device.v1`, `askBeforeAgentActions` or
  `alpha.appearance.v1` (the shell does adopt `alpha.startup-permissions.v1`, `P:apps/app/spec/shell/permissions.md:280`).
- Impact: an owner who turned "Ask before Alpha acts" on gets it off again; one who turned location or Browser-page
  sharing off gets them on again, and hosted models receive that data without a new choice. Dark theme reverts to light.
- Smallest fix: a rule in `P:apps/app/spec/settings/preferences.md` ("A phone updated from the legacy app keeps its
  saved choices, and an unreadable legacy record asks before every action") and a one-time read of the legacy document
  in `preferences.vibe` `readable()` before defaults are written; the same for `appearance.vibe` `readSaved()`.

### 3. MISSING — the required sign-in page can be left blank with no control

- Behaviour: when the readiness check fails or is cancelled, the required page stays drawn with "Sign-in unavailable"
  and "Try again".
- Legacy: `L:apps/app/src/runtime/connection-ui.tsx:3838` (`unavailable={!snapshot.signIn&&!snapshot.busy&&…}`) and the
  `unavailable` branch of `L:apps/app/src/runtime/cloud-sign-in-ui.tsx` ("Sign-in unavailable", "Try again"); commits
  d25ad29e4 and 34f710b20; test "a required page shown before startup stays rendered while its owner retries readiness".
- Port: `P:apps/app/src/web/account/SignInPanel.tsx:83` returns `null` whenever `screen === "ScreenClosed"` and no probe
  runs. The model reaches that state on the page: `P:apps/app/spec/account/signIn.md:297` (`back` during `Probing` on a
  page keeps `ScreenClosed`, clears `work`, leaves `latch` true), after which `canAutomaticProbe` (needs `not(latch)`)
  and `canLatchReleases` (needs a shown chooser or no entry) are both false. Reachable today: sign out inside Account,
  the automatic check starts, press Android Back before it settles; `P:apps/app/src/account/presentation.vibe:65-74`
  routes that Back to `signIn.back()`. The overlay (`P:apps/app/src/web/account/index.tsx`, `SignInPage`) then covers
  the phone with an empty page until the process restarts. `ownKeysCleared` with a stale latch reaches the same state.
- Smallest fix: in `signIn.md` make `back` during an automatic check on a page settle to `Choose` with unknown methods
  (or release the latch), add an `always` that a shown page has a chooser or a running check, and render the
  "Check sign-in options" action instead of `null` in `SignInPanel.tsx`.

### 4. CHANGED — the update machine can wedge in `Installing` or `Polling` until the process restarts

- Behaviour: a failed install attempt always returns the updater to idle so the next tap or poll retries.
- Legacy: `L:apps/app/src/prototype/settings-adapter.ts:635-642` (`finally { updateBusy = '' }`) and the scheduler's
  `busy: false` after every run (`L:apps/app/src/ui/state/app-update-gate.ts:429-441`).
- Port: `P:apps/app/src/settings/updates.vibe:88-91` returns from `install()` without sending `installAnswered` when
  `offerFor` is undefined. `installed()` (`:55-59`) answers `versionCode: MAX_SAFE_INTEGER` and an empty signer when
  `AlphaDevice.snapshot` fails once, which makes the offer undefined. The machine then stays `busy: Installing` (manual,
  `:107-110`) or `busy: Polling` (hands-off, `:121-122`); `canBeginCheck`, `canInstall`, `canPoll` and `canPollFinished`
  all need `busy == Idle` (`P:apps/app/spec/settings/updates.md`), so no check, install or poll runs again.
- Impact: one transient native read failure stops all launcher updates on that phone until reboot; the Install row
  shows "installing" forever.
- Smallest fix: send `installAnswered` with `OfferUnavailable` on the early return in `updates.vibe`, and add a `step`
  invariant to `updates.md` that every `install`/`poll` that left Idle is followed by an answer.

### 5. CHANGED — Android's update activation is read once per event, not followed, so Continue can be missing behind a modal

- Behaviour: while an update is preparing or paused, Alpha re-reads Android's state every second, shows "Continue update"
  as soon as Android allows it, releases the screen on idle or a terminal receipt, and tells the owner when their own
  page refused it.
- Legacy: `L:apps/app/src/ui/state/app-update-gate.ts:229-331` (readback loop, `waitForReadback` 1 s), `:147-151`
  (Continue), `:309-318` (toast "Finish your changes, then try updating again."), `:221-227` (Back and Home frozen),
  `:81-132` and `L:apps/app/src/main.tsx:411-420` (the mount is held at startup until the installer owns no pause).
- Port: `P:apps/app/src/settings/updates.vibe:127-136` reads `updateState` once at layer start and once per
  `alphaUpdateReady`/`alphaUpdateSettled` (`:166-177`). Native emits no event when an activation is sealed
  (`P:android/.../AlphaDevicePlugin.java:414,459,904` are the only emits), so `Paused`/`canContinue` is first seen by
  the next hands-off poll (`:118-119`), up to 15 minutes later. `P:apps/app/src/web/settings/UpdateActivation.tsx`
  covers the screen meanwhile. A lost settle broadcast is recovered only by that same poll. No refusal toast, no startup hold.
- Impact: on a phone where Android asks for confirmation, leaving Android's dialog without answering returns to a
  full-screen "Updating Alpha" with no button for up to 15 minutes.
- Smallest fix: a repeating read while `activation` is `Preparing`/`Paused`/`Continuing` in `updates.vibe` `schedule`,
  and a rule in `updates.md` ("While Android holds an activation its state is read again every second").

### 6. CHANGED — a saved sign-in is restored only if Cloud answers at that start

- Behaviour: a phone with a saved key that cannot reach Cloud at startup keeps its sign-in and shows Home.
- Legacy: tests "an unreachable saved sign-in survives a new resident connection without replacing its key"
  (`L:test/browser/saved-signin-retry.production.spec.ts`), "a saved sign-in that cannot reach Cloud at startup shows
  Home" (`L:test/browser/post-sign-in-setup.production.spec.ts`), "offline with a recent plan: the resident runs and
  retains the saved sign-in" (`L:test/browser/native-cloud-subscription.spec.ts`).
- Port: `P:apps/app/src/account/session.vibe:175-182`: with no persisted session, `restore` needs both the native
  identity and `GET /api/v1/user`; if the request fails, `startupSettles` runs signed out and nothing retries. The
  persisted session machine (`:220`) covers later offline starts, but the first start after the cutover has none.
- Impact: every existing phone that first starts the port offline or behind a captive portal shows the required sign-in
  page although its key is stored, and stays there after the network returns. `adopt` after a new sign-in has the same hole.
- Smallest fix: in `session.md` let `restore` take the native identity alone as `ActivationPending` and confirm on the
  next successful read; retry the read on a network return in `session.vibe`.

### 7. MISSING (part KNOWN) — Subscribe, Redeem and Add funds requests are not in the phone's Cloud route table

- Behaviour: Subscribe opens Stripe checkout, a membership code is redeemed, Add funds opens its checkout.
- Legacy: tests "on: Choose a plan opens the in-app plans on Alpha Cloud, Subscribe opens Stripe checkout", "success
  redeems once with a fresh key", "Add funds opens its amount form and creates only the reviewed balance checkout"
  (`L:test/browser/native-cloud-subscription.spec.ts`); code `L:apps/app/src/runtime/cloud-plans.ts`.
- Port: `P:apps/app/src/account/billing.vibe:138` (`POST /api/v1/subscriptions/checkout`), `:225`
  (`POST /api/v1/subscription/redeem`), `:216` (`POST /api/v1/credits/checkout`). None is in `cloudRoutes`
  (`P:capacitor.config.ts:24-46`), and upstream refuses an unlisted request as `NOT_LISTED`
  (`U:.../CloudRequestPolicy.java`, `plan`). Upstream also declares checkout and redeem as `keyed(..., IDEMPOTENCY_KEY)`
  (`:277-278`), a header `Cloud.json` cannot send (`P:apps/app/src/platform/cloud.vibe`); the port puts the key in the body.
- Open-items lists only "the device route table lacks `creditsCheckout`" (Upstream, cloud).
- Smallest fix: add the two routes to `capacitor.config.ts`, send `Idempotency-Key` through `CloudServices.client`
  instead of `Cloud.json` in `billing.vibe`, and extend the "Only managed routes leave the phone" journey test to
  compare every `cloud.json` path in `src/account` with the table.

### 8. CHANGED — the page says "ready" for an update without rechecking what the owner is doing

- Legacy: `L:apps/app/src/main.tsx` `prepareMountedUpdate`: refuses while voice is active, the connection is busy or a
  recorder is open; an automatic update also needs idle Home and no field focused at the freeze; then flushes the
  composer, Calendar, Notes, Inbox, Workflows and Messages drafts.
- Port: `P:apps/app/src/shell/activity.vibe:45-48` blurs the focused field and answers true when none stays focused;
  `P:apps/app/src/settings/updates.vibe:134-136` sends that as `ready`.
- Impact: a hands-off update whose download finishes after the owner started a voice turn, a recording or typing is
  acknowledged and installed over it. Whether each area keeps its draft on blur was not verified.
- Smallest fix: make `keepDrafts` return false unless `updateIdle(updateIdleFacts())` still holds for an automatic
  activation (the native state carries `automatic`); add the rule to `updates.md` under "Android's activation is acknowledged once".

### 9. CHANGED — hands-off retry timing: busy, deferred and failed attempts wait 15 minutes, not one minute doubling

- Legacy: not idle, Android starting, "requires a fresh check", an unavailable offer and a failed check all throw, so
  the scheduler retries after 1, 2, 4, 8, 15 minutes (`L:apps/app/src/prototype/settings-adapter.ts:452-484`,
  `L:apps/app/src/ui/state/app-update-gate.ts:429-441`).
- Port: `poll` with a busy phone sets `wakeAt = now + interval` (`P:apps/app/spec/settings/updates.md`, `poll`).
  `pollFinished` counts a failure only when `outcome === "CheckFailed"` or permission is `AndroidStarting`
  (`P:apps/app/src/settings/updates.vibe:124`), but `checkFailed` sets that outcome only for a manual check, so a failed
  automatic check is never a failure, and a stale manual failure makes every later poll one.
- Smallest fix: have `poll` return whether it was blocked and feed that and the automatic check's result into `pollFinished`.

### 10. CHANGED — a typed but unsent sign-in address no longer holds the update

- Legacy: test "a blurred sign-in draft holds the launcher update until the field is cleared"
  (`L:test/browser/launcher-ota.production.spec.ts`); `L:apps/app/src/prototype/settings-adapter.ts:237-239`.
- Port: `P:apps/app/src/account/bindings.vibe:128` knows only `address`/`prefill`, set after a send; the typed text lives
  in React state (`P:apps/app/src/web/account/SignInPanel.tsx`, `useState("")`).
- Smallest fix: report a non-empty draft to `SignInScreen` (a `drafted` flag in `signIn.md`) and include it in `idleOf`.

### 11. CHANGED — the chooser waits for the whole readiness check instead of six seconds

- Legacy: `L:apps/app/src/runtime/connection-ui.tsx:667` (`SIGN_IN_READINESS_WAIT_MS = 6000`), then email is usable and
  a late answer is adopted (`:680-697`).
- Port: `P:apps/app/src/account/signIn.vibe:115-120` awaits `status` with no bound. Native bounds each probe request at
  4 s (`P:android/.../cloud/CloudSignInReadiness.java:38-39`), so the wait ends, but after several requests.
- Smallest fix: `timeoutOption` of 6 s around the `status` call, settling with unknown methods and `lateFollows: true`.

### 12. MISSING — "Reopen" on the Google wait

- Legacy: `L:apps/app/src/runtime/connection-ui.tsx:2860-2867` (`reopenGoogle`), button in `cloud-sign-in-ui.tsx`
  (`view.step === 'google'`); test "Google waiting: one heading, a way to reopen the Google page, and Back".
- Port: `SignInPanel.tsx` shows a spinner and Back only; no rule in `signIn.md`.
- Smallest fix: a `reopenGoogle` event in `signIn.md` (cancel, then `tapGoogle`) and a button in `SignInPanel.tsx`.

### 13. CHANGED (CSP part KNOWN) — the delegation return page now forwards the code into the full app

- Legacy: `L:apps/app/public/delegation-return.html` is self-contained under `default-src 'none'` and builds the
  `alphaphone://cloud-delegation` link itself.
- Port: `P:apps/app/public/delegation-return.html` moves the query into `./#delegation-return…`; the app bundle then
  runs `P:apps/app/src/shell/landing.vibe` and `P:apps/app/src/web/shell/CallbackLanding.tsx`. The validation matches
  legacy (one 43-character state, code xor error, 4096/2000 limits, no unknown key, scrub before validate, only
  `access_denied` forwarded). The return now depends on the SPA being served beside the page, and the authorization
  code is handled by a page with no CSP.
- Open-items: Shell "`index.html` carries no CSP for the delegation-return landing route"; Tooling bullets on
  `export-browser-proof.ts` and `test-cloud-delegation-return.ts`.
- Smallest fix: keep the legacy static page (it needs no app), or ship the CSP before the cutover.

### 14. CHANGED — a successful install is read as "offer unavailable", and the tests fake statuses native never sends

- Native resolves `installUpdate` with no `status` on success (`P:android/.../AlphaDevicePlugin.java`, `call.resolve()`
  after commit) and never sends `"started"`. `P:apps/app/src/settings/updates.vibe:96-99` maps a missing status to
  `OfferUnavailable` and drops the saved digest; `InstallStarted` is unreachable. `P:apps/app/test/settings/settings.test.vibe:458-475`
  fakes `{ status: "started" }`, `"acknowledged"`, `"continued"`.
- Smallest fix: treat a resolved reply without status as `Accepted`; make the fakes answer what the plugin answers.

### 15. UNIMPLEMENTED — `spec/settings/native.md` is a model nothing calls

- Its 11 rules (`stageAdmitted`, `mayCommit`, `mayRelease`, `mayPublish`, `pilotVerified`, `mayDispatchReset`,
  `mayWriteSlot`, `appliedScale`, `kept`, `mayGrantRole`, `mayHandOff`) describe Java and release tooling. No file under
  `P:apps/app/src` or `P:apps/app/test` imports `gen/settings__native`, and there is no Java driver. The legacy models
  with Java trace harnesses (`specs/quint/native/NativeUpdate*.qnt`, `ResetRecovery.qnt`, `RuntimeUpdatePause.qnt`,
  `specs/quint/refinement/native/Update*Harness.java`, `Reset*Traces.java`) are still in the port tree; whether they
  still run was not checked. Open-items "Java-side host models are missing" names other models, not these.
- Smallest fix: keep the legacy native models as the authority for the Java, or add a JVM conformance driver per rule.

### 16. MISSING — no `.proof.dfy` in either area

- Legacy: `L:specs/lemma/apps/app/src/prototype/settings-adapter.dfy` proves `updateCheckDue`, `updateIdle`,
  `settingsPage` and `settingsNavigationRows` (developer rows never shown without the flag).
- Port: no `*.proof.dfy` exists anywhere under `P:apps/app/spec`. The legacy `.dfy` is still in `P:specs/lemma` but its
  source file is deleted. The properties exist only as Quint laws (`lawAFutureAnswerIsDue`, `lawACallIsNeverIdle`,
  `alwaysDeveloperOnlyWithTestMocks`).
- Smallest fix: `spec/settings/updates.proof.dfy` and `spec/settings/index.proof.dfy` for those four properties.

### 17. MISSING — no conformance driver for settings or account

- `P:apps/app/test/drivers/` holds 10 drivers, none named `settings__*` or `account__*`. The area tests
  (`test/settings/settings.test.vibe`, `test/account/*.test.vibe`) are one journey per story over hand-written fakes.
- Smallest fix: drivers for `settings__updates`, `account__signIn` and `account__session` first.

### 18. UNMODELED — eight rules have a Quint block with no invariant, law or witness

- `settings/appearance.md` "A new phone is light…"; `facts.md` "A read of the device…"; `index.md` "Settings has a
  root…" and "Privacy's Access setup…"; `network.md` "The Internet panel…"; `preferences.md` "A new phone lets Alpha…";
  `privacy.md` "A status read is shown only…"; `updates.md` "Android reports whether automatic installs are allowed…".

### 19. MISSING — the operator's Cloud readiness tool has no counterpart, and retained Cloud tests import deleted modules

- Legacy: `L:scripts/cloud-readiness.ts` (per-gate checks; `L:test/cloud-readiness.test.mjs`: "each observed deployment
  gap fails its own gate and names its step", "an SMS captcha closes the phone gate independently of email").
- Port: the script is gone; `P:scripts/legacy-retirement.json:4596-4600` maps the test to `cloud/test/*.test.vibe`,
  none of which covers gates. `P:scripts/cloud-worker.ts:155` keeps `smoke`. Not found in `U:packages/cloud` by a
  `captcha` search of `src`; upstream was not read further.
- Also CHANGED (tooling): `P:test/cloud-worker.test.mjs`, `cloud-deployment.test.mjs`, `cloud-email-resend.test.mjs`,
  `cloud-email-deployment.test.mjs`, `cloud-candidate-deployment.test.mjs` and `cloud-sdk-routing.test.mjs` import
  `scripts/cloud-deployment.ts`, `cloud-registration.ts`, `cloud-email-code.ts`, `cloud-sdk-authority.ts` or
  `cloud/edge/worker.ts`, none of which exists. Open-items' list of tests that target removed code omits them.

### 20. MISSING — components without `.meta.tsx`

- `P:apps/app/src/web/account/AccountScreen.tsx`, `SignInHost.tsx`; `P:apps/app/src/web/settings/DeveloperPage.tsx`,
  `Rows.tsx`. Open-items' "No meta file" list names only Maps and telephony.

### 21. UNVERIFIED

- Android Back on the required page's code step: the overlay surface has no `back` (`P:apps/app/src/web/account/index.tsx`,
  `surfaces`), so Back reaches `signIn.back()` only while the Account app is open. The shell's Back routing was not read.
- The resident after a cancelled update: legacy captured a reconnect and ran it on `canceled` with `resume`
  (`L:apps/app/src/main.tsx` `captureAppUpdateReconnect`, `app-update-gate.ts:300-322`). The port does nothing on
  `Ended`; whether `Resident` recovers by itself was not read.
- `P:apps/app/src/account/session.vibe:183-197` subscribes to `signInCompleted`/`signInIncomplete`/`signInRenewed` only
  after `renewSignIn` returns; whether native retains events for a late listener was not read.

### 22. KNOWN items in this slice (open-items bullet named)

- Add funds only on Eliza Cloud versus every Cloud after #1269 (Owner decisions).
- `invoice.stripe.com` not admitted, so an upgrade needing it reads as pending (Owner decisions; Upstream os).
- Proton Pass and development password-provider rows not ported; "Back up passwords" never shows (Owner decisions).
- "Try mock mode" does nothing because `admitMockMode` has no caller (Owner decisions).
- `internetValidated` flips are seen only on the next return to the app (Account).
- Owner route table for `/api/client-devices/*` and the enrollment import cycle not verified (Account).
- The Google App Link `appReturn` has no native source (Android / native).
- Whether `AlphaCloudSignIn.clearCredentialState` clears ElizaCloud's key (Owner decisions).

## Confirmed OK

| Behaviour | Legacy | Spec rule | Code |
| --- | --- | --- | --- |
| Offer is for this launcher and signer, newer, HTTPS, digest, size ≤ 2 GiB, URL ≤ 2048; index of ≤ 16 unique rows | `prototype/settings-adapter.ts:155-200` | `settings/updates.md` "An offer is for this launcher and signer…" | `src/settings/offer.vibe` |
| Check due after 15 min or a future clock | `settings-adapter.ts:203-208` | "A check is due fifteen minutes…" | `updates.vibe:66-74` |
| Failed read keeps the offer and retires automatic authority | `settings-adapter.ts:369-372` | "One check or install runs at a time…" | `updates.vibe:78-82` |
| Hands-off install needs a digest-bound offer, Android's permission, no pending install, idle | `settings-adapter.ts:452-484` | "A hands-off install needs idle…" | `updates.vibe:112-125` |
| Untouched sign-in card is idle, so a signed-out phone updates | `settings-adapter.ts:231-246` | `lawAnUntouchedSignInCardIsIdle` | `account/bindings.vibe:123-130`, `shell/activity.vibe:22-43` |
| Schedule runs from app start without Settings open, never with test mocks, foreground only | `settings-adapter.ts:704-707,736` | "Story: Get updates hands-off" | `updates.vibe:113,147-164`, `web/runtime.ts:32` |
| Native updater: staging, barrier, commit, pause, automatic gates | `android/.../AlphaDevicePlugin.java` | `settings/native.md` (model only, gap 15) | same file; diff is package renames plus the crash log moving out |
| Activation acknowledged once with `resumeEligible`; Continue calls `continueUpdate` | `ui/state/app-update-gate.ts:252-282,147-151` | "Android's activation is acknowledged once…" | `updates.vibe:127-141` |
| "Allow automatic updates" opens Android's page | `settings-adapter.ts:992-995` | "Android reports whether automatic installs are allowed…" | `updates.vibe:108-111` |
| Reset is a native review; only a native cancel is silent | `AlphaResetPlugin.java` (identical in both trees) | `settings/reset.md` | `src/settings/reset.vibe` |
| Stored Cloud key and its slots | `AlphaCredentialStore.java`, `AlphaCloudSignInPlugin.java` | `settings/native.md` "A credential slot changes only on an exact compare…" | two added lines and import renames only |
| `ALPHA_CLOUD_CUTOVER` off by default, written to renderer, Java and Gradle | `test/cloud-candidate-deployment.test.mjs` | `account/index.md` (deployment paragraph) | `cloud/src/deployment.vibe:125-138,175-183`, `cloud/generated/client-deployment.ts:5` |
| Email works while readiness is unknown; Google and phone need their own readiness | `runtime/cloud-sign-in.ts:36` | "Email works while readiness is unknown…" | `account/signIn.vibe` `methodsOf`, `SignInPanel.tsx` |
| Late readiness answer changes only the chooser its check showed | `connection-ui.tsx:2755-2763` | "A late readiness answer…" | `signIn.vibe` `followReadiness` |
| Offline starts nothing; Wi-Fi settings shortcut | `runtime/cloud-sign-in-network.tsx` | "Nothing starts while the phone is offline" | `signIn.vibe` `seen`, `openWifiSettings` |
| Back during Google adopts a key the host already stored | `connection-ui.tsx:2812-2825` | "Google waits for the host…" | `signIn.vibe` `back`, `runGoogle` |
| Delegation return validation and scrub order | `public/delegation-return.html` | `shell/landing.md` | `shell/landing.vibe` (delivery changed, gap 13) |
| Problem log: classes only, 50 entries | `AlphaDevicePlugin.java` `crashLog` | `settings/diagnostics.md`, `native.md` | `platform/crash-journal.vibe:67,80` via `ElizaSystem` |

## Not covered

- `settings`: facts and roles (`facts.md`, `vocabulary.md`), text size, Wi-Fi scan and join (`network.md`), the privacy
  listener row and Pause/Turn off ordering (`privacy.md` against `listenerReadGate`), the diagnostics export allowlist
  against `L:test/diagnostics-export.test.mjs` (14 titles), licences, the password vault flows beyond the two KNOWN
  bullets (`passwords.md` against `password-manager*.test.mjs`, `password-entry-back.spec.ts`), Settings navigation
  against `SettingsNav.qnt` and `SettingsPageFocus.qnt`, accessibility specs.
- `settings` release tooling: `app-update-candidate`, `publish-update-manifest`, `qualified-app-update`,
  `pilot-update*`, `update-channel*`, `os-update-enrollment`, `verify-wireless-launcher-update`,
  `deliver-app-update` tests and `ProtectedAppUpdatePromotion.qnt`, `PilotApkUpdate.qnt`, `AppUpdateCandidate.qnt`.
- `account`: plan admission and offline grace (`plan.md` against `PlanAdmissionGrace.qnt`, `CloudPlanRecheck.qnt` and
  the 60-odd titles of `native-cloud-subscription.spec.ts`), plan changes through `AlphaBillingAuthority`, referrals,
  key expiry warning and renewal, sign-out review (`sheet.md` against `AccountSheet.qnt`), Google connection and consent
  (`google.md` against `GoogleAccounts.qnt`, `google-authorization.test.mjs`), agent access switches, the delegation
  receiver (`delegation.md` against `DelegationReceiver.qnt` and `cloud-delegation-callback.test.mjs`, 12 titles), device
  enrollment (`enrollment.md`), limits, own-keys provider, the development bridge, power-launch claim, post-sign-in
  access setup, `IdentitySession.qnt`, `NativeCredentialMutation.qnt`, `CredentialVault*.qnt`, `PhoneSession.qnt`.
- `account` native: the in-tree `P:android/.../cloud/*.java` and `connection/*.java` copies were not diffed against the
  upstream classes legacy used at pin 7a124190a1 (`eliza-develop`).
- `cloud`: `P:cloud/src/{edge,profile,registration,wrangler,runtime-config,worker,cli}.vibe` were not read against
  `L:cloud/worker.ts`, `L:cloud/edge/worker.ts` and `L:scripts/cloud-worker.ts` (675 lines, now 301); provisioning,
  secrets, migration receipt, seed and deploy steps; `U:packages/cloud` and `U:spec/cloud/**`; the Cloud Worker
  description from repository data (commit a40eddf3dd6 is not on audited develop).
- Release signing and App Link tests listed under account (`aosp-release-signing`, `release-signing`,
  `auth-callback-manifest`, `cloud-signing-input`).

## Skeptic verdicts

Second reading, static only. `W:` = the author's working tree `/home/shaw/.cache/vibemig/alpha`. Its uncommitted diff under
`spec/settings` and `src/settings` is renames and added `*Values` sets only (plus `hide` → `hidePage` in `facts.vibe`); nothing
under `android`, `capacitor.config.ts`, `src/account`, `spec/account`, `src/web/{account,settings}` or `src/shell` is modified
there, so no gap below is fixed_uncommitted. All legacy evidence is on develop dd63c6bc, after #1422, so none is a deliberate retirement.

| # | Gap | Verdict | Severity | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Sign-in never adopted: Cloud requests read a different key store | confirmed (open-items understates) | blocker | `P:src/account/session.vibe:73-86,132-137,178-181` needs `GET /api/v1/user` through `Cloud.json`; `P:src/platform/cloud-live.vibe:40-50,84-88` sends it to `ElizaCloud`; `P:android/.../MainActivity.java:379` registers upstream `ElizaCloudPlugin` unchanged; `U:.../ElizaCloudPlugin.java:43-45` → `DeviceCustody.cloud` → `DeviceCredentialStore` slots `sign-in:<digest>:credential` (`U:DeviceCredentialStore.java:28,71,299`); Alpha's sign-in writes `cloud:<env>` in `AlphaCredentialStore`. No key → `CloudRequestPolicy.attachFor` refuses `SIGN_IN_REQUIRED` (`U:CloudRequestPolicy.java:134`) → `CloudSignedOut` → `readAccount` undefined → no `restore`/`signInCompleted`. The Owner-decisions bullet says only "requests carry no device key". Fix is larger than the auditor's: `CloudRequests.Custody` is a record over the concrete `DeviceCredentialStore` (`U:CloudRequests.java:27`), so overriding `custody()` alone cannot read Alpha's slot format; the bridge must mirror Alpha's key into that store (tokenAnswered/acknowledged/adoptSignIn, signOut) or Alpha must sign in through `ElizaSignIn`. |
| 2 | Saved safety and privacy choices dropped at cutover | confirmed | blocker | Legacy `L:src/browser/device-preferences.ts:4`, document `alpha.browser.device.v1` (`L:src/browser/preference-documents.ts:26`), appearance `localStorage['alpha.appearance.v1']` (`L:src/prototype/settings-adapter.ts:302`). Port reads only `alpha/device/settings/preferences` (`P:src/settings/preferences.vibe:7,33-44`) and `alpha/device/settings/appearance` (`P:src/settings/appearance.vibe:11,21-27`). No occurrence of `alpha.browser.device`, `askBeforeAgentActions`, `agentLocationEnabled` or `alpha.appearance.v1` anywhere under `P:apps`, `P:android/app/src/main`, `P:scripts`; `spec/platform/storage.md:109-135` adoption is for secure slots only. Same in `W:`. |
| 3 | Required sign-in page can be blank with no control | confirmed, narrower than stated | high | `P:spec/account/signIn.md:292-299`: `back` during `Probing` on a page keeps `ScreenClosed`, `latch` true; then `canAutomaticProbe` (:85) and `canLatchReleases` (:88) are both false. `P:src/web/account/SignInPanel.tsx:83` returns `null`; `P:src/account/signIn.vibe:259` retries only when `screen === "Choose"`. Back reaches `signIn.back()` only through `accountBack` while Account is the front app (`P:src/shell/navigation.vibe:100-106`, `P:src/account/presentation.vibe:65-73`), so the reachable case is sign-out inside Account then Back during the check; not reachable from Home at startup. A failed check is fine (it settles to `Choose` with "Check sign-in options", `signIn.vibe:115-119`). |
| 4 | Update machine wedges in Installing/Polling | confirmed | high | `P:src/settings/updates.vibe:88-91` returns without `installAnswered`; `:55-58` makes the offer undefined when `AlphaDevice.snapshot` fails once; `P:spec/settings/updates.md` `canBeginCheck`, `canInstall`, `canPoll`, `canPollFinished` all need `busy == Idle`; the machine is in memory (`updates.vibe:144`). Legacy always cleared busy (`L:src/prototype/settings-adapter.ts:635-642`, `L:src/ui/state/app-update-gate.ts:411-441`). |
| 5 | Activation read once per event, not followed | confirmed (worse than stated) | high | Only three callers of `watchActivation` (`P:src/settings/updates.vibe:165,168,173`); native emits nothing when an activation is sealed (`P:android/.../AlphaDevicePlugin.java:414,459,904`). `poll` (:118-119) forwards only `pending === true`, so it never delivers `Ended`: a lost `alphaUpdateSettled` leaves `UpdateActivation.tsx`'s full-screen modal until restart. Legacy loop `L:src/ui/state/app-update-gate.ts:229-331`, startup hold `L:src/main.tsx:413-419`. No refusal toast, no Back/Home freeze in the port. |
| 6 | Saved sign-in restored only if Cloud answers at that start | confirmed | high | `P:src/account/session.vibe:79-86,175-182`: `restore` needs identity and `/api/v1/user`; nothing retries after `startupSettles`; `adopt` (:132-137) has the same hole. Legacy tests exist (`L:test/browser/saved-signin-retry.production.spec.ts:85`, `post-sign-in-setup.production.spec.ts:149`, `native-cloud-subscription.spec.ts:462`). Recovers on the next process start that reaches Cloud. |
| 7 | Subscribe, Redeem, Add funds not in the route table | confirmed (header sub-claim not shown) | high | `P:capacitor.config.ts:24-46` lacks `POST /api/v1/subscriptions/checkout` and `POST /api/v1/subscription/redeem` (both in `U:CloudRequestPolicy.java:277-278` and `U:packages/cloud/src/client/routes.vibe:92-93`) and `POST /api/v1/credits/checkout` (absent upstream, the known bullet). These are the only three `cloud.json` paths in `P:src` not in the table. Upstream checkout reads the key from the body (`U:packages/cloud/src/billing/checkout.vibe:361-363`) as legacy sent it (`L:src/runtime/cloud-protocol.ts:253`), so the missing header is not shown to break checkout; legacy sent the header only for credits (`:261`). |
| 8 | "Ready" for an update without rechecking activity | confirmed | high | `P:src/shell/activity.vibe:45-48` blurs and answers true; `P:src/settings/updates.vibe:133-136`. Legacy `L:src/main.tsx:385-404` refuses on voice, busy connection, recorder, and for automatic on non-idle or a field focused at freeze, then flushes six draft owners. `UpdateState` schema drops native's `automatic` (`P:src/settings/native.schema.vibe:75-83`). |
| 9 | Hands-off retry waits 15 minutes | confirmed | low | `P:spec/settings/updates.md` `poll` else-branch and `pollFinished`; `P:src/settings/updates.vibe:124` counts only `outcome === "CheckFailed"` (set for manual checks only) or `AndroidStarting`. Legacy throws for all five cases (`L:src/prototype/settings-adapter.ts:452-484`) into `retry * 2^(n-1)` (`L:src/ui/state/app-update-gate.ts:426-437`). |
| 10 | Typed, unsent sign-in address does not hold the update | confirmed | low | `P:src/account/bindings.vibe:123-129` (`signIn.address` set only by submit); text in `useState` (`P:src/web/account/SignInPanel.tsx:67`). Legacy `L:src/prototype/settings-adapter.ts:237-239`, test `L:test/browser/launcher-ota.production.spec.ts:86`. |
| 11 | Chooser waits for the whole readiness check | confirmed | low | `P:src/account/signIn.vibe:115-119` has no bound; legacy `L:src/runtime/connection-ui.tsx:667,690`. |
| 12 | No "Reopen" on the Google wait | confirmed | low | Legacy `L:src/runtime/connection-ui.tsx:2860`, `L:src/runtime/cloud-sign-in-ui.tsx:169`; no `reopen` in `P:src/web/account`, `P:spec/account/signIn.md` or `P:src/account/signIn.vibe`; `SignInPanel.tsx:142` shows a spinner only. |
| 13 | Delegation return forwards into the full app | known_open_item | medium | Shell "`index.html` carries no CSP for the delegation-return landing route"; Tooling "`export-browser-proof.ts` must keep shipping `delegation-return.html` alongside `index.html`" and the "still target removed code" bullet naming `test-cloud-delegation-return.ts`. Port page: `P:apps/app/public/delegation-return.html` (forwarder under its own CSP). |
| 14 | Successful install read as "offer unavailable"; fakes answer statuses native never sends | confirmed | low | Native answers `call.resolve()` with no status (`P:android/.../AlphaDevicePlugin.java:829,831,953`); no `"started"` string in that file; `P:src/settings/updates.vibe:96-98`; fakes `P:test/settings/settings.test.vibe:463,482,506,507`. Effect is small: a committed install kills the process; a cancelled one loses its digest binding until the next check. |
| 15 | `spec/settings/native.md` is a model nothing calls | confirmed | medium | No `settings__native` import under `P:apps`, `P:android`, `P:scripts`, `P:test` (same in `W:`). Legacy models and Java harnesses are still present (`P:specs/quint/native/NativeUpdate*.qnt`, `P:specs/quint/refinement/native/Update*Harness.java`). Open-items names other Java models. |
| 16 | No `.proof.dfy` | confirmed | low | None under `P:apps/app/spec` or `W:`; upstream has them (`U:spec/workflow/*.proof.dfy`). Legacy `L:specs/lemma/apps/app/src/prototype/settings-adapter.dfy:19-37`. |
| 17 | No conformance driver for settings or account | confirmed | medium | `P:apps/app/test/drivers/` holds notes, telephony and workflows drivers only (same in `W:`). |
| 18 | Eight rules without invariant, law or witness | confirmed | low | Recounted by script over `spec/settings/*.md` and `spec/account/*.md` in `P:` and `W:`: the same eight headings, all in settings; none in account. |
| 19 | Cloud readiness tool gone; retained tests import deleted modules | confirmed in part | low | `P:scripts/cloud-worker.ts:155-200` `smoke` is the counterpart for eight gates (the same eight legacy `smoke` had). Gone with `scripts/cloud-readiness.ts`: the per-method gates (phone without SMS captcha, native Google, browser-return allowlist) and the `registration` printout. `P:test/cloud-readiness.test.mjs` still imports it; `cloud-worker`, `cloud-deployment`, `cloud-email-resend`, `cloud-email-deployment`, `cloud-candidate-deployment`, `cloud-sdk-routing` tests import missing modules (checked by resolving each import). Root `test/*.mjs` is not run by `verify` (`P:package.json:16,19`). |
| 20 | Components without `.meta.tsx` | confirmed | low | `P:src/web/account/{AccountScreen,SignInHost}.tsx`, `P:src/web/settings/{DeveloperPage,Rows}.tsx` (same in `W:`); the open-items list names Maps and telephony only. |
| 21a | Android Back on the required page | confirmed | medium | The overlay surface has no `back` (`P:src/web/account/index.tsx:79-81`) and no hold or layer Back is registered for it; with Home in front `backOnce` (`P:src/shell/navigation.vibe:89-107`) sends `nativeBack` to the shell under the page. Legacy captured `alpha-back` and cancelled the step (`L:src/runtime/connection-ui.tsx:3738-3757`). The on-screen Back still works. |
| 21b | Resident after a cancelled update | confirmed (timing only) | low | `resume` is not in `UpdateState` (`P:src/settings/native.schema.vibe:75-83`) and nothing runs on `Ended`. Recovery is the Resident's own: `Lost` restarts on the next tick, `Stopped` only on the next request (`P:src/platform/resident-live.vibe:147,292-305`, `P:spec/platform/resident.md:140-162`). Which state the service reports after `releaseUpdateShutdown` was not determined. |
| 21c | Late listeners for sign-in events | refuted | low | Native retains them: `notifyListeners(…, true)` for `signInCompleted`, `signInIncomplete`, `signInRenewed`, `signInMfaRequired` (`P:android/.../AlphaCloudSignInClient.java:766,1110,1203,1360,1763,1848`). |
| 22 | Eight KNOWN items | known_open_item | medium | Each is a bullet of `P:docs/vibestack-open-items.md`: Owner decisions (Add funds; invoice.stripe.com; password rows and backup; mock mode; custody/`clearCredentialState`), Account (`internetValidated`; client-devices routes; import cycle), Android / native (`appReturn`). |
