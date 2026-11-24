# Research: `apps/app/src/browser/` and the app build configuration

Scope: `apps/app/src/browser/` (139 files: 129 `.ts`, 3 `.tsx`, 7 `.css`; 6,352 lines but 681 KB, because most files are written as one-line, 200–1,800-character statements), `vite.config.ts`, `capacitor.config.ts`, `tsconfig.json`, `app.config.json`, `apps/app/index.html`, `apps/app/public/`, `scripts/prepare-client-features.ts`, `scripts/feature-manifest.ts`.

Method: I read every file under 60 lines end to end, all storage/document/recovery modules, the dev-gating modules and the build files. I sampled `voice.ts`, `calendar.ts`, `daily.ts`, `notifications.ts`, `device.ts`, `simulated-workflows.ts`, `development-*.ts` and `workflow-*.ts`. A script (scratchpad `graph.mjs`) built the import graph from `git ls-files`: every `browser/*` file, plus every importer in `apps`, `test`, `specs` and `scripts`. A second script (`exports.mjs`) listed exports that no file under `apps/app/src` references. Dead-code claims below say how I checked them. The worktree has no `.eliza/` and no checked-out `vendor/eliza`. I checked alias consumers inside the generated tree **read-only** against the main checkout's `/Users/nubs/alphaphone/.eliza/client-features`.

---

## 1. Area overview

- **What `browser/` is.** It holds the web (non-native) implementations of the Capacitor plugins: `AlphaVoiceCloud`, `AlphaNoteAudio`, `AlphaDevice`/`ElizaSystem`, `AlphaFiles`, `AlphaMailAttachments`, `DailyApps`, `AlphaCalendar`, `AlphaDeletions`, `AlphaNotifications`, `AlphaBrowser`, `ElizaLocation` and `AlphaHostedResults`. `browser/register.ts:18-41` registers all of them, and `main.tsx:3` imports it. Native builds skip registration (`if(!Capacitor.isNativePlatform())`). The README says the web build "is a development preview and the payload packaged into the APKs".
- **It is three things, not one:**
  1. **Web plugin stand-ins** (`voice`, `calendar*`, `daily`, `notifications`, `device`, `files`, `location`, `clock`, `browser-surface`, `mail-attachments`, `hosted-results`). About 50 files.
  2. **A general persistence and dialog layer that the product imports on every platform.** `domain-document.ts` (6 runtime importers), `json-domain-document.ts` (12 app importers), `documents.ts`, `domain-recovery.ts` (10 prototype importers), `review.ts` (7), `content-question.ts` (8 prototype importers), `dialog-layout.ts`, `revision.ts`, `screen-locked.ts`, `device-preferences.ts` and `calendar-sync-fields.ts` (3 runtime importers). The folder name `browser/` is therefore misleading.
  3. **A development simulator.** The `development-*` modules (12 files) fake a local, cloud or remote agent, a Cloud account and digests. The `simulated-*` and `simulator-*` modules (7) fake the Phone, Messages, Inbox, Wallet and Workflows apps. 15 `workflow-*` modules form a whole label-driven workflow engine. There are also `device-controls`, `incoming-simulation`, `location-simulation`, `password-provider`, `digest-*` and `focus-state`. Measured: **48 of 139 files and about 260 KB of the 681 KB (38%) exist only for development surfaces.**
- **Storage stack.** Upstream `BrowserDocumentStore` (IndexedDB plus Web Locks, `documents.ts:4`) sits at the bottom. On top of it, `BrowserDomainDocument` (`domain-document.ts`) wraps every value in a `{version:1, legacy, value}` envelope that keeps a frozen copy of an old `localStorage` key. `BrowserJsonDomainDocument` (`json-domain-document.ts`) wraps that again in `{raw}`. Each domain (calendar, reminders, notifications, preferences and so on) then adds its own facade with a `BroadcastChannel` refresh. `domain-recovery.ts` provides one recovery dialog over all of them.
- **Build.** `vite.config.ts` adds four custom plugins:
  - a fixture swap;
  - a stub resolver for five development modules, which applies only when the importer is one of three named files;
  - a CSP meta tag;
  - a `build-flags.json` asset.
  It also defines 34 hand-written aliases into `.eliza/client-features`. `tsconfig.json` repeats the alias map (36 entries, two of them different), and `test/dev-surface-gates.test.mjs:19` holds a third copy. `scripts/prepare-client-features.ts` copies about 270 listed upstream paths from the pinned vendor revision into `.eliza/client-features`, rewrites seven imports so that plain Node can load them, and writes a provenance stamp. App code mostly bypasses the aliases with `../../../../.eliza/...` paths: **364 occurrences in 197 files**, 35 of them in `browser/`.

---

## 2. Pattern taxonomy

### P1. Four-layer development gating ("belt, braces, second belt, second braces")

**What it looks like.** One development surface is gated by several independent mechanisms, each re-checking the same fact:
1. a Vite `resolveId` stub (`vite.config.ts:27-35, 74-85`);
2. a module-level export fold (`export const X = devSurfacesEnabled ? Real : () => null`);
3. a guard at the top of each function (`if(!devSurfacesEnabled) return`);
4. a second guard inside each called helper.

`main.tsx` then re-ANDs flags that already contain `devSurfacesEnabled`. A production string denylist (`scripts/audit-production-bundle.ts:29-70`) sits behind all of these.

**Examples.**
- `vite.config.ts:28-29` stubs `./browser/device-controls` and `./browser/simulated-apps`. Yet `device-controls.tsx:51` already has `export const BrowserDeviceControls=devSurfacesEnabled?DevelopmentDeviceControls:()=>null;`, and `simulated-apps.ts:17-18` has `export const captureSimulatedApps=devSurfacesEnabled?captureDevelopmentApps:()=>({});`.
- `simulated-apps.ts:20` re-checks `if(!devSurfacesEnabled||!browserDevProfile)return;` inside the function that the fold already removed.
- The leaf modules check again: `simulated-inbox.ts:10` `if(!devSurfacesEnabled)return;`, `simulated-messages.ts:10`, `simulated-voicemail.ts:6`, `simulated-workflows.ts:23`, `incoming-simulation.ts:8`.
- `main.tsx:97-99` has `const browserDevProfile=devSurfacesEnabled&&devProfileQuery; … const BrowserDeviceControls=devSurfacesEnabled?DevDeviceControls:null;`. `dev-profile.ts:7` already defines `browserDevProfile=devSurfacesEnabled&&…`, so this is a third AND of the same flag.
- `development-agent-document.ts:12` has `if(!devSurfacesEnabled||!browserDevProfile||…)`, although `browserDevProfile` implies `devSurfacesEnabled`. The same appears in `development-account-document.ts:19` and `development-identity.ts:7`.
- `vite.config.ts:79-80` applies the stub only if `owner` is `main.tsx`, `runtime/connection-ui.tsx` or `passwords/password-manager.ts`. A new importer silently gets the real module.

