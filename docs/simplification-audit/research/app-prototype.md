# Research: `apps/app/src/prototype/` (renderer core)

Scope: `apps/app/src/prototype/` (156 entries incl. 42 fixture images) and how `apps/app/src/main.tsx`
installs it. Read-only audit. Line numbers are against the worktree at `claude/codebase-simplification`.
"Confirmed" means checked in code and grepped repo-wide (`git grep` over `apps android scripts test specs
.github vite.config.ts package.json`); "suspicion" means plausible but not proven.

---

## 1. Area overview

**Size.** 101 `.ts/.tsx` files + `model.js`, `dc-lite.js`, `fixtures.js`, `fixtures.empty.js`, 3 HTML
templates, 4 CSS files, `asset-manifest.json`, `README.md`, `fixtures/img/` (42 images, 4.1 MB).
About **34,200 lines / 3.07 MB of source**. Ten files hold most of it: `model.js` 5,944 lines (446 KB),
`template.html` 4,593 (558 KB), `agent-adapter.ts` 2,099 (206 KB), `camera-adapter.ts` 1,737,
`voice-adapter.ts` 1,523, `settings-adapter.ts` 1,281, `inbox-cloud-adapter.ts` 1,052, `phone.css` 995,
`chat-overlay-motion-adapter.ts` 973, `fixtures.js` 671. 686 source lines exceed 300 characters,
27 exceed 1,000.

**The real architecture (confirmed).**

1. `template.html` is the original design-prototype HTML, which is still the product UI. It uses
   `{{holes}}`, `<sc-if>`, `<sc-for>` and `<sc-element>`. `template-source.ts` splices the dev-only
   `development-rail.html` / `development-system-surfaces.html` into it when `testMocksEnabled`.
2. `dc-lite.js` is a 195-line home-made template interpreter. It parses the template once into an inert
   DOM. On every React render it walks that DOM and calls `React.createElement` for each node, resolving
   holes against a flat "values" object (`DCLogic.render → kids(tpl.childNodes, this.renderVals())`).
   Inline `style="…"` strings are parsed at runtime and cached (`dc-lite.js:22-58`).
3. `model.js` is the design prototype's state machine. `class Component extends DCLogic`
   (`model.js:5189`) holds one big state bag. `registerView(key, def)` (`model.js:122`) fills a global
   `VIEWS` map with 15 view definitions. Each is an object of hooks (`state, persist, render, back,
   onLeave, reply, preset, actions, suggestions, immersive, voicePhrase, jumps, …`; 289 hook entries).
   `renderVals()` (`model.js:5725-5937`) builds the template's value object: shell chrome, chat, voice,
   toast, shade, dev rail. It also calls `VIEWS[view].render(state, api)`.
4. Production behaviour is added afterwards by **~53 `install*` functions** that `main.tsx:122-194`
   calls in a fixed order. They **monkey-patch** two things in place:
   - `Component.prototype` methods. Each install saves the previous method (`const originalSet = p.vset`)
     and assigns a wrapper that calls `originalSet.call(this, …)`. Wrapped methods include
     `componentDidMount` (30 wrappers), `componentWillUnmount` (32), `renderVals` (22),
     `componentDidUpdate` (19), and also `api`, `openView`, `vset`, `send`, `reply`, `startVoice`, …
   - `VIEWS[x]` hooks. Each install saves `views.calendar.render` and assigns a new one. Calendar and
     Notes each end up with **about 10 nested `render` wrappers**.
5. Adapters keep their per-shell state as **ad-hoc fields on the component instance** (241 distinct
   `this.<field> =` names across adapters) and in **module-level closure variables that capture the
   live shell** (`owner = this`, `activeShell = this`, `shell = this`; 25 files).
6. In production every effect adapter is installed. In `fixture` mode (test-mocks builds only, `?fixture=1`
   or mock mode) **none** of them is: `main.tsx:123` `if (!fixture) { … }`. So `model.js` is two things:
   (a) the shell and the presentation logic that adapters still call through, and (b) a complete
   simulated phone with canned replies, seed data and fake effects, used only by test-mocks/dev modes.
7. Fixture data is resolved at build time. A Vite plugin (`vite.config.ts:62-70`) points `./fixtures.js`
   at `fixtures.empty.js` (53 identical export names) unless `ELIZA_DEV_ALLOW_TEST_MOCKS=1`.

**Honest judgement.** This is a strangler-fig migration that stopped half-way. The prototype was never
replaced. It was wrapped about 300 times. Behaviour for one feature is spread across the model, the
template, and several adapters whose effect depends on install order. Adapters talk to each other through
untyped fields on the shell and flags on `VIEWS` objects (`view.automationsManaged`,
`views.calendar.displaySources`). Some adapters **undo** prototype behaviour after the fact: they null out
`reply`, empty the fixture state, and deep-walk render output to replace fake callbacks. Much of
`model.js` is shipped but cannot run in production. The design works and is heavily tested, but nobody
can see from one place what a screen does.

**Simplest sound target reachable incrementally (detail in §5):**
(1) Make install order explicit and declarative.
(2) Add one typed `ShellHost` and `ViewDefinition` contract in place of 45 local `Bag`/`Shell = any`
types.
(3) Replace prototype-method monkey-patching with a small, ordered hook registry on `Component`
(`onMount/onUpdate/onUnmount/decorateValues`). This is mechanical and keeps the same call order.
(4) Give each view **one owner module** that composes its decorators in a visible array.
(5) Move model.js view code that is only reachable in fixture mode into the dev/simulator side, or
delete it.
(6) Replace the native-adapter deep-walk scrubber with explicit overrides in the owning view.
(7) Move inline template styles into CSS classes over time.

None of these steps requires rewriting the UI in React components. That would be the "ideal" end state,
but it is not incremental.

---

## 2. Pattern taxonomy

### P1. Prototype monkey-patch chains ("wrap-and-call-original")
**Looks like:** `const originalUpdate = p.componentDidUpdate; p.componentDidUpdate = function (prev) { originalUpdate.call(this, prev); … }`.
**Why it hurts:** You cannot tell what `componentDidMount` or `renderVals` does without running 30 install
functions in your head in `main.tsx` order. Stack traces are 30 frames of anonymous wrappers. Every wrapper
is a re-entrancy and ordering hazard. TypeScript cannot check any of it.
**Examples:**
- `agent-adapter.ts:281-286` saves `componentDidMount/DidUpdate/WillUnmount/vset/api/renderVals`, then
  replaces them at `:702`, `:1248`, `:1249`, `:1267`, `:1323`, `:1453`. It also replaces the model's
  `reply` (`:1939`), `send` (`:1692`), `cardAct` (`:1952`), `agentSay` (`:1925`), `startVoice` (`:2075`)
  and `stopVoice` (`:2082`) outright.
- `voice-adapter.ts:103-104` `const originalApi = Component.prototype.api; Component.prototype.api = function…`.
  `startVoice` is replaced again at `:924`, after agent-adapter's version.
- `settings-adapter.ts:351` saves `mount, unmount, openView, update`. It wraps `componentDidUpdate` at
  `:675` and **again in the same file** at `:705-710` (`const appearanceUpdate = p.componentDidUpdate`).
