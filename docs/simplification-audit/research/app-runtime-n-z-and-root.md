# Audit: `apps/app/src/runtime/` (n–z), `apps/app/src/*` root files, `product/`, `passwords/`, `maps/`

Read-only research. Worktree `/Users/nubs/alphaphone/.claude/worktrees/simplify`. The worktree has no
`vendor/eliza` checkout and no `.eliza/` projection, so upstream twins were checked against the
main checkout's `/Users/nubs/alphaphone/.eliza/client-features` (read only, not audited).
Dead-code claims were checked with `grep -rlw <name>` over `apps/ android/app/src test scripts specs`
plus `vite.config.ts` / `package.json` where relevant.

---

## 1. Area overview

- **Size.** 109 files, 6,882 lines. `runtime/` n–z is 71 files / 4,388 lines. 17 of those 71 files are
  ≤15 lines. Root: `main.tsx` (438), `startup-permissions.tsx` (293), `daily.ts` (138),
  `startup-permission-flow.ts` (109), `startup-browser-permissions.ts` (89), `local-speech-playback.ts` (61),
  plus five files under 30 lines. `product/` (4 files, 489 lines), `passwords/` (2 files, 393 lines),
  `maps/` (21 files, 487 lines, of which 9 are one-line `export *`).
- **How it fits together.**
  - `main.tsx` is the composition root. It imports about 75 modules, mostly `prototype/*-adapter.ts`, and
    calls 54 `install*(Component, VIEWS)` functions. Each one monkey-patches methods on the prototype
    class component `Component` from `prototype/model.js`, then mounts `<Phone/>`.
  - `runtime/*` holds the non-UI layer. Its files fall into four groups:
    - Wrappers over upstream elizaOS code projected into `.eliza/client-features`. These are the
      `*-contract.ts`, `voice-*`, `notes-*`, `workflow-*` and `subscription-entitlement` files.
    - Capacitor bridge bindings: `native-*`, `paired-voice`, `note-recorder-driver`, `text-share`.
    - Storage adapters, each choosing between an encrypted Android slot via `secureConnectionStore` and a
      browser JSON document.
    - Protocol clients: `remote-protocol`, `view-navigation`, `owner-reminder-notification-*` and
      `workflow-protocol`.
  - `native-connection.ts` owns the AlphaConnection bridge: secure slots, managed HTTPS requests and Cloud
    credentials, with a full IndexedDB + AES-GCM browser implementation.
  - `product/` is the declarative product registration and the owner route table. `maps/` is mostly
    `plugin-maps` re-exports plus a few Alpha subclasses. `passwords/` is the settings password manager
    and its development vault.
- **Character of the code.**
  - Most real logic now lives upstream. The local files are bindings that pin "installed" storage names
    and module paths that tests import.
  - The remaining local logic is dense: one-line functions with many conditions, lines often over 300
    characters, and heavy staleness fencing. Typical fences are `current()`/`check()` closures, epochs,
    `JSON.stringify` identity compares and `visibilitychange` listeners.
  - There is a lot of legacy and compatibility code even though `docs/prd.md:56-58` says the new package
    "starts with its own private data" and "No app-data migration, backup or import/export workflow is
    planned".

---

## 2. Pattern taxonomy

### P1. Pass-through re-export shims ("module path keepers")
**What it looks like.** A file whose whole body is `export * from '../../../../.eliza/…'`, or a named
re-export list. Some add one wrapper line that closes over an app name or a storage key.

**Why it hurts.**
- It adds a hop to every import.
- It hides which upstream module really owns the behaviour.
- It turns every upstream rename into two edits.
- The comments admit the files exist only for tests: "Alpha keeps this module path for its adapter,
  routes and tests; it adds no behavior of its own" (`runtime/voice-assistant.ts:5`,
  `runtime/voice-turn-routes.ts:7`).

**Examples.**
- `runtime/note-dates.ts:1`, `runtime/notes-contract.ts:1`: whole file is `export * from '…/plugin-notes/src/client/…'`.
- `runtime/reviewed-mail-context.ts:1-7`, `runtime/telephony-actions-contract.ts:6-10`, `runtime/voice-assistant.ts:7-27`, `runtime/voice-turn-routes.ts:9-31`: named re-export lists only.
- `maps/agent-context.ts`, `background-navigation.ts`, `cloud-session.ts`, `contracts.ts`, `device-navigation.ts`, `guidance.ts`, `route-distance.ts`, `runtime.ts`, `screen.ts`: nine one-line `export *` files.
- `runtime/note-audio-lock.ts:3`: `export const withAudioDeletionLock=createNotesDeletionLock('alpha.notes-audio-effects.v1');`, one binding line.
- `runtime/permanent-voice-deletion.ts:9-15`, `runtime/reminder-deletions.ts:11-17`: re-export plus renamed aliases of journal methods (`export const retainReminderDeletion=journal.retain;`).
- `runtime/photo-library.ts:10-12`: three wrappers that only add `APP_NAME='Alpha'`.
- `runtime/notes-trash-policy.ts:28-73`: eleven one-line forwards to `policy.*` (`export function emptyNotesTrash(){return policy.empty();}`).
- `runtime/voice-timing.ts:48-76`: fourteen one-line forwards to `voiceTiming.*`.

**How widespread.**
- 15 files are pure re-exports.
- About 20 more are "re-export + ≤5 binding lines": `phone-dial-contract`, `sms-agent-contract`, `notes-store`, `native-assistant-draft-recovery`, `note-origin`, `native-live-voice`, `native-voice-turn`, `maps/native-location`, `maps/saved-places`, `maps/state`, `maps/cloud-provider`, `workflow-protocol`, `startup-permission-flow`, `startup-permission-progress`, `voice-entry-policy` and others.

**Treatment.**
- Import upstream directly through one alias, such as `@elizaos/…`, which `view-focus.ts` and `product/alpha-product.ts` already use.
- Keep one `alpha-bindings.ts` per domain (notes, reminders, voice) that holds only the product constants: slot names, lock names, app name.
- Delete the pure shims.

**Risk.**
- About 30 tests and scripts import these paths. Examples: `test/voice-turn-routes.test.mjs`, `scripts/test-remote-protocol.ts`, and `maps/runtime` with roughly 100 matches.
- `scripts/prepare-client-features.ts` decides what gets projected.
- Verify that `npm run verify` and the browser specs still resolve.

### P2. Forked upstream twin (local copy of a module that upstream already ships)
**What it looks like.** A local file that re-implements a module which the projection also delivers, and
the two have drifted apart.

