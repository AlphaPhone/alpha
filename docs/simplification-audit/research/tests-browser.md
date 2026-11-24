# Browser e2e suite audit: `test/browser`, Playwright config, browser CI

Scope: `test/browser/` (490 specs, 48 helper files), `playwright.config.ts`, `scripts/storage-specs.ts`,
`scripts/ci/run-browser.ts`, `scripts/ci/affected.ts`, `scripts/ci/export-browser-proof.ts`,
`.github/workflows/browser.yml` (+ `changes.yml`, which it calls). This was read-only research.

How I measured: I read every config and CI file in full. I read about 60 specs and every helper header in full
or in large part. I computed per-spec metrics with a script over all 490 specs: `test(` call sites, `page.evaluate`, in-page
`import('/src/…')`, role/text queries, user actions (`click/fill/press/keyboard`), `page.clock`, `waitForTimeout`
and `window as any`. The appendix table comes from those metrics plus hand-written verdicts for about 130 specs. I checked
helper usage with `git grep` over `test scripts playwright.config.ts package.json`. I took CI durations from
`gh run view` on the last six green PR runs of `browser.yml`.
Signal legend in the table: `sN` = in-page `/src` module imports, `rN` = role/text locator calls, `clk` = uses
`page.clock`, `wN` = number of `waitForTimeout` sleeps.

---

## 1. Area overview

- **Size.** There are 538 files (4.7 MB, ~51k physical lines). The code is written dense and minified, so the 51k lines hide about 4.7 MB of
  code. The biggest specs are `journey-core-loops.production.spec.ts` (71 KB), `native-cloud-subscription.spec.ts` (58 KB),
  `accessibility-resilience.spec.ts` (55 KB) and `chat-continuity.spec.ts` (52 KB). There are 490 specs: 434 run in chromium, 52 in production
  (51 `*.production.spec.ts` plus `production-surface.spec.ts`) and 4 in the live lane (`*.local.spec.ts`). 38 chromium specs are re-run
  in firefox and webkit through `scripts/storage-specs.ts`. The specs contain about 2,340 `test(` call sites. Loop expansion multiplies that about 1.7×:
  the production project's 229 call sites list as 385 tests, and firefox/webkit list 344 each.
- **Projects** (`playwright.config.ts:56-62`):
  - `chromium` runs everything except production and live specs, against `npm run dev:ui` (a Vite dev server with
    `ELIZA_DEV_ALLOW_TEST_MOCKS=1`).
  - `production` builds, audits and previews a flag-off bundle on port+1.
  - `firefox` and `webkit` run the storage list against the dev server.
  - `live` is added only when it is named on the command line, and needs a real local agent.
- **Global setup.** `warm-dev-server.ts` loads `/`, `/?mode=dev` and `/?mode=mock&start=home` once, so the cold Vite transform does not time
  out the first workers.
- **The real architecture of a spec** is almost always this sequence:
  1. `addInitScript` seeds `localStorage['alpha.connection.selection.v1']`. This happens 339 times inline.
  2. Optionally, an in-page fake Capacitor bridge (`window.Capacitor = {PluginHeaders, nativePromise…}`) stands in for Android.
  3. `page.goto('/?mode=dev[&tools=1][&shell=launcher]')` (205 specs) or `/?mode=mock&start=…` (25 specs).
  4. A mix of real UI driving (`getByRole`) and **in-page dynamic imports of product modules**: 2,342 `import('/src/…')`
     call sites across 178 distinct modules, used to seed state, call plugin stand-ins and monkey-patch prototypes.
  5. Assertions on the UI and on raw storage, read back through the same imported modules.
- **The production lane** uses `flag-off-android.ts` (47 KB) plus `resident-stub.ts` (29 KB) as a fake Android bridge for the
  flag-off bundle. 54 specs import it.
- **CI** (`browser.yml`):
  - `changes` (`affected.ts`) decides the lanes.
  - `verify` (90–115 min) and `formal` run in parallel with **6 chromium shards (21–40 min each, about 170–190 runner-minutes
    per PR)** and one production job (10–12 min, which also runs Quint composition refinement and a test-mocks bundle audit).
  - firefox/webkit run only on manual dispatch.

## 2. Pattern taxonomy

### P1. Unit test in a browser costume (module-in-page specs)
**What it looks like.** The spec loads the app (or a blank route), then `page.evaluate(async()=>{const {X}=await import('/src/…'); …})`
calls a module function directly and asserts on the return value. It performs no user action.
**Why it hurts.** These specs have the cost of e2e (a full dev-server page and app boot) and the value of a unit test. They pin internal APIs, so every
refactor breaks them. The owner explicitly wants none of these.
**Examples**
- `calendar-options.spec.ts:7-9`: `const {calendarOptionEvent,calendarUsesOptions,…}=await import('/src/prototype/calendar-adapter.ts')`
  followed by eight `expect(result.x).toEqual(…)` checks on a pure function table.
- `domain-initialization.spec.ts:7-13`: imports `BrowserDomainDocument` and patches `IDBObjectStore.prototype.put` to count writes.
- `dev-digest-storage.spec.ts:4-6`: `browserDigestStore`, `developmentIdentity` and `actionScope` called directly, with one `toEqual`.
- `dock-clearance.spec.ts:3-17`: a route-fulfilled fake DOM, then `installDockClearance()` called directly.
- `photo-filter-fallback.spec.ts:3-5`: a blank page, then `applyPhotoFilter` on a 4×1 canvas.
- `upstream-client-features.spec.ts:4-9`: imports the *upstream* `plugin-files/src/browser/files.ts` through `/@fs`.
- `calendar-linked-storage.spec.ts`: 16 `/src` imports, 0 locators, 0 actions, and it runs on 3 browsers.
- `browser-credential-cas.spec.ts`, `reminder-notification-dismissal.spec.ts`, `workflow-notification-recovery.spec.ts`,
  `notification-route-lifecycle.spec.ts`, `cloud-tts-streaming.spec.ts`, `dev-file-picker.spec.ts`, `view-navigation.spec.ts`
  (14 evaluates, no clicks).

**How widespread.** 40 specs have zero user actions and only evaluates or imports (listed as `not e2e` in the appendix). A further
40 specs do click or type but still have more `/src` imports than locator calls (70 specs in total have more imports than locator calls), for example `conversation-selection-storage` s35/r18,
`digest-execution-migration` s25/r6, `execution-storage-migration` s22/r7, `cloud-account-migration` s21/r6,
`device-storage-migration` s21/r8.
**Treatment.** Delete when an e2e journey covers the observable behaviour. Otherwise move the check to a Node integration test
under `test/` that exercises the module with a real IndexedDB shim, or drop it if it is internal.
**Risk.** Some of these specs are the only coverage of a race (concurrent IndexedDB writes, compare-and-swap). Before deleting, check that the owner still
wants that browser stand-in at all (see P7).

### P2. Backdoor setup and navigation
**What it looks like.** The spec reaches screens or state through imported singletons instead of the UI. The most common singletons are:
- `connectionController` (487 imports of `/src/runtime/connection-ui.tsx`)
- `registerPlugin('AlphaFiles'|'AlphaCalendar'|…)` (746 imports of `/src/platform-plugins.ts`)
- `browserNotes` (281)
- `calendarDocument` (232)
- `browserPhotoLibrary` (211)

**Examples**
- `helpers/connection-diagnostics.ts:9-15`: `openConnectionDiagnostics` polls `connectionController.getSnapshot().startupResolved`
  and then calls `connectionController.open()`. 69 files use it. Its own comment says the product route is
  "Settings → About → Connection help".
- `storage-usage.spec.ts:7`: files are imported through `registerPlugin('AlphaFiles').importFile(new File(…))` instead of the Files UI.
- `dev-connected-voice.spec.ts:4`: `connectionController.getPairedVoiceBinding=()=>({…})` (33 controller overrides in total).
- `helpers/legacy-notes.ts:7-12`: seeds `openBrowserNotes().replace(records)` before it navigates.
- `source-reference-integrity.spec.ts:3-6`: whole flow through `AlphaFiles`/`AlphaMailAttachments` plus a raw IndexedDB rewrite.

**Treatment.** Seed state only at the bridge or fixture boundary (one harness, P6), and navigate only through visible controls (`nav.ts`).
**Risk.** Seeding through the UI is slower. Mitigate with a fixture-level `seed()` API that writes the documents through the same
fake bridge the app reads from.

### P3. Prototype surgery (monkey-patching product classes in the page)
**What it looks like.** `X.prototype.method = async function(){ … hold/fail … }` replaces a product class method to inject races and failures.
- 849 patch sites across 156 specs.
- Most common targets: `IDBObjectStore.prototype.put` (194), `Storage.prototype.setItem` (106),
  `Component.prototype.renderVal` (40), `BrowserDaily.prototype.operateReminder` (26), `LocalAgentProtocol.prototype.send` (16),
  `BrowserVoice.prototype.synthesize*` (22).

**Examples**
- `calendar-delete-completion.spec.ts:17`: `BrowserCalendar.prototype.remove=`
- `calendar-save-completion.spec.ts:7`: `BrowserCalendar.prototype.save=`
- `album-storage-migration.spec.ts:7` and `notes-save-failure.spec.ts:21`: `IDBObjectStore.prototype.put=function(...)`
- `chat-header-home.spec.ts:4` and `chat-message-polish.spec.ts:9`: patch `Component.prototype.renderVal` from `/src/prototype/model.js`

**Why it hurts.** Renaming any method silently breaks the fault injection. When the patched method is no longer called, many of these
tests still pass, so they test nothing.
**Treatment.** Keep fault injection only at real boundaries: the fake bridge, `page.route`, and storage quota (CDP
`Storage.overrideQuotaForOrigin`). Delete product-class patches.

### P4. Source-text and stitched-source harnesses
**What it looks like.** The spec reads source files from disk, regex-edits them, strips types and injects them with `addScriptTag` or `setContent`.
The result is a third build of the product that is neither the dev build nor the shipped bundle.
**Examples**
- `notes-named-review.spec.ts:7-10`: `compile('apps/app/src/prototype/source-review-dialog.ts').replace(/import\s*\{\s*holdPhoneInert…/,'')`,
  then `page.addScriptTag({type:'module',content:inert+review})`. Its three tests are **title-identical duplicates** of
  `notes-review.spec.ts`, which already loads the same modules through Vite.
- `notes-query-review.spec.ts:6-9`: the same technique.
- `native-speech.production.spec.ts:65-68`: inside the *production* lane, it reads `.eliza/client-features/…/navigation-voice.ts` and
  `apps/app/src/maps/navigation-voice.ts`, strips imports and exports, and `page.evaluate`s the concatenation. This does not test the
  production bundle at all.
- `login-field-reporter.spec.ts:11` and `reading-sensitive.spec.ts:6`: they slice JavaScript out of a Java text block in `vendor/eliza/…/*.java`.
- `mock-readiness.spec.ts:4-6`: it regex-extracts the `evaluateJavascript("…")` string from an androidTest Java file.
- `production-surface.spec.ts:28-39`: it re-walks the built bundle text with `engineFindings`, which
  `scripts/audit-production-bundle.ts:144` already runs inside the production `webServer` command (`playwright.config.ts:44`).
- `video-timestamp-boundaries.spec.ts:3`: it reads the `mediabunny` bundle from `node_modules` and serves it as a fixture.

**Treatment.** Delete them. The Java-snippet checks belong in Android instrumentation or upstream, and the bundle scan is
already done by the audit.

### P5. Twin lanes (`x.spec.ts` and `x.production.spec.ts`)
There are 10 pairs. Most pairs test the same journey twice, once with dev fixtures and once with the flag-off harness.
- `chat-continuity` (691 + 490 lines): **7 identical test titles**, including "pressing Send twice dispatches one message"
  (`chat-continuity.spec.ts:379` and `chat-continuity.production.spec.ts:356`). The bodies differ only in fixture plumbing:
  `fixture(page,f=>f.posts)` against `harness(page,f=>f.posts)`.
- `chat-system-notices`: the single production test is the first dev test, word for word (`.spec.ts:79` and `.production.spec.ts:18`).
- `post-sign-in-setup`: the same three onboarding paths ("verified email code goes straight to access setup", "signed-in start opens
  access setup directly") appear in both files.
- `accessibility-sweep`, `responsive-surfaces`, `home-daily-overview`, `home-attention`, `use-in-email`, `browser-external-handoff`
  and `signed-out-page` cover the same screens with different fixture stacks.

**Treatment.** Write one spec per journey and run it in the build that matters, which is the production lane with the bridge harness. Keep dev-lane
twins only for cases that need developer surfaces. Parametrise by project where both builds really matter.

### P6. Bridge re-implementation (Capacitor bridge written ~57 times)
`window.Capacitor = { PluginHeaders: names.map(name=>({name,methods:methods.map(…rtype…)})), nativePromise, nativeCallback }`
appears inline in **49 specs** (for example `aosp-phone.spec.ts:15`, `native-insets.spec.ts:9`, `native-plugin-startup.spec.ts:11`,
`chat-continuity.spec.ts:40`, `password-manager.spec.ts:122`, and `production-surface.spec.ts:73,368,490`, which has three copies in one file).
It also appears in **8 helpers**:
- `flag-off-android.ts:254`
- `resident-stub.ts`
- `telephony-fixture.ts:98`
- `device-apps-stub.ts:15`
- `accessibility-states.ts:392`
- `helpers/delivery-fixture.ts:27`
- `helpers/native-cloud-plan-fixture.ts:45`
- `helpers/native-cloud-signin.ts:67`

`accessibility-states.ts:357-396` (`launcherBridge`) and `device-apps-stub.ts:5-25` are near-verbatim copies: the same plugin list, the same
`answers` and the same `cap.Plugins[name]={addListener…}` loop. In total, **76 specs** hand-write `nativePromise`/`PluginHeaders` handlers.
**Treatment.** Write one typed `installBridge(page, handlers)` that derives `PluginHeaders` from the handler map and exposes a typed
`window.__alphaTest` recorder. Then build `flag-off-android` and the other helpers as plugin modules on top of it.

### P7. Testing the simulator, not the product
205 specs boot `?mode=dev` and 41 drive the "Device controls" simulator panel. Many of them assert the behaviour of
browser stand-ins in `apps/app/src/browser/*` (139 files: `calendar-store`, `reminder-store`, `development-*`, `location-simulation`,
`incoming-simulation`), which the APK replaces with native plugins.
- `dev-parity.spec.ts:4-16` saves, edits and removes through `registerPlugin('AlphaCalendar')` and expects `{saved,edited,stale:'conflict'}`.
- `dev-sensors.spec.ts:5` calls `AlphaDevice.setSensor` and `AlphaVoiceCloud.startRecording`.
- `dev-incoming-call.spec.ts:2-5` reads `localStorage['alpha.dev.app.phone']`.
- `dev-wallet.spec.ts` tests a Wallet app that the PRD says is deferred and removed from MVP (AP-13).

**Why it hurts.** Most of the chromium lane's runtime proves that a test double behaves correctly.
**Treatment.** Keep **one** `dev-surface.smoke.spec.ts`: mock mode banner, fixture images, device-controls panel opens, dev build has no
sign-in gate. Delete simulator-semantics specs, or move them to Node if the stand-ins stay.

### P8. Legacy-data fossils
19 specs are named `*-migration`, `*legacy*`, `*compatibility*` or `*retirement*`:
- `agent-conversation-migration`
- `album-storage-migration`
- `calendar-storage-migration`
- `cloud-account-migration`
- `cloud-setup-migration`
- `device-storage-migration`
- `digest-authorization-migration`
- `digest-execution-migration`
- `digest-inbox-migration`
- `execution-storage-migration`
- `notification-storage-migration`
- `preference-storage-migration`
- `reminder-storage-migration`
- `note-audio-legacy-restore`
- `legacy-notes-access`
- `legacy-list-identity`
- `maps-legacy-provenance.production`
- `inbox-folders-compatibility.production`
- `workflow-retirement`

In addition, 54 specs reach Notes or Calendar through the legacy "Previous notes" or "retained calendar source" path (`helpers/legacy-notes.ts`, 57
refs; `helpers/browser-calendar.ts:1-2`: "Compatibility fixtures seed the persisted authority retained from older installations").
The PRD says: "No app-data migration, backup or import/export workflow is planned", yet `calendar-backup-restore.spec.ts` (10 tests, 3 browsers)
exists. 16 specs still select the `{kind:'remote'}` paired-agent connection, while the PRD says "No hosted-agent pairing". The product still has it at
`apps/app/src/runtime/connection-ui.tsx:3376`.
**Treatment.** When the product deletes a legacy path, delete its specs and the helper paths with it. Until then, keep one storage-contract spec.

### P9. Micro-spec sprawl
Areas are split into many 1–2-test files with copy-pasted boot code:
- Calendar has **45 specs**. Nine `calendar-*` files have 1 test each (`calendar-agent-all-day-review`, `-agent-transaction-cancel`,
  `-approval-queue`, `-delete-completion`, `-end-after-start`, `-month-focus`, `-save-completion`, `-transaction-cancel`, `-wide-days`), plus
  15 `dev-calendar-*` files.
- Workflows has 41.
- Notes has 36.
- Files has `files-dialog-accessibility`, `files-dialog-dismissal`, `files-dialog-large-text`, `files-location-layout` and
  `files-sort-directions`, all with 1 test.
- Photos has `photo-album-accessibility`, `photo-delete-accessibility`, `photo-overlay-contrast` and `photos-grid-density`.
- Home has 16 files.
- Size of the long tail: 125 specs have a single `test(` call site (74 of them with no loop), and 32 specs are under 2 KB.

**Treatment.** Write one journey file per area (§9), where each test is a user journey and the a11y and layout checks are steps inside it.

### P10. Clock roulette (fake-time flakiness patterns)
76 specs use `page.clock` (155 `setFixedTime`, 56 `install`, 25 `runFor`, 23 `fastForward`, 19 `setSystemTime`). 76 use
`waitForTimeout`: 294 static sleeps adding up to **~285 s** before loop expansion.
- **Frozen Date with real timers.** `setFixedTime` pins `Date.now()` while timers run in real time. `dev-clock.spec.ts:11,17,20,23,26` move
  time by calling `setFixedTime` again mid-test and then wait real time for the app's ticker to notice (`waitForTimeout(1100)` at :17,
  `1200` at :23,:31).