**Size.** 26 `if(!devSurfacesEnabled` guards in `browser/` (29 in `src`). 76 `devSurfacesEnabled` and 49 `browserDevProfile` mentions in `browser/` (111 and 120 across `src`). Nine distinct gates exist:
- `testMocksEnabled`
- `devSurfacesEnabled`
- `browserDevProfile`
- `developerTools`
- `developmentAgentWorkflows`
- `privateLocalPreviewEnabled`
- `developmentCartesiaVoiceEnabled`
- `browserCloudResidentEnabled`
- `updateChannelCheckEnabled`

**Why it hurts.** No layer is trusted, so every new development module copies all of them. The importer-allowlisted stub is fragile. The many re-checks also hide what the real boundary is.

**Treatment.** Keep one mechanism:
- Move every development-only module under one folder, for example `apps/app/src/dev/`, behind one entry `dev/index.ts`.
- Import that entry only through `if (devSurfacesEnabled) await import('./dev')`, which Rollup removes as dead code when the constant is false. Alternatively, use one Vite alias `@dev` that points to `dev/index.ts` or `dev/stub.ts`, with no importer allowlist.
- Delete the export folds and the inner guards.
- Keep the bundle audit as the backstop.

**Risk and checks.** The production bundle must stay free of the development strings. Run `npm run build && npm run audit:bundle` with the flag off, and repeat the build with `ELIZA_DEV_ALLOW_TEST_MOCKS=1`. `test/dev-surface-gates.test.mjs` and `test/settings-truth.test.mjs:173` read the source text of `dev-profile.ts` and will need rewriting.

### P2. Legacy-mirror envelopes for storage that never shipped ("frozen localStorage shadow")

**What it looks like.** Each `BrowserDomainDocument` takes a `legacy:()=>string|null` reader of an old `localStorage` key. On first read it imports that key into `{version:1,legacy,value}` and keeps the legacy copy for ever. Every later read, edit, restore and reset re-reads the old key and throws if the key changed (`domain-document.ts:24-26`, `unchanged(...)`). `json-domain-document.ts` then wraps values in `{raw}`, so a JSON value is stored as JSON inside JSON inside JSON: `JSON.parse(envelope).value` → `JSON.parse(.).raw` → `JSON.parse(.)`.

**Evidence that the legacy side is dead in practice:**
- No code writes the legacy keys any more. `git grep "localStorage.setItem|removeItem" apps/app/src` finds writes only to `alpha.dev.*` (the simulator), insets, appearance, the connection selection and the native-only intents. None of them writes an `alpha.browser.*` key that a `BrowserDomainDocument` reads.
- The envelope was introduced 2026-10-04 (`6e3e8292a Add legacy-preserving browser domain migration and recovery policy`). The app version is `0.1.0` (`app.config.json:6`), and the README calls the web build a development preview.
- On Android (WebView) the same modules run, but the README says new package IDs install "with its own private data", so a fresh install has no old keys. *Suspicion, not proved:* the retained Pixel v44 or older internal APKs could still hold keys. **Owner decision needed (see §7).**

**Examples.**
- `domain-document.ts:9-16` declares `Envelope`, `DomainRecovery.legacy` and `legacyChanged`. Lines 41-49 do the first-read import. Lines 58, 61, 65 and 69 re-check the legacy key on every edit.
- `notification-store.ts:10-11`: `// v2 superseded the old partial policy. Preserve whichever legacy source was active.` followed by `localStorage.getItem(notificationStorageKey)??localStorage.getItem('alpha.browser.notification-policy.v1')`.
- `digest-storage.ts:23-35` scans every `localStorage` key under a prefix to build a legacy `{slots}` blob ("All inbox slots migrate together … Never update the old keys").
- `development-execution-document.ts:11-14` merges two legacy keys into one envelope.
- `development-account-document.ts:10` wraps a legacy key in `{rawAccount}`.
- `domain-recovery.ts:17` and `:36` show a "Download old copy" button for the legacy bytes.
- `device-preferences.ts:22` has `if(receipt.format!=='domain'||receipt.legacyChanged)throw …`.
- `runtime/media-copy-intent.ts:14` and `runtime/cloud-personal-intent.ts:14` add more legacy readers from runtime.

**Size.** 20 instantiations: 13 in `browser/` and 7 more `BrowserJsonDomainDocument` users in `runtime/`.

**Treatment.** If the owner confirms that no shipped install depends on old keys:
- Reduce `BrowserDomainDocument` to `{read, edit, capture, reset}` over the raw upstream store, with no legacy parameter, no envelope and no `legacyChanged`/`format`.
- Make `BrowserJsonDomainDocument` the same class.
- Bump document keys or clear the store once.
- Delete the "old copy" UI.

This removes roughly 40 lines of `domain-document.ts`, most of `json-domain-document.ts`, and a `legacy` lambda from every call site.

**Risk.** Data loss for any real user with pre-October data. The Quint models `specs/quint/refinement/application/domain-document-creation.mjs` and `browser-deletion-poll.mjs` encode the envelope and must change with it.

### P3. Copy-paste document facades ("observable document boilerplate")

**What it looks like.** Every domain re-implements the same wrapper:
- `new BroadcastChannel('alpha.browser.documents.v1')`;
- an `onmessage` key filter that dispatches a `window` event;
- `read/readRaw/capture/reset/edit` pass-throughs;
- an `edit` that stringifies before and after to decide whether to broadcast.