- `local-speech-playback.ts:123`: `const p = Component.prototype, original = p.renderVals, mount = …, update = …`.
- `chat-overlay-motion-adapter.ts:308-313` wraps `renderVals/componentDidMount/DidUpdate/WillUnmount`.
- `data-adapter.ts:19-23` wraps `openView`. `:71-72`, `:200-201` and `:224-225` wrap `renderVals` three
  times in one file.
- `maps-adapter.ts:361-363`: "Later adapters wrap renderVals too, so disposal leaves this wrapper in place
  as a pass-through."
**How widespread:** 40 files reassign prototype methods (`agent-adapter` 28, `voice-adapter` 11,
`notifications-adapter` 9, `agent-calendar-adapter` 9, …). 87 `original*/prior*/base*` captures. 30+ files
use `.call(this|shell…)`.
**Treatment:** Add an ordered hook registry to `Component`, e.g. `Component.hooks.mount.push(fn)`, with
`componentDidMount(){ base(); for (h of hooks.mount) h(this) }`, plus a `decorateValues(out, shell)`
pipeline for `renderVals`. Convert one adapter at a time, keeping the current order (the registry order
equals the `main.tsx` order). Methods that are fully *replaced* (`send`, `reply`, `cardAct`, `startVoice`)
should become explicit strategy slots (`shell.agent = agentAdapter`) instead of prototype overwrites.
**Risk/verify:** Wrappers sometimes run code *before* the original (`agent-adapter.ts:703` sets
`notesSourceMode` before `originalMount.call`). Pre- and post-hooks must both be supported. Browser e2e
(`npm run test:browser` and the production variant) is the safety net. Source-regex tests
(§P20) will break.

### P2. View-hook render chains ("onion renders")
**Looks like:** `const render = views.calendar.render; views.calendar.render = (state, api) => { const out = render(state, api); out.x = …; return out; }`.
**Why it hurts:** A view's displayed values come from up to 10 nested functions in different files. Each
can mutate `out`, call `render` with a doctored `state`, or skip the inner call altogether. Nobody owns
the view.
**Examples (calendar, confirmed 10 wrappers):** `calendar-adapter.ts:163`, `reminder-adapter.ts:166`,
`calendar-form-draft-adapter.ts:54`, `calendar-edit-draft-adapter.ts:43`, `note-origin-adapter.ts:63`,
`agent-calendar-adapter.ts:217` **and again** `:310` (`{const inner=views.calendar.render;views.calendar.render=function…}`),
`canonical-calendar-drafts.ts:121`, `calendar-month-focus.ts:7`, plus `native-adapter.ts:389` (generic).
**Notes (≈11 wrappers):** `agent-adapter.ts:2083`, `voice-adapter.ts:1249`, `notes-document-adapter.ts:17`,
`notes-share-adapter.ts:8`, `notes-trash-adapter.ts:218`, `notes-folders-adapter.ts:53`,
`canonical-notes-ui.ts:345`, `note-source-adapter.ts:43`, `note-web-source-adapter.ts:7`, and the
generic `subview-accessibility.ts:36/60`.
**Workflows:** `workflow-adapter.ts:462` (full replace) → `automations-adapter.ts:173` → `clock-adapter.ts:86`
→ `subview-accessibility.ts:36`.
**Widespread:** 38 `*.render =` assignments in 30 files. `back`, `onLeave`, `persist`, `state`, `actions`,
`reply` and `suggestions` are re-assigned the same way.
**Treatment:** Give each view one owner file (`views/calendar/index.ts`) that declares its pipeline
explicitly (`render = compose(baseRender, reminders, formDraft, editDraft, noteOrigin, agentCalendar, canonicalDrafts, monthFocus)`).
Merge decorators that share the same state (the three calendar draft adapters, P11).
**Risk:** The order inside each chain matters (`agent-calendar-adapter.ts:310` must wrap after
`canonical-calendar-drafts`). Capture the current order first with a one-off probe that logs the chain.

### P3. Ordering-dependent installation and traps to stay "outermost"
**Looks like:** Comments such as "Install after …", "Outermost so …", a forward reference to a not-yet-installed
adapter, or an `Object.defineProperty` setter that re-wraps whatever later code assigns.
**Examples:**
- `main.tsx:124-127`: `let selected; installPrototypeNativeAdapters(…{ onSelection: … selected?.(…) }); … selected = installSelectedDocumentAdapter(…)`.
  This is a forward reference that resolves an install-order cycle.
- `native-adapter.ts:400-406`: `Object.defineProperty(settings, 'render', { … set: next => { exposed = finalize(next); } })`,
  commented "Later adapters replace settings.render; keep this honesty pass outermost." Every later
  assignment is re-wrapped, so `honestSettings` runs **once per wrapper layer**. With settings-adapter
  and subview-accessibility that is 3 times per render. It only works because `honestSettings` is
  idempotent.
- `main.tsx:182-192` and `home-overview-cards.ts:112`: "Install outermost among Home adapters".
  `camera-adapter.ts:183`: "Install after native/selection adapters". `selection-adapter.ts:25` and
  `data-adapter.ts:12`: "Install after effect adapters, before mounting".
- `main.tsx:168` versus `:175`: `installWorkflowAdapter/installAutomationsAdapter` are called from two
  places, under `!browserDevProfile` and under `developmentAgentWorkflows`.
**Treatment:** Put a single declarative `ADAPTERS: Array<{id, when, install}>` list in one file, with
`after:` constraints stated as data and checked at start-up in dev builds. Drop the defineProperty trap
once settings has one owner (P2).
**Risk:** Low if the list keeps the current order exactly.

### P4. Untyped state bags (`Bag = Record<string, any>`, `Shell = any`)
**Looks like:** `type Bag=Record<string,any>;` at the top of a file. `model.d.ts` declares
`Component: ComponentType<any>`, `VIEWS: Record<string, any>`.
**Why it hurts:** Fields such as `this.notesSourceMode`, `view.automationsManaged` and
`st.calendarAuthority` are untyped and unchecked. A typo silently becomes `undefined`. `strict: true` in
`tsconfig.json` buys nothing here.
**Examples:** 45 local declarations in this folder: `agent-calendar-adapter.ts:24`,
`automations-adapter.ts:16`, `browser-adapter.ts:20`, `calendar-adapter.ts:15`, `camera-adapter.ts:40`,
`inbox-cloud-adapter.ts:33`, `settings-adapter.ts:42`, `voice-adapter.ts:54`; `Shell = any` at
`agent-adapter.ts:88`, `chat-overlay-motion-adapter.ts:22`, `local-speech-playback.ts:22`,
`use-in-email-review.ts:5`; `reminder-adapter.ts:13` `type Bag = any`. Ten more live in
`apps/app/src/browser/*` (`simulated-apps.ts:11`, `workflow-focus.ts:4`, …). 737 uses of `Bag` and 141
explicit `any` in this folder.
**Treatment:** Add one `prototype/shell-types.ts` exporting `ShellHost` (the methods adapters actually use:
`S, vget, vset, api, setState, toast, live, openView, later`), `ViewApi` (the object `api()` returns,
`model.js:5390-5420`), `ViewDefinition<State, Out>`, and a typed `ShellExtensions` interface listing the
241 instance fields by owner. Migrate one adapter at a time.
**Risk:** None at runtime. The typing work itself will surface latent bugs.