- **Absence proven by sleeping.** `dev-clock.spec.ts:17`: `await page.waitForTimeout(1100);expect(…sounds.length)…`. This is a negative
  assertion after a fixed sleep: it passes when the machine is slow, and it costs time on every run.
- **Fake timers mixed with real sleeps.** `clock.install` plus `waitForTimeout` appears in 7 specs (`home-app-library`, `home-daily-overview`,
  `journey-a-conversation:319,326,342` with sleeps of 2.5 s and 1.3 s, `notes-trash-resume:30,47`, `post-sign-in-setup:164,179`, `context-selection`,
  `media-polish`). `setFixedTime` plus sleeps appears in 9 more (`message-actions:45,87`, `standalone-shell:251`, `dev-workflow-*`).
- **Gesture timing by sleep.** `home-app-library.spec.ts:226` (`mouse.down(); waitForTimeout(700); mouse.up()`) and `message-actions.spec.ts:45,87`
  simulate long-presses with wall-clock sleeps.
- **A second time source.** `dev-contacts`, `dev-messages-lifecycle` and `home-inbox` also override `Date` in the page, on top of `page.clock`.

**Treatment.** Use `clock.install()` plus `runFor`/`fastForward` everywhere time matters, never wall sleeps. For "nothing happened", use
`runFor(N)` and then assert. Use `helpers/settled.ts` (already exists, 13 users) for motion.

### P11. Timeout inflation
There are 144 `test.setTimeout(≥120_000)` calls (12 at 240 s) and 196 explicit `timeout: ≥30_000` waits. The default is 30 s (`playwright.config.ts:52`).
`warm-dev-server.ts` exists only because cold transforms timed out tests. The inflation hides slow specs, and a hung test can hold a
worker for 4 minutes. **Treatment.** Rely on the default timeout plus a harness that boots fast. Treat any per-test override as a smell that needs review.

### P12. Untyped window bag
There are 3,316 `window as any` occurrences in 368 test files. Every fixture shares state through ad-hoc globals: `window.continuity`,
`window.flagOff`, `window.nativeSpeech`, `window.canonicalNotesFixture`, `window.dialogResult`, `window.releaseCalendarTransactions`, and so on.
**Treatment.** Use one `declare global { interface Window { __alphaTest: AlphaTestHarness } }` in the harness.

### P13. Per-spec boot boilerplate
- The `kind:'offline'` selection seed is written inline **339 times**.
- 69 specs write their own foreign-request fence (`page.route(/^https?:\/\/(?!127…)/, abort)`).
- 39 write their own `pageerror` collector.
- 69 use `test.use(...)` overrides.
- 74 files carry multi-line "evidence boundary" disclaimers. For example, `chat-system-notices.production.spec.ts:1-7` restates what
  `flag-off-android.ts:5-13` already says.

**Treatment.** Provide one `test` fixture (`test.extend`) that seeds the connection, fences the network, collects page errors and fails on
them.