**Examples.**
- `calendar-store.ts:11-34`
- `reminder-store.ts:6-28`, identical shape apart from the guard function
- `preference-documents.ts:3-17`, a third, generic copy that calendar and reminders could have used
- `notification-store.ts:13-39`
- `hosted-results.ts:12-13`
- `workflow-notices.ts:7-9`
- `digest-authorization-document.ts:6,25-28`
- `development-account-document.ts:11,29-36`

**Size.** 8 `typeof BroadcastChannel==='undefined'` guards in 8 files (9 in `src`). The upstream store has no broadcast of its own (checked read-only: `browser-document-store.ts` has no `BroadcastChannel`).

**Treatment.** Generalise `preference-documents.ts`'s `document(key, event)` into `observedDocument(key, {event, guard?})` and use it for calendar, reminders, notifications, hosted results and workflow notices. Or add broadcast to the upstream store.

**Risk.** Event names are part of the cross-module contract. Grep each `alpha:*-document-changed` listener when merging.

### P4. Hand-rolled imperative `<dialog>`s with copied lifecycle ("dialog kit by copy")

**What it looks like.** Each dialog repeats the same steps:
- `document.createElement('dialog')`;
- copying theme tokens from `.os`;
- listeners for `alpha-back`, `pagehide`, `alpha:device-state` and `visibilitychange`, plus `previous?.focus()`;
- a matching manual remove-listener list;
- often a dedicated CSS file of about 10 near-identical rules.

**Examples.**
- Theme-token copy loops in 15 `browser/` files: `review.ts:16`, `selected-document-viewer.ts:7`, `calendar-response.ts:6`, `calendar-meeting.ts:6`, `dialog-layout.ts:6`, `simulator-recovery.ts:33`, `incoming-simulation.ts:10`, `location-simulation.ts:25`, `workflow-history.ts:32`, `workflow-receipts.ts:33`, `workflow-urgency.ts:18`, `workflow-result-input.ts:11`, `reading-review.ts:13` and `device-controls.tsx:21`. They also disagree on which tokens to copy (`bg,fg,s2,line` / `bg,fg,s2` / `bg,fg,s2,line,mut` / `bg,fg,mut,line,s2,acc`).
- Dark-mode detection is duplicated with different case handling: `.toUpperCase()==='#000000'` in `calendar-response.ts:6` against `.toLowerCase()==='#000000'` in `dialog-layout.ts:6`.
- Lifecycle wiring is repeated: `selected-document-viewer.ts:12-14`, `calendar-meeting.ts:14`, `calendar-response.ts:7`, `retained-data-notice.ts:11-13`, `domain-recovery.ts:56-59` and `password-provider.ts:17-20,27-30`. The last of these wires the same listener set twice, once for the pending phase and once for the open phase.
- The CSS files are near-duplicates: `mail-attachments.css` against `selected-document-viewer.css` (8 of 9 rules identical apart from the prefix), `calendar-response.css` against `calendar-meeting.css`, and `review.css`.
- Mount points are inconsistent: `(document.querySelector('.os')||document.body).append(dialog)` (`retained-data-notice.ts:14`, `domain-recovery.ts:59`) against `document.body.append(dialog)` (`selected-document-viewer.ts:15`, `calendar-meeting.ts:14`). The token copying exists only because body-mounted dialogs escape `.os`.

**Size.** 50 `'alpha-back'` listeners in 26 `browser/` files (100 in `src`). 59 `'visibilitychange'` uses in 32 files. 21 `createElement('dialog')` files in `browser/` and 17 more in `prototype/` and `runtime/`.

**Treatment.** Provide one `openOwnedDialog({label, className, mount: '.os'})` that returns `{dialog, signal, close}`. It owns retirement events, focus restore and theming. Mount every dialog inside `.os` so that the CSS variables apply and token copying goes away. Use one dialog stylesheet with modifiers. Longer term, render these as React portals, since the app is React.

**Risk.** Back-button capture order (`true` capture flag) and `stopImmediatePropagation` semantics must stay the same. Browser specs cover most of these dialogs.

### P5. Re-implemented one-line predicates ("lock-screen check, five spellings")

**Examples.**
- `screen-locked.ts:3` defines `browserScreenLocked()`. The same selector string is inlined in `workflow-speech.ts:8`, `workflow-trigger-runtime.ts:13`, `voice.ts:275` and `runtime/text-share.ts:6`.
- The predicate "page hidden or dev-background or locked" exists three times under three names: `notice-action.ts:2` `noticeActionBlocked`, `notifications.ts:21` `locked`, `hosted-results.ts:17` `blocked`. Bare `devBackground==='true'` appears 13 times in 13 `browser/` files.
- The email regex `/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/` appears four times in `simulated-inbox.ts` (lines 7, 21, 24 twice) and as a variant in `calendar-sync-fields.ts:10`.
- The development namespace regex `/^(local|remote|cloud(?:\.(first|second))?)$/` appears in `development-digest-document.ts:15`, `development-execution-document.ts:10` and `development-agent-document.ts:12`.
- The connection selection is parsed inline with `JSON.parse(localStorage.getItem('alpha.connection.selection.v1')||'null')` 9 times in 6 `browser/` files (`workflow-drafts.ts:9,13`, `digest-storage.ts:12,19`, `development-connection.ts:18`, `development-digests.ts:13,73`, `development-workflows.ts:20`, `development-actions.ts:12`) and 16 times in `src`, although `runtime/connection-ui.tsx:204` owns the `SELECTION` constant.
- The SHA-256 hex digest is inlined in `browser/` at `workflow-trigger-runtime.ts:15`, `deletions.ts:20`, `calendar.ts:50`, `calendar.ts:242`, `hosted-results.ts:15` and `workflow-notices.ts:13`, and 25 times across `src`. Random hex is `revision.ts:2`; `runtime/connection-ui.tsx:1488,1555` inline it again.

**Treatment.** Create one `browser-state.ts` (or `platform/foreground.ts`) with `screenLocked()` and `foregroundBlocked()`. Use one `sha256Hex(value)` and one `readConnectionSelection()`. Put regex constants in one module.

### P6. Defensive re-verification sandwich ("check, act, check")