### P5. Ad-hoc instance fields as the cross-adapter bus
**Looks like:** `this.notesStore`, `this.notesRaw`, `this.notesLocalRaw`, `this.notesPending`,
`this.notesStorageFailed`, `this.canonicalNotesUi`, `this.composerDraft`, `this.calendarDraft`, … are
written by one adapter and read by others.
**Examples:** `agent-adapter.ts:703` (`this.notesSourceMode='canonical';this.notesSourceEpoch=0;this.notesStorageFailed=true;…`).
`camera-adapter.ts:197-199` reads `this.notesSourceMode`, `this.canonicalNotesUi`, `this.notesStorageFailed`,
`this.notesPending`, `this.notesStore`. `voice-adapter.ts:108-110` reads `this.notesSourceMode`.
`main.tsx:353-357` calls `owner.flushComposerForAppUpdate`, `flushCalendarForAppUpdate`, … added by four
different adapters, and checks `typeof draft !== 'function'`.
**Widespread:** 241 distinct `this.x =` names in adapters. 101 distinct notes/calendar/composer/voice/
inbox/workflow fields. 23 `this.notes*` fields alone.
**Treatment:** Group them into per-domain objects owned by one module (`shell.notes: NotesController`,
`shell.calendarDrafts`, …), typed through `ShellExtensions`.

### P6. Module-level "current shell" captures
**Looks like:** `let owner:any; p.componentDidMount=function(){ mount.call(this); owner=this; …}` and
renders that read `owner` instead of their arguments.
**Examples:** `calendar-form-draft-adapter.ts:19-21,55`, `settings-adapter.ts:358` (`let owner: any, facts: Bag = {}, …`
plus about 20 more mutable closure variables on one line), `agent-adapter.ts:269` `activeShell`,
`browser-adapter.ts:491` `renderVals = function(){shell=this;…`, `inbox-cloud-adapter.ts` `api = current`
inside render (`:856`), `sms-adapter.ts:246` `api=viewApi`.
**Widespread:** 25 files.
**Why it hurts:** It assumes a singleton shell, but the code also tries to support remounts. Render
functions have side effects on module state.
**Treatment:** When moving to the hook registry (P1), pass `shell` explicitly. Keep per-shell state in
`WeakMap<Shell, State>` or the per-domain controllers (P5).

### P7. Prototype behaviour neutralised after the fact ("undo layers")
**Looks like:** The adapter installs a no-op over a prototype hook, resets fixture state to empty, or
deep-walks render output to replace fake callbacks.
**Examples:**
- `view.reply = () => null` in `inbox-cloud-adapter.ts:59`, `maps-adapter.ts:180`, `browser-adapter.ts:424`,
  `contacts-adapter.ts:123`, `phone-adapter.ts:198`, `sms-adapter.ts:198`, `workflow-adapter.ts:66`.
  This is redundant, because `agent-adapter.ts:1939` already replaces `p.reply` globally:
  `p.reply = function () { return { text: agentPendingText() }; };`.
- `data-adapter.ts:25-34`: an `empty` table resets the `state` of photos/files/phone/messages/inbox/workflows/
  wallet/settings to empty arrays. Production fixtures are **already empty** through `fixtures.empty.js`,
  so this is a second layer of emptying. `:36-40` `wrap()` re-renders phone/messages/inbox with
  `people: []`. `:62-67` wraps **wallet**, which is not reachable in production (P9).
- `native-adapter.ts:291-330` `walk()`: on every render of 13 views it deep-copies the whole output object.
  It replaces every function-valued property by matching `module/key/path` strings
  (`replacement()`, `:255-290`, e.g. `path.includes('controls.') || path.includes('dkeys.')`). It also
  rewrites settings rows by **visible label text**
  (`if (result.label === 'Leaves this device') …`, `if (result.label === 'On-device model') result.val = 'Not reported'`).
  The "honesty pass" stops prototype buttons from doing fake things, but it is coupled to label copy, and
  each render allocates a full copy.
- `native-adapter.ts:390-393` stubs `later/every` on the api so "rendering cannot start a fake phone call,
  navigation timer, capture or booking". That admits the prototype renders have side effects.
- `settings-adapter.ts:737`: `render({ ...state, page: …, acct: null, adding: false, sheet: [...].includes(state.sheet?.kind) ? null : state.sheet }, api)`.
  It calls the prototype with doctored state, then overwrites 20+ output fields.
**Treatment:** In production the effect lives in the adapter, so the fake path should not exist in the
first place. Move fixture behaviour out of the `model.js` views into the dev simulator
(`browser/simulated-*.ts` already does this for wallet, workflows, inbox and messages), or gate it at the
source. Then delete the undo layers.
**Risk:** Medium. Each `walk` replacement must be shown to be either dead (P8) or moved into the owning
view. The visible-label matches must become structured keys.