**Examples.**
- `runtime/workflow-device-contract.ts:99-181` declares `ApprovalPosterSession`, `ApprovalPosterNative`,
  `definiteNoticeFailure` and `createWorkflowApprovalPoster`, about 85 lines. The only consumer,
  `prototype/workflow-adapter.ts:2`, imports the upstream
  `.eliza/client-features/packages/contracts/src/workflow-approval-poster.ts`, and so do
  `scripts/workflow-renderer-fixture.ts:1` and `test/workflow-approval-poster.test.mjs:2`. The local
  copy has no importer at all. **Confident: dead.**
- `runtime/notes-organize-contract.ts` (68 lines) diverges from the upstream
  `plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts` (188 lines). The
  upstream copy is projected (`scripts/prepare-client-features.ts:300`) and carries its own
  `NOTES_KINDS`, `NOTES_FOLDER_NAME_MAX` and `NOTES_FILTER_TEXT_MAX`. The local one re-derives them from
  `notes-view.ts:10` and `notes-folders-model.ts:10`.
- `runtime/workflow-device-contract.ts:42-46` (`validateWorkflowReminderResult`) and
  `runtime/workflow-reminder-read.ts:27-28` repeat the same "validate, then check
  `kind==='reminders'`" sequence.

**Treatment.** Delete the dead copy. Switch `prototype/agent-adapter.ts:37` and
`prototype/notes-organize-executor.ts:2` to the upstream contract.

**Risk.** The local `NotesKind` is consumed by `notes-view.ts`, and the Notes UI may rely on the local
version's field names. Diff the two before swapping.

### P3. Dual-store slot re-implemented per feature (Android secure slot vs browser document)
**What it looks like.** Each persistent feature writes its own
`const android=()=>Capacitor.getPlatform()==='android'`, then a `read` that branches to
`secureConnectionStore.read(slot)` or `(await browserDoc()).readJson()`, and an `edit` that runs a
compare-and-exchange (CAS) on Android or `editJson` in the browser, with its own "changed" error.

**Examples.**
- `runtime/notes-folders.ts:7-19`
- `runtime/reminder-journal-store.ts:9-19`: already a generic helper, but only reminders use it.
- `runtime/note-audio-deletions.ts:16-28`
- `runtime/notes-trash.ts:16-42`: builds two whole store objects and picks one at call time.
- `runtime/service-read-cache-store.ts:17-22`: another CAS-over-`editJson` adapter.
- `runtime/workflow-intents.ts:19-26`: localStorage slots on Android, a domain document in the browser.
- `notes-trash.ts:49-55` and `note-audio-deletions.ts:29-33`: the same "read saved notes raw" code twice:
  `android()?(await secureConnectionStore.read<{currentRaw:string}>(SECURE_NOTES_SLOT))?.currentRaw:await(await import('./browser-notes-document')).readBrowserNotesRaw()`.

**How widespread.** `secureConnectionStore.compareExchange` appears in 12 files.
`BrowserJsonDomainDocument` appears in 15 files. There are 34 `getPlatform()==='android'` checks in 21
files.

**Treatment.** Make one `durableSlot<T>(slotName, browserKey)` with `read`, `edit` and `capture/reset`,
built from `reminder-journal-store.ts`. Collapse 8 or more call sites. Add a single `readSavedNotesRaw()`.

**Risk.** Browser keys are "installed identity". Keep the exact strings.

### P4. Legacy data and compatibility paths kept although the PRD rules out migration
**What it looks like.** Readers and seeds for storage keys from earlier builds or the prototype, extra
"legacy" selection kinds, and versioned progress formats.

**Examples.**
- `runtime/notes-store.ts:3-5`: `LEGACY_NOTES_KEY='alphaphone:prototype:notes:v1'`, carried into
  `notesStorageKeys.legacy`.
- `runtime/notes-secure-store.ts:12-16`: `LEGACY_NOTES_SOURCE_KEYS=[config.legacy,config.current,config.daily]`
  with the comment "The localStorage keys an empty secure slot migrates from on open", plus `readLegacyDailyNotes`.
- `runtime/phone-context.ts:16`, `:49-52` and `:86-88`: the selection kinds `legacy-app-notes-source`,
  `legacy-app-calendar-source` and `legacy-app-calendar-event`, with `accountId:'device-local-legacy'`.
  These are fed by `prototype/agent-adapter.ts:590,655` and `prototype/legacy-notes-access.ts`.