**What it looks like.** Every async step is wrapped as `throwIfAborted(); await verify(); op(); await verify(); throwIfAborted()`, even inside the development fixture, where races do not matter for the product.

**Examples.**
- `development-agent-document.ts:24` `readDevelopmentAgent`: verify, check, read, verify, check.
- `development-agent-document.ts:27` `editDevelopmentAgent`: verify and check outside, then again inside before and after the editor.
- `development-cloud-document.ts:12-15`: `await check(signal)` around every call.
- `digest-storage.ts:55-56`: four checks around one `capture`.
- `development-identity.ts:22-25`: verify before and after capture and reset.
- `development-connection.ts:13,18,32`: `check()` runs on entry, inside each branch, and on exit.

**Size.** 116 `throwIfAborted()` calls in 37 `browser/` files (533 in `src`).

**Treatment.** For development fixtures, delete most of it: one identity check at the boundary is enough. For product code, centralise the pattern in the document layer, for example an `edit` that takes `{signal, guard}`.

**Risk.** Some product specs assert "owner changed" refusals. Keep the product paths and simplify the dev-only ones first.

### P7. Hand-written structural validators of the module's own writes ("needs recovery" validators)

**What it looks like.** Each store validates its own JSON with one long boolean expression and throws "… needs recovery." Examples are `development-digest-document.ts:12`, `development-agent-document.ts:16`, `device-preferences.ts:6-13`, `digest-authorization-document.ts:8-18`, `notification-store.ts:22-29`, `development-cloud-document.ts:10`, `workflow-notices.ts:14-22` and `simulator-recovery.ts:11-27`. Ad-hoc object guards are copied again: `simulator-recovery.ts:9` and `workflow-history.ts:5` define the same `object=(value)=>…` as `prototype/calendar-approval-fields.ts:5` and `runtime/agent-calendar.ts:25`.

**Size.** 31 "needs recovery" throws in 21 `browser/` files.

**Why it hurts.** These are the highest-complexity lines in the folder (single expressions with 15 or more `||` clauses). The data is written only by the same module.

**Treatment.** Use one small schema helper, or trust the writer and keep validation only at true trust boundaries (backup import, agent operations). Delete validators on dev-only stores.

### P8. Development simulators woven into product plugins ("dev-forked copy and branches")

**What it looks like.** Product plugin code has dev-only branches and dev-specific user text inline:
- `location.ts:10,16,64,67`: `simulatedCoordinates()`, a constructor branch, `simulatedFix()`, and `devSurfacesEnabled?'…device controls.':'…quick settings.'`.
- `device.ts:34`, `device-adapter.ts:10` (`devSurfacesEnabled?'Needs recovery':'Device settings unavailable…'`), `workflow-location.ts:8` and `apps.ts:12`.
- `domain-recovery.ts:9`: in production every recovery shows only `openRetainedDataNotice` ("Data kept"). The whole 61-line backup/reset/restore dialog therefore runs only with test mocks, yet product code calls it from 10 prototype adapters.

**Treatment.** Inject simulation through the plugin registry. The dev entry point registers `SimulatedLocation` instead of `BrowserLocation`, so product plugins have no dev branches. Decide whether production recovery should exist at all (§7). If not, replace the `openXRecovery` functions with a single notice.

### P9. Generic helper with one caller's specifics built in

**Examples.**
- `domain-recovery.ts:40-53` is the "generic" domain recovery, yet it hard-codes calendar UI: `'Choose calendar backup'`, `'Recover events'`, `'Review calendar restore'` and `'This replaces all active calendar events…'`. It also has a 5 MB calendar limit. Only `calendar-recovery.ts` passes `restoreOption`.
- `domain-recovery.ts:106` has the positional signature `(domain,name,heading,description,signal?,restoreOption?,storage?)`. `calendar-recovery.ts:5` passes `undefined` to reach parameter 6.
- `domain-document.ts:62` puts device-settings text in the shared class: `'Device settings changed. Review the current choice and try again.'`.

**Treatment.** Move calendar restore into `calendar-recovery.ts`, pass an options object, and make the error text generic or injected.

### P10. Thin re-export and adapter files ("one-liner shims")

**Examples.**
- `file-archive.ts:1`, `scan-correction.ts:1` and `scan-edges.ts:1` contain only `export * from '../../../../.eliza/…'`.
- `scan-draft.ts` (3 lines), `documents.ts` (4), `revision.ts` (2), `reminder-action-document.ts` (3), `reminder-creation-document.ts` (3), `notification-recovery.ts` (3), `calendar-time.ts` (4), `screen-locked.ts` (4), `workflow-resources.ts` (5), `register-hosted-results.ts` (6), `storage-usage.ts` (7), `calendar-alerts.ts` (8), `notice-action.ts` (9) and `video-codecs.ts` (8).
- `workflow-speech.ts:1` re-exports `speakAppText as speakWorkflowText`.
- `note-audio-store.ts:12-13` re-exports upstream names under new names (`audioMetadata=notesAudioMetadata`, `AudioRow=NotesAudioRow`).

**Size.** 23 files of 9 lines or fewer.

**Treatment.**
- Import upstream directly through an alias (P13) and delete the pure re-exports.
- Fold the 3-line document constants into a single `documents.ts` registry of keys.
- Merge `screen-locked` and `notice-action` into P5's module.
- Merge `register-hosted-results.ts` into `register.ts` (see P12).

**Risk.** Every file is listed by path in `test/support/feature-parity.mjs` (the allowlist test requires an exact inventory), so each merge must edit that list. That cost is low but mandatory.

### P11. Duplicated local types (see §4 for the full table)

Examples:
- `notifications.ts:17-19` re-declares `Notice`, `DeviceEvent` and `Selection`, which `notification-store.ts:5-7` already declares.
- `domain-document.ts:2-8` re-declares upstream `BrowserDocumentSnapshot` and the store interface.
- `journalBinding?:{scope:string;proposalId:string;operationHash:string}` is written out four times.
- `type Bag=Record<string,any>` appears in 15 `browser/` files (41 in `src`).

### P12. Import-order-dependent plugin registration ("first registration wins")