### P8. Shipped-but-unreachable prototype views and branches ("fixture-only model code")
These are confirmed by reading which adapters fully replace `render` without calling the captured
original.
- **Fully replaced in production** (the model's `render` and most helpers never run when `!fixture`):
  `inbox` (`model.js:779-1130`, replaced at `inbox-cloud-adapter.ts:855`), `maps` (`model.js:2503-2913`,
  `maps-adapter.ts:182`), `phone` (`model.js:139-486`, `phone-adapter.ts:201`), `messages`
  (`model.js:487-778`, `sms-adapter.ts:246`), `workflows` (`model.js:4161-4575`,
  `workflow-adapter.ts:462`; the model version is used only by the dev profile through
  `browser/simulated-workflows.ts`), `browser` (the test-mocks variant `model.js:1693-1889`; production
  registers a 7-line stub at `:1890-1896` whose `render` returns `{}` and is replaced by
  `browser-adapter.ts:432`). In total **≈2,300 of 5,944 model.js lines** (~39%) are reachable only in
  test-mocks/dev modes. Each view's `state/preset/immersive/title` hooks still run.
- **Canned replies:** 14 `reply:` regex responders in `model.js` plus `scriptedReply/copy()`
  (`model.js:106-112`, 52 uses) and `Component.reply/send/startVoice` (`model.js:5633-5719`) are all
  replaced in production (`agent-adapter.ts:1692,1939`, `voice-adapter.ts:924`).
- **Heads-up banner:** `showHeads()` is an empty stub (`model.js:5720-5723`). `headsOpen/headsOk/headsX/headsReply/headsSw/fireHeads`
  (`model.js:5910-5915`) and `headsDone` (`:5436,5454,5463`) have no template binding. `template.html:4512`
  says "No heads-up banner". `headsOpen/headsReply` are referenced nowhere else. `fireHeads` is used only
  by `development-rail.html`. `agent-adapter.ts:1538` overrides `headsOk`. The `HEADS` fixture is only
  read here. This is dead.
- **Quick-settings tiles on Android:** The shade (and therefore `tiles`) renders only when
  `simulatedShade` (`template.html:4518`), and that requires `systemShade === 'simulated'`, i.e.
  `devSurfacesEnabled` (`main.tsx:113`, `model.js:5546`). Nothing else sets `shade: true` except dev
  controls (`main.tsx:330`). So the following never render in production:
  - `agent-adapter.ts:1539-1543` (Android `honestTiles`) and `p.refreshTileFacts/tileAction/displayHandoff`
    (`:1551-1590`), plus `stopTileWatch` (`:707`)
  - the non-Android tile mapping in `agent-adapter.ts:1545-1546`
  - `main.tsx:196-204` `installBrowserCapabilityTiles` (installed exactly in production web builds)
  - `native-adapter.ts` `honestTiles/tileFactsFromSnapshot/tileSettingsPages`
  `test/shade-tile-facts.test.mjs` exercises the pure helpers. **High-confidence suspicion.** Verify by
  adding a production-build assertion that `.tiles` is never read, or by the bundle audit.
- **Dev-rail values computed on every production render:** `jumps`, `subJumps`, `modes`, `legend`,
  `themes`, `toggleFs` and `fs` (`model.js:5817-5835,5928-5935`) are bound only in
  `development-rail.html`. The 28 voice `bars` are template-bound but static.
- **Wallet double-tap on power:** `model.js:5921` (`isMvpView("wallet")` is never true outside the dev
  profile). `secureAdmits` lists `"wallet"` (`:5484`).
**Treatment:** Move each fully replaced view's model code into the test-mocks simulator, or delete it once
the fixture-mode browser tests that rely on it (`test/browser/dev-*.spec.ts`, `mvp.spec.ts`) are migrated
or retired. Gate the rest behind `testMocksEnabled` so the build drops it.
**Risk:** Many browser specs run in `?fixture=1`/`?mode=dev` and assert prototype behaviour. Deleting this
code also deletes those tests' subject. Product decision: does the fixture-mode simulator keep existing?
(§7)

### P9. Deferred-scope code kept "for restoration" (Wallet, AP-13)
PRD AP-13: "Deferred: removed from MVP; views, native adapters and agent actions remain disabled in both
distributions".
- `model.js:3848-4160` (313 lines: `walLuhn`, `walFmtNum`, `walAddTx`, pay/add-card/transit flows) is
  registered only `if (testMocksEnabled)` (`:3919`). It is still in the module, and esbuild can only drop it
  if the helpers are unreferenced.
- `template.html:3231-3526` (296 lines, ~33 KB) is the Wallet markup. It is a raw string, so it **ships in
  every production bundle**.
- Fixtures `WAL_CARDS/WAL_TRIPS/WAL_MERCH/WAL_PASSES` (`fixtures.js`, mirrored in `fixtures.empty.js`).
- `data-adapter.ts:30,65-69`, `native-adapter.ts:83,271`, `agent-adapter.ts:691-695` (wallet → `'passwords'` view
  mapping and `sensitive`), `mvp-features.ts:17,23,30`, `browser/apps.ts:8,10`,
  `browser/simulated-apps.ts:34` (dev wallet simulation), `test/browser/dev-wallet.spec.ts`
  (5 tests of a simulated card wallet), `test/wallet-disabled.test.mjs` (proves it is unreachable).
- `mvp-features.ts:10` "Reference definitions and saved user data are retained".
**Treatment:** Delete Wallet entirely: model, template, fixtures, simulator, dev tests and the
`wallet-disabled` test, which becomes trivially true. Keep only `deferredMvpPrompt` refusing "pay". This is
an owner decision, because "retained for restoration" was an explicit choice.

### P10. Legacy beside canonical (Notes and Calendar "previous/legacy" sources)
**Notes.** Canonical notes are the default ("Canonical is the default; no legacy store/migration/cleanup is
opened", `agent-adapter.ts:772`). A whole second notes engine stays reachable through a "Previous notes"
source switch:
- `legacy-notes-access.ts` (62 lines; `LegacyNotesAbsent/DraftOnly/ReviewRequired`,
  `openExistingBrowserNotes/DeviceNotes`, availability probes).
- `agent-adapter.ts`: 56 matches for `notesSourceMode|legacy|previousNotes`. `p.vset` for notes
  (`:1267-1322`) is a 55-line optimistic store-commit path. In canonical mode its first line refuses list
  writes (`if(key==='notes'&&Object.hasOwn(patch,'list')&&this.notesSourceMode!=='legacy'){…return false;}`),
  so everything after it runs only in legacy mode. `:1325-1331` builds `notesSourceOptions` with
  `{id:'legacy',label:'Previous notes'…}`. `:774-779` `notesCommittedHandler` runs only if `notesSourceMode==='legacy'`.
- Branches in `camera-adapter.ts:197-200`, `voice-adapter.ts:108-110`, `canonical-notes-ui.ts:340,347`,
  `notes-trash-adapter.ts`, `notes-folders-adapter.ts`, `note-origin-adapter.ts`,
  `workflow-authoring.ts`, `agent-calendar-adapter.ts`.
- The legacy-only instance fields: `notesStore, notesRaw, notesLocalRaw, notesPending, notesStorageFailed,
  notesStorageFull, notesCommitUncertain, notesAgentRaw, notesLegacyAbsent, notesLegacySource, notesDraftDeferred`.
- Tests: `test/previous-notes-source-opening.test.mjs`, `test/browser/legacy-notes-access.spec.ts`, and
  about 28 more files mention it.
**Calendar.** `agent-calendar-adapter.ts` (24 "legacy" mentions): `calendarAuthority` `'legacy'|'legacy-google'|'canonical'`,
model statuses `'transition-required'|'legacy-recovery'`, `legacyDayOffset` (`:45`), a "Saved · Read only"
source chooser (`:215`), `legacyCalendarPreservation` (`runtime/legacy-calendar-preservation.ts`), and the
settings recovery rows at `settings-adapter.ts:862-867`.
**Why this is probably deletable:** `legacy-notes-access.ts` was added 2026-10-28. The Android identity
changed to `ai.alphacompute.alphaphone` on 2026-11-09 (`a651d5c74`). The README and PRD say the new
package "starts with its own private data" and "No app-data migration, backup or import/export workflow is
planned". A fresh `ai.alphacompute.alphaphone` install cannot hold pre-canonical notes or pre-canonical
calendar records unless such records were written after 11-09 by this package (they were not: canonical is
the default). The browser dev profile can hold them.
**Treatment:** With owner sign-off, delete `legacy-notes-access.ts`, the legacy `vset` path, the source
switch, all `notesSourceMode` branches and the legacy instance fields, and likewise the legacy calendar
authority. **This is the largest single simplification in the area** (≈400-600 lines across 12 files plus
tests).
**Risk:** It needs a product decision: do any devices still run the *old* package with data that the new
package must read? The PRD says no. Also confirm that nothing in the new package writes
`LEGACY_NOTES_SOURCE_KEYS` (`runtime/notes-secure-store.ts:14`).

### P11. Near-duplicate sibling adapters
- **Three calendar draft adapters:** `calendar-form-draft-adapter.ts` (80 lines),
  `calendar-edit-draft-adapter.ts` (60) and `canonical-calendar-drafts.ts` (143). Each does the same thing:
  wrap mount/update/unmount/render, create an `AssistantDraftController` over `assistantDraftStore`,
  encode/decode a form, anchor its day offset to a civil date, and expose `discard…Draft`. `main.tsx:133-134`
  installs the first two with **identical** `active:` predicates.
- **Twelve notes adapters,** each a small render wrapper on `views.notes`: `notes-document-adapter`,
  `notes-share-adapter`, `notes-trash-adapter`, `notes-folders-adapter`, `note-source-adapter`,
  `note-web-source-adapter`, `note-origin-adapter`, `canonical-notes-ui`, `notes-query-*`,
  `notes-organize-executor`, plus the notes halves of `agent-adapter` and `voice-adapter`.
- **Three adapters on `workflows`**, coordinating through `view.automationsManaged=true`
  (`automations-adapter.ts:44`, read at `workflow-adapter.ts:462`).
**Treatment:** One `calendar-drafts.ts` parameterised by codec and binding key. One notes view owner. One
workflows owner.

### P12. Copied modal/dialog boilerplate despite a shared helper
`source-review-dialog.ts` exports `openReview()`, which handles focus return, `holdPhoneInert`, Back,
abort, visibility and pagehide. Yet `file-email-review.ts:12-15`, `summary-note-review.ts:9`,
`note-web-source-adapter.ts:14` and `note-source-adapter.ts:53` (and outside the folder
`runtime/calendar-sync-settings.ts:205` and `browser/content-question.ts:9`) re-implement it, including
the identical theme-token copy
`const theme=document.querySelector('.os');if(theme){…for(const token of ['bg','fg'])dialog.style.setProperty('--source-'+token,…)}`.
14 files call `document.createElement('dialog')`. `notes-query-review.ts:4-6` defines private
`button/heading/paragraph` element factories.
**Treatment:** Make every review use `openReview`, and add a tiny `dom.ts` (`el(tag, props, children)`).

### P13. Duplicated micro-helpers
- **Civil-day number** `Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())` appears 10 times:
  `calendar-form-draft-adapter.ts:11` **and** `:42` (twice in one file), `calendar-edit-draft-adapter.ts:29`,
  `canonical-calendar-drafts.ts:84`, `calendar-form-inputs.ts:3`, `calendar-interval-presentation.ts:5`,
  `agent-calendar-adapter.ts:47`, `runtime/calendar-form-draft.ts:8`, `browser/workflow-calendar.ts:2`,
  `browser/workflow-receipts.ts:15`.
- **Lucide icon URL** `'/icons/lucide/'+name+'.svg'` is built by hand in 8 files (`inbox-cloud-adapter.ts:863`,
  `media-review-controls.ts`, …). The model instead maps SVG *path data* to icons (P16).
- **`text(value)` coercers** (`native-adapter.ts:84`, `calendar-approval-fields.ts:6`), plus about 20
  inline `typeof x==='string'?x:''`.
- **Session identity comparisons by `JSON.stringify([...session fields])`** appear throughout
  (`main.tsx:102,430`, `agent-adapter.ts:443,1429,1694`, …), each building its own tuple.
**Treatment:** `prototype/util/{dates,icons,session-key}.ts`, or the existing `runtime/` equivalents.

### P14. Rename/re-export shims
- `assistant-draft-controller.ts:7`: `export {DurableDraftController as AssistantDraftController}` with the
  comment "This name is kept for the existing call sites". It has 6 importers.
- `canonical-notes-editor.ts` (1 line, re-exports `NotesEditor`, 1 importer).
- `scan-text-layer.ts` (1 line, `export *`).
- `mock-attention.ts` (4 lines, re-exports `mockAttentionRows` from `./model.js`). Its only importer is
  `data-adapter.ts:2`, which also imports `HOME_DEFAULTS` from `./model.js` directly on the next line.
  `test/support/feature-parity.mjs:387` lists it.
**Treatment:** Inline the imports and delete the shims.

### P15. Defensive programming
- **Idempotence guards for single-call installers:** `data-adapter.ts:9,15-16` and `native-adapter.ts:137-138`
  (`WeakSet installed`). Each installer is called exactly once.
- **Disposers nobody calls:** `installPrototypeNativeAdapters`, `installPrototypeCameraAdapter` and
  `installPrototypeMapsAdapter` return restore functions, and maintain `restore[]` arrays and `disposed`
  flags (`native-adapter.ts:139,394,405-408`, `maps-adapter.ts:362-363`). `git grep` finds no caller using
  the return value in `apps` or `test`. The only test call (`test/native-adapter-activity.test.mjs:30`)
  ignores it.
- **Optional calls on the adapter's own methods,** e.g. `this.closeSummaryReview?.()` and
  `this.cancelReadReplyCompletions?.()`: 42 `this.x?.(` calls in the folder. Also 42
  `typeof x === 'function'` checks (`main.tsx:357`, `native-adapter.ts:387,400`).
- **Silent catches:** 181 `catch{}` / `.catch(()=>{})` / `catch{/* … */}` in the folder.
- **Staleness closures:** 84 `const current=()=>…` / `exact` / `bound` / `belongs` guards, often 3 nested
  (`agent-adapter.ts:443-444,1607,1621-1622,1744`). 19 `live&&!document.hidden` repeats.
- **`IC.x = IC.x || "…"` self-defaults:** 83 in `model.js` (e.g. `:142-148`). This is defending against a
  re-definition that cannot happen in one module.
- `typeof PN !== "undefined"` (`model.js:5802`) tests a module-level `var` declared at `:150`.
- `S()` (`model.js:5309-5315`) rebuilds and filters the whole state on every call (256 `.S()` calls in the
  folder).
**Treatment:** Delete guards for impossible states. Replace staleness closures with one `AbortSignal` per
shell/view lifetime. Rule: `catch` must either handle or rethrow, and a silent swallow needs a reason that
is not "keep going".

### P16. Home-grown template engine with string special-cases
- `dc-lite.js:70-72` hard-codes three template overrides by **attribute text**:
  `if (n === "aria-label" && raw === "{{name}}: summarize this file" && scope.files?.pv?.askLabel) …`,
  `raw === "Stop and save"`, `raw === "{{ic.stop}}"`. These are view logic hidden in the renderer.
- Icons are resolved by **SVG path data**: `ICON_ASSETS` maps `IC[key]` *path strings* to Lucide files
  (`model.js:5943`). `dc-lite.js:139-141` looks up `scope.iconAssets?.[props(...).d]`. Two icons that share
  a path collide, and changing a path silently loses the icon.
- Inline styles: **256 KB of the 558 KB template is `style="…"` attributes** (2,128 lines carry one). They
  are parsed at runtime with a cache (`dc-lite.js:22-58`) that includes special padding/margin shorthand
  expansion. `phone.css` then fights them with **128 `!important`** declarations (e.g. `phone.css:2,5,6,14,76,77`).
  Computed CSS strings are also built in JS (`css: on ? "background:var(--acc);…" : …`,
  `model.js:5782,5820,5823,5827`, `inbox-cloud-adapter.ts:864`, `workflow-adapter.ts:465`).
**Treatment:** Move the three special cases into the view values. Key icons by name, not path. Gradually
move inline styles into classes per view section. That also removes most `!important`.
**Risk:** Visual regressions. Needs screenshot comparison per view.

### P17. Side effects started from render
`inbox-cloud-adapter.ts:859-861` (`queueMicrotask(() => { if (api?.isActive()) void openMailbox(); })` inside
`view.render`), `automations-adapter.ts:174` (`queueMicrotask(()=>void refresh(true))`), `workflow-adapter.ts:462`,
`data-adapter.ts:51-52` (storage refresh), `maps-adapter.ts:363` (`queueMicrotask` in `renderVals`).
61 `queueMicrotask(` calls in the folder. `settings-adapter.ts:855` even calls
**`views.calendar.render(owner.vget('calendar'), owner.api('calendar'))`**, the entire ~10-layer calendar
chain, from inside the Settings render, just to read derived values.
**Treatment:** Move loads to the `onUpdate` hook ("view became active") and expose derived calendar values
from the calendar owner as a function.

### P18. Minified-style density
One-line functions of 1,000+ characters: `agent-adapter.ts:1248` (an entire `componentDidUpdate`
on one line), `:711-712`, `:1425-1428`, `voice-adapter.ts` (max line 2,066 chars), `camera-adapter.ts`
(1,419), `inbox-cloud-adapter.ts` (1,065), `settings-adapter.ts:358`, `main.tsx:100,335,430`. Two
formatting styles coexist: `chat-overlay-motion-adapter.ts` is tab-formatted (avg 40 chars/line), the rest
is hand-compressed. No formatter or linter config exists in the repo (no biome/prettier/eslint files;
`package.json` has no lint script). `model.js` mixes ES5 (`var`, 1,272 `function (` expressions,
`var self = this` ×15) with ES2020+ (`?.`, `??`, classes).
**Treatment:** Adopt a formatter (format-only commit per file, excluded from blame). Do this *after* the
structural moves, to avoid conflicts.

### P19. Run-mode explosion
Branches in this folder depend on `testMocksEnabled`, `devSurfacesEnabled`, `browserDevProfile`
(`?mode=dev`), `fixture` (`?fixture=1`), `mock` (`?mode=mock` or saved selection),
`developmentAgentWorkflows` (`?workflows=agent`), `developerTools` (`?tools=1`), `?shell=launcher`,
`?surface=assistant`, `privateLocalPreviewEnabled`, `isAndroid` and `aospImage` (113 flag references; model.js
16, settings 15, voice 14). `isAndroid` (141 uses) and `Capacitor.isNativePlatform()` (15) express the same
fact. `devSurfacesEnabled` is defined twice (`build-flags.ts:3`, `browser/dev-profile.ts:4`).
**Treatment:** Reduce production to two axes: platform, plus image capability. Keep all simulator modes in
`browser/` behind one `devSimulator` object.

### P20. Tests frozen to the source text of these files (refactor blocker)
323 test files reference prototype paths. 157 read them as text. There are 346 `assert.match/doesNotMatch`
calls on source variables, e.g. `test/agent-always-local.test.mjs:159`
(`assert.match(adapter, /if\(card\.planAction\)\{\n\s+if\(card\.planAction==='plan'\)…/)`),
`test/alpha-client-consumed-approvals.test.mjs:54`
(`/this\.connectionSession = session;\s*alphaClient\.disconnect\(\);/`) and
`test/accessibility-coverage.test.mjs:186,305` (template regexes). Most-read: `browser-camera.ts` (110
test references), `model.js` (77), `agent-adapter.ts` (48), `template.html` (38).
**Consequence:** Every refactor above breaks these tests without changing behaviour. Retire them first, or
together with each refactor, in line with the owner's "no source-text tests" goal.

### P21. Fixture and dev assets inside the product folder
`fixtures.js` (671 lines), `fixtures/img/` (4.1 MB), `development-rail.html`,
`development-system-surfaces.html`, `asset-manifest.json`, and dev branches in production adapters.
The Vite swap works (`vite.config.ts:62-70`) and `scripts/audit-production-bundle.ts` checks it. But
`fixtures.empty.js` must mirror 53 exports by hand (checked by `test/fixtures-parity.test.mjs`), and the
production path still carries code that consumes fixtures (P7, P8).
`asset-manifest.json` is referenced only by `README.md` (confirmed with `git grep asset-manifest`).
`README.md:31` points at a `design` directory that does not exist (`git ls-files | grep ^design/` is
empty). `model.js:119` says "See CONTRACT.md", but no CONTRACT.md exists in the repo.
**Treatment:** Move fixtures, images and dev HTML to `apps/app/src/dev/` (or `browser/`). Have model.js
import fixtures only from simulator modules. Delete the stale doc pointers.

### P22. Deep relative imports into generated upstream output
105 imports of `../../../../.eliza/client-features/...` across 52 files (e.g. `agent-adapter.ts:4,10,11,14,15,25,33,34,52,62,63,65,70`).
`tsconfig.json` already defines `@elizaos/...` path aliases, which 10 files use instead.
**Treatment:** Use the alias consistently. Cross-cutting; the shared-runtime auditor should own it.

### P23. God adapter
`agent-adapter.ts` has 82 imports spanning telephony, SMS, contacts, notes (both engines), calendar,
reminders, maps, photos, files, clock, workflows, camera, browser reviews, passwords and tiles. Its
`componentDidMount` runs from line 702 to about line 1222 (520 lines). It owns composer drafts,
conversation history, notes storage (legacy), device-action routing, voice turns, quick-settings tiles and
Back availability.
**Treatment:** Split by responsibility. Conversation/composer, device-action routing (already partly in
`runtime/*-executor`), notes storage (gone with P10) and tiles (gone with P8) leave the file.

---

## 3. Delete candidates

| Candidate | Evidence | Confidence |
| --- | --- | --- |
| Heads-up banner: `showHeads`, `headsDone`, `heads*` values (`model.js:5436,5442,5454,5463,5720-5723,5910-5915`), `HEADS` and `LOCK_SUM` fixtures, `agent-adapter.ts:1538` `headsOk` | No template binding (`git grep` finds only model.js, fixtures and one dev-rail `fireHeads`). `template.html:4512` "No heads-up banner". `LOCK_SUM` is imported but unused in model.js and anywhere else. `test/home-cards.test.mjs:103` asserts its absence. | Confirmed |
| Android/web quick-settings tile code: `agent-adapter.ts:707,1539-1590`, `main.tsx:196-204`, `native-adapter` `honestTiles/tileFactsFromSnapshot/tileSettingsPages`, `out.shadeN` filter (`agent-adapter.ts:1537`) | Shade and tiles render only when `simulatedShade` (dev). `shade:true` is set only by `openShade` (dev) and `main.tsx:330` (dev controls). | High-confidence suspicion; tested only by `test/shade-tile-facts.test.mjs` |
| Wallet (model `:3848-4160`, template `:3231-3526`, `WAL_*` fixtures, `data-adapter` wallet rows, `browser/simulated-apps` wallet, `test/browser/dev-wallet.spec.ts`, `test/wallet-disabled.test.mjs`, `model.js:5484,5921`) | PRD AP-13 deferred. Not reachable in any product build (`mvp-features.ts:17,23`). | Owner decision |
| Legacy/previous Notes engine (`legacy-notes-access.ts`, the legacy `vset` path `agent-adapter.ts:1268-1322`, `notesSourceOptions`, `notesSourceMode` branches in 10 files, legacy instance fields, related tests) | Canonical is the default. The new package has no migrated data (README, PRD). | Owner decision (strong) |
| Legacy calendar authority (`'legacy'`, `'legacy-google'`, `transition-required`, `legacy-recovery`, `legacyDayOffset`, `runtime/legacy-calendar-preservation.ts`, `settings-adapter.ts:862-867`) | Same argument as Notes | Owner decision |
| `view.reply = () => null` in 7 adapters | `p.reply` is globally replaced (`agent-adapter.ts:1939`), and `Component.reply` is the only caller of view replies (`model.js:5640-5643`) | Confirmed redundant |
| Model `reply:` responders, `scriptedReply`, `COPY.replies`, `VOICE` scripted demo, `Component.send/reply/startVoice` model bodies | Replaced in production. Needed only if the fixture-mode simulator is kept. | Depends on §7 Q1 |
| Fully replaced model views: inbox, maps, phone, messages, workflows, test-mocks browser (≈2,300 lines) | Adapters replace `render` without calling the original (§P8) | Depends on §7 Q1 |
| `data-adapter.ts:25-34` empty-state table and `wrap('phone'/'messages'/'inbox'/'wallet')` | Fixtures are already empty in production. Phone/messages/inbox renders are fully replaced and ignore `api.people`. | Confirmed for wallet. Likely for the rest. |
| `native-adapter.ts` `walk/replacement` branches for phone, messages, inbox, maps, browser, workflows | Those views' renders are fully replaced by later adapters, so the walked render never runs for them | Confirmed by reading the install order. Verify per module. |
| Installer disposers and `WeakSet installed` guards (`native-adapter.ts:137-139,394,405-408`, `data-adapter.ts:9,15-16`, `maps-adapter.ts:362-363`, camera `installViewPresence` return) | No caller uses the return value (`git grep` over `apps`, `test`) | Confirmed |
| Shims `mock-attention.ts`, `canonical-notes-editor.ts`, `scan-text-layer.ts`, `assistant-draft-controller.ts` | Re-exports only | Confirmed |
| Second `componentDidUpdate` wrap in `settings-adapter.ts:705-710`, and duplicate `definition.back` wrap `:353-357` vs `:723-728` | Merge into one | Confirmed |
| Dev-rail values computed in production `renderVals` (`jumps`, `subJumps`, `modes`, `legend`, `themes`, `toggleFs`, `fs`, `rootJustify`) | Bound only in `development-rail.html` | Confirmed (move behind `testMocksEnabled`) |
| `asset-manifest.json` | Referenced only by README | Confirmed unused by code. Keep only if provenance documentation is wanted. |
| `IC.x = IC.x \|\| …` (83), `typeof PN !== "undefined"` | Impossible states | Confirmed |
| Stale doc pointers: `model.js:119` "See CONTRACT.md", `README.md:31` "design directory" | Files do not exist | Confirmed |
| Duplicate `installWorkflowAdapter/installAutomationsAdapter` call site (`main.tsx:168` vs `:175`) | Can become one conditional | Confirmed |

---

## 4. Duplicated types and helpers

| Name | Locations | Proposed home |
| --- | --- | --- |
| `type Bag = Record<string, any>` | 40 files in `prototype/` (list in §P4), 10 in `browser/` | `prototype/shell-types.ts` with real types (`ViewState`, `ViewValues`) |
| `type Shell = any` / `Record<string,any>` | `agent-adapter.ts:88`, `chat-overlay-motion-adapter.ts:22`, `local-speech-playback.ts:22`, `notes-trash-adapter.ts:15`, `notes-folders-adapter.ts:3`, `use-in-email-review.ts:5`, `calendar-approval-adapter.ts:5`, `maps-chat-adapter.ts:55` | `ShellHost` interface |
| View API shape (the object from `model.js:5390-5420`) | Implicit everywhere as `api: Bag` / `current: Bag` / `viewApi: Bag` | `ViewApi` type |
| `ShellPrototype` | `camera-adapter.ts:163` (local) | `shell-types.ts` |
| Civil-day helper | 10 locations (§P13) | `runtime/civil-date.ts` (`civilDay`, `civilDayDiff`) |
| Modal review dialog scaffolding | `source-review-dialog.ts` (canonical), copies in `file-email-review.ts`, `summary-note-review.ts`, `note-web-source-adapter.ts`, `note-source-adapter.ts`, `runtime/calendar-sync-settings.ts`, `browser/content-question.ts` | `openReview` |
| DOM element factories | `notes-query-review.ts:4-6` plus inline `createElement` chains in 14 dialog files | `prototype/dom.ts` |
| Calendar draft adapter skeleton | `calendar-form-draft-adapter.ts`, `calendar-edit-draft-adapter.ts`, `canonical-calendar-drafts.ts` | One `calendar-drafts.ts` |
| Toggle-track style helpers | `api.track/kx` (`model.js:5418-5419`), `stTog` (`model.js:4613`), workflow cards (`workflow-adapter.ts:463`) | One component class in CSS |
| Lucide icon URL builder | 8 files | `icon-style.ts` (already exists one level up) |
| Session identity tuple `JSON.stringify([...])` | `main.tsx:102,430`, `agent-adapter.ts:443,1429,1694`, `agent-calendar-adapter.ts:142`, … | `runtime/session-key.ts` |
| `devSurfacesEnabled` | `build-flags.ts:3`, `browser/dev-profile.ts:4` | `build-flags.ts` (the comment explains Node tests; fix the tests instead) |
| Empty view state | `model.js` `state:` per view versus `data-adapter.ts:25-34` overrides | The view owner's `state` |

---

## 5. Structure / foldering

- **The name `prototype/` is misleading.** It holds the production renderer and most product UI logic.
  Proposed split:
  - `shell/`: `model.js` core (Component, navigation, toast, chat window), `dc-lite.js`, `template*.html`,
    `shell-types.ts`, the hook registry and the declarative adapter list.
  - `views/<view>/`: one owner per view composing its decorators: `calendar/` (15 files today), `notes/`
    (12), `inbox/`, `workflows/` (workflow, automations, clock), `camera/` with `scan/` (9 `scan-*` files),
    `settings/`, `maps/`, `browser/`, `phone/`, `messages/`, `contacts/`.
  - `reviews/`: the 15 `*-review.ts` dialogs on `openReview`.
  - `dev/` (or `apps/app/src/browser/`): `fixtures.js`, `fixtures.empty.js`, `fixtures/img`,
    `development-*.html`, the fixture-only model views.
- **Monoliths to split:** `model.js` (shell vs 15 views vs fixture behaviour), `template.html` (per-view
  partials concatenated at build time; settings alone is 618 lines and 80 KB), `agent-adapter.ts` (§P23),
  `settings-adapter.ts` (also holds pure update-manifest parsing `:153-230` and appearance storage
  `:258-273`, which `main.tsx` imports; these belong in `runtime/`), `camera-adapter.ts` (camera plus photos
  render plus scan plus agent capture API), `voice-adapter.ts` (chat voice plus note recorder plus notes
  render wrapper).
- **Files in the wrong place:** pure runtime/domain modules living under `prototype/`: `locale-time.ts`,
  `files-index.ts`, `note-recorder.ts`, `local-speech-playback.ts`, `home-cards.ts`, `photo-viewport.ts`,
  `calendar-days.ts`, `calendar-form-inputs.ts`, `summary-source.ts` and the `settings-adapter.ts`
  update/appearance helpers. `mvp-features.ts` is product policy (`runtime/` or `product/`).
- **Tiny files to merge:** `notes-share-adapter.ts` (22 lines), `notes-document-adapter.ts` (34),
  `note-web-source-adapter.ts` (28), `notes-recorder-control.ts` (10), `own-notice-question.ts` (18),
  `workflow-notice-question.ts` (30), `system-bar-appearance.ts` (18), `calendar-month-focus.ts` (25),
  `calendar-confirmation.ts` (20), `scan-event.ts` (19) and the 1-line shims (§P14). Merge each into its
  view owner.
- **Misleading names:** `installPrototypeDataAdapter` scrubs fixture state and adds Home cards, but loads
  no data. `native-adapter.ts` is a fixture-honesty scrubber, not a native bridge. `mock-attention.ts`
  is a re-export of model data. `CanonicalNotesEditor` / `AssistantDraftController` are aliases of
  upstream names.

**Sound target reached incrementally (order matters):**
1. Retire the source-text tests that pin these files (P20). Otherwise every later step is noisy.
2. Delete the confirmed dead code (heads-up, redundant `reply=null`, disposers/guards, shims, stale docs).
3. Make install order declarative (P3), with no behaviour change.
4. Add `shell-types.ts` and type adapters as you touch them (P4).
5. Convert prototype monkey-patches to a hook registry (P1), one adapter per commit.
6. Make one owner per view: notes, calendar and workflows first (P2, P11). Merge the calendar draft adapters.
7. With owner decisions: delete legacy notes/calendar (P10) and Wallet (P9). Remove fixture-only model
   views or move them to `dev/` (P8). Collapse `native-adapter` walk and `data-adapter` scrubbing (P7).
8. Mechanical cleanups: format, inline styles to classes, icons by name (P16, P18).

---

## 6. Worst offenders

1. `agent-adapter.ts`: a 2,099-line god adapter, 82 imports, 28 prototype patches, the legacy notes
   store, dead tile code, and a single-line `componentDidUpdate`.
2. `model.js`: 5,944 lines, about 39% unreachable in production, ES5/ESNext mix, 83 `IC||` defaults,
   mutable module globals (`PN`, `PH_T`, `NT`, `CAL_PENDING`, `model.js:5182-5187`).
3. `template.html`: 558 KB, of which 256 KB is inline style. Wallet markup still ships.
4. `native-adapter.ts`: a deep-walk honesty scrubber keyed by paths and label text, plus a
   `defineProperty` setter trap.
5. `settings-adapter.ts`: renders the prototype with doctored state and overwrites it, wraps itself
   twice, calls the full calendar render chain, and mixes in pure update/appearance helpers.
6. `voice-adapter.ts`: 1,523 lines; patches `api`, `startVoice`, `renderVals`, `componentDidUpdate` and
   `componentWillUnmount`, and owns the note recorder and a notes render wrapper.
7. `camera-adapter.ts`: 1,737 lines; owns camera, photos render, scan and the agent capture API; reads the
   legacy notes fields.
8. `inbox-cloud-adapter.ts`: 1,052 lines; fully replaces the model view and starts mail reads from render.
9. `agent-calendar-adapter.ts`: two calendar render wrappers in one file and the legacy calendar
   authority.
10. `main.tsx` (installation section, `:122-204`): about 54 order-dependent installs, a forward reference,
    a duplicate workflow install, and a dead `installBrowserCapabilityTiles`.
11. `data-adapter.ts`: double-empties fixtures, wraps `renderVals` three times, wraps wallet.
12. `dc-lite.js`: string-matched special cases, icon lookup by path data.
13. `legacy-notes-access.ts`: an entire legacy access path (P10).
14. `calendar-form-draft-adapter.ts`, `calendar-edit-draft-adapter.ts`, `canonical-calendar-drafts.ts`:
    triplicated draft logic.
15. `workflow-adapter.ts` + `automations-adapter.ts` + `clock-adapter.ts`: three owners of one view,
    coordinating through flags on `VIEWS`.
16. `phone.css`: 128 `!important` fighting template inline styles.
17. `subview-accessibility.ts`: accessibility focus added by sniffing render-output keys per view
    (`POPUPS` table keyed on `out.menu`, `out.shareSheet`, …).
18. `chat-overlay-motion-adapter.ts`: a different formatting style; patches four lifecycle methods.
19. `fixtures.js` / `fixtures.empty.js`: a 53-export hand-mirrored pair, plus 4.1 MB of images in `src/`.
20. `local-speech-playback.ts`: wraps `renderVals` and three lifecycle methods for playback state.
21. `notifications-adapter.ts`: 9 prototype patches for a feature whose list feeds only the dev shade
    (`main.tsx:141-142`).

---

## 7. Open questions / risks (owner decisions)

1. **Does the fixture-mode simulated phone (`?fixture=1`, `?mode=mock`, `?mode=dev`) stay a product
   requirement?** If not, about 2,300 lines of `model.js`, the canned replies, `fixtures.js`, the 42
   images, most of `browser/simulated-*`, and the many `test/browser/dev-*.spec.ts` can go. If it stays,
   move it out of the production module graph (`dev/`) so production code stops neutralising it (P7).
2. **Legacy Notes and legacy Calendar authority (P10).** Can any `ai.alphacompute.alphaphone` install
   hold pre-canonical records? The PRD and README imply no. If so, delete both paths and their tests.
3. **Wallet (AP-13).** "Retained for restoration" or delete? Deleting is cheap to undo through git.
4. **Phone/Messages/Contacts (AP-08, image only).** The live adapters replace the model views entirely
   (`phone-adapter.ts:201`, `sms-adapter.ts:246`), but `native-adapter`'s phone/messages branches and
   the model's simulated dialer remain. Confirm the native adapters are the only intended
   implementation.
5. **Quick-settings tiles.** Product policy #416 says Android's shade is the only shade. Confirm the tile
   fact/handoff code is not planned for a future in-app surface before deleting it.
6. **Template technology.** The minimal path keeps `dc-lite` and the template. A longer-term move to React
   components per view would remove P16 entirely, but it is a rewrite. Decide whether the target is
   "tidy prototype engine" or "components".
7. **Source-text tests (P20)** must be retired or rewritten as behaviour tests *before* the structural
   refactors. Otherwise each step fails CI for no behavioural reason. This needs coordination with the
   tests auditor.
8. **Ordering risk.** Some wrappers act *before* calling the original (e.g. `agent-adapter.ts:703`). The
   hook registry needs pre- and post-phases, and the declarative order must be validated against
   today's order (log the chain once in a dev build and diff it).
9. **Verification for each step:** `npm run verify`, `npm run test:browser` and
   `npm run test:browser:production` (the production bundle audit covers fixture leakage), plus the
   Android build per AGENTS.md. A green host test is not evidence of device behaviour.