- `runtime/workflow-intents.ts:37-44`: `legacy()` seeds the browser document from older per-key localStorage slots.
- `startup-permission-progress.ts:6-15`: four historical walkthrough versions are kept ("2 the historical
  five-step native list…").
- `startup-permissions.tsx:36-48`: a second key, `alpha:startup-permission-progress:v1`, is read from
  `sessionStorage` as a fallback ("Session progress from before the durable marker").
- `runtime/service-read-cache-store.ts:8-9,23-27,39-40`: `sharedMailKeys` and `retireSharedMail` erase
  mail snapshots from "before mail had its own document", on every app start.
- `runtime/native-connection.ts:256-266`: `removeStoredCloudCredential` "removes the Cloud key an
  earlier build stored".
- `runtime/note-origin.ts:25-39`: `voiceNoteChanged` also accepts "a link made before content revisions".
- `runtime/phone-context.ts:106-129`: `phoneContextMessage`, the "Legacy compatibility envelope", which
  is sent only to unnegotiated peers in test-mocks builds.
- `product/alpha-product-registration.ts:325`: `legacyIds: { home: "chat", workflows: "automations", wallet: "inventory" }`.
- Related, outside this file range: `runtime/legacy-calendar-preservation.ts` (used by
  `prototype/agent-calendar-adapter.ts:15,151`).

**Why it hurts.** Every legacy path brings validators, test fixtures (for example
`test/fixtures/previous-notes-source-opening.mjs` and `test/notes-owner-retirement.test.mjs`) and agent
context kinds. The "previous notes" source keeps a second Notes authority alive next to canonical Notes.

**Treatment.** After the owner decides (see §7), delete:
- the legacy keys and the migration-on-open,
- the `legacy-app-*` context kinds,
- historical progress versions 1–3,
- the sessionStorage fallback,
- `retireSharedMail`,
- the `phoneContextMessage` envelope.

**Risk.**
- `README.md` asks to "verify updates and data retention between builds with the new package ID". Only
  keys written by shipped builds of `ai.alphacompute.alphaphone` need preserving.
- The prototype-era `alphaphone:prototype:*` and `alphaphone:daily:v1` keys predate that package.

### P5. Constant feature switches that are always off (or always on) and their dormant branches
**Examples.**
- `runtime/voice-entry-policy.ts:2`: `externalVoiceInvocationEnabled = false`. This gates
  `main.tsx:430` (`installListenerInvocation` is never installed), `runtime/always-on-listener.ts:27,49,72`
  and `prototype/settings-adapter.ts:450,777,1033`. The whole wake-listener invocation path is
  unreachable code.
- `runtime/voice-selection.ts:38-40`: `CLEF_ENDPOINT_ENABLED=false` and `clefEndpointStage()` always
  returns `{enabled:false,client:null}`, but `createEndpointChain` still carries the Clef stage
  (`voice-turn-routes.ts:22-31`).
- `runtime/voice-selection.ts:20-29`: `VOICE_SEND_POLICY='auto-send'` plus the test-only override
  `setVoiceSendPolicyForTests`.
- `build-flags.ts:11`: `updateChannelCheckEnabled = false as boolean`. The `as boolean` is there only to
  stop the compiler from folding the branch.
- `runtime/phone-context.ts:146-148`: the comment says `notes.organize.v1` "waits for the pin", so the
  capability is never negotiated. Yet `notes-organize-contract.ts` and
  `prototype/notes-organize-executor.ts` stay wired in `prototype/agent-adapter.ts:1055`.
- `runtime/phone-context.ts:161`: `telephonyDeviceCapabilities({…contactLookup:false})` is hard-coded off.

**Why it hurts.** The code paths still cost reading, typing, tests (`test/voice-in-chat-only.test.mjs`
regex-matches the dormant branch in `main.tsx`) and review effort.

**Treatment.** Delete the dormant branch and keep the decision in the PRD or an issue. Upstream already
owns the reusable code.

**Risk.** Owner intent: P-78 and #663 are explicit "keep dormant" decisions. Confirm before deleting.

### P6. Test-mocks-only product subsystems living in production modules
**What it looks like.** Large features that only `ELIZA_DEV_ALLOW_TEST_MOCKS=1` can reach, compiled into
every build and threaded through production code.

**Examples.**
- `runtime/remote-protocol.ts` (338 lines): remote-agent pairing. `connection-ui.tsx:1138` throws
  `pairingRetired()` unless `testMocksEnabled`. The PRD says "No hosted-agent pairing" (`docs/prd.md:17`).
  Its leaf helpers (`conversationRoomId`, `turnAbortPath`, `messagePageQuery`, `conversationViewHeaders`)
  are also used by the production `local-agent.ts:14`.
- `runtime/paired-voice.ts`: paired-agent speech. `native-reading-voice.ts:28-30` reaches it only after
  `if(!testMocksEnabled)return null`. `note-recorder-driver.ts:89-93` has an `'agent'` branch, but
  `selectVoiceRoute()` (`voice-selection.ts:127-134`) never returns `'agent'`, so that branch is
  unreachable in every build.
- `runtime/native-recovery-backup.ts:7`: `if(!testMocksEnabled)throw Error("App-data backup is unavailable.")`.
  This is an app-data backup exporter that the PRD rules out.
- `passwords/password-manager.ts:54-59,245-247`: password import/export ("Transfer") only with
  `testMocksEnabled`. The PRD rules out import/export.
- `runtime/native-connection.ts:156-159`: the development HTTP and device headers allowlist.
- `maps/regional-provider.ts:8-35`: the Monaco regional dataset and gateway (`10.0.2.2:47850`), test-mocks only.
- `main.tsx:105-120,288,316,323-335,408-421`: mock mode, the banner and device controls inlined in the root.

**Treatment.**
- Move the test-mocks surfaces behind `vite.config.ts` disabled-module stubs, as `browser/device-controls`
  already is, or into `browser/dev/*`.
- Move the shared conversation helpers out of `remote-protocol.ts` into `local-agent`.
- Delete backup and transfer.

**Risk.** Many tests and fixtures (`scripts/fixtures/workflow-host.ts`, `scripts/test-connection-history.ts`)
drive the agent through `RemoteProtocol.pair`. They would need a different harness.

### P7. Per-call-site Capacitor plugin typings (no single bridge definition)
**What it looks like.** The same native plugin is registered in many files, each with its own partial
inline interface or `any`.

**Examples.**
- `AlphaVoiceCloud` is registered in 16 files with different shapes:
  - `paired-voice.ts:7-17`,
  - `note-recorder-driver.ts:16-27`,
  - `native-reading-voice.ts:7` (`registerPlugin<any>`),
  - `local-speech-playback.ts:7,58` (`<any>` twice),
  - `startup-permissions.tsx:21`,
  - `workflow-presentation.ts:46` (registered via `@capacitor/core` directly, which skips `platform-plugins.ts`).
- `DailyApps` is typed in `daily.ts:56-138` and registered again with a different shape in
  `startup-permissions.tsx:16-20`.
- `AlphaDevice` is registered in 18 places (`text-share.ts:3`, `startup-permissions.tsx:25`,
  `main.tsx:181,372` and others).
- `ElizaLocation` appears in `startup-permissions.tsx:22` and `maps/native-location.ts:5`.
- `native.ts:26`: `(System as unknown as { openAppInfo(...) })`.
- There are 16 `registerPlugin<any>` calls repo-wide.

**Why it hurts.** No compile-time check catches a renamed native method. Each file invents its own subset.

**Treatment.** Add one `native/plugins.ts` that exports typed singletons per plugin, merged with
`daily.ts` and `native.ts`. Ban direct `@capacitor/core` `registerPlugin`.

**Risk.** Low. The change is types only, but check the browser `web:` implementations in
`browser/register.ts`.

### P8. Re-derived platform predicates and PluginHeaders sniffing
**Examples.**
- 215 `Capacitor.isNativePlatform()` calls and 34 `getPlatform()==='android'` calls are used
  interchangeably. iOS is not a target, so the two differ only in theory.
- `native.ts:14` exports `isAndroid`, yet most files recompute their own (`notes-trash.ts:16`,
  `note-audio-deletions.ts:16`, `reminder-journal-store.ts:10`, `workflow-intents.ts:19,36`).
- `(Capacitor as typeof Capacitor&{PluginHeaders?:…})` casts appear 9 times:
  `native-connection.ts:14,18,25,217`, `native.ts:21`, `main.tsx:369`.

**Treatment.** Export `isAndroid` and `pluginHeader(name)` / `pluginHasMethod(name,method)` from one
place.

### P9. Duplicated SHA-256-hex helper
**What it looks like.**
`Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x))),b=>b.toString(16).padStart(2,'0')).join('')`.

**Examples in this area.**
- `sms-agent-contract.ts:4`
- `native-recovery-backup.ts:11`
- `native-calendar-sync.ts:34`
- `owner-reminder-notification-protocol.ts:29`
- `service-read-cache-store.ts:18`
- `note-origin.ts:32-33`

**Repo-wide.** About 25 copies, including `assistant-draft-store.ts:14`, `inbox-local-store.ts:13`,
`google-accounts.ts:338`, `reminder-adapter.ts:256,378,428`, `browser/*` and others. Upstream also exports
`workflowSha` (`workflow-device-contract.ts:28`).

**Treatment.** One `sha256Hex(text|bytes)` in a shared util, or reuse `workflowSha`.

**Risk.** None, apart from keeping the canonicalisation (`JSON.stringify` vs `canonical()`) at call sites.

### P10. Duplicated local `any` bags and ad-hoc structural types
**Examples.**
- `type Bag=Record<string,any>` is declared in about 60 files repo-wide, including
  `passwords/password-manager.ts:23` and `runtime/reminder-creations.ts:7`, where it feeds `reminderEvents():Bag[]`.
- `type Shell=any` appears in 6 prototype files.
- `type Request=(path,body,signal)=>Promise<unknown>` appears in `runtime/view-navigation.ts:12`,
  `maps/resident-relay.ts:7` and `runtime/device-view-profile.ts:7`.
- The local `Binding` in `paired-voice.ts:6` duplicates `connection-ui.tsx:2531`'s
  `getPairedVoiceBinding()` return type.
- The local `Note` structural type in `notes-view.ts:8` and `FolderNote` in `notes-folders-model.ts:64`
  sit beside the shared `NoteRecord`.
- `BrowserDocument` is spelled out inline in `reminder-journal-store.ts:4` and again in
  `notes-folders.ts:7`.

**Treatment.** One `ShellApi` / `ViewModel` type for the prototype shell, one `OwnerRequest` type, and
`NoteRecord` everywhere. See §4.

### P11. Liveness fences repeated in every async operation
**What it looks like.** Each operation builds its own `check()` / `current()` closure. Typical parts are
`document.hidden`, `connectionController.getSnapshot().open`, a `JSON.stringify(binding)` compare, a
`visibilitychange` listener, a `connectionController.subscribe` listener, an `AbortController` link and
a timeout, all with manual add/remove.

**Examples.**
- `native-reading-voice.ts:18-25`
- `paired-voice.ts:22-35`
- `prototype/local-speech-playback.ts:30-39` (`speakOnDevice`)
- `native-calendar-sync.ts:25-28`
- `text-share.ts:5-7`
- `view-navigation.ts:84-89,165-178,233-235`
- `source-renewal-question.ts:10-38`
- `owner-reminder-notification-port.ts:19,73`
- `maps/navigation-voice.ts:50-55`: compares eight snapshot fields for staleness.
- `native-connection.ts:294-326`

**Why it hurts.** The same protocol is hand-rolled about 15 times. Listener leaks and missed removals are
easy to introduce, and the files become hard to read.

**Treatment.** One `ownedOperation({signal, timeoutMs, watch: [visibility, connection], current})`
helper that returns `{signal, check, dispose}`. Upstream `createNativeSpeechRequests`
(`paired-voice.ts:26`) is already part of this.

**Risk.** Semantics differ subtly per site: some abort on hide, others defer. Each site needs its own
browser spec.

### P12. Minified-style density and mixed formatting
**What it looks like.**
- 74 lines over 300 characters in this area. Worst files: `phone-context.ts` (9), `share-panel.ts` (8),
  `native-calendar-sync.ts` (8), `startup-permissions.tsx` (7), `main.tsx` (5),
  `owner-reminder-notification-protocol.ts` (4), `local-speech-playback.ts` (4).
- Single-character or no indentation, and many statements chained with `;` on one line.

**Examples.**
- `share-panel.ts:38`: `finish` removes 7 listeners, restores focus and resolves, all on one line.
- `share-panel.ts:33`: a geometry calculation over 400 characters.
- `local-speech-playback.ts:22`: `dispose` is a chained `Promise.all` of ternary spreads.
- `owner-reminder-notification-protocol.ts:40`: one `if` with 15 OR-ed validity conditions.
- `owner-reminder-notification-port.ts:30-33`: the state machine is compressed into 3 lines.
- `native-calendar-sync.ts:36,45`: whole methods on one line.
- `view-navigation.ts` mixes tab, 4-space and 2-space indentation in one class (`:27-55` vs
  `:220-252` vs `:253-425`). Clearly several authors and no formatter.

**Treatment.** Run Prettier over the app source once (it is not enforced today), then refactor the
worst functions into named predicates.

**Risk.** Some tests regex-match source text (see P15), so a reformat breaks them.

### P13. Swallowed errors and "best effort" without reporting
**Count.** 34 empty `catch{}`, `.catch(()=>{})` or comment-only catches in this area.

**Examples.**
- `main.tsx:227,260,375` (`watchMountedAppUpdates(...).catch(() => {})`). The comment there says
  "Android still requires this WebView's receipt and refuses to commit", so an update gate failure is
  silent.
- `native-connection.ts:278,281,300`: native cancel failures are dropped.
- `native-view-events.ts:9-12`: the `quiet()` wrapper swallows both sync and async failures.
- `owner-reminder-notification-port.ts:16,24`: `try{next=this.source?.binding()??null;}catch{}`.
- `telephony-executor.ts:111`: a contact read failure is skipped with `/* skipped */`.
- `workflow-device-contract.ts:162-163`: dead code anyway (P2).
- `source-renewal-question.ts:19`: `void o.settle(true).catch(()=>{})`.
- `workflow-presentation.ts:55`: `catch { signal.throwIfAborted(); return 1; }` silently downgrades the protocol.
- `native-calendar-sync.ts:40`: `cancel(){…void bridge().sync({kind:'cancel'}).catch(()=>{});}`.
- `passwords/password-manager.ts` has two such catches.

**Treatment.** Keep a deliberate catch only where a comment says why the failure is safe. Otherwise
route failures to the crash log or diagnostics (`runtime/crash-log.ts` exists). Give
`quiet`/`bounded` one shared definition.

### P14. Defensive re-validation of trusted in-process values
**What it looks like.** Validation of values that come from this process's own typed code, or of
shapes the type system already guarantees.

**Examples.**
- `owner-route-policy.ts:6-9`: validates the compile-time constant table at load.
- `product/native-cloud-runtime.ts:8`: `if(!characterName.trim()||!appName.trim())throw` on a literal registration.
- `icon-style.ts:7`: throws at render time on an unknown icon name. A typed union from
  `icon-catalog.json` would catch this at build time.
- `notes-folders-model.ts:42-60`: `addNotesFolder` and `renameNotesFolder` re-validate the whole document
  on input and output (`validateNotesFolders(...)` three times per edit). `notes-folders.ts:16-18` then
  validates again.
- `text-share.ts:8-11`: `selectedText` re-checks `typeof input.title!=='string'` on a typed parameter.
- `notes-view.ts:14-20`: `strings()` and `transcript()` guard every field of a `NoteRecord` as `unknown`.
- `remote-protocol.ts:65-77`: `object()`, `string()` and `boolean()` validators. These are defensible
  at a network boundary, so this is not a target.

**Treatment.** Validate once at the trust boundary (native bridge, network, storage read). Use the
types inside.

**Risk.** Some checks are deliberate defence against corrupt storage. Keep validation at decode, drop it
on edit.

### P15. Test-harness-shaped production source
**What it looks like.** Production code bent so that Node tests can `vm.runInNewContext` the
type-stripped source, or so tests can regex-match its text.

**Examples.**
- `voice-selection.ts:8`: "Plain constants and function exports only: Node contract tests evaluate this source directly."
- `voice-timing.ts:37`: "Function declarations only: Node contract tests evaluate this source."
- `remote-protocol.ts:78-81`: `import.meta.env === undefined ||` exists only because tests import
  without Vite. `native-connection.ts:156` and `build-flags.ts:5` do the same.
- Source-text tests:
  - `test/voice-in-chat-only.test.mjs:34,35,64` asserts exact `main.tsx` and `always-on-listener.ts` text;
  - `test/settings-truth.test.mjs:20` regex-matches `build-flags.ts`;
  - `test/live-voice.test.mjs:130` and `test/one-runtime-profile.test.mjs:71-73` do the same.
  - 34 test or script files `readFileSync`/`read` sources in this area.
- Test-only exports from production modules:
  - `setVoiceSendPolicyForTests`, `setVoiceTimingClock`, `clearVoiceTiming` and `voiceTimingRecords` (test-only, `src=0`);
  - `validateWorkflowReminderResult` and `parseWorkflowPhoneReview` (`workflow-device-contract.ts:42,47`, test-only);
  - `memorySecretBackend`, `indexedDbSecretBackend`, `durableSecretsWithFallback` and `createBrowserConnection` (`native-connection.ts:61,71,130,162`, used by tests only from outside the file).

**Why it hurts.** Refactors break tests that assert text, not behaviour. That locks in shapes, density
and dead branches.

**Treatment.** In line with the owner's test policy, delete source-text tests. Test through the browser or
integration harness instead, and drop the code contortions.

### P16. Composition-root sprawl and monkey-patch installers
**What it looks like.** `main.tsx` imports about 75 modules and calls 54 installers that rewrite
`Component.prototype` methods (`main.tsx:122-194`), plus an inline `installBrowserCapabilityTiles`
(`:196-204`). It also holds inset caching (`:206-218`), layout math (`:264-319`), the dev-tools command
switch (`:323-335`), the app-update gate (`:343-378`), mock-mode admission (`:408-421`) and toast plumbing.

**Specific smells.**
- `installWorkflowAdapter` and `installAutomationsAdapter` are installed in two places under opposite
  conditions (`:168` and `:175`).
- `testMocksEnabled && mock` is checked repeatedly although `mock` already implies `testMocksEnabled`
  (`:111`, `:120`, `:288`, `:316`, `:335`, `:408`).
- Three separate `if(!browserDevProfile)` blocks sit back to back (`:157,160,168`).

**Treatment.** Split `main.tsx` into `bootstrap/adapters.ts` (an ordered list), `bootstrap/layout.ts`
(the `size()` effect), `bootstrap/app-update.ts` and `dev/mock-mode.ts`. Collapse the redundant guards.

### P17. Registry declared but not consulted
**What it looks like.** `product/alpha-product-registration.ts:328-338` declares `storage.retained`, the
"installed" key names (`alpha.startup-permissions.v1`, `alpha:startup-permission-walkthrough:v1`,
`alphaphone:daily:v1`, `alpha.connection.selection.v1`, `alpha.appearance.v1`). Consumers still
hard-code the literals:
- `startup-permission-flow.ts:48`
- `startup-permission-progress.ts:11`
- `notes-secure-store.ts:12`
- `main.tsx:106`, plus 11 other files for `alpha.connection.selection.v1`.

Only `launcherBuiltinPrefix` is read (`prototype/home-shell.ts:76`).

**Treatment.** Read the keys from the registration, or drop the `retained` block. One source of truth.

### P18. Inconsistent upstream import mechanisms
**What it looks like.** Three ways to reach the same upstream code:
- `@elizaos/...` aliases (`view-focus.ts:22`, `product/alpha-product.ts:16`, `native.ts:4`);
- `../../../../.eliza/client-features/...` (most files);
- `../../../../vendor/eliza/...` directly (`passwords/password-manager.ts:7-10`, `passwords/dev-vault.ts:1-2`, `native.ts:3`).

Imports that bypass the projection undermine `upstream.lock.json` and the bundle audit's assumptions.

**Treatment.** One alias (`@elizaos/*` mapped to `.eliza/client-features`) and a lint rule.

### P19. Dangling references in comments
**What it looks like.** Eight comments cite `PLAN.md` ("PLAN.md section 3, decision N1",
`notes-folders-model.ts:2`, `notes-view.ts:4`, `notes-organize-contract.ts:6`,
`notes-trash-policy.ts:6`). No `PLAN.md` exists in the repo (`find . -name PLAN.md` returns nothing).
Many comments also cite issue numbers and policy IDs (P-78, #423, MVP-15, A-10, F1, N2) with no index.
Comments often run longer than the code they describe (`voice-timing.ts:2-38`, 36 lines for 14
one-line forwards).

**Treatment.** Point to `docs/prd.md` or specs, or delete. Keep comments to the "why".

### P20. Misleading names and same-named files
**Examples.**
- Two `local-speech-playback.ts` files. `src/local-speech-playback.ts` (61 lines) is the native playback
  primitive (`speakLocalText`, `playOwnedSpeech`, `confirmSpeechRetirement`).
  `prototype/local-speech-playback.ts` (319 lines) is the shell read-aloud adapter, and it imports the
  first file (`:4`).
- `reminder-deletions.ts` holds "cancel, complete, snooze and edit requests", not just deletions (`:4-6`,
  "Keep the installed slot… they hold every pending reminder action").
- `PendingReminderDeletion=PendingReminderAction`.
- `note-audio-lock.ts` exports a lock also used for all Notes Trash writes (`notes-trash.ts:25`
  re-exports it as `withNotesDeletionLock`).
- `native-connection.ts` is mostly the browser connection (IndexedDB vault, fetch).
- `workflow-presentation.ts` handles workflow protocol negotiation.
- `notes-store.ts` and `notes-secure-store.ts`: the "secure" one is the real store. The other only binds
  legacy keys.
- `daily.ts` is the `DailyApps` plugin typing plus the `Reminder` and `Action` domain types.

---

## 3. Delete candidates

| Candidate | Evidence | Confidence |
|---|---|---|
| `runtime/workflow-device-contract.ts:99-181`: `ApprovalPosterSession`, `ApprovalPosterNative`, `definiteNoticeFailure`, `createWorkflowApprovalPoster` (~85 lines) | Only consumer `prototype/workflow-adapter.ts:2` imports the upstream `.eliza/…/workflow-approval-poster.ts`; tests and scripts import upstream too; `grep -rlw createWorkflowApprovalPoster apps scripts test` shows no import of the local symbol | **High** |
| `runtime/workflow-device-contract.ts:42-46` `validateWorkflowReminderResult` and `:47-50` `parseWorkflowPhoneReview` | `src=0`; used only by `test/workflow-reminder-contract.test.mjs` and `test/workflow-output-contract.test.mjs`; production uses `workflow-reminder-read.ts` and upstream directly | High (delete with their tests) |
| `runtime/note-recorder-driver.ts:84` `browserDevProfile && selected==='agent'` and `:89-93` paired branch | `selectVoiceRoute` (`voice-selection.ts:127-134`) returns only `device`/`cloud`/`manual`; callers pass `'cloud'` explicitly (`scripts/test-cloud-voice-flow.ts:77`) | High |
| `'agent'` in `VoicePreference` and in `selectVoiceRoute`'s return type | Tests assert `'agent'` maps to `'cloud'`/`'device'` (`test/voice-selection.test.mjs:115,148,154`), so the value is a no-op alias | Medium |
| `main.tsx:430` `installListenerInvocation` branch; `runtime/always-on-listener.ts` invocation path; `voice-entry-policy.ts` | `externalVoiceInvocationEnabled=false` constant | Medium (owner: P-78 says keep dormant) |
| `voice-selection.ts:31-40` Clef stage switch | Constant false; client is always `null` | Medium (owner #663) |
| `voice-selection.ts:14-29` send-policy switch and `setVoiceSendPolicyForTests` | Constant `'auto-send'`; the override is test-only | Medium |
| `build-flags.ts:7-11` `updateChannelCheckEnabled` | Constant false; comment says "the product does not check for updates" | Medium |
| `runtime/native-recovery-backup.ts` (16 lines) and its caller in `browser/domain-recovery.ts:24-25` | Throws unless test-mocks; the PRD says no backup | Medium (owner) |
| Password import/export (`passwords/password-manager.ts:54-59,133-136,245-247`) | Test-mocks only; the PRD says no import/export | Medium (owner) |
| `runtime/remote-protocol.ts` `RemoteProtocol` class (pair/restore/revoke/abortTurn/send, lines 94-296) | Reachable only through `connectRemote`, which throws without test-mocks (`connection-ui.tsx:1138`); PRD: "No hosted-agent pairing". Keep the leaf helpers (`conversationRoomId`, `turnAbortPath`, `turnAbortOutcome`, `messagePageQuery`, `conversationViewHeaders`) that `local-agent.ts:14` uses, and move them there | Medium (large test harness depends on it) |
| `runtime/paired-voice.ts` and `getPairedVoiceBinding` consumers | Paired sessions exist only through RemoteProtocol pairing (test-mocks) | Medium |
| `runtime/phone-context.ts:106-129` `phoneContextMessage` legacy envelope | Its comment says it is sent only to unnegotiated peers in test-mocks builds and is "otherwise used only to recognize history stored by older builds" | Medium |
| Legacy notes chain: `notes-store.ts` `LEGACY_NOTES_KEY`/`notesStorageKeys.legacy`; `notes-secure-store.ts:12-16` `LEGACY_NOTES_SOURCE_KEYS`, `readLegacyDailyNotes`; `phone-context.ts` `legacy-app-notes-source` branch; `prototype/legacy-notes-access.ts`; the "previous notes" source mode in `agent-adapter.ts` | PRD: no app-data migration; the new package starts empty | Owner decision |
| `phone-context.ts:49-52` `legacy-app-calendar-*` kinds and `runtime/legacy-calendar-preservation.ts` | Same | Owner decision |
| `startup-permission-progress.ts` versions 1–3 and `startup-permissions.tsx:36-48` sessionStorage fallback key | Historical formats only | Medium-high |
| `service-read-cache-store.ts:8-9,23-27,38-40` `sharedMailKeys`/`retireSharedMail` | One-off cleanup of an older layout, run on every start | Medium-high |
| `native-connection.ts:256-266` `removeStoredCloudCredential` | "removes the Cloud key an earlier build stored". Check callers in `connection-ui.tsx` | Medium |
| `note-origin.ts:35-39` whole-record revision fallback in `voiceNoteChanged` | Only matters for links "made before" content revisions | Medium |
| Nine `maps/*.ts` one-line `export *` shims and six `runtime/*` pure re-export files (P1) | No behaviour | High (mechanical import rewrite) |
| Unused exports (`src=0` and `tests=0`), make private or remove: `remote-protocol.ts` `droppedResponse` export, `RemoteIdentity`, `RemoteAuthStatus`; `resident-recovery.ts` `residentBootLost` export, `RecoveryReview`, `RecoveryArchive`, `ResidentBootStatus` exports; `subscription-entitlement.ts:43` `allowanceText` wrapper (no caller anywhere); `service-read-cache-store.ts` `sharedMailKeys`; `text-scale.ts` `LARGE_TEXT_CLASS`; `text-share.ts` `nativeTextSharing` export; `notes-folders-model.ts` `NOTES_FOLDER_LIMIT`, `NOTES_FOLDER_NAME_MAX`, `emptyNotesFolders` exports; `notes-organize-contract.ts` `NOTES_ORGANIZE_CAPABILITY`, `NOTES_ORGANIZE_TYPES`; `owner-reminder-notification-protocol.ts` `OWNER_REMINDER_BYTES`, `reminderDigest` export; `notes-trash.ts` `browserNotesTrashKey`; `note-audio-deletions.ts` `audioDeletionDocument` export; `phone-context.ts` `OWN_NOTIFICATION_SOURCE`; `telephony-executor.ts` `ContactMatch`, `TelephonyExecution`; `reminder-deletions.ts` `PendingReminderDeletion` | Checked with `grep -rlw` over `apps/app/src`, `android/app/src`, `test`, `scripts`, `specs` | High (export removal); `allowanceText` delete |
| `subscription-entitlement.ts:69` `void copy;` | No-op statement | High |
| `main.tsx:175` second `installWorkflowAdapter/installAutomationsAdapter` call | Merge with `:168` into one condition | High (no behaviour change) |

---

## 4. Duplicated types and helpers

| Name / shape | Locations | Proposed home |
|---|---|---|
| SHA-256 hex digest | `sms-agent-contract.ts:4`, `native-recovery-backup.ts:11`, `native-calendar-sync.ts:34`, `owner-reminder-notification-protocol.ts:29`, `service-read-cache-store.ts:18`, `note-origin.ts:32`; also about 19 more in `runtime/` (a–m), `prototype/`, `browser/` | `runtime/hash.ts` `sha256Hex()` (or upstream `workflowSha`) |
| `type Bag=Record<string,any>` | `passwords/password-manager.ts:23`, `runtime/reminder-creations.ts:7`, about 58 more repo-wide | One `ShellBag`/`ViewState` type in `prototype/model` typings |
| Android/browser durable slot adapter | `notes-folders.ts:7-19`, `reminder-journal-store.ts:9-19`, `note-audio-deletions.ts:16-28`, `notes-trash.ts:16-42`, `service-read-cache-store.ts:17-22`, `workflow-intents.ts:19-26` | Generalise `reminder-journal-store.ts` into `runtime/durable-slot.ts` |
| "Read saved notes raw" | `notes-trash.ts:49-55`, `note-audio-deletions.ts:29-33` | `notes-secure-store.ts` `readSavedNotesRaw()` |
| `android()` / `native()` predicate | `notes-trash.ts:16`, `note-audio-deletions.ts:16`, `reminder-journal-store.ts:10`, `notes-folders.ts:9`, `workflow-intents.ts:19,36`, `startup-permissions.tsx:64` | `native.ts` `isAndroid` |
| PluginHeaders lookup | `native-connection.ts:14,18,25,217`, `native.ts:21`, `main.tsx:369` | `platform-plugins.ts` `pluginHeader(name)`, `pluginHasMethod(name,m)` |
| Plugin interface for `AlphaVoiceCloud` | 16 files (P7) | `native/plugins.ts` |
| Plugin interface for `DailyApps` | `daily.ts:56-138`, `startup-permissions.tsx:16-20` | `daily.ts` (one declaration) |
| `ElizaLocation` interface | `startup-permissions.tsx:22`, `maps/native-location.ts:5` | `maps/native-location.ts` or plugins module |
| Owner request function type `(path,body,signal)=>Promise<unknown>` | `view-navigation.ts:12-16`, `maps/resident-relay.ts:7`, `device-view-profile.ts:7` | `alpha-client.ts` `OwnerRequest` |
| Paired voice `Binding` | `paired-voice.ts:6`, `connection-ui.tsx:2531` return type, `native-reading-voice.ts:17` (spread with `expiresAt`) | Export from `connection-ui` |
| UUID regex | `power-launch-state.ts:9`, `owner-reminder-notification-protocol.ts:5`, `remote-protocol.ts:316`, `resident-recovery.ts:33`, `native-calendar-sync.ts:20` (`/^[a-f0-9-]{36}$/`, looser), `connection-ui` `validateUuid` (from vendor) | One `isUuid()` (upstream `validateUuid`) |
| `object()` / `record()` "plain object or throw" | `remote-protocol.ts:65`, `view-navigation.ts:22`, `native-calendar-sync.ts:14`, `owner-reminder-notification-protocol.ts:24`, `phone-workflow-authoring.ts:17-18` (inline) | Shared `asRecord(value, message)` |
| Canonical JSON (`canonical()`) | `owner-reminder-notification-protocol.ts:28`; likely upstream `workflowBytes` | Upstream helper |
| `NotesKind` / `NOTES_KINDS` / folder name max | `notes-view.ts:9-10`, `notes-trash-policy.ts:22` (`kinds:['text','list','voice','link']` literal again), `notes-organize-contract.ts`, upstream `notes-organize-contract.ts` | Upstream contract |
| Kind-to-label map `{text:'Notes',list:'Checklists',voice:'Voice notes',link:'Links'}` | `notes-view.ts:31`, `notes-organize-contract.ts:59` | `notes-view.ts` `KIND_LABEL` |
| Reminder "open" status set | `workflow-reminder-read.ts:6` (`OPEN`), `reminder-creations.ts:34` (inline 6-way OR) | One `OPEN_REMINDER_STATUSES` |
| Validate-then-assert-reminders | `workflow-reminder-read.ts:27-28`, `workflow-device-contract.ts:43-45` | Keep one |
| Startup permission keys | `startup-permission-flow.ts:48`, `startup-permission-progress.ts:11`, `product/alpha-product-registration.ts:335-336` | Registration (P17) |
| Abort/timeout race boilerplate (`interrupted` promise + `rejectAbort`) | `native-connection.ts:276-287,297-301`, `voice-timing.ts:126-129`, `workflow-presentation.ts:47-51`, `local-speech-playback.ts:19-20`, `native-network.ts:5-21` | `runtime/abort-signal.ts` (already exists, add `raceAbort`) |
| Two-stage "status/request/openSettings" permission bridges | `startup-permissions.tsx:68-79` per-key objects, `startup-browser-permissions.ts` | Fine as-is, but `permissionAccess` (`startup-permissions.tsx:51`) duplicates upstream `locationAccess`-style readers |

---

## 5. Structure and foldering

- **Tiny files to merge.**
  - Notes bindings: `note-audio-lock` (3 lines), `notes-store` (13), `notes-secure-store` (30),
    `permanent-voice-deletion` (15), `note-audio-deletions` (42), `notes-trash` (57),
    `notes-trash-policy` (73), `notes-folders` (20), `notes-folders-model` (81), `note-dates` (1),
    `notes-contract` (1), `note-origin` (39), `note-default-title` (13). Merge into `notes/bindings.ts`
    (installed slot and lock names) and `notes/storage.ts`, and import upstream for the rest. That is 13
    files down to about 3.
  - Reminder bindings: `reminder-creations`, `reminder-deletions`, `reminder-journal-store` and
    `workflow-reminder-read` become a `reminders/` folder.
  - Voice: `voice-assistant`, `voice-turn-routes`, `voice-entry-policy`, `native-voice-turn` and
    `native-live-voice` are re-export or binding files. `voice-selection`, `voice-states`, `voice-timing`,
    `voicemail-*`, `paired-voice`, `native-reading-voice` and `note-recorder-driver` are the real voice
    layer. Make a `voice/` folder.
  - Contract shims `phone-dial-contract`, `sms-agent-contract` and `telephony-actions-contract` become
    one `telephony/contracts.ts` next to `telephony-executor.ts`.
- **Monoliths to split.**
  - `main.tsx` (P16).
  - `native-connection.ts`: browser secret vault (lines 47-154) → `browser/secret-store.ts`; browser
    connection (`:155-210`) → `browser/connection.ts`; Cloud and remote credential stores and native
    request (`:224-326`) stay.
  - `startup-permissions.tsx`: a 293-line component with 20 or more `useState`/`useRef` hooks. Move the
    resumable progress logic into `startup-permission-progress.ts`.
- **Wrong place.**
  - `share-panel.ts` builds a full modal dialog imperatively with inline styles in `runtime/`. It is UI
    and belongs with `prototype/share-panel-adapter.ts` or should be a React component.
  - `toast-layer.ts`, `text-scale.ts` and `view-focus.ts` are DOM installers. Move them to `ui/` or
    `bootstrap/`.
  - `status-ui.tsx` is a React component in `runtime/`.
  - `src/local-speech-playback.ts` belongs under `runtime/voice/`. Rename to `native-speech-playback.ts`
    to end the same-name clash with `prototype/local-speech-playback.ts`.
  - `daily.ts` (native plugin typing plus domain types) and `native.ts` both live at the root. Merge
    into a `native/` folder with P7's typed plugins.
  - `passwords/dev-vault.ts` and `maps/regional-provider.ts` are development-only and belong under a
    `dev/` folder that the bundle stubs out.
  - `product/native-cloud-runtime.ts` has no in-app importer. It is consumed by
    `scripts/native-google-product-host.ts:9` and tests. It is fine as a product file, but it is a
    build-time artefact.
- **Misleading names.** See P20: `reminder-deletions`, `note-audio-lock`, `native-connection`,
  `workflow-presentation`, `notes-store` vs `notes-secure-store`, `daily.ts`.

---

## 6. Worst offenders

1. `main.tsx`: 438-line composition root with 54 prototype monkey-patch installers, layout math, the update gate, mock mode, redundant guards and a duplicated workflow install.
2. `runtime/workflow-device-contract.ts`: about 85 dead lines (forked approval poster) plus test-only exports.
3. `runtime/native-connection.ts`: three concerns in one file, 9 `PluginHeaders` casts across the codebase, 5 swallowed errors, test-only exports.
4. `runtime/phone-context.ts`: 9 lines over 300 characters; per-kind validation as a chain of `if` blocks; legacy kinds; legacy envelope.
5. `runtime/remote-protocol.ts`: 338-line pairing client for a retired, test-mocks-only feature, mixed with production helpers.
6. `runtime/view-navigation.ts`: three indentation styles, deeply nested try/finally in `deliver()`, a hard-coded view-id mapping at `:83` beside `alphaCanonicalViewId`.
7. `runtime/share-panel.ts`: a modal built imperatively in about 10 dense lines, with inline styles, a 250 ms polling `setInterval` and 7 manually managed listeners.
8. `runtime/owner-reminder-notification-protocol.ts`: 15-condition one-line validators.
9. `runtime/owner-reminder-notification-port.ts`: a state machine compressed into one-liners; 14 private mutable fields.
10. `runtime/native-calendar-sync.ts`: methods on one line, an inline polling loop, a long `error()` ternary chain.
11. `src/local-speech-playback.ts`: `speakChunk` has 10 positional parameters, `any` plugin, nested promise plumbing; same file name as `prototype/local-speech-playback.ts`.
12. `startup-permissions.tsx`: 20+ hooks, a legacy progress fallback, re-registered plugins.
13. `runtime/notes-secure-store.ts` + `runtime/notes-store.ts`: the legacy migration source of truth for "previous notes".
14. `runtime/notes-organize-contract.ts`: a diverged fork of the upstream contract for a capability that is never negotiated.
15. `runtime/note-recorder-driver.ts`: unreachable `'agent'` and paired branches; inline plugin typing.
16. `runtime/voice-selection.ts`: two constant switches plus a test-only override; `'agent'` no-op alias.
17. `runtime/notes-trash.ts`, `note-audio-deletions.ts`, `notes-folders.ts`: duplicated dual-store code.
18. `runtime/service-read-cache-store.ts`: legacy mail retirement on every start; a third CAS adapter.
19. `runtime/subscription-entitlement.ts`: dead `allowanceText` wrapper, `void copy;`, a credits branch the PRD calls out as non-policy.
20. `runtime/voice-timing.ts`: 36-line comment and 14 one-line forwards; test-only clock and clear hooks.
21. `passwords/password-manager.ts`: test-only import/export path; module-level mutable globals; direct `vendor/eliza` imports.
22. `maps/` (9 one-line shims): import indirection only.
23. `runtime/source-renewal-question.ts`: a callback-object API with 9 callbacks and nested flags (`composing`, `ended`, `interrupted`).
24. `startup-permission-progress.ts`: four historical progress versions.

---

## 7. Open questions and risks (owner decisions)

1. **Legacy local data.**
   - Has any build of `ai.alphacompute.alphaphone` shipped to users who hold `alphaphone:prototype:notes:v1`,
     `alphaphone:notes:v2` or `alphaphone:daily:v1` data, or legacy calendar data?
   - If not, the PRD (`docs/prd.md:56-58`) allows deleting the whole "previous notes" source, the
     `legacy-app-*` context kinds, `legacy-calendar-preservation`, historical walkthrough versions,
     `retireSharedMail` and `removeStoredCloudCredential`.
2. **Dormant decisions.** Can the always-off switches be deleted outright (re-implemented later from
   upstream), or must the code stay dormant? These are `externalVoiceInvocationEnabled` (P-78), Clef
   (#663), `VOICE_SEND_POLICY` and `updateChannelCheckEnabled`.
3. **Remote and paired agent harness.** Remote pairing is retired in product (`docs/prd.md:17`), but
   `RemoteProtocol` is the backbone of many host tests (`scripts/fixtures/workflow-host.ts`,
   `scripts/test-connection-history.ts`, workflow host tests). Deleting it needs a replacement integration
   harness (probably the local agent).
4. **Backup and import/export.** Test-mocks-only `native-recovery-backup` and password Transfer conflict
   with "no backup/import/export". Delete them, or keep them as developer tools?
5. **Notes organise capability.** `notes.organize.v1` is never negotiated (`phone-context.ts:146-148`).
   Should the local fork be deleted and the upstream contract adopted when the pin supports it?
6. **Source-text tests.** Reformatting (P12) and removing dormant code (P5) will break about 34 test files
   that regex-match source. Per the owner's test policy, retire those tests first or alongside.
7. **Installed identity strings.** Slot and lock names (`notes-records:v1:device`,
   `alpha.notes-audio-effects.v1`, `alpha.browser.*`) must survive consolidation exactly, or Android
   updates between builds lose data. Any refactor of P3 needs an update-retention check on a device or
   emulator. That check is distinct from an APK build (AGENTS.md).
8. **Credit-oriented copy.** `subscription-entitlement.ts:35-40` special-cases `view.kind==='credits'`.
   The PRD says credit-oriented onboarding differs from policy. Is that branch still needed?
9. **`isNativePlatform` vs `getPlatform()==='android'`.** Confirm that iOS is not a target, so the two
   can be unified.