`platform-plugins.ts:4-7` keeps the first `registerPlugin(name, impl)` and ignores later web implementations. Ordering therefore becomes load-bearing, and it is defended only by comments:
- `register.ts:17` says it "must be the first import in main", but `main.tsx:1` imports `./runtime/voice-entry-policy` first.
- `register-hosted-results.ts:4-6` says it must claim `AlphaHostedResults` before native-connection's tree is evaluated, yet `register.ts:3` imports `../runtime/native-connection` *before* `./register-hosted-results` (line 4).
- `runtime/hosted-background.ts:13`, `runtime/hosted-result-notices.ts:19` and `prototype/workflow-adapter.ts:266` all call `registerPlugin('AlphaHostedResults')` without a web implementation.

*Suspicion:* it works only because those modules are not evaluated earlier on this path. It is not verified that registration breaks.

**Treatment.** Let `registerPlugin` accept a late `web` implementation (attach it if absent), or use a separate entry chunk. Then delete the ordering comments and `register-hosted-results.ts`.

### P13. Deep relative paths into generated upstream source, plus three copies of an alias map

**Facts.**
- 364 `(../)+.eliza/client-features/…` imports in 197 `src` files: 356 at `../../../../`, 8 at `../../../`. 35 of them are in `browser/`.
- By package: `packages/contracts` 63, `plugin-assistant` 59, `plugin-notes` 48, `packages/ui` 36, `plugin-inbox` 30, `plugin-maps` 28, `plugin-files` 21, and others.
- At the same time `vite.config.ts:117-157` keeps 34 one-file aliases, `tsconfig.json:23-117` keeps 36, and `test/dev-surface-gates.test.mjs:19` keeps a third partial copy.
- The two configs differ: Vite has `@eliza-system`, while tsconfig has `/src/*`, `@elizaos/core/schema-types` and `@elizaos/ui/api/transport`.
- Some modules are imported both ways. For example `packages/contracts/src/deletion-window` is imported relatively in `browser/calendar.ts:7`, `browser/daily.ts:2`, `browser/calendar-deletions.ts:1` and `browser/journal-retention.ts:1`, although the alias `@elizaos/contracts/deletion-window` exists.
- 18 test or spec files hard-code the `../../../../.eliza` text as well.

**Would an alias help? Yes.** One wildcard (tsconfig `"@eliza/*": ["./.eliza/client-features/*"]` plus a Vite `{find:/^@eliza\//, replacement:<abs>/.eliza/client-features/}`) would replace all 364 relative paths and every app-only single-file alias. Keep only the `@elizaos/*` bare names that **files inside the copied tree** import. Checked read-only, these include `@elizaos/contracts` (11 files), `@elizaos/core/schema-types` (4) and `upstream renderer package/view-primitives` (3).

**Caveat.** Node tests load app `.ts` through plain Node or vm (`test/support/strip-types.mjs`) and do not resolve Vite aliases. They need one `module.registerHooks` resolve hook in test support. That is also why `prepare-client-features.ts:345-405` rewrites seven upstream imports to relative `.ts` paths. A shared Node hook could replace those projections too (see P15).

### P14. Tested-but-unshipped code ("model-only implementations")

- `browser-poll.ts:34-86`: `createSessionSaver` and the `SessionSaver` type have **no caller under `apps/`**. Checked with `git grep -n createSessionSaver -- apps`: the only hit is the definition. Its only users are `test/browser-session-persistence.test.mjs:64,150` and `specs/quint/refinement/application/browser-tab-lifecycle.mjs:36`. The product does not use the saver that the model checks.
- `workflow-notices.ts` `savedWorkflowNoticeHistory`: one internal reference (its declaration). It is used only by `test/browser/workflow-notice-*.spec.ts` through `page.evaluate(import('/src/browser/workflow-notices.ts'))`.
- `build-flags.ts:11` `updateChannelCheckEnabled = false as boolean`: no consumer in `apps/`. It is kept alive by `test/settings-truth.test.mjs:20`, which regex-matches the source line, and is stubbed in `test/browser/chat-dictation-api.spec.ts:14-15` and `voice-stop-speaking.spec.ts:6`.

**Treatment.** Delete the code or wire it into the product. Delete the source-text assertions.

### P15. Build-script hardening beyond the threat (`prepare-client-features.ts`)

- `prepare-client-features.ts:15,323,333` has a `projectVoice` option that defaults to `true`, and no caller ever passes `false`. Checked: `git grep projectVoice` finds only this file. The `projectionVersion:projectVoice?14:0` branch is therefore dead.
- `prepare-client-features.ts:320` `export const CLIENT_FEATURE_PATCHES = []` has no importer anywhere (`git grep CLIENT_FEATURE_PATCHES`).
- `prepare-client-features.ts:324-329` throws if any of four *retired* patch files exist ("Retired client patch slot"). This is a tombstone guard for a mechanism that no longer exists.
- `prepare-client-features.ts:411-462` performs an atomic rename/retire dance with `SharedArrayBuffer` and `Atomics.wait` polling for "concurrent preparation" by peer processes, plus inode re-checks (`sameDirectory`). It exists because 7 `pre*` npm hooks (`package.json:53-59`) each re-run preparation.
- Seven per-file string-replace projections (`:345-403`) exist only so that plain Node can load the copied files (see P13).

**Treatment.**
- Remove `projectVoice`, `CLIENT_FEATURE_PATCHES` and the retired-slot check.
- Run preparation once per command, not from 7 `pre*` hooks, and drop most of the concurrency logic.
- Replace the projections with a Node resolve hook.

**Risk.** CI workflows also call `upstream:prepare-client` directly (`.github/workflows/browser.yml:130,213`, `resident-prepare.yml:39` and others). 9 Quint scripts call `checkClientFeatures()`.

### P16. Label-string-driven behaviour (development workflow engine)

`simulated-workflows.ts:32-40` dispatches on display text: `text==='read it aloud'`, `'speak it when i pick up the phone'`, `'a notification, only if urgent'`, `'a note in notes'`. `workflow-calendar.ts:6-10` does the same with `"today's calendar"` and `'calendar next 3 days'`, and `workflow-dated-sources.ts:16` with `"overnight inbox and today's calendar"`. Each behaviour depends on English prose, with `replaceAll('’',"'")` normalisation. This adds about 15 files and 100 KB of a second workflow runtime beside the real one in `runtime/workflow-*`. Treatment is an owner decision: keep the development workflow simulator or delete it (§7).