### P14. Tests of the test harness
`accessibility-audit.ts` is an 806-line home-grown "axe" (`accessibility-audit.ts:3-12`: "Dependency-free accessibility
checks … in the spirit of axe rules"). `accessibility-audit.spec.ts` spends 14 tests unit-testing that helper on `setContent`
fixtures. `axe-core` is not a dependency (`package.json` has no hit for axe).
**Treatment.** Owner decision. Either adopt `@axe-core/playwright` and keep only the product-specific rules (dock overlap,
reading order, ~200 lines), or keep the engine and move its self-test out of the e2e lane.

### P15. Node-side product imports and formal-model coupling
- 11 specs import product or tooling code into the Playwright runner process:
  - `../../apps/app/src/runtime/device-record-presentation.ts` (6)
  - `cloud-deployment.generated` (4)
  - `../../scripts/local-agent-dev-bridge` (4)
  - `upstream renderer: gestures/constants` (2, in `standalone-shell`)
  - `../../scripts/audit-production-bundle.ts` (2)
  - `../../specs/quint/refinement/check-traces.mjs` (`browser-list-focus:2`, `maps-list-focus:3`, `notes-photos-list-focus:4`)

  The consequence: `npx playwright test --project=chromium --list` **fails entirely** ("Total: 0 tests in 0 files") in a worktree without the
  prepared `.eliza` projection. The cause is these top-level imports (observed: "Cannot find module …/.eliza/client-features/…/device-record-presentation.ts"). A single
  missing projection hides the whole inventory.
- `browser-list-focus.spec.ts:69` calls `checkTraces({model:'BrowserSession',…})`, so a UI e2e also does Quint refinement.

**Treatment.** Specs must import only `@playwright/test` and the harness. Produce Quint traces in the Quint lane.

### P16. Hidden second Playwright harness
`adapters.spec.ts:7-18` shells out to 8 `scripts/test-*.ts` (703 lines), and each launches its *own* Chromium (`scripts/test-maps-context-browser.ts:8`)
against the test server. Separately, `scripts/maps/test-renderer.ts`, `scripts/maps/test-recovery-renderer.ts`,
`scripts/test-photo-filter-png-reference.ts`, `scripts/prototype-capture.ts` and about 25 `specs/quint/**` refinement drivers also drive
Playwright. That is why `verify` installs Chromium (`browser.yml:48-49`). Browser automation lives in three places with three conventions.
**Treatment.** Move adapter scripts into `test/browser` as normal specs, or delete them where the journeys cover them.

### P17. Dead or vestigial guards
- `test.skip(info.project.name!=='production',…)` appears in 5 files that only the production project can match anyway (`settings.production.spec.ts:11`,
  `settings-truth.production`, `google-maps-raster.production`, `managed-maps-unavailable.production`, `maps-legacy-provenance.production`).
- 3 chromium specs always skip in the normal shards (`browser-agent-tts:6`, `browser-host-disclosure:4`, `host-reminder-recovery:3`) and are
  re-run by a separate CI step with a second dev server (`browser.yml:178-182`).
- `reminder-v2-assistant.spec.ts` generates all its tests in loops. Its v1 case is a "legacy reminder (no alertMinutes, no timingVersion)" path.

### P18. Duplicate test helpers for one concern
- Two IndexedDB "hold the documents transaction" helpers: `calendar-fixture.ts:1-8` (`holdCalendarTransactions`) and
  `helpers/calendar-storage-hold.ts:4-15` (`holdDocumentsTransaction`). They are the same technique on the same DB and store.
- Seven voice fixtures:
  - `voice-fixture.ts`
  - `cloud-voice-fixture.ts`
  - `cloud-notes-voice-fixture.ts`
  - `generic-cloud-speech-fixture.ts`
  - `native-speech-fixture.ts`
  - `voice-assistant-fixture.ts`
  - `voice-fixture-failure-metadata.ts`
- Nine calendar helpers:
  - `calendar-fixture.ts`
  - `calendar-sync-fixture.ts`
  - `calendar-draft-readiness.ts`
  - `helpers/browser-calendar.ts`
  - `helpers/calendar-review.ts`
  - `helpers/calendar-storage-hold.ts`
  - `helpers/canonical-calendar.ts`
  - `helpers/home-calendar.ts`
  - `helpers/one-calendar.ts`
- Four navigation helpers: `app-navigation.ts`, `workflow-navigation.ts`, `inbox-draft-navigation.ts`, `scan-review-navigation.ts`.
- Two resident-agent fakes: `resident-stub.ts` and `helpers/resident-agent-plugin.ts`.
- Four cloud fakes: `helpers/native-cloud-signin.ts`, `helpers/native-cloud-plan-fixture.ts`, `helpers/cloud-plan-settings.ts`,
  `helpers/cloud-connection-notices.ts`.

## 3. CI cost and why

| Job | Measured (last 6 green PR runs, Nov 10–11 2026) | Notes |
| --- | --- | --- |
| Browser MVP shards 1–6 | 21–40 min each; test step 2,318 s on shard 4 | **~170–190 runner-min per PR**; `workers: 2` on a 4-vCPU runner |
| Browser production | 10–12 min (test step 645 s) | Also runs Quint composition refinement (41 s) and builds and audits a test-mocks bundle |
| Repository verification | 91–115 min | Triggered by **any** non-doc change, including a single spec edit; also builds the "browser proof renderer" |
| Changed-model proofs | up to 180 min limit | Same trigger as verify |
| Storage (ff/webkit) | 15–21 min unsharded per browser; 2 shards × 2 browsers | Manual dispatch only |
| Wall clock of one PR run | 21:57 → 01:59 (about 4 h, including queueing) | Run 42905729621 |

Why the chromium lane is slow:
1. About 2,000 or more independent **full app boots on an unbundled Vite dev server** (every test does `goto` plus the init scripts). The 2,342 in-page `/src`
   imports add module transforms on top. The config needs a warm-up global setup to avoid timeouts.
2. Only `workers: 2` per runner (`playwright.config.ts:53`).
3. Sleeps (~285 s static) and inflated timeouts (144 tests at ≥120 s).
4. About 40–50% of the specs (P1, P7, P8, P5 twins) add runtime without proving a user journey.
5. Every runner pays for setup separately: npm ci, the Playwright install (~24 s) and the dev-server warm-up.

## 4. Spec selection by changed path (`scripts/ci/affected.ts`) and where it over-selects

How it works:
- `affected()` (`affected.ts:18-52`) maps paths to 4 booleans.
- `browserPlan()` (`:61-74`) narrows **only when every changed non-doc path is an existing `test/browser/*.spec.ts` or `*.production.spec.ts`**.
  - 3 or fewer dev specs run on 1 shard. Four or more run on 6 shards.
  - Otherwise the full inventory runs on 6 shards, plus the full production lane.

Over-selection:
1. **Any `apps/app/**` change runs all 434 chromium specs, all 52 production specs and Android** (`affected.ts:43-45`). There is no
   area→spec mapping, so a CSS tweak in Maps runs the Telephony, Wallet and Calendar migration specs.
2. **Any helper change runs everything**, because a non-spec file under `test/browser/` disables narrowing (`:63`). There are 48 helpers, and
   `flag-off-android.ts` is shared by 54 specs, yet an edit to `scan-review-navigation.ts` (5 users) still runs all specs.
3. **A spec-only change still triggers `verify` (90–115 min) and `formal`**, because `result.verify = true` is set for every
   non-reference path before the branch (`affected.ts:26`).
4. **Live specs over-select.** `selectableSpec` (`:59`) does not match `*.local.spec.ts`, so editing a live-only spec, which CI never runs,
   selects the full browser inventory.
5. **The production lane never narrows.** `npm run test:browser:production` (`browser.yml:226`) runs all 52 production specs when any one
   production spec changes.
6. **Shards are not sized to the work.** Four changed specs get 6 runners, each paying npm ci, the Playwright install and the dev-server warm-up.
7. **The unknown-path fallback selects everything** (`:47-49`, for example any `scripts/*.ts` or `package.json` change, including `scripts/ci/affected.ts`
   itself). That is defensible for `package.json`, but too broad for scripts that only feed one lane.
8. **Firefox/WebKit qualification** (38 specs × 2, `scripts/storage-specs.ts`) targets engines the product never ships (Android WebView is
   Chromium; `browser.yml:13` says "not the Android engine").
9. **`verify` builds and uploads an artifact nobody downloads** (`browser.yml:89-104`, `export-browser-proof.ts renderer`). I grepped
   `.github` and `scripts` for `browser-proof-renderer-`/`download-artifact` and found no consumer. The worker export in `resident-prepare.yml:54-58`
   is likewise uploaded with no in-repo download. `export-browser-proof.ts` is a 139-line hardened exporter (symlink walk, 96 MiB budget,
   rejection report) with its own unit test, `test/browser-proof-export.test.mjs`. **Suspicion:** an external system may consume it. Owner to confirm.

Proposed selection: give every journey spec an **area tag** that matches `apps/app/src` ownership. Map `apps/app/src/<area>/**` and the
area's `test/browser/<area>/**` to that area's journeys. Map shared roots (`runtime/connection-ui.tsx`, `prototype/model.js`, shell
CSS, the harness) to a small **smoke set** of one journey per area, not to the full set. Run the full set nightly and on main.
Size shards to the selected spec count. Set `verify` from non-browser paths only.

## 5. Delete candidates (with evidence)

| Candidate | Evidence it is not needed |
| --- | --- |
| `notes-named-review.spec.ts`, `notes-query-review.spec.ts` | Same three test titles as `notes-review.spec.ts`. They stitch stripped source (P4); `notes-review` loads the same modules through Vite. |
| `production-surface.spec.ts` test 1 ("ships no in-browser speech engine") | `engineFindings` is already run by `scripts/audit-production-bundle.ts:144` in the production webServer command (`playwright.config.ts:44`). |
| `native-speech.production.spec.ts` "Maps local speech adapter…" test (`:62-72`) | It evaluates hand-stripped source in the production lane and does not touch the bundle. |
| `chat-system-notices.spec.ts` first test | Identical title and journey in `chat-system-notices.production.spec.ts:18`. |
| 7 duplicated `chat-continuity.spec.ts` tests | Identical titles in `chat-continuity.production.spec.ts` (listed in P5). |
| `dev-wallet.spec.ts` | PRD AP-13: Wallet "removed from MVP". |
| `accessibility-audit.spec.ts` | Tests the helper, not the product (P14). |
| `mock-readiness.spec.ts`, `login-field-reporter.spec.ts`, `reading-sensitive.spec.ts` (native-snippet half) | Java text-block extraction (P4). They belong in instrumentation or upstream. |
| `adapters.spec.ts` plus 8 `scripts/test-*.ts` | A second harness (P16). Fold into specs or delete if covered by `journey-*`. |
| 40 "not e2e" specs in the appendix (for example `calendar-options`, `dock-clearance`, `photo-filter-fallback`, `domain-*`, `dev-digest-storage`, `simulator-concurrency`, `upstream-client-features`, `view-navigation`, `calendar-linked-storage`) | No user action; they assert module return values (P1). |
| 19 legacy/migration specs | PRD: no app-data migration. Delete them together with the product paths (owner decision). |
| `test.skip(project!=='production')` lines in 5 production specs | Unreachable: the project `testMatch` already restricts these files. |
| Unused exports | Confirmed with `git grep -w` over `test scripts`: `resident-stub.ts` `emailCode` (only its definition); `accessibility-states.ts` `INSTALLED_APPS_STATE` (no external user); `helpers/legacy-notes.ts` `selectLegacyNotesSource` (no external user); exported-but-only-internal types `FlagOffMessage/Calendar/Event/Options/Schedules`, `StubStream`, `StubMapsPlace`, `ResidentStubOptions`, `TelephonyFixture`, `CanonicalCalendarFixtureOptions`, `HomeCalendarEvent`, `Violation`, `PageAuditOptions` (drop `export`). |
| `calendar-fixture.ts` | Duplicate of `helpers/calendar-storage-hold.ts` (P18). |
| `firefox`/`webkit` projects and the `storage` job, plus `scripts/storage-specs.ts` | Engines the product does not ship. Owner decision. |

No helper file is entirely orphaned. Every root and `helpers/` file has at least one importer. I checked with `git grep -l` for each basename; the
lowest counts are `warm-dev-server.ts` (config only), `telephony-fixture.ts`, `helpers/one-calendar.ts`, `helpers/native-cloud-signin.ts`,
`helpers/native-cloud-plan-fixture.ts` and `helpers/cloud-connection-notices.ts`, with 1 user each.

## 6. Duplicated types and helpers (proposed single home)

| Concern | Locations | Proposed home |
| --- | --- | --- |
| Capacitor bridge fake | 49 specs inline, plus `flag-off-android.ts`, `resident-stub.ts`, `telephony-fixture.ts`, `device-apps-stub.ts`, `accessibility-states.ts:357`, `helpers/delivery-fixture.ts`, `helpers/native-cloud-plan-fixture.ts`, `helpers/native-cloud-signin.ts`, `helpers/photos-bridge.ts` | `test/browser/harness/bridge.ts` (typed handlers per plugin, derived `PluginHeaders`) |
| Launcher app-list stub | `device-apps-stub.ts:5-25` and `accessibility-states.ts:357-396` | `harness/plugins/launcher.ts` |
| Resident agent fake | `resident-stub.ts`, `helpers/resident-agent-plugin.ts`, plus the agent parts of `flag-off-android.ts` | `harness/plugins/agent.ts` |
| Eliza Cloud fake | `helpers/native-cloud-signin.ts`, `helpers/native-cloud-plan-fixture.ts`, `cloud-voice-fixture.ts`, `generic-cloud-speech-fixture.ts`, `cloud-notes-voice-fixture.ts` | `harness/cloud.ts` |
| Voice/speech ports | the 7 voice fixtures (P18) | `harness/plugins/voice.ts` |
| Calendar fixtures | the 9 calendar helpers (P18) | `harness/plugins/calendar.ts` plus `nav/calendar.ts` |
| IndexedDB transaction hold | `calendar-fixture.ts`, `helpers/calendar-storage-hold.ts` | `harness/storage.ts` |
| Connection seed (`kind:'offline'`) | 339 inline copies, plus `accessibility-states.ts:27`, `warm-dev-server.ts:17`, `device-apps-stub.ts:7` | `harness/app.ts` fixture option |
| Network fence / pageerror capture | 69 / 39 inline copies, plus `helpers/canonical-notes.ts:11-12`, `flag-off-android.ts` `fenceNetwork` | `harness/app.ts` auto-fixture |
| Contrast/luminance maths | `camera-overlay-contrast.spec.ts:8-12`, `map-label-contrast.spec.ts:14-15`, and `accessibility-audit.ts` | `harness/a11y.ts` only |
| Navigation | `app-navigation.ts`, `workflow-navigation.ts`, `inbox-draft-navigation.ts`, `scan-review-navigation.ts`, `helpers/browser-calendar.ts` `openBrowserCalendar`, `helpers/connection-diagnostics.ts` (backdoor) | `harness/nav.ts`, using visible UI only |
| Spec selection regex | `productionSpec` in `playwright.config.ts:10` **and** `scripts/ci/affected.ts:58` ("Must match"); the spec path regex in `run-browser.ts:8` and `affected.ts:59` | one exported constant, for example in `scripts/ci/browser-lanes.ts` |
| Window state | 3,316 `window as any` | `declare global { interface Window { __alphaTest: … } }` |

## 7. Structure and foldering

- **The flat directory holds 490 specs plus 22 root-level helpers next to a `helpers/` folder with 26 more.** The split is arbitrary
  (`flag-off-android.ts` and `resident-stub.ts` sit at the root; `helpers/native-cloud-signin.ts` sits in `helpers/`). Use
  `test/browser/<area>/*.journey.spec.ts` plus `test/browser/harness/**`.
- `scripts/storage-specs.ts` is test configuration that lives in `scripts/`. It should live next to `playwright.config.ts`, or be deleted along with the storage lanes.
- `warm-dev-server.ts` sits among the specs. Move it to `harness/global-setup.ts`.
- **Misleading names.**
  - `dev-*` means "runs on the dev build", not "tests developer tooling", and many `dev-*` specs are core journeys (`dev-inbox`,
    `dev-calendar-series`).
  - `journey-*` sits beside non-journeys.
  - `canonical-*` against `legacy-*` describes data sources, not journeys.
  - `mvp.spec.ts` is a grab bag of Notes, mock mode, theme and digest panel.
- **Monoliths to split by journey.**
  - `journey-core-loops.production.spec.ts` (931 lines, 71 KB, 17 tests across loops A–J05)
  - `native-cloud-subscription.spec.ts` (46 tests)
  - `accessibility-resilience.spec.ts` (30 tests across camera, maps, browser, notes, toast and dock)
  - `standalone-shell.spec.ts` (33 tests)
  - `gmail-mvp-scope.spec.ts` (216 locator calls)
- **Tiny files to merge.** The 125 single-test specs (P9).
- **Code style.** Minified one-line test bodies (`storage-usage.spec.ts:4` is one 600-character line) make review and diffs hard. Format test code
  with the repo formatter.

## 8. Worst offenders

1. `flag-off-android.ts`: a 47 KB bridge fake that is also a DSL; it is the hub of the duplicated bridge layer (P6).
2. `accessibility-audit.ts` and `accessibility-audit.spec.ts`: an 806-line home-grown axe plus 14 tests of the helper (P14).
3. `chat-continuity.spec.ts`: 7 tests duplicated in `.production`; uses the `remote` pairing kind (P5, P8).
4. `journey-core-loops.production.spec.ts`: a 71 KB monolith; it should be the backbone, but needs splitting per loop.
5. `native-cloud-subscription.spec.ts`: 46 tests in 58 KB; it is a state matrix rather than journeys.
6. `notes-named-review.spec.ts` and `notes-query-review.spec.ts`: stitched source, exact duplicates (P4).
7. `native-speech.production.spec.ts`: source stitching inside the production lane (P4).
8. `conversation-selection-storage.spec.ts`: 35 `/src` imports in a 3-browser storage spec (P1).
9. `dev-location.spec.ts`: 33 imports and 20 tests of simulated location (P7).
10. `dev-workflow-executor.spec.ts`: 31 imports and 20 tests of executor internals (P1, P7).
11. `home-daily-overview.spec.ts`: 33 imports, `clock.install` plus sleeps (P10), and a production twin.
12. `dev-clock.spec.ts`: 30 imports, repeated `setFixedTime` jumps and absence-by-sleep (P10).
13. `calendar-linked-storage.spec.ts`: 0 UI actions, runs on 3 engines (P1).
14. `adapters.spec.ts`: a wrapper around 8 Playwright scripts (P16).
15. `production-surface.spec.ts`: duplicate bundle scan; 3 inline bridges in one file (P4, P6).
16. `accessibility-states.ts`: duplicated launcher bridge; state catalogue mixing four connection modes (P6).
17. `resident-stub.ts` with `helpers/resident-agent-plugin.ts`: two resident-agent fakes (P18).
18. `helpers/connection-diagnostics.ts`: the backdoor `connectionController.open()` used by 69 files (P2).
19. `helpers/legacy-notes.ts` and `helpers/browser-calendar.ts`: route 110 specs through legacy data sources (P8).
20. `scripts/ci/affected.ts`: app changes mean everything, helper changes mean everything, spec changes trigger 90-minute verify (§4).
21. `.github/workflows/browser.yml`: 6 fixed shards; Quint and the test-mocks audit run inside the browser production job; an artifact export nobody downloads.
22. `scripts/ci/export-browser-proof.ts`: a 139-line hardened exporter for artifacts without an in-repo consumer (owner to confirm).
23. `dev-parity.spec.ts`, `dev-sensors.spec.ts`, `simulator-concurrency.spec.ts`: they test the browser stand-ins (P7).
24. `reminder-v2-assistant.spec.ts`: a loop-generated legacy v1/v2 timing matrix with 12 imports.
25. `calendar-backup-restore.spec.ts`: 10 tests on 3 engines for a "backup" that the PRD says does not exist.

## 9. Target e2e suite (proposal)

**Principle.** Each spec is a user journey through visible UI, run against the **production (flag-off) bundle** with one typed
bridge harness. That is the only build that ships. The dev lane keeps only what needs developer surfaces. Accessibility and layout are checked
*inside* journeys by `expectAccessible(page)` at key screens, plus one sweep spec. No spec imports `/src`.

### Shared harness: `test/browser/harness/`
- `app.ts` provides a `test.extend` with fixtures:
  - `app({build, shell:'standalone'|'launcher', connection:'offline'|'resident'|'cloud', theme, textScale, viewport, time})`
    boots the page, seeds the connection, installs the bridge, fences non-local network, fails on `pageerror` and installs `page.clock` when `time` is given.
  - `seed` writes initial records through the bridge (notes, calendar rows, mail).
- `bridge.ts` has one typed Capacitor fake: `installBridge(page, {Agent, ElizaSystem, DailyApps, AlphaConnection, AlphaFiles, AlphaCalendar,
  AlphaNotifications, AlphaVoiceCloud, …})`. Handlers are typed from the product plugin interfaces. Calls are recorded in `window.__alphaTest.calls`.
- `plugins/*.ts`: `agent` (the merged resident-stub and resident-agent-plugin), `cloud`, `calendar`, `mail`, `voice`, `launcher`, `telephony`,
  `photos`.
- `nav.ts`: `openApp(name)`, `goHome()`, `back()`, `openSettings(path)`, `openChat()`, all through roles.
- `a11y.ts`: axe plus about 3 product rules (dock overlap, reading order, text clipping at 200/300%).
- `time.ts`: `advance(ms)` and `expectNothingFor(ms)` built on `clock.runFor`.
- `global-setup.ts`: builds the production bundle once.

### Journey specs per area (about 35 files, against today's 490)
| Area | Journey specs |
| --- | --- |
| Shell / Home | `shell/standalone.journey` (Home, app library, HOME/Back, dock, toast, render-error recovery); `shell/launcher.journey` (installed apps, default apps, launcher Home swipe); `shell/home-overview.journey` (daily overview, attention, brief: empty, error and fresh states) |
| Onboarding / account | `account/sign-in.journey` (gate, email code, cancel, expiry, saved sign-in retry); `account/access-setup.journey` (post-sign-in steps, permissions walkthrough); `account/subscription.journey` (plan, billing recovery, replacement account); `account/own-provider.journey` (keys, reconnect, local provider) |
| Settings | `settings/settings.journey` (truthful state, device facts, privacy per connection, appearance, location recovery, reset private data) |
| Chat / assistant | `chat/conversation.journey` (send, stream, Stop, double-send, notices, restart recovery, draft continuity across HOME, Back and rotation); `chat/context.journey` (all-view context, selected content and documents, message actions, reply edit) |
| Voice | `voice/dictation.journey`; `voice/conversation.journey` (route preference Cloud/local fallback, barge-in, stop speaking, listener invocation) |
| Resident agent | `agent/core-loops.journey` (split of `journey-core-loops` loops A, C, D/F, J05 on Android); `agent/failures.journey` (first run, failures, recovery, background results) |
| Mail | `mail/inbox.journey` (read, folders, images, hostile attachment, pagination F-12); `mail/compose-send.journey` (draft recovery, reviewed send F-5/F-10, trash/undo F-13, Gmail grant recovery); `mail/use-in-email.journey` (reply from conversation, photo/file → email) |
| Calendar | `calendar/events.journey` (create/edit/delete with review, all-day/zone/repeat, drafts survive resize and reload); `calendar/agent-and-sync.journey` (Agent Calendar, Google link, sync settings, approval queue, availability) |
| Clock / reminders | `clock/alarms-reminders.journey` (journey C, reminder create/snooze/complete review, notice taps, timing review) |
| Notes | `notes/notes.journey` (canonical CRUD, checklist, read aloud, permission recovery); `notes/trash.journey` (3-day Trash, permanent delete, undo); `notes/voice-and-sources.journey` (journey B, web/summary source notes, note→calendar handoff) |
| Files / scan | `files/files.journey` (import, preview media, bulk, sort, storage usage, save attachment); `files/scan.journey` (page camera, edges, OCR, searchable PDF, J01 poster to event, J03 document analysis) |
| Browser | `browser/browsing.journey` (tabs, private tab, external handoff, find, copy link, paste fallback, journey E); `browser/reading.journey` (reviewed reading, sensitive refusal, J05 research note); `browser/passwords.journey` (provider setup, saved sign-ins) |
| Photos / camera / video | `media/camera.journey`; `media/photos.journey` (permitted library, albums, batch, edit, share, delete); `media/video.journey` |
| Maps | `maps/maps.journey` (search, route alternatives, nav start/stop, attribution, unavailable, event return J04) |
| Workflows / digests | `workflows/authoring.journey`; `workflows/runs.journey` (approvals, receipts, missed run, interruption recovery, notices and taps); `digests/digests.journey` (journey D, schedules, sources renewal) |
| Telephony (AOSP renderer) | `telephony/phone-sms-contacts.journey` (only if the AOSP renderer paths stay in this repo) |
| Cross-cutting | `a11y/sweep.journey` (state catalogue × theme × text scale × landscape, both builds via a project parameter); `platform/production-surface` (flags, CSP, no dev surfaces); `platform/dev-surface.smoke` (mock mode, fixture images, device controls, no sign-in gate in dev) |
| Live (manual) | keep the 4 `*.local.spec.ts` unchanged |

### CI shape
- **PR runs:**
  - area-selected journeys on the production bundle, 1–3 shards sized to the selection;
  - the dev smoke;
  - the a11y sweep only for UI-shell, CSS or component changes.
- **Nightly and main:** the full suite.
- **Delete** the firefox/webkit lanes (owner decision) and the extra speech-profile step (fold it into the harness profile option).
- **Move** Quint composition and the test-mocks bundle audit out of the browser production job into `verify`.
- **Expected effect** (an estimate, not measured): about 35 journey files with roughly 300–400 tests, against ~2,300+ cases today. That is under 30 runner-minutes per typical
  single-area PR, against ~190 today.

## 10. Open questions and risks

1. Should the browser stand-ins in `apps/app/src/browser/*` (dev simulator) keep any test coverage? If they stay as developer tools, keep
   only a smoke. If they are product web fallbacks, which ones?
2. Legacy data paths (Previous notes, retained calendar source, the 19 migration specs, `calendar-backup-restore`, the `remote` pairing kind): delete
   them in the product first? The PRD says no migration, no backup and no hosted pairing.
3. Firefox/WebKit storage qualification: is any non-Chromium engine a target? The product ships only in Android WebView.
4. A11y engine: adopt axe-core (a new dependency), or keep the custom engine and test it outside e2e?
5. `export-browser-proof.ts` and the `browser-proof-*` artifacts: is there an external consumer? None was found in the repo.
6. Quint trace capture inside 3 UI specs (`check-traces.mjs`): does the formal lane need these traces? If so, move it to `specs/quint`.
7. Telephony/AOSP renderer specs: do they belong in this repo's browser lane, or only in AOSP image qualification?
8. Risk: deleting P1 and P3 specs removes the only browser-side coverage of several storage races (compare-and-swap, concurrent tabs). Decide per race
   whether a Node integration test against `fake-indexeddb` replaces it, or whether the race matters on Android at all.
9. Risk: I could not run `--list` for chromium in this worktree (it fails on the missing `.eliza` projection, P15), so chromium case counts are
   static estimates (2,107 `test(` call sites, about 1.7× after loops).

---

## Appendix A. Every spec: project, area, journey, verdict

Columns:
- **Spec**: file name without `.spec.ts`.
- **Project(s)**: `chromium`, `production` or `live`, with `+ firefox/webkit` when listed in `scripts/storage-specs.ts`.
- **Journey it proves**: the first test title (template parts shown as `…`).
- **Tests**: static `test(` count; `+loop` means it is generated in a loop.
- **Signals**: `sN` in-page `/src` imports, `rN` locator calls, `clk` page.clock, `wN` sleeps.
- **Verdict**: `merge into <area>.journey` means keep the distinctive user-visible assertions as steps or cases in the target
  journey (§9) and drop the rest as duplicate coverage.

| Spec | Project(s) | Area | Journey it proves (first test) | Tests | Signals | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| accessibility-audit | chromium | A11y / Layout | names and focusability come from the accessibility tree | 14 | s0 r0 | not e2e: unit tests of the test helper accessibility-audit.ts (setContent fixtures) → delete with helper if replaced by axe; else move to a helper self-test outside the e2e lane |
| accessibility-lifecycle | chromium | A11y / Layout | …: focus lands on the screen's name, and HOME three times returns to an accessible Home | 8 | s0 r15 w1 | merge into a11y-layout.journey |
| accessibility-resilience | chromium | A11y / Layout | every capture control is on screen and usable (…) | 30+loop | s1 r96 | merge into a11y-layout.journey |
| accessibility-sign-in.production | production | Account / Cloud / Connection | the signed-out Cloud chooser stays usable after the resident fails to start | 4+loop | s0 r4 w2 | merge into account.journey |
| accessibility-sweep.production | production | A11y / Layout | production names, roles, focus, contrast and clipping: … | 2 | s0 r10 | merge into accessibility-sweep (parametrise by project) |
| accessibility-sweep | chromium | A11y / Layout | names, roles, focus and contrast: … (…) | 11 | s0 r5 clk | keep as basis of a11y-layout.journey; run same state list in both builds instead of two files |
| adapters | chromium | Shell / Home / Platform | rendered adapter: … | 1 | s0 r0 | not e2e wrapper: inline the 8 scripts/test-*.ts as Playwright specs (or delete duplicates) and drop the wrapper |
| agent-camera-capture | chromium | Photos / Camera / Video | Home camera request: … | 1+loop | s2 r10 | merge into media.journey |
| agent-clock-handoff | chromium | Reminders / Clock | agent Clock handoff: … | 2 | s14 r31 w1 | merge into clock-reminders.journey |
| agent-conversation-migration | chromium | Chat / Assistant | reading an empty development profile creates no saved history | 8 | s16 r11 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| album-storage-migration | chromium + firefox/webkit | Photos / Camera / Video | two tabs retain all concurrently created albums across reload | 5 | s10 r11 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| all-view-context.production | production | Resident agent (prod) | each enabled view supplies its own context to the resident agent, and no secret is sent | 3 | s0 r7 | merge into resident-core-loops.production |
| aosp-contacts | chromium | Telephony (AOSP) | ordinary APK presentation never admits Contacts or prompts permission | 3 | s0 r11 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| aosp-phone | chromium | Telephony (AOSP) | standalone exposes no Phone route, call prompt or telephony request | 2 | s0 r4 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| aosp-telephony-views | chromium | Telephony (AOSP) | Home shows one Messages card and one Phone card and keeps no telephony content | 13 | s1 r35 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| appearance-storage | chromium + firefox/webkit | Settings / Device | tabs follow saved appearance without echoing writes | 8+loop | s0 r6 | merge into storage-contract spec (cross-browser lane) — 0 /src imports |
| assistant-draft-recovery | chromium | Chat / Assistant | an unsent multiline draft survives reload and clearing stays cleared | 7+loop | s14 r11 | merge into chat.journey |
| assistant-draft-review | chromium | Chat / Assistant | long assistant draft stays editable and bounded: … … | 2+loop | s2 r6 | merge into chat.journey (tiny: 2 tests) |
| assistant-draft-storage | chromium + firefox/webkit | Chat / Assistant | draft text survives restart and remains isolated by full binding | 8+loop | s12 r5 | merge into storage-contract spec (cross-browser lane) — 12 /src imports |
| assistant-surface-close | chromium | Chat / Assistant | Go Home closes the assistant window | 4 | s0 r6 | merge into chat.journey |
| attachment-accessibility | chromium | Mail / Inbox | attachment stays readable and dismissible: … … | 1+loop | s2 r3 | merge into mail.journey (tiny: 1 test) |
| attachment-lifecycle | chromium | Mail / Inbox | shell Back releases a reviewed attachment and its object URL | 2 | s2 r1 | not e2e (module-in-page: 2 /src imports, no user action) → node integration or delete |
| billing-recovery.production | production | Account / Cloud / Connection | an account without a subscription is told why nothing was sent and gets the one Subscription popup back | 8 | s0 r44 w3 | merge into account.journey |
| browser-agent-playback.local | live | Browser app | first host speech request plays without a readiness probe | 1 | s2 r0 | keep (manual live lane) |
| browser-agent-tts | chromium | Voice / Speech | local agent TTS rejects … without browser voice fallback | 3+loop | s3 r0 | not e2e (module-in-page: 3 /src imports, no user action) → node integration or delete |
| browser-audio | chromium | Voice / Speech | browser voice encodes audio, reviews a transcript, persists audio and reloads it | 5 | s10 r2 w1 | merge into voice.journey |
| browser-camera | chromium | Photos / Camera / Video | browser camera persists a real encoded frame, releases capture and restores Photos after reload | 3 | s3 r28 | merge into media.journey |
| browser-chat-overlay | chromium | Browser app | pulling, opening and expanding the chat sheet leaves the website under it untouched | 2 | s0 r10 w4 | merge into browser.journey |
| browser-cloud-bootstrap | chromium | Browser app | empty optional DEV Cloud credential leaves Home usable without choosing or signing in | 4 | s6 r3 | not e2e (module-in-page: 6 /src imports, no user action) → node integration or delete |
| browser-cloud-dev | chromium | Browser app | browser restores an existing host Cloud account, uses canonical voice and preserves explicit logout | 2 | s22 r18 | merge into browser.journey |
| browser-copy-link | chromium | Browser app | Copy link follows committed Back navigation rather than the address draft | 4+loop | s0 r28 | merge into browser.journey |
| browser-credential-cas | chromium | Browser app | encrypted credential CAS fences concurrent renderer instances even without Web Locks | 4 | s7 r0 | not e2e (module-in-page: 7 /src imports, no user action) → node integration or delete |
| browser-external-handoff.production | production | Browser app | a normal page opens in another browser from the menu | 2 | s0 r6 | merge into browser.journey |
| browser-external-handoff | chromium | Browser app | private cancellation restores the native surface without handing off | 4 | s2 r7 | merge with .production (complementary cases) into browser.journey |
| browser-foreground | chromium | Browser app | powered-off browser hides workflow notifications and rejects their actions until unlock | 1 | s3 r7 | merge into browser.journey (tiny: 1 test) |
| browser-host-disclosure | chromium | Browser app | connected browser host preserves its privacy contract and resident memory status | 1 | s5 r11 | merge into browser.journey (tiny: 1 test) |
| browser-list-focus | chromium | Browser app | closing an earlier tab preserves the focused tab and its activation identity | 2 | s1 r14 | merge into browser.journey |
| browser-navigation | chromium | Browser app | stopped loads and retired frame callbacks cannot commit or share an old address | 7+loop | s14 r32 | merge into browser.journey |
| browser-paste-fallback.production | production | Browser app | an unreadable page opens the review with an empty excerpt; pasting enables Continue | 2 | s0 r9 | merge into browser.journey |
| browser-photo-edit | chromium + firefox/webkit | Photos / Camera / Video | browser photo rotation, crop and filter save a distinct copy with unchanged original pixels | 12+loop | s21 r60 | merge into media.journey |
| browser-profile-unsupported.production | production | Browser app | Browser … …px | 2+loop | s0 r10 w1 | merge into browser.journey (tiny: 2 tests) |
| browser-reminder-edit-recovery | chromium + firefox/webkit | Reminders / Clock | stale rendered schedule must not overwrite a newer canonical edit | 8+loop | s28 r41 clk | merge into clock-reminders.journey |
| browser-reminder-recurrence | chromium | Reminders / Clock | browser reminder repeats in its saved zone after reload and rejects old decisions | 5 | s18 r27 clk w1 | merge into clock-reminders.journey |
| browser-secret-retirement | chromium | Browser app | a failed IndexedDB read or removal never reports a temporary sign-out and can retry the durable slot | 1 | s1 r0 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| browser-signins | chromium | Browser app | normal tabs and history survive a cold start and the selected tab reloads its page | 9 | s10 r58 w1 | merge into browser.journey |
| browser-speech | chromium | Voice / Speech | without a local agent, local speech is unavailable and no engine, model or worker is loaded | 9+loop | s6 r19 | merge into voice.journey |
| browser-video | chromium | Photos / Camera / Video | video records microphone audio, saves exactly once and decodes after reload (cleared MIME: …) | 8+loop | s12 r18 | merge into media.journey |
| browser-voice-registration | chromium | Voice / Speech | loading browser voice preserves the launcher bridge, system and hosted result factories | 3 | s7 r3 | merge into voice.journey |
| browser-web-find.production | production | Browser app | the web Browser menu offers no Find in page and shows no "not implemented" toast | 1 | s0 r13 w1 | merge into browser.journey (tiny: 1 test) |
| calendar-accessibility | chromium | Calendar | calendar detail keeps long text readable: … … | 7+loop | s10 r47 clk | merge into calendar.journey |
| calendar-agent-all-day-review | chromium | Calendar | an all-day update is reviewed as the dates and attendees that are saved, and instants that are not whole da… | 1 | s2 r3 | merge into calendar.journey (tiny: 1 test) |
| calendar-agent-transaction-cancel | chromium | Calendar | agent cancellation after preparation prevents a Calendar commit and receipt | 1 | s3 r2 | merge into calendar.journey (tiny: 1 test) |
| calendar-approval-queue | chromium | Calendar | Calendar queue review is readable and retains explicit controls: … | 1+loop | s3 r4 | merge into calendar.journey (tiny: 1 test) |
| calendar-availability | chromium | Calendar | foreground Calendar availability: … | 2 | s3 r28 | merge into calendar.journey |
| calendar-backup-restore | chromium + firefox/webkit | Calendar | file selection and review do not write; confirmation restores events without replaying alerts | 10 | s4 r63 | merge into calendar.journey |
| calendar-creation-recovery | chromium | Calendar | committed creation response loss survives reload and recovers receipt without replay | 10+loop | s18 r32 w3 | merge into calendar.journey |
| calendar-delete-completion | chromium | Calendar | late Calendar deletion preserves newer … | 1+loop | s3 r13 clk | merge into calendar.journey (tiny: 1 test) |
| calendar-delete-review | chromium | Calendar | Cancel, Escape and system Back delete nothing; Delete removes exactly the reviewed event | 3 | s4 r19 clk | merge into calendar.journey |
| calendar-edit-draft | chromium + firefox/webkit | Calendar | … edits survive reload and save to their existing item | 6+loop | s12 r33 clk | merge into calendar.journey |
| calendar-end-after-start | chromium | Calendar | rendered End controls cannot reach the start, and the shortest form still saves with end after start | 1 | s1 r5 clk | merge into calendar.journey (tiny: 1 test) |
| calendar-form-controls | chromium | Calendar | day chips reach a month ahead, keep Today one tap away and mark the chosen day | 6 | s0 r37 clk | merge into calendar.journey |
| calendar-form-draft | chromium + firefox/webkit | Calendar | … creation form survives reload without creating an item | 13+loop | s11 r77 clk | merge into calendar.journey |
| calendar-linked-storage | chromium + firefox/webkit | Calendar | an uncertain Calendar sync checkpoint survives a full browser reload | 5 | s16 r0 | not e2e (module-in-page: 16 /src imports, no user action) → node integration or delete |
| calendar-maps-handoff | chromium | Maps | event address searches once, preserves result choice and returns to the same event | 4 | s3 r26 | merge into maps.journey |
| calendar-modal-draft | chromium + firefox/webkit | Calendar | all-day recurring editor restores fields and saves only the existing event | 7 | s7 r40 | merge into calendar.journey |
| calendar-month-focus | chromium | Calendar | month picker owns keyboard focus … … | 1+loop | s0 r19 | merge into calendar.journey (tiny: 1 test) |
| calendar-options | chromium | Calendar | all-day, zoned and repeating forms map to exact provider fields | 1 | s1 r0 | not e2e: pure function table (calendar-adapter.ts) → node unit/integration or delete |
| calendar-proposal-review.production | production | Calendar | Android: the proposal card states time zone, calendar and attendees, and Approve hands over exactly the rev… | 3 | s0 r15 w1 | merge into calendar.journey |
| calendar-recovery | chromium + firefox/webkit | Calendar | backup preserves damaged bytes and reviewed reset restores an empty usable calendar | 7 | s7 r29 | merge into calendar.journey |
| calendar-save-completion | chromium | Calendar | edited event refresh waits for React completion and preserves … | 1+loop | s2 r13 | merge into calendar.journey (tiny: 1 test) |
| calendar-storage-migration | chromium + firefox/webkit | Calendar | legacy import preserves exact bytes, then reload uses the committed document | 8+loop | s20 r7 w1 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| calendar-sync-settings | chromium + firefox/webkit | Calendar | Settings reviews the destination before opt-in, then explicitly syncs actual local data in both directions | 5+loop | s7 r35 | merge into calendar.journey |
| calendar-transaction-cancel | chromium | Calendar | closing … editor after preparation cancels the pending transaction | 1+loop | s4 r5 | merge into calendar.journey (tiny: 1 test) |
| calendar-wide-days | chromium | Calendar | Calendar leads with the previous day, opens overnight segments as the original event and lists the day at l… | 1 | s2 r12 clk | merge into calendar.journey (tiny: 1 test) |
| camera-controls | chromium | Photos / Camera / Video | digital zoom changes saved pixels and preserves front-camera mirroring | 9 | s10 r32 | merge into media.journey |
| camera-media.production | production | Photos / Camera / Video | a camera capture persists and Ask Alpha attaches it locally without the development profile | 2 | s0 r35 | merge into media.journey |
| camera-overlay-contrast | chromium | Photos / Camera / Video | camera text has contrast over a white feed: … | 1+loop | s0 r0 | merge into a11y-layout sweep (contrast rule already exists in accessibility-audit.ts) |
| camera-tools-layout | chromium | Photos / Camera / Video | Camera controls stay reachable at …x… | 1 | s0 r3 | merge into media.journey (tiny: 1 test) |
| canonical-calendar-form-review | chromium | Calendar | canonical spring detail and editor show both real clocks and the current guests | 3 | s0 r15 clk | merge into calendar.journey |
| canonical-icons | chromium | A11y / Layout | canonical launcher, dock and Files assets: … | 3+loop | s0 r16 | merge into a11y-layout.journey |
| canonical-notes-checklist-labels | chromium | Notes | blank checklist actions have object labels while exact text and row editing are preserved | 1 | s0 r8 | merge into notes.journey (tiny: 1 test) |
| canonical-notes-design | chromium | Notes | live agent Notes use the mock-mode Notes design with typed cards | 4 | s0 r49 | merge into notes.journey |
| canonical-notes-draft-copy | chromium | Notes | a failed canonical save offers Copy draft and retains the exact edit through clipboard refusal and success | 1 | s0 r6 | merge into notes.journey (tiny: 1 test) |
| canonical-notes | chromium | Notes | canonical Trash dates the deletion and requires a fresh review after its selected entry changes | 21+loop | s12 r151 clk w1 | keep as basis of notes.journey |
| chat-continuity.production | production | Chat / Assistant | the device draft survives HOME, Back, a keyboard resize and rotation with its selection, and a restart, and… | 13 | s0 r37 clk | keep as basis of chat.journey |
| chat-continuity | chromium | Chat / Assistant | a restart while a message is in flight offers it for review, never as a draft, and posts nothing | 26+loop | s13 r83 w8 | merge into chat-continuity.production (7 tests share identical titles; keep only remote-agent-specific cases if the remote kind survives) |
| chat-decline.production | production | Chat / Assistant | a proposal is declined from its chat card and the agent records the rejection | 2 | s0 r12 | merge into chat.journey |
| chat-dictation-api | chromium | Voice / Speech | API dictation: Transcribe stops into editable local text and appends only to the unsent draft | 7 | s3 r21 w1 | merge into voice.journey |
| chat-header-home | chromium | Chat / Assistant | actual chat header goes Home preserving … and original foreground cancellation | 3+loop | s3 r8 | merge into chat.journey |
| chat-message-polish | chromium | Chat / Assistant | Copy is visually quiet, accessible and does not move actions: … | 3+loop | s2 r9 | merge into chat.journey |
| chat-reply-announcement | chromium | Chat / Assistant | a streamed reply is announced as replying, then once when it settles | 2 | s2 r6 w3 | merge into chat.journey (tiny: 2 tests) |
| chat-system-notices.production | production | Chat / Assistant | notices after an unanswered message collapse to one owner-facing notice, which a later reply retires | 1 | s0 r7 | merge into chat.journey |
| chat-system-notices | chromium | Chat / Assistant | notices after an unanswered message collapse to one owner-facing notice, which a later reply retires | 2 | s0 r7 | delete duplicate case (identical title in .production); keep the combined-notice case in chat.journey |
| chat-voice-mode | chromium | Voice / Speech | unsigned chat voice stays in Home and can stop without opening the microphone | 11+loop | s11 r53 w1 | merge into voice.journey |
| clock-dialog-accessibility | chromium | Reminders / Clock | … Clock review owns focus and leaves no hidden modal on Home | 2+loop | s2 r30 clk | merge into clock-reminders.journey (tiny: 2 tests) |
| clock-repeat.production | production | Reminders / Clock | clockRepeatDaysVersion …: Mon to Fri is reviewed as repeating weekdays and sent as one handoff with days [2… | 2+loop | s0 r21 | merge into clock-reminders.journey |
| cloud-account-migration | chromium + firefox/webkit | Account / Cloud / Connection | empty account hydration leaves no document and an explicit signed-out identity | 10 | s21 r6 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| cloud-account-panel | chromium | Account / Cloud / Connection | Inbox opens focused account sign-in directly, without agent hosting or requests | 4 | s6 r22 | merge into account.journey |
| cloud-account-replacement.production | production | Account / Cloud / Connection | signing out of account A and into account B stops the resident before A is revoked and uses only B afterwards | 2 | s0 r11 | merge into account.journey |
| cloud-personal-intent-storage | chromium | Account / Cloud / Connection | empty personal setup reads do not initialize an intent | 9 | s3 r4 | merge into storage-contract spec (cross-browser lane) — 3 /src imports |
| cloud-personal-onboarding | chromium | Account / Cloud / Connection | personal Cloud setup: … | 2 | s10 r59 | merge into account.journey |
| cloud-setup-migration | chromium | Account / Cloud / Connection | reading an empty setup leaves its recovery revision unclaimed | 7 | s4 r9 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| cloud-tts-latency.local | live | Voice / Speech | Cloud TTS measures three identical phrases without a model or recording | 1 | s2 r0 | keep (manual live lane) |
| cloud-tts-streaming | chromium | Voice / Speech | Cloud read-aloud plays its first frames before the agent finishes sending the clip | 6 | s6 r0 w1 | not e2e (module-in-page: 6 /src imports, no user action) → node integration or delete |
| cloud-voice-live.local | live | Voice / Speech | real Cloud voice records admission, transcription, navigation and playback latency | 1 | s1 r7 | keep (manual live lane) |
| compact-viewport | chromium | A11y / Layout | Notes remains editable and navigable at …x… | 4+loop | s0 r26 | merge into a11y-layout.journey |
| composer-dispatch | chromium | Chat / Assistant | without a connection the chooser opens and the message returns to the composer | 3 | s2 r7 clk | merge into chat.journey |
| composer-send-focus | chromium | Chat / Assistant | Send preserves composer focus … … | 5+loop | s4 r12 | merge into chat.journey |
| confidentiality-claims | chromium | Chat / Assistant | visible … … has no unverified confidentiality claim | 3+loop | s0 r6 w1 | merge into chat.journey |
| connection-activity-presentation | chromium | Account / Cloud / Connection | Activity presents recorded phone actions in plain language with reconcile controls | 1 | s0 r8 | merge into account.journey |
| connection-boundaries.production | production | Account / Cloud / Connection | production Android never pairs or restores a saved … and keeps its credential | 11 | s0 r57 w1 | merge into account.journey |
| connection-preference-storage | chromium + firefox/webkit | Account / Cloud / Connection | normal browser … change cancels delayed identity without adopting it | 2+loop | s7 r1 | not e2e (module-in-page: 7 /src imports, no user action) → node integration or delete |
| connection-startup-presentation | chromium | Account / Cloud / Connection | saved development connection restores without flashing a chooser; explicit settings remain available | 2 | s2 r6 | merge into account.journey (tiny: 2 tests) |
| connection.production | production | Account / Cloud / Connection | local-only product does not reconnect … | 1+loop | s0 r5 | merge into account.journey (tiny: 1 test) |
| content-review-layout | chromium | Chat / Assistant | … … review remains usable at 150 percent text and compact height | 1+loop | s3 r6 | merge into chat.journey (tiny: 1 test) |
| context-selection | chromium | Chat / Assistant | only own notifications offer a question, and the reviewed text is what reaches the draft | 14 | s17 r71 clk w1 | merge into chat.journey |
| conversation-selection-storage | chromium + firefox/webkit | Chat / Assistant | empty selection does not initialize storage | 15+loop | s35 r18 | merge into storage-contract spec (cross-browser lane) — 35 /src imports |
| design | chromium | A11y / Layout | design …: … states render without errors | 2+loop | s0 r4 | merge into a11y-layout.journey or delete (mock-mode visual) |
| dev-calendar-alert-boundaries | chromium | Calendar | all-day alert starts at the local civil date and dismisses durably | 2 | s9 r4 clk | merge into calendar.journey; drop module-in-page cases (9 /src imports vs 4 role queries) |
| dev-calendar-alerts | chromium | Calendar | rendered Calendar alert becomes due and opens the exact event from the shade | 5 | s15 r14 clk | merge into calendar.journey; drop module-in-page cases (15 /src imports vs 14 role queries) |
| dev-calendar-all-day-save | chromium | Calendar | provider saves … all-day events as exact UTC civil boundaries | 2+loop | s5 r9 clk | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-assistant | chromium | Calendar | browser assistant Calendar action: … | 1 | s6 r15 clk | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-conversion | chromium | Calendar | timed to all-day uses the displayed civil day and preserves content across reload | 4 | s3 r26 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-cross-tab | chromium | Calendar | another browser tab changing the series prevents a stale occurrence editor from saving | 1 | s5 r7 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-editor | chromium | Calendar | browser complex Calendar editor preserves … dates | 2+loop | s7 r15 clk | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-guests | chromium | Calendar | complex editor saves guests, prunes removed responses, and persists meeting and alert controls | 4 | s8 r20 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-meeting-lifecycle | chromium | Calendar | meeting … retires owned media and discloses the local-only preview | 3+loop | s8 r22 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-meeting | chromium | Calendar | Calendar attendees and video option persist through rendered creation, editing and reload | 4 | s6 r31 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-navigation | chromium | Calendar | browser Calendar opens the exact … event | 4+loop | s6 r11 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-preferences | chromium | Calendar | month dialog closes and restores the toggle for pointer and keyboard at large text: … | 1+loop | s1 r6 clk | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-recurring-assistant | chromium | Calendar | browser assistant recurring Calendar action: … | 1 | s11 r14 clk | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-response | chromium | Calendar | rendered guest responses persist and clear through … editing | 3+loop | s10 r30 | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-calendar-series | chromium | Calendar | rendered daily series creates, edits and deletes one occurrence while retaining the others | 6 | s14 r35 clk | merge into calendar.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-camera-focus | chromium | Photos / Camera / Video | rendered focus selects viewfinder coordinates and clears on camera replacement and Home | 7 | s5 r3 | merge into media.journey; drop module-in-page cases (5 /src imports vs 3 role queries) |
| dev-camera-light | chromium | Photos / Camera / Video | dev screen lighting works without torch capability and never filters saved pixels | 3+loop | s2 r10 | merge into media.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-clock | chromium | Reminders / Clock | browser Clock sets, lists, reloads and deletes an alarm through rendered controls | 12 | s30 r59 clk w3 | merge into clock-reminders.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-cloud-identity | chromium | Account / Cloud / Connection | sample Cloud accounts isolate conversations and proposals and retire on account changes | 3 | s11 r23 | merge into account.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-cloud-scenarios | chromium | Account / Cloud / Connection | existing Dedicated adoption completes through the shared review | 4 | s2 r26 | merge into account.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-cloud-setup | chromium | Account / Cloud / Connection | development Cloud review completes locally and connects the chat consumer | 5 | s4 r36 | merge into account.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-connected-voice | chromium | Voice / Speech | … keeps the explicit Cloud-only voice policy | 1+loop | s1 r3 | not e2e (module-in-page: 1 /src imports, no user action) → node integration or delete |
| dev-connection-actions | chromium | Account / Cloud / Connection | queued development action executes once only after review and preserves its receipt on reload | 14+loop | s34 r88 clk w1 | merge into account.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-connection-pagehide | chromium | Account / Cloud / Connection | departing development connection stops rendering until page restoration | 1 | s0 r5 | not e2e (module-in-page: 0 /src imports, no user action) → node integration or delete |
| dev-connection-setup | chromium | Account / Cloud / Connection | … development setup saves a reply, chats, reloads and restores history | 6+loop | s5 r35 | merge into account.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-contacts | chromium | Telephony (AOSP) | contact create, edit, favorite, delete and undo retain exact fields through reload | 5 | s1 r30 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-content-question | chromium | Chat / Assistant | selected file question reviews exact text and composes without sending | 2 | s6 r20 | merge into chat.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-controls-accessibility | chromium | Settings / Device | device tools remain readable and reachable: … …% …px | 3+loop | s1 r17 | merge into settings.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-digest-delegation | chromium | Digests / Brief | local authorization review survives reload and revocation disables its sources | 5 | s14 r47 clk | merge into digests.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-digest-live | chromium | Digests / Brief | reviewed live … reads fresh bounded browser data | 3+loop | s11 r20 clk | merge into digests.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-digest-schedule | chromium | Digests / Brief | reviewed snapshot schedule delivers one retained result and survives reload | 10+loop | s20 r43 clk | merge into digests.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-digest-storage | chromium | Digests / Brief | development digest storage preserves pending recovery, rejects conflicts and retires with its connection | 1 | s3 r0 | not e2e (module-in-page: 3 /src imports, no user action) → node integration or delete |
| dev-display | chromium | Settings / Device | text size affects computed typography, persists after reload and scales new content without compounding | 7 | s6 r18 | delete/dev-surface smoke: simulator display controls |
| dev-file-picker | chromium | Files / Scan | file chooser cancellation removes its input and a later chooser imports exact bytes | 5+loop | s9 r0 | not e2e (module-in-page: 9 /src imports, no user action) → node integration or delete |
| dev-files | chromium | Files / Scan | file mutations serialize races and invalidate old selections without partial folder imports | 9 | s11 r59 | merge into files-scan.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-hosted-journey | chromium | Workflows | connected browser saves before notification, opens retained output, toggles preferences and restores after … | 4 | s3 r15 clk | merge into dev-surface smoke |
| dev-hosted-results | chromium | Workflows | saved result notices persist, deduplicate, validate retained content and consume once | 8 | s18 r6 | merge into workflows.journey; drop module-in-page cases (18 /src imports vs 6 role queries) |
| dev-image-question | chromium | Chat / Assistant | camera question uses an unsaved frame and releases review on cancel | 4 | s5 r30 | merge into chat.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-inbox-triage | chromium | Mail / Inbox | search, archive, undo and delete preserve their local state through reload | 6 | s0 r51 | merge into mail.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-inbox | chromium | Mail / Inbox | local Inbox saves and restores attachment drafts then sends and opens the same bytes after reload | 7 | s0 r81 | merge into mail.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-incoming-attachments | chromium | Mail / Inbox | incoming attachment triggers the exact receipt through Files and Wallet and survives reload | 10 | s1 r70 | merge into mail.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-incoming-call | chromium | Telephony (AOSP) | device incoming call accepts and ends as one incoming history entry | 5 | s0 r30 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-location | chromium | Settings / Device | home condition uses actual coordinate distance: … | 20+loop | s33 r21 | not e2e (33 /src imports): simulator location → dev-surface smoke or delete |
| dev-maps-share | chromium | Maps | Maps uses the common panel and copies its exact link only on explicit choice | 4+loop | s0 r18 | merge into maps.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-maps-voice | chromium | Maps | fresh navigation fixes speak each actual step once and arrival stops owned speech | 10+loop | s3 r18 | merge into maps.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-message-attachments | chromium | Mail / Inbox | save restore send and reload retain exact attachment bytes and preview | 8 | s0 r43 | merge into mail.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-messages-lifecycle | chromium | Telephony (AOSP) | search finds sent text after reload | 7 | s0 r24 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-network | chromium | Settings / Device | shade and settings share persisted Wi-Fi and Bluetooth state | 3 | s6 r23 | delete/dev-surface smoke: simulator network toggle |
| dev-notification-queue | chromium | Notifications | active device events survive reload and are rediscovered after collection changes | 6 | s15 r19 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-notifications | chromium | Notifications | first-use policy persists, stale edits reject, previews are explicit and history never retains text | 10 | s24 r67 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-parity | chromium | Shell / Home / Platform | browser calendar persists events and rejects stale modifications | 10 | s28 r25 | delete or move to node integration: exercises browser stand-in plugins via registerPlugin, no UI |
| dev-password-provider | chromium | Browser app | development provider persists selection and fills only a disposable sample | 6 | s6 r39 | merge into browser.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-phone-messages | chromium | Telephony (AOSP) | local call controls and hangup persist one call without external traffic | 4 | s0 r37 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-reload | chromium | Shell / Home / Platform | source … … reload bootstrap once and preserve browser-local state | 2+loop | s0 r0 w2 | keep only if dev server reload is product-relevant; else delete (dev tooling) |
| dev-search-question | chromium | Chat / Assistant | … composes an editable question and sends only after review | 2+loop | s4 r13 | merge into chat.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-sensors | chromium | Settings / Device | microphone disable retires pending permission immediately and releases a late stream | 7 | s12 r14 | delete/dev-surface smoke: tests the simulator sensor panel and stand-in plugins |
| dev-speech-account-switch | chromium | Voice / Speech | switching sample accounts stops current speech and retires prepared playback | 1 | s2 r7 | merge into voice.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-surface-copy | chromium | Shell / Home / Platform | development entry surfaces do not expose native-only missing-feature messages | 1 | s0 r1 | merge into dev-surface smoke |
| dev-voicemail-audio | chromium | Telephony (AOSP) | voicemail reads its exact transcript locally, stops, ignores old completion, and completes on the voice event | 5+loop | s1 r21 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-wallet | chromium | Wallet (deferred AP-13) | development card add, lock, default and removal persist without credentials or external requests | 5 | s0 r29 | delete: Wallet is deferred/removed from MVP (PRD AP-13); spec keeps the simulator alive |
| dev-workflow-agent | chromium | Workflows | connected Write uses actual returned text as the next Notes step input | 10+loop | s13 r16 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-authoring | chromium | Workflows | agent workflow editor saves a typed workflow through the development bridge | 7+loop | s19 r32 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-automatic-speech | chromium | Workflows | automatic speech executes from Home and waits for its terminal event | 9 | s8 r10 clk w1 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-background-agent | chromium | Workflows | automatic connected Write runs from Home with workflow context and exact Notes output | 7+loop | s7 r7 clk | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-calendar | chromium | Workflows | three-day read handles DST, all-day civil bounds, overlaps and recurrence | 6+loop | s7 r6 clk | merge into workflows.journey; drop module-in-page cases (7 /src imports vs 6 role queries) |
| dev-workflow-concurrency | chromium | Workflows | a waiting pickup does not block another scheduled workflow or lose either run | 8 | s9 r8 clk w1 | merge into workflows.journey; drop module-in-page cases (9 /src imports vs 8 role queries) |
| dev-workflow-dates | chromium | Workflows | dated workflow source: … | 6+loop | s6 r7 clk | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-execution | chromium | Workflows | reviewed agent workflow runs and shows its durable output and history | 5+loop | s11 r30 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-executor | chromium | Workflows | local run changes the device and persists its actual step outputs after reload | 20+loop | s31 r36 | merge into workflows.journey; drop executor-internals cases that import /src modules |
| dev-workflow-files | chromium | Workflows | workflow reads nested text and binary metadata from actual Files after reload | 10 | s12 r6 clk | merge into workflows.journey; drop module-in-page cases (12 /src imports vs 6 role queries) |
| dev-workflow-focus | chromium | Workflows | focus holds actual arrivals, allows only Maya, then reviews and posts one end summary | 18+loop | s19 r34 clk | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-history | chromium | Workflows | exports exact reviewed snapshot and removes only finished runs across reload | 6 | s2 r26 clk | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-messages | chromium | Telephony (AOSP) | New messages selects only unread incoming records and leaves read state intact | 8 | s1 r19 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-workflow-phone | chromium | Telephony (AOSP) | approved … workflow phone write resumes from its exact receipt once | 6+loop | s12 r48 | merge into telephony.journey (AOSP-only renderer paths on the dev simulator) |
| dev-workflow-receipts | chromium | Workflows | receipt review saves exact file bytes and selected Wallet amount, then survives reload | 17 | s13 r32 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-result | chromium | Workflows | supplied result drives exact local notes, notices and messages and survives reload | 5+loop | s6 r22 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-speech | chromium | Workflows | workflow waits for actual speech completion before later steps | 13+loop | s4 r23 clk | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-triggers | chromium | Workflows | time trigger runs from Home without opening Workflows and never repeats after reload | 17+loop | s14 r45 clk w4 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| dev-workflow-urgency | chromium | Workflows | offline review … the notification and continues | 8+loop | s6 r15 | merge into workflows.journey (runs on dev simulator; keep only the user-visible journey) |
| device-storage-migration | chromium + firefox/webkit | Shell / Home / Platform | empty device hydration does not invent persisted settings or roles | 8+loop | s21 r8 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| device-view-profile | chromium | Settings / Device | enabled views via native resident enrollment: … | 1 | s2 r5 | merge into settings.journey |
| digest-authorization-migration | chromium | Digests / Brief | empty authorization reads do not claim a document | 11 | s11 r24 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| digest-execution-migration | chromium | Digests / Brief | empty digest polling and repeated unchanged reads preserve the absence of a document | 7 | s25 r6 clk | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| digest-inbox-migration | chromium | Digests / Brief | empty inbox reads do not create a document | 9 | s10 r13 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| digest-native-sources.production | production | Digests / Brief | phone sources on Android: reviewed consent within the calendar and expiry bounds, a bound schedule arms ren… | 3 | s0 r35 | merge into digests.journey |
| digest-resident-schedule.production | production | Digests / Brief | loop D on Android: a reviewed snapshot, morning and evening schedules, a lost acknowledgement retried exact… | 2 | s0 r31 | merge into digests.journey |
| digest-source-renewal | chromium | Digests / Brief | a bound source shows its renewal window, pauses at expiry and renews with its schedule in one confirmed step | 3 | s6 r47 clk | merge into digests.journey |
| digest-summary | chromium | Digests / Brief | … digest presents final summary with private details handled in … | 2+loop | s2 r8 | merge into digests.journey (tiny: 2 tests) |
| direct-voice-live.local | live | Voice / Speech | real voice opens Notes through the actual renderer channel | 1 | s2 r14 | keep (manual live lane) |
| dock-clearance | chromium | A11y / Layout | chat presentation and exact installer own the published header and dock clearance | 1 | s1 r0 | not e2e: route-fulfilled fake DOM + direct installDockClearance() → delete (covered by a11y dock rules) |
| document-excerpt-sensitive | chromium | Notes | a document excerpt with a verification code is refused until it is edited | 1 | s1 r10 | merge into notes.journey (tiny: 1 test) |
| document-summary-note.production | production | Notes | J03 on Android: a picked document, a trimmed question and the resident answer become one reviewed note whos… | 2 | s0 r28 | merge into notes.journey |
| domain-atomicity | chromium + firefox/webkit | Shell / Home / Platform | cross-tab edits read the last committed value after an asynchronous edit | 5 | s2 r0 | not e2e (module-in-page: 2 /src imports, no user action) → node integration or delete |
| domain-initialization | chromium + firefox/webkit | Shell / Home / Platform | concurrent legacy imports write once and leave the recovery capture usable | 1 | s2 r0 | not e2e (module-in-page: 2 /src imports, no user action) → node integration or delete |
| domain-recovery-lifecycle | chromium | Shell / Home / Platform | … recovery cancels delayed … on … | 1 | s2 r4 | merge into shell.journey (tiny: 1 test) |
| drawer-full-height | chromium | A11y / Layout | Apps fills the screen and its last control clears the chat bar at …px | 1+loop | s0 r4 | merge into a11y-layout.journey (tiny: 1 test) |
| durable-delete-undo | chromium | Chat / Assistant | real reminder deletion review and durable … | 2+loop | s3 r18 clk | merge into chat.journey (tiny: 2 tests) |
| execution-storage-migration | chromium | Workflows | empty workflow and action reads do not create execution history | 8 | s22 r7 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| explicit-send | chromium | Mail / Inbox | an explicit prompt with an empty composer posts once and shows one user bubble | 2 | s3 r5 | merge into mail.journey (tiny: 2 tests) |
| file-email | chromium | Mail / Inbox | selected Files require explicit attachment review, retain exact bytes and never send | 4+loop | s10 r35 | merge into mail.journey |
| files-agent-filter | chromium | Files / Scan | an agent filter from Home opens Files on its first visit and leaves the result usable | 3 | s4 r6 | merge into files-scan.journey |
| files-bulk | chromium | Files / Scan | select, move together into a folder, delete to Trash, restore, and Empty only after confirming | 8+loop | s11 r62 | merge into files-scan.journey |
| files-dialog-accessibility | chromium | Files / Scan | … Files folder dialog owns keyboard focus without changing files on dismissal | 1+loop | s0 r11 | merge into files-scan.journey (tiny: 1 test) |
| files-dialog-dismissal | chromium | Files / Scan | … file rename and delete dialogs restore their opener and preserve the file | 1+loop | s4 r13 | merge into files-scan.journey (tiny: 1 test) |
| files-dialog-large-text | chromium | Files / Scan | … long file deletion review fits at 150 percent text | 1+loop | s2 r12 | merge into files-scan.journey (tiny: 1 test) |
| files-location-layout | chromium | Files / Scan | Files aligns category, storage and Trash rows in … | 1+loop | s0 r4 | merge into files-scan.journey (tiny: 1 test) |
| files-preview-media | chromium | Files / Scan | Files renders real image, audio and video previews and retires playback on Back | 2 | s2 r11 | merge into files-scan.journey (tiny: 2 tests) |
| files-sort-directions | chromium | Files / Scan | All files exposes direct folder/view controls and all six sort directions without changing files | 1 | s1 r15 | merge into files-scan.journey (tiny: 1 test) |
| fixture-images | chromium | Shell / Home / Platform | mock … decodes fixture images | 1+loop | s0 r0 w1 | merge into dev-surface smoke (mock mode decodes fixtures) |
| fixtures-empty-runtime | chromium | Shell / Home / Platform | live views render from empty fixtures without errors or fixture text | 3 | s0 r9 w1 | merge into dev-surface smoke |
| full-chat-grabber | chromium | Chat / Assistant | a slow drag of … rests where it is released | 18+loop | s0 r32 w8 | merge into chat.journey |
| global-basemap | chromium | Maps | global basemap renders without configuring search/routes or automatically reading location: …x… | 3+loop | s2 r23 | merge into maps.journey |
| gmail-grant-recovery | chromium | Mail / Inbox | Gmail same-ID … clears read availability and recovers explicitly | 2+loop | s5 r14 w1 | merge into mail.journey |
| gmail-mvp-scope | chromium | Mail / Inbox | Shared email waits for Gmail account readiness: … | 19+loop | s7 r216 w1 | keep as basis of mail.journey |
| gmail-notice-question | chromium | Mail / Inbox | Gmail Ask explicit source review  | 1+loop | s2 r7 | merge into mail.journey (tiny: 1 test) |
| google-maps-raster.production | production | Maps | Google Maps tiles … | 1+loop | s0 r33 | merge into maps.journey |
| home-app-library | chromium | Shell / Home / Platform | fresh Alpha Home shows core apps and loads installed apps only in Apps | 13 | s0 r85 clk w1 | merge into shell.journey (launcher Home) |
| home-assistant-surface | chromium | Shell / Home / Platform | the assistant surface shows chat and Close only: no app grid, digests or startup permissions | 2 | s0 r7 | merge into shell.journey (tiny: 2 tests) |
| home-attention.production | production | Shell / Home / Platform | unconnected Home hides empty widgets and keeps sign-in reachable | 2 | s0 r8 | merge into home overview journey |
| home-attention | chromium | Shell / Home / Platform | Home attention opens the local Inbox and tracks unread mail through reload | 5 | s4 r14 | merge into home overview journey |
| home-brief-result.production | production | Digests / Brief | a digest result from the agent reaches the Home brief card (… result inbox): attributed, timed by its run, … | 8+loop | s0 r10 | merge into digests.journey |
| home-calendar-density | chromium | Calendar | Home Calendar keeps complete line boxes and its time footer: … … … | 1+loop | s0 r1 | merge into calendar.journey (tiny: 1 test) |
| home-chat-anchor | chromium | Shell / Home / Platform | Home grid stays anchored through chat detents: … …x… | 2+loop | s0 r10 | merge into shell.journey |
| home-compact-scroll | chromium | Shell / Home / Platform | compact Home reaches lower apps and horizontal widgets in … | 2+loop | s0 r4 w1 | merge into shell.journey (tiny: 2 tests) |
| home-daily-overview.production | production | Shell / Home / Platform | fresh Home hides empty widgets without fixture content or outside requests | 1 | s0 r5 w1 | merge into home-daily-overview |
| home-daily-overview | chromium | Shell / Home / Platform | calendar card keeps source and time accessible without generic app labels | 16 | s33 r27 clk w4 | keep as basis of home overview journey (production file has 1 case → merge it here, parametrised) |
| home-inbox | chromium | Shell / Home / Platform | Home Inbox uses cached unread subjects and aligned text: … | 15+loop | s14 r50 | merge into shell.journey |
| home-landscape | chromium | Shell / Home / Platform | landscape lays Home and the composer side by side and keeps every Home control reachable | 3 | s0 r14 | merge into shell.journey |
| home-launcher | chromium | Shell / Home / Platform | Apps opens over Home without product views or a count, and closes on Back, Home and Close | 4 | s1 r25 | merge into shell.journey |
| home-native-launcher | chromium | Shell / Home / Platform | a new Android WebView holds Home until its update settles | 11 | s3 r54 w1 | keep as basis of shell.journey launcher half |
| home-overlay-stability | chromium | Shell / Home / Platform | Home icons stay fixed while chat is dragged and its resting controls animate in | 1 | s0 r3 w1 | merge into shell.journey (tiny: 1 test) |
| home-workflows | chromium | Shell / Home / Platform | Home shows actual workflow names and states, then opens the existing list: … | 6+loop | s4 r17 | merge into shell.journey |
| host-reminder-recovery | chromium | Reminders / Clock | host journal reminder recovery uses retained receipt: …, creation:… | 1+loop | s6 r0 clk | not e2e (module-in-page: 6 /src imports, no user action) → node integration or delete |
| inbox-attachment-layout | chromium | Mail / Inbox | Gmail attachment review retains exit and keyboard reading … … | 1+loop | s4 r17 | merge into mail.journey (tiny: 1 test) |
| inbox-compose-layout | chromium | Mail / Inbox | Inbox draft remains editable at large text: … … | 1+loop | s1 r18 | merge into mail.journey (tiny: 1 test) |
| inbox-folders-compatibility.production | production | Mail / Inbox | Inbox folders stay hidden and dismiss safely: … …px | 1+loop | s0 r10 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| inbox-folders-drafts | chromium | Mail / Inbox | Older servers offer only the query-based Archive folder | 5 | s2 r59 w1 | merge into mail.journey |
| inbox-hostile-attachment | chromium | Mail / Inbox | … is never rendered: the review is inert text, Save to Files keeps the exact bytes, and opening it in Files… | 6+loop | s8 r60 w2 | merge into mail.journey |
| inbox-message-layout | chromium | Mail / Inbox | Inbox reads long inert content without horizontal scrolling: … | 1+loop | s1 r13 | merge into mail.journey (tiny: 1 test) |
| inbox-owner-fence | chromium | Mail / Inbox | Gmail owner fence … | 1+loop | s2 r13 | merge into mail.journey |
| inbox-read-cancel-draft | chromium | Mail / Inbox | … retains … local mail | 2+loop | s4 r42 | merge into mail.journey |
| inbox-save-attachment | chromium | Mail / Inbox | reviewed Gmail attachment saves exact bytes once and survives reload in Files | 4 | s6 r20 | merge into mail.journey |
| inbox-unsaved-recovery | chromium + firefox/webkit | Mail / Inbox | update readback drains a retired Inbox editor without dispatching mail | 8 | s5 r53 | merge into mail.journey |
| journey-a-conversation | chromium | Chat / Assistant | journey A: boot, connect, converse across apps, stop a reply, reload and recover one result per accepted re… | 3 | s5 r70 clk w3 | keep (chat.journey) |
| journey-b-voice-note-actions | chromium | Notes | Journey B: recorded note UI and retained scheduling contract save one event and reminder, then edit and del… | 2 | s5 r109 | keep (notes/voice journey) |
| journey-c-alarms | chromium | Reminders / Clock | journey C: agent-proposed alarm is reviewed, saved once, survives reload, rings, snoozes, rings again and i… | 2 | s2 r60 clk | keep (clock-reminders.journey) |
| journey-core-loops.production | production | Resident agent (prod) | loop A on Android: the resident agent answers, the conversation follows across apps, Stop is honest and a r… | 17 | s0 r140 clk | keep: backbone of the production lane (split per loop if it stays >900 lines) |
| journey-d-digests | chromium | Digests / Brief | journey D: morning and evening digests run once each, are retained and acknowledged, and a missed time is n… | 2 | s3 r59 clk | keep (digests.journey) |
| journey-e-browser-credentials | chromium | Browser app | browser navigation, tabs, private tab, reviewed reading and password manager complete as one journey | 1 | s2 r58 | keep (browser.journey) |
| journey-f-email-notifications | chromium | Mail / Inbox | development mailbox: load, open a message, local draft survives reload, one local send | 5 | s4 r76 clk | keep (mail.journey) |
| journey-f-hosted-result | chromium | Workflows | Journey F (hosted): result notices tapped after a restart each reach exactly their own result, once | 1 | s1 r3 | merge into workflows.journey (notice tap) |
| journey-f-reviewed-send | chromium | Mail / Inbox | F-5: the send review shows From, To, Cc, Bcc, subject, body and the attachment, and the dispatched request … | 14 | s5 r141 w2 | keep (mail.journey: reviewed send/trash/pagination) |
| journey-j01-poster-calendar | chromium | Calendar | J01 poster scan becomes exactly one reviewed Calendar event; suggestions and drafts never save by themselves | 1 | s1 r37 clk | keep (files-scan → calendar) |
| journey-j03-document-analysis | chromium | Files / Scan | J03: an Inbox attachment is saved to Files, analysed, and kept as a reviewed note whose source link opens t… | 1 | s4 r75 | keep (files-scan.journey) |
| journey-j04-android.production | production | Maps | an event location opens unconfigured Maps, hands off to an installed map app only on tap, and Back to event… | 2 | s0 r7 | merge into maps.journey |
| journey-j04-cloud-maps.production | production | Maps | an event location is searched once in Cloud Maps, routed from an explicit origin, started and stopped, and … | 3 | s0 r27 w2 | keep (maps.journey) |
| journey-j04-schedule-travel | chromium | Maps | calendar event location is handed to Maps once, routed by explicit choices, and returns to the event | 1 | s2 r22 | merge with journey-j04-cloud-maps.production into maps.journey |
| journey-j05-web-research-note | chromium | Browser app | reviewed page excerpt, development agent answer and explicit Save leave exactly one source-linked note | 3 | s5 r42 | keep (browser.journey) |
| large-text-layout | chromium | A11y / Layout | compact large text preserves Files cards, address controls and Home workflow: … | 1+loop | s1 r13 w1 | merge into a11y-layout.journey (tiny: 1 test) |
| large-text-overlap | chromium | A11y / Layout | … at …% text: no card text or app label is printed over another or cut | 5 | s0 r3 w1 | merge into a11y-layout.journey |
| legacy-list-identity | chromium | Notes | duplicate legacy bookmark URLs render once and retain stored values | 1 | s1 r5 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| legacy-notes-access | chromium | Notes | retained previous notes have a visible route and return to the current collection | 4 | s6 r16 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| listener-invocation.production | production | Voice / Speech | … cannot start voice or consume a deferred invocation | 4+loop | s0 r4 w1 | merge into voice.journey |
| live-voice | chromium | Voice / Speech | live voice: partials render as interim text, stale turns are dropped and the final arrives once | 2 | s1 r0 w2 | merge into voice.journey |
| local-agent-availability | chromium | Chat / Assistant | native local-agent packaging: … | 1 | s0 r20 | merge into chat.journey |
| local-agent-native-stream | chromium | Chat / Assistant | native adapter streamed reply renders before completion and handles … | 2+loop | s7 r21 | merge into chat.journey |
| local-agent-stop | chromium | Chat / Assistant | Restart local agent waits for native shutdown, then starts again: … | 1 | s0 r10 clk | merge into chat.journey |
| local-agent-stream | chromium | Chat / Assistant | authored composer text reaches the verified transport unchanged and blank-only stays local | 1 | s1 r1 | merge into chat.journey (tiny: 1 test) |
| local-ocr | chromium | Files / Scan | real local OCR recognizes an image without remote model requests | 5 | s6 r16 | merge into files-scan.journey |
| local-provider-settings | chromium | Account / Cloud / Connection | provider status, pinned model, verified save and confirmed key removal | 3+loop | s2 r41 | merge into account.journey |
| location-settings-recovery | chromium + firefox/webkit | Settings / Device | unreadable location retains exact backup and requires confirmed replacement: … | 6 | s3 r32 | merge into settings.journey |
| login-field-reporter | chromium | Browser app | reports only the focused login fields of its own frame, with no origin, on real focus | 7 | s0 r0 | not e2e (source-text harness: extracts JS from a vendor Java text block and runs it in setContent pages) → delete or move to node |
| mail-controls | chromium | Mail / Inbox | compact and expanded assistant controls expose one voice mic without a duplicate dictation launcher | 2 | s1 r14 | merge into mail.journey (tiny: 2 tests) |
| mail-images | chromium | Mail / Inbox | HTML email loads images by default, keeps inline links isolated, and saved opt-out survives reload | 5 | s4 r33 | merge into mail.journey |
| mail-preview | chromium | Mail / Inbox | encoded Gmail previews render punctuation as text without loading markup | 3 | s1 r11 | merge into mail.journey |
| mail-review.production | production | Mail / Inbox | Android: the send review shows Cc and Bcc, an edit after review is reviewed again, and only the last review… | 2 | s0 r23 | merge into mail.journey |
| managed-maps-unavailable.production | production | Maps | managed Cloud … preserves recovery without provider setup or invented results | 1+loop | s0 r2 | merge into maps.journey (tiny: 1 test) |
| map-label-contrast | chromium | Maps | map labels remain readable … … | 1+loop | s1 r0 | borderline: calls resolveMapColors() in page; fold into a11y contrast sweep of rendered map |
| maps-approved-read | chromium | Maps | approved Maps snapshot: … | 1 | s7 r23 | merge into maps.journey |
| maps-chat-cards | chromium | Maps | agent Maps cards render without raw markup: … | 1+loop | s2 r9 | merge into maps.journey (tiny: 1 test) |
| maps-event-return-ownership | chromium | Maps | a fresh canonical Maps visit owns its return while the prior visit still settles | 2 | s1 r9 | merge into maps.journey (tiny: 2 tests) |
| maps-event-return | chromium | Maps | Back to event returns to exactly the originating event from every Maps layer, once, without a new search | 5 | s5 r34 | merge into maps.journey |
| maps-legacy-provenance.production | production | Maps | legacy Maps content with … coverage | 1+loop | s0 r17 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| maps-list-focus | chromium | Maps | a Maps search readback keeps the focused provider place when a preceding result arrives | 2 | s2 r7 | merge into maps.journey (tiny: 2 tests) |
| maps-share-layout | chromium | Maps | … common Share panel remains usable at large text | 1+loop | s2 r3 | merge into maps.journey (tiny: 1 test) |
| media-copy-intent-storage | chromium + firefox/webkit | Photos / Camera / Video | empty read leaves the browser document uninitialized | 7+loop | s9 r6 | merge into storage-contract spec (cross-browser lane) — 9 /src imports |
| media-polish | chromium | Photos / Camera / Video | empty scan starts with capture and import instead of disabled export buttons | 8+loop | s8 r45 clk w2 | merge into media.journey |
| message-actions | chromium | Chat / Assistant | tap reveals quiet actions and copies exact message: … | 14+loop | s10 r39 clk w2 | merge into chat.journey |
| message-reply-edit | chromium | Chat / Assistant | new live stable IDs enable Reply and send canonical metadata without rewriting prose | 10 | s8 r25 | merge into chat.journey |
| mock-background-admission | chromium | Shell / Home / Platform | mock admission …: … | 1 | s0 r11 | merge into dev-surface smoke |
| mock-readiness | chromium | Shell / Home / Platform | native readiness accepts rendered mock mode and requires the live navigation marker after exit | 1 | s0 r2 | not e2e: regex-extracts a Java probe string; keep only as Android instrumentation, delete here |
| mvp-workflow-scope | chromium | Workflows | Mock …: workflow builder excludes deferred integrations and runs an allowed flow | 3 | s0 r28 | merge into workflows.journey (mock mode only → dev-surface smoke) |
| mvp | chromium | Shell / Home / Platform | … …: all MVP views remain accessible | 13+loop | s4 r85 | merge into shell.journey (Notes cases → notes.journey); mock-mode cases → one dev-surface smoke |
| native-calendar-deletion-routing | chromium | Calendar | native Calendar … deletion carries only its exact inspected identity | 1+loop | s3 r3 | merge into calendar.journey (tiny: 1 test) |
| native-calendar-sync-settings | chromium | Calendar | native Settings requires native consent, links its exact source, pulls edits and pauses both boundaries | 4 | s0 r22 | merge into calendar.journey |
| native-cloud-signin | chromium | Account / Cloud / Connection | email code sign-in stays in Alpha, retries a wrong code, waits out resend and binds Cloud AI | 16+loop | s0 r107 clk | merge into account.journey |
| native-cloud-subscription | chromium | Account / Cloud / Connection | a phone without a saved sign-in shows the dedicated sign-in page, no local-only bypass, and the agent runs | 46+loop | s6 r143 clk | keep as basis of account.journey (46 tests: trim to journeys; many are state-matrix cases) |
| native-insets | chromium | A11y / Layout | fitted standalone navigation stays below native bars and returns to apps by pointer and keyboard | 8+loop | s3 r19 | merge into a11y-layout.journey |
| native-mock-chrome | chromium | Shell / Home / Platform | Android mock uses only native system chrome and reserves the banner across views | 2+loop | s0 r17 | merge into dev-surface smoke |
| native-plugin-startup | chromium | Shell / Home / Platform | Android legacy plugin injection is wrapped before renderer startup and listener cleanup | 2 | s3 r2 | not e2e (module-in-page: 3 /src imports, no user action) → node integration or delete |
| native-speech.production | production | Voice / Speech | production chat captures locally, transcribes locally, plays local reply and cancels playback | 7 | s0 r8 | keep UI cases in voice.journey; delete the Maps case that stitches stripped source |
| native-video-library-change | chromium | Photos / Camera / Video | own library notifications during native Save do not cancel the operation | 5+loop | s0 r23 | merge into media.journey |
| note-audio-delete-recovery | chromium + firefox/webkit | Notes | voice note deletion … | 2+loop | s22 r17 | merge into notes.journey |
| note-audio-legacy-restore | chromium | Notes | explicit legacy voice recording restore: … | 1+loop | s5 r9 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| note-audio-lifecycle | chromium | Notes | legacy metadata migrates without exposing bytes; save replay updates transcript and rejects another owner | 4 | s4 r2 | merge into notes.journey |
| note-audio-native-fence | chromium | Notes | retired renderer delayed delete cannot undo explicit restored note | 3 | s7 r7 clk | merge into notes.journey |
| note-calendar-handoff | chromium | Notes | Notes scheduling contract: an event draft writes nothing until Save, then links to exactly the note it came… | 5 | s11 r47 clk | merge into notes.journey |
| note-read-aloud | chromium | Notes | reads the open note with the local voice and stops when the note is edited | 3 | s4 r12 | merge into notes.journey |
| note-source | chromium | Notes | retained source fingerprint survives reload, rejects changed bytes and opens exact source … | 3+loop | s3 r33 | merge into notes.journey |
| notes-audio-journey | chromium + firefox/webkit | Notes | canonical Notes saves audio before transcription, keeps it across client reload and restores the same recor… | 1 | s3 r25 | merge into notes.journey |
| notes-browser-segments | chromium | Notes | a browser recording is written as bounded standalone segments, the last one before stop resolves | 1 | s1 r0 | not e2e (module-in-page: 1 /src imports, no user action) → node integration or delete |
| notes-document-receipt | chromium | Notes | A document receipt that arrives while the page is hidden is shown once the page is visible | 3 | s0 r22 w2 | merge into notes.journey |
| notes-document-storage | chromium + firefox/webkit | Notes | two tabs share one collection without advancing its receipt on reopen | 10+loop | s17 r6 | merge into storage-contract spec (cross-browser lane) — 17 /src imports |
| notes-named-review | chromium | Notes | a named delete is disambiguated locally and confirmed for the exact note | 3 | s0 r6 | not e2e (source-text harness: stitches stripped TS source of 3 product modules + phone.css into setContent) → delete or move to node |
| notes-pending-save | chromium | Notes | an edit made while the previous Notes save is still committing is saved, not refused | 1 | s2 r7 | merge into notes.journey (tiny: 1 test) |
| notes-permanent-delete-backstop | chromium | Notes | death after the tombstone commit, before the recording moved: explicit source activation finishes the erase… | 7 | s15 r32 | merge into notes.journey |
| notes-permission-recovery | chromium | Notes | blocked Notes microphone opens the existing access panel and keeps the retry explicit | 1 | s0 r7 | merge into notes.journey (tiny: 1 test) |
| notes-photos-list-focus | chromium | Notes | a saved Notes pin change retains focus in the single list and opens that note | 4 | s1 r11 | merge into notes.journey |
| notes-query-review | chromium | Notes | local Notes choice preserves … theme, exact long preview and modal ownership | 1+loop | s0 r5 | not e2e (source-text harness: stitches stripped TS source into setContent) → delete or move to node |
| notes-responsive.production | production | Notes | Notes keeps a readable column and preserves the same draft, caret and scroll through resizing | 1 | s0 r7 | merge into notes.journey (tiny: 1 test) |
| notes-review | chromium | Notes | local Notes choice preserves … theme, exact long preview and modal ownership | 4+loop | s1 r11 | not e2e (source-text harness: injects phone.css text + route-fulfilled page, calls module directly) → delete or move to node |
| notes-save-failure | chromium + firefox/webkit | Notes | Notes retains unsaved text after … | 1 | s3 r11 | merge into notes.journey (tiny: 1 test) |
| notes-status-layout | chromium | Notes | Notes storage failure has its own space: … …x… | 1 | s0 r9 | merge into notes.journey (tiny: 1 test) |
| notes-trash-full | chromium | Notes | a deletion that would overfill Trash is refused: the note stays saved, Trash is unchanged, and making room … | 2 | s7 r52 | merge into notes.journey |
| notes-trash-recovery | chromium | Notes | Trash written under a larger limit stays readable, restorable and purgeable; a full Trash refuses without l… | 10 | s18 r131 clk | merge into notes.journey (Trash/3-day) |
| notes-trash-resume | chromium | Notes | a resume on Home erases expired text and voice Trash entries without opening Notes | 2 | s6 r15 clk w1 | merge into notes.journey (tiny: 2 tests) |
| notes-trash | chromium | Notes | deleted notes survive a restart in Recently deleted, restore with the same identity, and Undo still works | 7 | s25 r64 clk | merge into notes.journey |
| notification-action-lifecycle | chromium | Notifications | … retires notification opening … commit | 1+loop | s3 r0 | not e2e (module-in-page: 3 /src imports, no user action) → node integration or delete |
| notification-route-lifecycle | chromium | Notifications | … notification … … commit | 1+loop | s5 r0 | not e2e (module-in-page: 5 /src imports, no user action) → node integration or delete |
| notification-storage-migration | chromium + firefox/webkit | Notifications | policy reads retain authority and document revision without writing a legacy mirror | 7+loop | s9 r6 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| notifications-handle | chromium | Notifications | Home has no notifications control and no downward pull opens a shade | 11+loop | s1 r7 w2 | merge into workflows.journey |
| one-calendar | chromium | Calendar | Calendar shows a saved reminder when there are no calendar events or Google connection | 5+loop | s4 r45 clk | merge into calendar.journey |
| operation-review-accessibility | chromium | Chat / Assistant | operation review retains controls: … … | 3+loop | s4 r9 | merge into chat.journey |
| own-provider.production | production | Account / Cloud / Connection | pending provider change shows progress instead of a false failure | 17+loop | s0 r166 | keep (account.journey production half) |
| owner-gmail-read-state-absent | chromium | Mail / Inbox | read state is unavailable when capabilities … readState | 2+loop | s3 r9 | merge into mail.journey (tiny: 2 tests) |
| owner-maps-attribution-refusals | chromium | Maps | Maps keeps the OpenStreetMap copyright credit one tap away beside Cloud results | 2 | s3 r4 | merge into maps.journey (tiny: 2 tests) |
| owner-settings-review | chromium | Account / Cloud / Connection | Settings category state matches the selected context and resets on a fresh visit | 2 | s1 r26 | merge into account.journey (tiny: 2 tests) |
| password-entry-back | chromium | Browser app | Android Back on … keeps the list unlocked and clears the typed password | 1 | s0 r12 | merge into browser.journey (tiny: 1 test) |
| password-manager | chromium | Browser app | development vault: unlock, search, add, generate, edit and delete without exposing secrets | 10 | s5 r114 | merge into browser.journey |
| password-provider-setup | chromium | Browser app | setup handoff does not claim selected; return to Alpha observes the selection | 10 | s0 r29 | merge into browser.journey |
| password-provider-storage | chromium + firefox/webkit | Browser app | pending password settings cannot open after … | 3+loop | s7 r11 | merge into storage-contract spec (cross-browser lane) — 7 /src imports |
| permitted-photos | chromium | Photos / Camera / Video | full access shows the library with no access row and requests no permission automatically | 5 | s0 r16 | merge into media.journey |
| photo-agent-review-leave | chromium | Photos / Camera / Video | leaving Photos ends an open agent … review | 1+loop | s2 r5 | merge into media.journey (tiny: 1 test) |
| photo-album-accessibility | chromium | Photos / Camera / Video | … album manager owns keyboard focus and restores the photo control | 1+loop | s1 r13 | merge into media.journey (tiny: 1 test) |
| photo-albums | chromium + firefox/webkit | Photos / Camera / Video | visible Photos album journey creates with selected media, renames, removes, adds and deletes without deleti… | 3 | s4 r24 | merge into media.journey |
| photo-batch | chromium | Photos / Camera / Video | visible batch favorite, trash, undo and download journey persists exact selected items | 11+loop | s13 r52 w1 | merge into media.journey |
| photo-delete-accessibility | chromium | Photos / Camera / Video | photo deletion review owns focus … … | 1+loop | s1 r11 | merge into media.journey (tiny: 1 test) |
| photo-email | chromium | Mail / Inbox | Photos source requires separate attachment review and preserves source bytes in local draft | 2+loop | s7 r13 | merge into mail.journey (tiny: 2 tests) |
| photo-filter-fallback | chromium | Photos / Camera / Video | portable photo filters match the native canvas filter | 1 | s1 r0 | not e2e: canvas maths on a blank page → node/canvas integration or delete |
| photo-order | chromium | Photos / Camera / Video | migrated mixed media pages use capture date and stable identity ties without gaps or duplicates | 3 | s4 r2 | merge into media.journey |
| photo-overlay-contrast | chromium | Photos / Camera / Video | photo metadata and selection stay readable over white images … | 2 | s0 r5 | merge into media.journey (tiny: 2 tests) |
| photo-permitted-batch | chromium | Photos / Camera / Video | … permitted items use reviewed batches of … | 5+loop | s1 r15 | merge into media.journey |
| photos-clean-controls | chromium | Photos / Camera / Video | Camera cover, menu selection, info swipe and photo chat share use the saved image | 4 | s9 r78 | merge into media.journey |
| photos-grid-density | chromium | Photos / Camera / Video | Photos keeps density and virtual rows aligned at …px | 1 | s0 r1 | merge into media.journey (tiny: 1 test) |
| photos-pending-read.production | production | Photos / Camera / Video | native Photos grid opens and stays open … | 3+loop | s0 r11 w5 | merge into media.journey |
| post-sign-in-setup.production | production | Account / Cloud / Connection | APK path: a verified email code goes straight to the seven access steps while the agent restarts | 3 | s0 r20 w1 | keep (account.journey: onboarding) |
| post-sign-in-setup | chromium | Account / Cloud / Connection | a verified email code goes straight to access setup while the agent restarts behind it | 5 | s3 r45 clk w2 | merge into post-sign-in-setup.production (same three paths tested with dev fixtures) |
| preference-storage-migration | chromium + firefox/webkit | Settings / Device | empty bookmark reads and sound polling do not invent stored data | 6 | s10 r6 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| privacy-per-connection | chromium | Account / Cloud / Connection | current Settings and privacy contract reflect the … connection | 6+loop | s4 r23 | merge into account.journey |
| product-recovery-entry | chromium | Shell / Home / Platform | damaged bookmarks are recovered from Browser bookmarks without Device controls | 3 | s0 r34 | merge into shell.journey |
| production-surface | production | Shell / Home / Platform | the built bundle ships no in-browser speech engine, model or inference runtime | 14 | s0 r123 w1 | keep core (flags, CSP, no dev surfaces); delete the bundle-text test (duplicates audit-production-bundle.ts in webServer) |
| proposal-recovery | chromium | Chat / Assistant | interrupted reply recovers only reviewable proposals: … | 1 | s2 r19 | merge into chat.journey |
| provider-key-reconnect.production | production | Account / Cloud / Connection | Own Voice … survives status revision publication during the real reconnect | 1+loop | s0 r18 | merge into account.journey (tiny: 1 test) |
| reading-capability | chromium | Browser app | the web build offers reading a committed page without an Android unavailable note | 2 | s2 r26 | merge into browser.journey (tiny: 2 tests) |
| reading-review | chromium | Browser app | review requires explicit text and confirmation, uses the exact excerpt, and releases playback on close | 8 | s5 r50 | merge into browser.journey |
| reading-sensitive | chromium | Browser app | browser and native extraction refuse credential prose: … | 8+loop | s10 r22 | not e2e (source-text harness: extracts JS from a vendor Java text block; compares with /@fs module) → delete or move to node |
| reading-source | chromium | Browser app | public HTML becomes inert reviewed article text without credentials or resource requests | 9+loop | s1 r10 | merge into browser.journey |
| recording-question | chromium | Voice / Speech | the transcript selects and copies its full text without sending or changing the recording | 7 | s9 r24 | merge into voice.journey |
| reduced-motion-harness | chromium | A11y / Layout | a spec that opts into reduced motion gets no screen-entry animation | 2 | s0 r2 w1 | merge into a11y-layout.journey (tiny: 2 tests) |
| remaining-dialog-layout | chromium | A11y / Layout | … … review retains actions and theme at large text | 1 | s9 r5 | merge into a11y-layout.journey (tiny: 1 test) |
| remaining-subview-accessibility | chromium | A11y / Layout | … … retires covered controls … | 3+loop | s1 r11 | merge into a11y-layout.journey |
| reminder-action-storage | chromium + firefox/webkit | Reminders / Clock | independent tabs retain every reminder action kind without replay | 4 | s8 r6 | merge into storage-contract spec (cross-browser lane) — 8 /src imports |
| reminder-create-review | chromium + firefox/webkit | Reminders / Clock | reminder creation … | 1+loop | s12 r26 clk | merge into clock-reminders.journey |
| reminder-creation-storage | chromium + firefox/webkit | Reminders / Clock | empty reads and absent discard do not initialize creation history | 7+loop | s14 r6 | merge into storage-contract spec (cross-browser lane) — 14 /src imports |
| reminder-decision-review | chromium + firefox/webkit | Reminders / Clock | reviewed reminder …: … | 2+loop | s17 r24 clk | merge into clock-reminders.journey |
| reminder-delete-review | chromium + firefox/webkit | Reminders / Clock | reviewed reminder deletion … | 3+loop | s10 r23 clk | merge into clock-reminders.journey |
| reminder-lifecycle | chromium | Reminders / Clock | 33 definite refusals are retired after absent readback and creation still works | 2 | s4 r0 | not e2e (module-in-page: 4 /src imports, no user action) → node integration or delete |
| reminder-notice-question | chromium | Reminders / Clock | reminder Ask review  | 1+loop | s1 r8 | merge into clock-reminders.journey (tiny: 1 test) |
| reminder-notice-taps | chromium | Reminders / Clock | durable reminder tap  | 1+loop | s0 r18 | merge into clock-reminders.journey |
| reminder-notification-dismissal | chromium | Reminders / Clock | a held … reminder dismissal rejects after … | 2+loop | s9 r0 | not e2e (module-in-page: 9 /src imports, no user action) → node integration or delete |
| reminder-refusal-ui | chromium | Reminders / Clock | refused reminder creation (…) is retired with its reason | 1+loop | s3 r7 clk | merge into clock-reminders.journey (tiny: 1 test) |
| reminder-storage-migration | chromium + firefox/webkit | Reminders / Clock | empty and unchanged reminder polling preserves document identity | 6 | s11 r6 | legacy-data path: delete with the migration (PRD: no app-data migration) or fold into one storage-contract spec |
| reminder-timing-review | chromium | Reminders / Clock | one-time reminder preserves reviewed alert … after reload | 14+loop | s25 r66 clk | merge into clock-reminders.journey |
| reminder-v2-assistant | chromium | Reminders / Clock | v1/v2 reminder timing proposals reviewed in chat (loop-generated) | 0 | s12 r20 clk | merge into clock-reminders.journey (tests generated in a loop; 12 /src imports) |
| render-error-recovery | chromium | Shell / Home / Platform | a render failure shows recovery without user content | 1 | s0 r7 | merge into shell.journey (tiny: 1 test) |
| reset-only.production | production | Account / Cloud / Connection | production retained Notes offers editing without import/export migration controls | 2 | s0 r11 | merge into account.journey (tiny: 2 tests) |
| resident-background-results | chromium | Resident agent (prod) | resident background result binding: … | 1 | s0 r24 | merge into resident-core-loops.production |
| resident-failures.production | production | Resident agent (prod) | a resident reply that fails with … (… frame) says so, offers the next step and sends once | 7+loop | s0 r47 w2 | merge into resident-core-loops.production |
| resident-first-run.production | production | Resident agent (prod) | first run: a neutral loading screen, never Home, until the sign-in page opens | 6 | s0 r28 w1 | merge into resident-core-loops.production |
| resident-recovery.production | production | Resident agent (prod) | recovery waits for explicit restart and a backgrounded review cannot archive or start | 6+loop | s0 r19 | merge into resident-core-loops.production |
| responsive-surfaces.production | production | A11y / Layout | the canvas keeps its own density and takes its arrangement from measured size, not the keyboard | 12 | s0 r62 | keep as basis of responsive layout journey |
| responsive-surfaces | chromium | A11y / Layout | an Inbox message reads in a bounded column and a reply draft survives every size | 9 | s4 r36 clk | merge with responsive-surfaces.production into a11y-layout.journey (different apps per file; one file, both builds) |
| review-visual-viewport | chromium | A11y / Layout | … keeps actions above a visual-only keyboard | 1+loop | s2 r6 | merge into a11y-layout.journey (tiny: 1 test) |
| root-view-states | chromium | A11y / Layout | … …: fresh profile is empty, labelled and keyboard accessible | 3 | s0 r21 | merge into a11y-layout.journey |
| saved-signin-retry.production | production | Account / Cloud / Connection | an unreachable saved sign-in stays available in agent settings and can be retried without replacing its key | 3 | s0 r12 | merge into account.journey |
| scan-correction | chromium | Files / Scan | perspective correction maps a trapezoid using projective sampling | 8+loop | s6 r50 | merge into files-scan.journey |
| scan-document | chromium | Files / Scan | document review adds, reorders, replaces and removes pages then downloads the reviewed order | 8 | s5 r34 | merge into files-scan.journey |
| scan-draft | chromium | Files / Scan | saved draft survives reload and opens without a new image | 9 | s12 r29 | merge into files-scan.journey |
| scan-edges | chromium | Files / Scan | detects … quadrilateral corners without changing image bytes | 5+loop | s5 r34 | merge into files-scan.journey |
| scan-event | chromium | Files / Scan | Camera Scan opens a reviewed event draft and persists only after Calendar Save | 3+loop | s3 r36 | merge into files-scan.journey |
| scan-keep | chromium | Files / Scan | an unconfirmed Keep that the host can resolve once offers Try keeping again, which keeps the photo | 2 | s1 r7 | merge into files-scan.journey (tiny: 2 tests) |
| scan-links | chromium | Files / Scan | recognized links require a current, reviewed click and open without opener access | 2 | s2 r8 | merge into files-scan.journey (tiny: 2 tests) |
| scan-native-page-camera | chromium | Files / Scan | native document entry captures, reviews, retakes and resumes without gallery or a second camera owner | 2 | s0 r31 | merge into files-scan.journey |
| scan-page-camera | chromium | Files / Scan | captured and retaken pages enter the document only after review | 4 | s1 r37 | merge into files-scan.journey |
| scan-pdf | chromium | Files / Scan | reviewed photo PDF downloads a real landscape page with an image and no hidden OCR text | 4 | s4 r10 | merge into files-scan.journey |
| scan-review-keyboard | chromium | Files / Scan | … review supports keyboard reading at large text in … | 1+loop | s3 r2 | merge into files-scan.journey (tiny: 1 test) |
| scan-searchable | chromium | Files / Scan | real local OCR exports only reviewed lines as searchable text | 7 | s4 r35 | merge into files-scan.journey |
| scan-text-draft | chromium | Files / Scan | reviewed lines persist with reordered images and export after reload without recognition | 4 | s6 r43 | merge into files-scan.journey |
| selected-content-question | chromium | Chat / Assistant | normal app reviews selected file before composing … | 1+loop | s2 r14 | merge into chat.journey (tiny: 1 test) |
| selected-content-readiness | chromium | Chat / Assistant | a selected text file offers Ask only after its readable excerpt arrives | 3 | s4 r13 | merge into chat.journey |
| selected-document-accessibility | chromium | Files / Scan | selected document fits large text: … … | 2+loop | s3 r7 | merge into files-scan.journey (tiny: 2 tests) |
| settings-device-facts | chromium | Settings / Device | Settings shows HOME and assistant role state and reads it back after a declined then accepted request | 9 | s0 r39 w4 | merge into settings.journey |
| settings-navigation | chromium | Settings / Device | Back from Licenses returns to About, then to Settings, then Home | 1 | s0 r3 | merge into settings.journey (tiny: 1 test) |
| settings-page-accessibility | chromium | Settings / Device | … Settings hides covered pages and restores keyboard focus | 3 | s0 r45 | merge into settings.journey |
| settings-truth.production | production | Settings / Device | launcher Home asks Android for its own shade and draws no Alpha shade, tiles or brightness | 10+loop | s0 r53 w1 | keep as basis of settings.journey (production) |
| settings.production | production | Settings / Device | production Settings opens every category and its app settings through the displayed controls | 4 | s0 r26 | merge into settings.journey |
| share-panel | chromium | Browser app | common Share panel keeps email/external explicit and retires without fallback | 1 | s1 r10 w1 | merge into browser.journey (tiny: 1 test) |
| shaw-ui-fixtures | chromium | Shell / Home / Platform | confirmed-empty Home hides attention cards and keeps every app entry | 4 | s2 r15 | merge into dev-surface smoke |
| shell-toast | chromium | Shell / Home / Platform | a long toast stays up for its reading time and a short one for 1.9 s | 7 | s0 r10 w5 | merge into shell.journey |
| signed-out-page.production | production | Account / Cloud / Connection | pending native verification and Cancel stay on the mandatory gate | 3 | s0 r14 | merge into account.journey |
| signed-out-page | chromium | Account / Cloud / Connection | development profile remains available without production sign-in gate | 1 | s0 r3 | merge into dev-surface smoke (one assertion: dev build has no sign-in gate) |
| simulator-concurrency | chromium | Shell / Home / Platform | another development tab cannot replace the current writers saved contacts | 4 | s1 r0 | not e2e: simulator internals → delete |
| simulator-recovery | chromium | Shell / Home / Platform | malformed saved apps preserve bytes, isolate recovery and let healthy apps open | 8 | s2 r42 w1 | dev-surface smoke (simulator recovery UI) |
| simulator-save | chromium | Shell / Home / Platform | storage failure keeps Contacts navigable and retains the draft for a successful retry | 2 | s1 r11 | dev-surface smoke |
| source-reference-integrity | chromium | Mail / Inbox | durable library references reject changed stored bytes after the picker capability is released | 1 | s1 r1 | not e2e (module-in-page: 1 /src imports, no user action) → node integration or delete |
| speak-replies | chromium | Voice / Speech | a typed reply never autoplays… | 3+loop | s5 r11 w1 | merge into voice.journey |
| standalone-shell | chromium | Shell / Home / Platform | standalone preview hides simulated system controls and developer tools | 33+loop | s1 r165 clk w8 | keep as basis of shell.journey (33 tests: split navigation vs. per-app cases) |
| startup-access | chromium | Account / Cloud / Connection | required native access keeps focused, reachable controls at narrow widths and large text, with honest limit… | 2 | s3 r14 | merge into account.journey |
| startup-permissions-walkthrough | chromium | Account / Cloud / Connection | recovered original required design/order and Ready … | 4+loop | s4 r17 clk | merge into account.journey |
| storage-usage | chromium + firefox/webkit | Files / Scan | Files shows origin storage estimate and refreshes its actual usage | 2+loop | s2 r13 | merge into storage-contract spec (cross-browser lane) — 2 /src imports |
| subview-accessibility | chromium | A11y / Layout | Inbox subviews retire covered controls and return focus: … | 2+loop | s0 r10 | merge into a11y-layout.journey (tiny: 2 tests) |
| summary-source-note | chromium | Notes | displayed answer requires review and saves exactly edited text with source provenance | 5 | s7 r52 | merge into notes.journey |
| unified-automations | chromium | Workflows | Alpha unified list, filters, paused authoring and explicit owner review use canonical contracts | 6 | s2 r92 clk | merge into workflows.journey |
| upstream-client-features | chromium | Files / Scan | independent hosts use the Files package with isolated databases and their own presentation | 2 | s1 r0 | not e2e: imports upstream plugin-files via /@fs; move to upstream or node integration |
| upstream-map-plane | chromium | Maps | shared map renderer loads its real worker and draws host-styled route geometry | 3+loop | s2 r26 | merge into maps.journey |
| use-in-email.production | production | Mail / Inbox | a resident agent reply is reviewed and placed in a reply draft for the selected email, and nothing is prepa… | 6 | s0 r41 clk | keep (mail.journey: reply from conversation) |
| use-in-email | chromium | Mail / Inbox | reviewed reply fills the selected email's draft and never sends: … | 4+loop | s4 r25 | merge into use-in-email.production (dev version uses development agent; production covers the real resident path) |
| user-selected-settings.production | production | Settings / Device | selected Settings navigation and preferences persist at … | 1 | s0 r42 | merge into settings.journey |
| video-edit | chromium | Photos / Camera / Video | trimmed rotated copy retains audio, original bytes and exactly one receipt after reload | 12+loop | s20 r25 | merge into media.journey |
| video-timestamp-boundaries | chromium | Photos / Camera / Video | trim preserves only the chosen color frames and audio tone across timestamp boundaries | 1 | s1 r0 | not e2e: library boundary check on a fixture module → node integration |
| view-focus | chromium | A11y / Layout | a screen change that drops focus moves it to the screen title, then to the Home region on HOME | 8 | s1 r17 | merge into a11y-layout.journey |
| view-navigation-react | chromium | A11y / Layout | promoted prepared receipt crosses actual React chat, current-client claim and committed Notes acknowledgment | 4+loop | s2 r5 | merge into a11y-layout.journey |
| view-navigation | chromium | A11y / Layout | claimed Notes navigation displays the view and reports only IDs and a confirmed switch | 9+loop | s1 r0 | not e2e (module-in-page: 1 /src imports, no user action) → node integration or delete |
| voice-assistant.production | production | Voice / Speech | production assistant has one Talk control and no dictation launcher | 8+loop | s0 r16 w3 | merge into voice.journey |
| voice-composer-recovery | chromium | Voice / Speech | synthetic voice: one idle mic, full-width synth, mute and Stop preserve visible chat | 11+loop | s3 r51 | merge into voice.journey |
| voice-entry-context | chromium | Voice / Speech | unavailable chat voice preserves the selected note and returns to typing without sending | 1 | s2 r13 | merge into voice.journey (tiny: 1 test) |
| voice-levels | chromium | Voice / Speech | rendered voice bars follow actual microphone amplitude; Home pauses a browser recording and Discard closes … | 2 | s4 r8 | merge into voice.journey (tiny: 2 tests) |
| voice-owned-navigation | chromium | Voice / Speech | canonical own Notes Calendar Home navigation keeps … voice through matching speech and rearm | 8+loop | s11 r14 w7 | merge into voice.journey |
| voice-preparation-ownership | chromium | Voice / Speech | unsigned Cloud conversation reaches account Settings without Notes or microphone: … browser | 2+loop | s0 r15 | merge into voice.journey (tiny: 2 tests) |
| voice-route-preference | chromium | Voice / Speech | Cloud remains the Notes transcription route across reload and legacy local preferences cannot silently swit… | 1 | s2 r2 | merge into voice.journey (tiny: 1 test) |
| voice-save-ownership | chromium | Voice / Speech | owned new voice note save … keeps the recording until the note is confirmed | 1+loop | s3 r5 | merge into voice.journey (tiny: 1 test) |
| voice-stop-speaking | chromium | Voice / Speech | Stop speaking shows only while Alpha speaks and interrupts the reply once | 2 | s1 r3 w1 | merge into voice.journey (tiny: 2 tests) |
| voice-timing | chromium | Voice / Speech | a Cloud conversation turn records one entry-sourced record from recording end to final reply, without first… | 4 | s6 r5 w1 | merge into voice.journey |
| web-summary-note | chromium | Notes | page excerpt becomes a reviewed summary note and reopens its durable web source | 8+loop | s9 r57 | merge into notes.journey |
| workflow-dialog-layout | chromium | Workflows | … … dialog stays usable at compact height and large text | 1 | s5 r6 | merge into workflows.journey (tiny: 1 test) |
| workflow-generation | chromium | Workflows | generated draft requires review, local adoption and separate confirmed Save | 6+loop | s8 r51 | merge into workflows.journey |
| workflow-intent-storage | chromium + firefox/webkit | Workflows | two tabs admit exactly one request for each operation and retain unrelated requests | 9+loop | s14 r11 | merge into storage-contract spec (cross-browser lane) — 14 /src imports |
| workflow-interruption-recovery | chromium | Workflows | repeated and rapid Run taps admit exactly one run | 14 | s10 r107 w1 | keep as basis of workflows.journey |
| workflow-missed-run-now | chromium | Workflows | a missed scheduled time says nothing ran and offers Run now only through the reviewed run confirmation | 3+loop | s2 r30 w1 | merge into workflows.journey |
| workflow-notice-history | chromium | Workflows | compaction frees capacity and preserves exact replay and conflicts after reload | 11+loop | s19 r20 | merge into workflows.journey |
| workflow-notice-lifecycle | chromium | Workflows | history hides the older download when no older copy exists | 5+loop | s12 r3 | not e2e (module-in-page: 12 /src imports, no user action) → node integration or delete |
| workflow-notice-taps | chromium | Workflows | scoped native workflow tap  | 1 | s5 r33 | merge into workflows.journey |
| workflow-notices | chromium | Workflows | cancellation between notification preparation and commit leaves no stored effect | 7 | s11 r8 | merge into workflows.journey |
| workflow-notification-recovery | chromium | Workflows | notification receipt repairs an interrupted journal from … history without reposting | 3+loop | s6 r0 | not e2e (module-in-page: 6 /src imports, no user action) → node integration or delete |
| workflow-open-view | chromium | Workflows | approved navigation opens Workflows only after claim: … | 1 | s0 r18 | merge into workflows.journey |
| workflow-outcome-unknown | chromium | Workflows | checking workflow editing support keeps Run visible and disabled without claiming a run started | 4 | s3 r51 w2 | merge into workflows.journey |
| workflow-presentation-execution | chromium | Workflows | typed Notify and Speak require separate approval and retain … outcome in … | 1+loop | s3 r30 | merge into workflows.journey (tiny: 1 test) |
| workflow-removed-navigation | chromium | Workflows | a fresh Workflows visit reaches the sole removed workflow and restores it only after review | 1 | s2 r10 | merge into workflows.journey (tiny: 1 test) |
| workflow-retirement | chromium | Workflows | workflow retirement does not render against revoked document storage and resumes cleanly | 1 | s0 r2 | not e2e (module-in-page: 0 /src imports, no user action) → node integration or delete |
| workflow-run-context | chromium | Workflows | selected execution receipt sends only its run/version identity through the actual composer | 1 | s0 r19 | merge into workflows.journey (tiny: 1 test) |
| workflow-scope-refusal | chromium | Workflows | unsupported scope is refused before generation | 2 | s3 r17 | merge into workflows.journey (tiny: 2 tests) |
| workflows.production | production | Workflows | the list shows only the agent’s workflows; detail, Run with its receipt, pause and enable | 4 | s0 r24 w1 | merge into workflows.journey |