### P17. Duplicated windowing and legacy branch in `voice.ts`

- `voice.ts:81-91` (recovered window) and `voice.ts:93-108` (saved note window) are two copies of "decode once, slice a 25 s PCM window, encode WAV". The second copy hard-codes `25_000` three times (`:94`, `:104`, `:107`) although `NOTE_SEGMENT_MS` is declared at `:20`.
- `voice.ts:53-58` is a legacy branch: "Older pending rows contain no completion markers…". The same legacy family appears in `journal-retention.ts:12-13` ("Rows without a time predate this policy") and `note-audio-store.ts:13`/`voice.ts:175,346` (`migrateAudio`). Delete these with P2 if the owner confirms that no old data exists.

### P18. Misleading names and keys

- `reminder-action-document.ts:2-3`: "Keep the installed key". The actions document is stored under `'alpha.browser.reminder-deletions.v1'`. The key name is kept for legacy data (P2).
- `browser/` holds cross-platform modules (§1, item 2).
- `dev-profile.ts:2-4` re-derives `devSurfacesEnabled` locally ("Same value as devSurfacesEnabled in build-flags.ts, spelled so Node contract tests … can load this module without Vite") with a defensive `import.meta.env!==undefined`. The same defence appears in `build-flags.ts:5`. One flag now has two definitions so that a test loader works.

---

## 3. Delete candidates

| Candidate | Evidence | Confidence |
|---|---|---|
| `build-flags.ts:7-11` `updateChannelCheckEnabled` | `git grep updateChannelCheckEnabled -- apps scripts`: definition only. Kept only by the source-text test `test/settings-truth.test.mjs:20` and spec stubs. | High |
| `browser-poll.ts:34-86` `SessionSaver` and `createSessionSaver` (and `saveRetryDelay`/`retryDelayForCount` if only the saver uses them) | No caller in `apps/` (`git grep createSessionSaver -- apps`). Used only by `test/browser-session-persistence.test.mjs`, Quint refinement and the manifest. The tests and the model must go with it, or the product must adopt it. | High (as unshipped code) |
| `workflow-notices.ts` `savedWorkflowNoticeHistory` export | No `apps/` caller. Used only by browser specs through `page.evaluate`. | Medium |
| `vite.config.ts:152-157` alias `@eliza-system` → `vendor/eliza/.../plugin-native-system/src/index.ts` | 0 hits in apps, tests, scripts and the generated tree (`git grep @eliza-system`, read-only grep of `/Users/nubs/alphaphone/.eliza/client-features`). `native.ts:3` imports vendor by a relative path instead. | High |
| `vite.config.ts:121` and `tsconfig.json:108` alias `@elizaos/contracts/stated-clock-time` | 0 consumers in the app, tests, scripts or generated tree (same check). | Medium (an upstream bump could start using it) |
| `vite.config.ts:166-167` `server.fs.allow` entries for `vendor/eliza/plugins/plugin-native-system` and `…/plugin-assistant/src/services/device-actions` | The app reads those through `.eliza/client-features` now. The direct vendor imports are of `plugin-native-passwords` and `packages/core/src/utils/uuid`, which are *not* listed. *Suspicion:* the list is stale. Verify with `npm run dev` and the browser specs. | Low–medium |
| `prepare-client-features.ts` `projectVoice` option, `CLIENT_FEATURE_PATCHES`, retired-patch guard (`:324-329`) | No caller passes `projectVoice:false`. No importer of `CLIENT_FEATURE_PATCHES`. The retired-slot guard protects a removed mechanism. | High |
| The whole `legacy` path in `domain-document.ts`, the `{raw}` wrapper in `json-domain-document.ts`, the "Download old copy" UI in `domain-recovery.ts:17,36,60`, `notification-store.ts:10-11` (v1 key), `digest-storage.ts:23-35`, `development-execution-document.ts:11-14`, `development-account-document.ts:10`, `voice.ts:53-58`, `journal-retention.ts:12-13` "predate this policy" | Nothing writes the legacy keys (`git grep localStorage.setItem`). Added 2026-10-04 for a pre-release preview. | **Needs owner sign-off** (§7) |
| Pure re-export shims `file-archive.ts`, `scan-correction.ts`, `scan-edges.ts` | 1 line each. Their 1–2 importers (`prototype/browser-camera.ts`, `prototype/scan-correction-review.ts`) can import upstream directly. | High |
| `register-hosted-results.ts` | Exists only for import order (P12). Delete after `registerPlugin` accepts late web implementations. | Medium |
| `vite.config.ts:28-29` stubs for `device-controls` and `simulated-apps` (or the export folds in those files, but not both) | Two mechanisms do the same job (P1). | High (keep one) |
| Inner `if(!devSurfacesEnabled)` guards in `simulated-inbox.ts:10`, `simulated-messages.ts:10`, `simulated-voicemail.ts:6`, `simulated-workflows.ts:23`, `incoming-simulation.ts:8`, `simulated-apps.ts:20` | Only reachable through the folded or stubbed `installSimulatedApps`. | High |
| `main.tsx:97-99` re-ANDs of `devSurfacesEnabled` | `dev-profile.ts:7,13` already include it. | High |
| Development-only modules as a group (48 files, about 260 KB): `development-*`, `simulated-*`, `simulator-*`, `incoming-simulation`, `location-simulation`, `password-provider`, `digest-delegation*`, `digest-authorization-document`, `digest-storage`, `digest-live-sources`, the 15 `workflow-*` simulator modules, `focus-state` | Gated by `devSurfacesEnabled` or `browserDevProfile`. Reachable only from `?mode=dev`. | **Owner decision** (§7) |

---

## 4. Duplicated types and helpers

| Name | Locations | Proposed home |
|---|---|---|
| `Selection`, `DeviceEvent` (notification) | `notification-store.ts:5,7` and `notifications.ts:18-19` (`Notice` at `:17` overlaps `DeviceEvent`) | export from `notification-store.ts` |
| `Snapshot` / `Documents` (store interface) | `domain-document.ts:2-8` against upstream `BrowserDocumentSnapshot` and `BrowserDocumentStore` | import the upstream types |
| `journalBinding {scope,proposalId,operationHash}` | `calendar-deletions.ts:6`, `reminder-deletions.ts:6`, `daily.ts:38`, `deletions.ts:22` | `type JournalBinding` in `journal-retention.ts` |
| Deletion stage, settle, undo and guard logic | `calendar-deletions.ts:20-55` and `reminder-deletions.ts:8-43` (same algorithm, different row equality) | a generic `deletionJournal<Row>(equals)` |
| `type Bag=Record<string,any>` | 15 `browser/` files, 41 in `src` | one exported `Bag` (or real types) |
| `screenLocked` selector | `screen-locked.ts:3`, `workflow-speech.ts:8`, `workflow-trigger-runtime.ts:13`, `voice.ts:275`, `runtime/text-share.ts:6` | `screen-locked.ts` |
| hidden, dev-background or locked predicate | `notice-action.ts:2`, `notifications.ts:21`, `hosted-results.ts:17` (and 13 bare `devBackground` checks) | one `foregroundBlocked()` |
| SHA-256 hex | `workflow-trigger-runtime.ts:15`, `deletions.ts:20`, `calendar.ts:50,242`, `hosted-results.ts:15`, `workflow-notices.ts:13`, and 19 more in `runtime/` and `prototype/` | `sha256Hex()` beside `revision.ts` |
| random hex id | `revision.ts:2`, `runtime/connection-ui.tsx:1488,1555` | `revision.ts` |
| canonical JSON | `hosted-results.ts:16`, `runtime/owner-reminder-notification-protocol.ts:28` | one `canonicalJson()` |
| plain-object guard `object(value)` | `simulator-recovery.ts:9`, `workflow-history.ts:5`, `prototype/calendar-approval-fields.ts:5`, `runtime/agent-calendar.ts:25`, `runtime/automations-protocol.ts:22` | one `isPlainObject` |
| connection selection reader | 9 inline parses in 6 `browser/` files and 16 in `src`. The constant lives at `runtime/connection-ui.tsx:204` | `readConnectionSelection()` exported from the connection owner |
| dev namespace regex | `development-digest-document.ts:15`, `development-execution-document.ts:10`, `development-agent-document.ts:12` | `development-identity.ts` |
| email regex | `simulated-inbox.ts:7,21,24(×2)`, `calendar-sync-fields.ts:10` | one `isEmailAddress` |
| repeat → RRULE map | `calendar-sync-fields.ts:4-8`, `prototype/agent-calendar-adapter.ts:200`, `prototype/calendar-adapter.ts:36` | `calendar-recurrence.ts` |
| theme-token copy and dark detection | 15 `browser/` files (P4) | the dialog kit |
| observable document facade | `calendar-store.ts`, `reminder-store.ts`, `preference-documents.ts`, `notification-store.ts`, `hosted-results.ts`, `workflow-notices.ts`, `digest-authorization-document.ts`, `development-account-document.ts` | `observedDocument()` |
| `devSurfacesEnabled` definition | `build-flags.ts:3` and `dev-profile.ts:4` | `build-flags.ts` only (fix the test loader instead) |
| alias map | `vite.config.ts:117-157`, `tsconfig.json:23-117`, `test/dev-surface-gates.test.mjs:19` | one wildcard plus a generated list shared by all three |
| Android-vs-browser persistence pair | `runtime/cloud-personal-intent.ts:18,23-27` and `runtime/media-copy-intent.ts:19-25` each implement raw `localStorage` CAS for Android *and* a `BrowserDomainDocument` for web | one storage port with two adapters (cross-area, flag to the runtime auditor) |

---

## 5. Structure and foldering

- **Split `browser/` by role:**
  - `platform/web/`: the web Capacitor plugins;
  - `platform/storage/`: `documents`, `domain-document`, `json-domain-document` and the observed facade;
  - `ui/dialogs/`: `review`, `content-question`, `reading-review`, `dialog-layout`, `retained-data-notice`, `selected-document-viewer`;
  - `dev/`: everything listed in the §3 dev group.

  Today 12 app modules import `json-domain-document`, 10 prototype modules import `domain-recovery`, and 8 import `content-question` from a folder called "browser".
- **`content-question.ts` and `reading-review.ts`** are prototype UI. Their importers are all in `prototype/`, and they import back from `prototype/summary-source` and `prototype/local-ocr`, which creates a circular folder dependency. Move them into `prototype/`.
- **`calendar-sync-fields.ts`** is used by `runtime/calendar-linked-provider.ts`, `runtime/calendar-sync-host.ts` and `runtime/native-calendar-sync.ts`, including on native. It belongs in `runtime/` or a shared calendar module.
- **Calendar is spread over 18 files:** `calendar`, `-store`, `-records`, `-recurrence`, `-time`, `-alerts`, `-backup`, `-recovery`, `-deletions`, `-editor`, `-editor-draft`, `-linked-local`, `-meeting`, `-response`, `-agent-review`, `-sync-fields`, plus 3 CSS files. Several have 4–9 lines (`calendar-time` 4, `calendar-alerts` 8, `calendar-recovery` 9, `calendar-response` 8 very long lines). Give the calendar a `calendar/` subfolder and merge the tiny ones (time, alerts and recurrence into records; response and meeting into a dialogs file).
- **The recovery entry points** (`preference-recovery.ts`, `reminder-recovery.ts`, `notification-recovery.ts`, `calendar-recovery.ts`) are 11 one-line wrappers around `openDomainRecovery`. In production they all show "Data kept" (`domain-recovery.ts:9`). Replace them with a table keyed by domain.
- **Monoliths:**
  - `voice.ts` (41 KB): note recording, recovery, speech requests and playback in one class.
  - `calendar.ts` (33 KB).
  - `notifications.ts` (29 KB).
  - `daily.ts` (21 KB).
  - `simulated-workflows.ts` (18 KB).
  - `development-workflows.ts` (18 KB).
  - `device.ts` (15 KB, with a single 1,853-character line, the longest in the folder).

  208 lines in `browser/` exceed 400 characters and 14 exceed 1,000. Formatting alone (Prettier) would make review and diffs workable. Today one-line functions such as `calendar-response.ts:6-7` hide 30+ statements.
- **Tiny files that should merge:** `screen-locked` + `notice-action` + `focus-state`'s `focusChanged`; `revision` + the new `sha256Hex`; `reminder-action-document` + `reminder-creation-document` + `reminder-store`; `audio-settings` + `audio-levels`; `video-codecs` + `video-capture`; `camera-frame` + `camera-focus`; `register-hosted-results` → `register`.
- **Build files:**
  - Move the alias map out of `vite.config.ts` and `tsconfig.json` into one generated wildcard.
  - `vite.config.ts:16` runs `checkCloudDeployment(...)` at config import time, so config evaluation has side effects.
  - `apps/app/index.html`, `capacitor.config.ts` and `app.config.json` are minimal and fine.
  - `apps/app/public/` assets are all referenced. Checked: fonts in `prototype/prototype.css` and `asset-manifest.json`; lucide icons through `icon-style.ts:8` (dynamic `-filled` names); sender icons through `runtime/mail-sender-image.ts:11`; `delegation-return.html` through scripts and specs.
- **`scripts/feature-manifest.ts`** is small and clean. It is the source of the exact-inventory test (`test/feature-parity.test.mjs:24-31`), which requires every Alpha source path to be listed by hand in `test/support/feature-parity.mjs` (636 lines). Every file merge or move in this area must edit that list. Consider limiting the inventory to directories, or deleting the module-list half of the test.

---

## 6. Worst offenders

1. `domain-document.ts`: the legacy envelope and frozen-shadow policy behind every browser store (P2).
2. `domain-recovery.ts`: 61 lines of dense imperative dialog, calendar-specific branches in a generic helper, positional parameters, and production-dead apart from line 9 (P4, P8, P9).
3. `json-domain-document.ts`: a third JSON wrapping layer (P2).
4. `vite.config.ts`: two development-stub plugins with an importer allowlist, 34 hand aliases (one dead), and side effects at config time (P1, P13).
5. `tsconfig.json`: a second, drifting copy of the alias map (P13).
6. `scripts/prepare-client-features.ts`: a dead option, a dead export, a tombstone guard, concurrency machinery and seven import rewrites (P15).
7. `voice.ts`: a 41 KB monolith with duplicated PCM windowing and a legacy recovery branch (P17).
8. `calendar.ts` and `daily.ts`: mirrored deletion and journal flows, inline SHA helpers and long one-line methods (P5, P11).
9. `notifications.ts`: re-declared types, its own lock predicate and two dialog constructions (P4, P5, P11).
10. `notification-store.ts`: a legacy v1 key fallback and lock-wrapped initialisation for a preview build (P2).
11. `simulated-apps.ts`: monkey-patches `Component.prototype` (`componentDidMount`, `openView`, `vset`) plus four gating layers (P1).
12. `simulated-workflows.ts` with the 15 `workflow-*` modules: a second workflow engine driven by English labels (P16).
13. `simulated-inbox.ts`: the email regex four times, and one 1,000+ character `render` override.
14. `development-connection.ts`, `development-cloud.ts` and `development-cloud-ui.tsx`: a fake agent, Cloud and billing protocol with a check-act-check pattern on every line (P6).
15. `development-agent-document.ts`, `development-execution-document.ts` and `development-digest-document.ts`: triple-guarded document wrappers with duplicated regexes (P1, P5, P6).
16. `digest-storage.ts`: a legacy prefix-scan migration plus a four-check recovery wrapper (P2, P6).
17. `password-provider.ts`: duplicated pending and open listener sets, and a development provider in product code paths (P4, P8).
18. `location.ts` and `location-simulation.ts`: simulation branches and dev-forked copy inside the product plugin (P8).
19. `device.ts` and `device-adapter.ts`: a monkey-patched `renderVals`, dev-forked copy, and the folder's longest line (P8).
20. `preference-documents.ts`, `calendar-store.ts` and `reminder-store.ts`: the facade boilerplate in triplicate (P3).
21. `dev-profile.ts`: a second definition of `devSurfacesEnabled` for a test loader (P18).
22. `browser-poll.ts`: a session saver used only by tests and models (P14).
23. `register.ts` and `register-hosted-results.ts`: ordering-dependent registration contradicted by the actual import order (P12).

---

## 7. Open questions and risks

1. **Legacy data.** Does any installed build (the retained Pixel v44, internal APKs, or testers' browser profiles) hold `alpha.browser.*` `localStorage` data written before 2026-10-04 that must survive? If not, P2 deletes the envelope, the `{raw}` wrapper, legacy keys, migrations and the "old copy" UI. If yes, run a one-time migrate-and-drop, not a permanent shadow.
2. **Production recovery.** `domain-recovery.ts:9` shows only "Data kept" outside test-mocks builds. Should production have *any* recovery entry points? If not, the 11 `open*Recovery` wrappers and their prototype call sites can collapse to one notice.
3. **Development simulator scope.** Should the browser development profile (`?mode=dev`) with its simulated Phone, Messages, Inbox, Wallet and Workflows apps, a fake Cloud account and billing, and a label-driven workflow engine be kept? That is 48 files and 38% of the folder. Deleting it removes the largest single block and most of P1, P6 and P16, and it would also retire many browser specs.
4. **Model-only code.** `createSessionSaver` is proved and model-checked but not used by the product. Wire it in or delete it with its Quint and tests.
5. **Alias migration.** Moving to an `@eliza/*` wildcard needs a shared Node resolve hook for the strip-types and vm test loaders, and edits to 18 test or spec files that hard-code `../../../../.eliza`. It would also let `prepare-client-features.ts` drop its seven import projections. Confirm that the formal-model ledger (`specs/quint/*/manifest.json`, `scripts/quint-lib.ts`), which records exact source paths, tolerates the rewrite.
6. **Registration order (P12).** Not proved broken. Confirm by having `registerPlugin` log any second registration that carries a `web` implementation.
7. **Exact-inventory test.** `test/feature-parity.test.mjs` plus `test/support/feature-parity.mjs` will fail on every file merge or move in this plan. Decide whether the module inventory is still wanted.
