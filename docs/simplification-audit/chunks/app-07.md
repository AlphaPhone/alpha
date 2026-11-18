# Chunk app-07 — summary

Scope: 18 `apps/app/src/browser/{video-transcode,voice,workflow-*}.ts` files and 6 root renderer files (`build-flags.ts`, `daily.ts`, `icon-catalog.json`, `icon-style.ts`, `local-speech-playback.ts`, `main.tsx`). Per-file reports: `docs/simplification-audit/files/apps/app/src/...`.

Key fact for this chunk: of the 15 `workflow-*` files, 14 are reachable only through `browser/simulated-workflows.ts` ← `browser/simulated-apps.ts`, which `vite.config.ts:29` stubs out of production builds. `workflow-notices.ts` is the exception — it is **product** code (agent `post_notification` effect in `prototype/agent-adapter.ts:1146`, receipts in `runtime/local-agent-storage.ts:32`, shade list in `browser/notifications.ts:6`). The dev-only `workflow-triggers.ts`/`workflow-trigger-runtime.ts` nevertheless carry Lemma proofs and Quint replay models.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/browser/video-transcode.ts | KEEP (minor) | 33 | 30 |
| apps/app/src/browser/voice.ts | SPLIT | 459 | ~400 across 4 files |
| apps/app/src/browser/workflow-calendar.ts | MERGE into browser/dev/workflow-sources.ts | 23 | 20 |
| apps/app/src/browser/workflow-dated-sources.ts | MERGE into browser/dev/workflow-sources.ts | 24 | 20 |
| apps/app/src/browser/workflow-drafts.ts | SIMPLIFY | 19 | 12 |
| apps/app/src/browser/workflow-focus.ts | SIMPLIFY | 42 | 36 |
| apps/app/src/browser/workflow-history.ts | SIMPLIFY | 85 | 65 |
| apps/app/src/browser/workflow-local-send.ts | KEEP (minor) | 28 | 26 |
| apps/app/src/browser/workflow-location.ts | SIMPLIFY | 23 | 21 |
| apps/app/src/browser/workflow-messages.ts | MERGE into browser/dev/workflow-sources.ts | 12 | 0 (≈8 moved) |
| apps/app/src/browser/workflow-notices.ts | SIMPLIFY | 71 | 55 |
| apps/app/src/browser/workflow-receipts.ts | SIMPLIFY (Wallet parts DELETE if A3) | 46 | 40 (25 without Wallet) |
| apps/app/src/browser/workflow-resources.ts | MERGE into browser/simulated-workflows.ts | 5 | 0 (3 moved) |
| apps/app/src/browser/workflow-result-input.ts | SIMPLIFY | 28 | 15 |
| apps/app/src/browser/workflow-speech.ts | MERGE into browser/simulated-workflows.ts | 11 | 0 (6 moved) |
| apps/app/src/browser/workflow-trigger-runtime.ts | SIMPLIFY | 93 | 85 |
| apps/app/src/browser/workflow-triggers.ts | KEEP (minor) | 121 | 115 |
| apps/app/src/browser/workflow-urgency.ts | SIMPLIFY | 26 | 16 |
| apps/app/src/build-flags.ts | SIMPLIFY | 11 | 5 (+ flags moved in) |
| apps/app/src/daily.ts | SIMPLIFY (later MOVE to native/plugins.ts) | 138 | 125 |
| apps/app/src/icon-catalog.json | KEEP (data) | 174 | 174 |
| apps/app/src/icon-style.ts | KEEP | 10 | 10 |
| apps/app/src/local-speech-playback.ts | SIMPLIFY + MOVE to runtime/voice/native-speech-playback.ts | 61 | 55 |
| apps/app/src/main.tsx | SPLIT | 438 | ~140 in main + ~245 in new bootstrap/dev modules |

Total 1,981 lines; ≈220 removable without owner decisions; ≈560 more if the dev workflow simulator is deleted (14 dev-only `workflow-*` files), ≈16 more if simulated Wallet goes, ≈30 more if A1 legacy branches go.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag = Record<string,any>` | type | workflow-dated-sources.ts:2, workflow-focus.ts:4, workflow-history.ts:3, workflow-local-send.ts:1, workflow-messages.ts:1, workflow-receipts.ts:4, workflow-trigger-runtime.ts:9, workflow-triggers.ts:1 | 41 files in src | shared `Bag` (types.md) |
| dev app state merge `{...api.get(n),...JSON.parse(localStorage.getItem('alpha.dev.app.'+n)||'{}')}` | helper | workflow-dated-sources.ts:17, workflow-focus.ts:9,26,41, workflow-local-send.ts:5, workflow-messages.ts:3, workflow-receipts.ts:6, workflow-trigger-runtime.ts:14 | simulated-workflows.ts:26, simulated-apps.ts:52, workflow-trigger-runtime.ts:43 (cached variant) | `browser/simulator-recovery.ts` `devAppState(api,name)` (it owns `key()` at :8) |
| flow definition `JSON.stringify({name,trig,steps})` | helper | workflow-triggers.ts:5 (`triggerDefinition`) | workflow-focus.ts:26,41, simulated-workflows.ts:20 | workflow-triggers.ts |
| lock/background predicate | helper | workflow-focus.ts:41, workflow-speech.ts:8, workflow-trigger-runtime.ts:13, voice.ts:275, workflow-notices.ts:36, workflow-urgency.ts:14, workflow-result-input.ts:7, workflow-receipts.ts:44, workflow-location.ts:15 | notice-action.ts:2 `noticeActionBlocked`, screen-locked.ts:3, notifications.ts:21, hosted-results.ts:17, runtime/text-share.ts:6 | `notice-action.ts` (or new `platform/foreground.ts`) |
| civil-day `Date.UTC(y,m,d)` | helper | workflow-calendar.ts:2, workflow-receipts.ts:15 | runtime/calendar-form-draft.ts:8, prototype/calendar-form-inputs.ts:3, calendar-interval-presentation.ts:5, calendar-form-draft-adapter.ts:11,42, calendar-edit-draft-adapter.ts:29, canonical-calendar-drafts.ts:84 | `browser/calendar-time.ts` `civilDayUtc` |
| SHA-256 hex | helper | workflow-notices.ts:13, workflow-trigger-runtime.ts:15 | deletions.ts:20, calendar.ts:50,242, hosted-results.ts:15, +19 in src | `browser/revision.ts` `sha256Hex` |
| plain-object guard `object()` | helper | workflow-history.ts:5 | simulator-recovery.ts:9, prototype/calendar-approval-fields.ts:5, runtime/agent-calendar.ts:25, runtime/automations-protocol.ts:22 | `apps/app/src/lib/is-plain-object.ts` |
| owned-operation lifecycle (retire events + visibilitychange) | helper | workflow-notices.ts:51-61, workflow-location.ts:12-14 | notice-action.ts:4-9 `beginNoticeAction` | `notice-action.ts` |
| imperative dialog kit (cssText, `['--bg','--fg','--s2']` copy, alpha-back capture, focus restore) | helper | workflow-history.ts:31-32,81-84, workflow-receipts.ts:32-43, workflow-result-input.ts:10-26, workflow-urgency.ts:17-24 | 17 more browser/prototype/runtime dialogs (research P4) | `openOwnedDialog()` in `browser/dialog-layout.ts` |
| observable document facade (BroadcastChannel + changed) | helper | workflow-notices.ts:8-9,37 | calendar-store, reminder-store, preference-documents, notification-store, hosted-results, digest-authorization-document, development-account-document | `observedDocument()` from preference-documents.ts |
| radius side test (inside/outside/unknown) | helper | workflow-location.ts:20-21 | workflow-trigger-runtime.ts:55 | `maps/route-distance.ts` |
| AlphaCalendar / AlphaNotifications / ElizaLocation / AlphaVoiceCloud plugin typings | type | workflow-calendar.ts:1, workflow-focus.ts:12,16,26, workflow-trigger-runtime.ts:26,53,59, local-speech-playback.ts:7,58 | startup-permissions.tsx:21-24, 16 AlphaVoiceCloud sites | typed native plugin module |
| `DailyApps` interface | interface | daily.ts:56-138 | startup-permissions.tsx:16-20 (partial, adds checkPermissions/requestPermissions) | daily.ts exported `DailyAppsPlugin` |
| `ClockResult` | type | daily.ts:55 | runtime/clock-contract.ts:19 (`ClockHandoffResult as ClockResult`, different shape) | rename one |
| abort race deferred / `bounded` / `playbackWait` | helper | video-transcode.ts:12-13, local-speech-playback.ts:18-20, voice.ts:383-392 | native-connection.ts:276-287, voice-timing.ts:126-129, workflow-presentation.ts:47-51, native-view-events.ts:9-12 | `runtime/abort-signal.ts` (`raceAbort`, `bounded`) |
| connection selection parse | inline | workflow-drafts.ts:9,13, main.tsx:106 | 16 sites; constant at runtime/connection-ui.tsx:204 | `readConnectionSelection()` |
| `devSurfacesEnabled` / `browserDevProfile` / `developerTools` re-derivations | const | main.tsx:97-99,323 | browser/dev-profile.ts:4,7,11,13, build-flags.ts:3 | build-flags.ts + dev-profile.ts only |
| inset cache `INSETS_KEY`/`validInset`/`rememberInsets` | const/helper | main.tsx:206-211 | main.tsx:255-258 | `runtime/surface-insets.ts` |
| `installBrowserCapabilityTiles` | helper | main.tsx:196-204 | browser/device-adapter.ts `installBrowserDeviceAdapter` | browser/device-adapter.ts |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `build-flags.ts:7-11` `updateChannelCheckEnabled` | git grep apps/android/scripts: definition only; kept by `test/settings-truth.test.mjs:20` (T1) and route-stub bodies in `chat-dictation-api.spec.ts:15`, `voice-stop-speaking.spec.ts:6` | High |
| `main.tsx:97-99` re-ANDed flag consts, `:121,174` dev guards around the Vite-stubbed simulated apps, `testMocksEnabled &&` before `mock`/`fixture` (9 sites) | flags already folded into `dev-profile.ts:7,13`, `mock`, `fixture`; stub at `vite.config.ts:28-29` | High |
| `workflow-notices.ts:25` `savedWorkflowNoticeHistory` | 0 apps callers; 3 browser specs via page.evaluate | Medium |
| `workflow-history.ts:34,49` hidden `description`/`noticeDescription` paragraphs | never filled, never unhidden, no aria reference | Medium |
| `workflow-location.ts:8` production branch of the `devSurfacesEnabled?…:…` message | module reachable only when `devSurfacesEnabled` (simulated-workflows.ts:23 early return) | High |
| `workflow-speech.ts:1` alias re-export; `workflow-resources.ts` and `workflow-messages.ts` as files | single importer each; merge | High |
| `daily.ts:73-76` `restoredResult` listener overload and `:81` `restoreSelected()` (+ `browser/daily.ts:172`) | no renderer caller (git grep apps); native still emits/implements | Medium (owner: native side) |
| `voice.ts:204` duplicate `devSurfacesEnabled` guard in `cloudBinding` | both callers guard first | High |
| `voice.ts:340-344` `saveRecording`, `:346` `migrationStatus` | no renderer caller; specs/native tests only | Low–medium (plugin-contract parity, owner) |
| A1 legacy paths: `voice.ts:52-58` (pre-journal recovery), `voice.ts:175,346` `migrateAudio`, `workflow-notices.ts:7,24,29,70` legacy comparisons, `workflow-history.ts:55,65,79-80` "⤓ Older" link, `workflow-drafts.ts:12` legacy reader | nothing writes the legacy keys (research P2) | Needs owner sign-off |
| Simulated Wallet in `workflow-receipts.ts:14-27,37` | PRD AP-13 deferred (A3) | Owner decision |
| Whole dev workflow simulator: 14 dev-only `workflow-*` files (+ simulated-workflows.ts, focus-state.ts) | stubbed out of production by `vite.config.ts:29`; reachable only with `?mode=dev` | Owner decision |

## Cross-file actions
1. **Dev-state helper**: add `devAppState(api,name)` to `browser/simulator-recovery.ts`; replace in `workflow-dated-sources.ts`, `workflow-focus.ts`, `workflow-local-send.ts`, `workflow-messages.ts`, `workflow-receipts.ts`, `workflow-trigger-runtime.ts`, `simulated-workflows.ts`, `simulated-apps.ts`.
2. **Foreground predicate**: export `noticeActionBlocked` (or move to `platform/foreground.ts`) and use it in `voice.ts`, `workflow-focus.ts`, `workflow-speech.ts`, `workflow-trigger-runtime.ts`, `workflow-notices.ts`, `workflow-urgency.ts`, `workflow-result-input.ts`, `workflow-receipts.ts`, `workflow-location.ts`, plus `notifications.ts`, `hosted-results.ts`, `runtime/text-share.ts` (outside chunk).
3. **triggerDefinition**: import from `workflow-triggers.ts` in `workflow-focus.ts` and `simulated-workflows.ts`.
4. **Dialog kit**: `openOwnedDialog` in `browser/dialog-layout.ts`; migrate `workflow-history.ts`, `workflow-receipts.ts`, `workflow-result-input.ts`, `workflow-urgency.ts` (and 17 others); update `test/browser/workflow-dialog-layout.spec.ts`, `remaining-dialog-layout.spec.ts`.
5. **Merges**: `workflow-calendar.ts` + `workflow-dated-sources.ts` + `workflow-messages.ts` → `browser/dev/workflow-sources.ts`; `workflow-resources.ts` + `workflow-speech.ts` → `simulated-workflows.ts`. Edit `test/support/feature-parity.mjs`; update page.evaluate import paths in `dev-workflow-calendar.spec.ts`, `dev-workflow-dates.spec.ts`.
6. **SHA-256 / civil day / plain object**: shared helpers (`browser/revision.ts`, `browser/calendar-time.ts`, `lib/is-plain-object.ts`) used by `workflow-notices.ts`, `workflow-trigger-runtime.ts`, `workflow-calendar.ts`, `workflow-receipts.ts`, `workflow-history.ts` and their twins listed above. Hash inputs (`JSON.stringify(x)`) must stay identical — persisted digests/sourceHash depend on them.
7. **workflow-notices.ts store**: move to `observedDocument()`; consumers that listen for `window 'focus'` (D3) must keep working (`notifications.ts`, shade).
8. **updateChannelCheckEnabled**: delete in `build-flags.ts` + `test/settings-truth.test.mjs:20-21` + stub bodies `test/browser/chat-dictation-api.spec.ts:14-15`, `test/browser/voice-stop-speaking.spec.ts:6`.
9. **Flag consolidation**: move `developmentBridgeAllowed` (`runtime/local-agent.ts:71`, `runtime/local-agent-storage.ts:9`), `developmentCloudVoiceEnabled` inputs, `dev-profile.ts:4` into `build-flags.ts`; requires replacing `test/dev-local-launcher.test.mjs:39` transplant and the Node-loader `import.meta.env===undefined` shims.
10. **DailyApps typing**: export `DailyAppsPlugin` from `daily.ts`, add permission methods, use in `startup-permissions.tsx:16-20` and `browser/daily.ts:35` (`implements`).
11. **local-speech-playback move/rename**: update 9 importers, `specs/quint/native/manifest.json` paths, `specs/quint/refinement/native/renderer-speech-chunk.mjs:44`, `speech-cleanup-latch.mjs`, `web-reading-review.mjs`, `specs/quint/application/manifest.json`, `test/support/feature-parity.mjs`, and host tests that import it.
12. **voice.ts split**: move T2 transplant tests (`browser-note-pending-audio`, `browser-streamed-speech`, `browser-voice-cancellation`, `browser-saved-transcript-audio`, `agent-always-local:256`) or delete per T2; update `specs/quint/application/manifest.json:3433`, `notes-recorder-media-admission.mjs:13`.
13. **main.tsx split**: new `bootstrap/adapters.ts`, `bootstrap/layout.ts`, `bootstrap/app-update.ts`, `runtime/surface-insets.ts`, `dev/mock-mode.tsx`; move `installBrowserCapabilityTiles` to `browser/device-adapter.ts`, dev-tools command handler to `browser/device-controls.tsx` (keep `vite.config.ts:28` stub export shape). Rewrite/delete every main.tsx text pin (list below) and update Quint application manifest + 10 refinement harnesses.
14. **Connection selection reader**: `readConnectionSelection()` in `runtime/connection-ui.tsx`, used by `main.tsx:106`, `workflow-drafts.ts:9,13` and 13 more.

## Text/path pins
- `test/support/feature-parity.mjs` — lists every file in this chunk by path (exact-inventory test `test/feature-parity.test.mjs`).
- `main.tsx`: `test/home-inset-layout.test.mjs` (slices `const INSETS_KEY=`…`let shell: any;` and `      const keyboardFree=`…`--phone-scale`), `test/app-update-automatic.test.mjs:132,161`, `test/voice-in-chat-only.test.mjs:34,64` (exact lines), `test/system-bar-appearance.test.mjs:18` (exact line), `test/product-identity.test.mjs:139`, `test/accessibility-coverage.test.mjs:189,227,274`, `test/retired-shell-work.test.mjs:7`, `test/startup-warning-retention.test.mjs:6`, `test/image-contacts-admission.test.mjs:50`, `test/post-sign-in-setup.test.mjs:157`, `test/theme-palette.test.mjs:39`, `scripts/test-canonical-notification-navigation.ts:10`, `scripts/dev-ui-remote-host.ts`, `specs/quint/application/manifest.json` (symbols `BrowserDeviceControls`, `refreshImage`, `applyImageContacts`, `chatPullBinding`, `keyboardFreeHeight`, `canvasGeometry`, `freeHeight(width,layoutHeight,input.editing)`), 10 `specs/quint/refinement/application/*.mjs` harnesses, 5 legacy Quint checkers, fixtures `appearance-preference`, `calendar-mounted-editor`, `notes-trash-read`, `workflow-clock-admission`.
- `build-flags.ts`: `test/settings-truth.test.mjs:20`, `test/dev-local-launcher.test.mjs:39`, `test/one-runtime-profile.test.mjs:49`, route stubs in `chat-dictation-api.spec.ts:15`, `voice-stop-speaking.spec.ts:6`, `specs/quint/application/manifest.json:479-506`, `recovery-ui.mjs:33`, `surfaces.mjs:37`, `cloud-connection-notices.mjs:204`.
- `local-speech-playback.ts`: `specs/quint/native/manifest.json` (symbols `confirmSpeechRetirement`, `speakChunk`, `dispose`, `playOwnedSpeech`, `speakLocalText`, `strictDrain`, `preparation`, strings `speech-cleanup-unconfirmed`, `playback-busy`), `renderer-speech-chunk.mjs:44` (source evaluation), `speech-cleanup-latch.mjs`, `web-reading-review.mjs`, `specs/quint/application/manifest.json`.
- `voice.ts`: T2 host tests listed in cross-file action 12, `specs/quint/application/manifest.json:3433`, `notes-recorder-media-admission.mjs:13`, ~20 browser specs importing `/src/browser/voice.ts`.
- `workflow-triggers.ts`: `LemmaScript-files.txt:7`, `specs/lemma/apps/app/src/browser/workflow-triggers.dfy(.gen)` (`//@` annotations on `placeChanged`, `cursorThrough`, `triggerTickPlan`), `specs/lemma/README.md:172`, `specs/quint/services/manifest.json` symbols, `trigger-cursor-replay.mjs:41`, `test/workflow-trigger-detection.test.mjs:4`.
- `workflow-trigger-runtime.ts`: `test/workflow-trigger-detection.test.mjs:153-160` (regexes on exact source text incl. `private wake=()=>{this.blocked=false;this.held=false;this.calendarEvents.clear();`), `trigger-cursor-replay.mjs:32-40` (import-specifier replacement of `workflow-focus`, `platform-plugins`, `location-simulation`, `sensor-policy`, `saved-places`, `native-location`), `specs/quint/services/manifest.json` symbols `WorkflowTriggerRuntime`, `blocked`, `held`, `wake`, `position`, `watching`, `triggerState`, `workflowNeedsReview`.
- `video-transcode.ts`: import specifier `'./video-transcode'` in video-edit.ts replaced by `test/video-capture-limit.test.mjs:12` and `specs/quint/refinement/native/video-edit-review.mjs:15`.
- `icon-style.ts`: `test/automations-unified.test.mjs:69`; import line `import {iconStyle} from '../icon-style';` replaced in `test/browser-reading-capability.test.mjs:156`, `test/dc-lite-keys.test.mjs:13`.
- `icon-catalog.json`: `scripts/vendor-lucide-icons.ts:16`, `test/canonical-icons.test.mjs:14`, `test/fixtures/workflow-execution-markup.mjs:14`.
- `daily.ts`: `scripts/test-clock-handoff-flow.ts:8`; 9 browser specs import `/src/daily.ts`.
- `workflow-notices.ts`: 13 browser specs import it; `dev-workflow-history.spec.ts:13` reads key `alpha.browser.workflow-notices.v1`.
- `workflow-history.ts`, `workflow-result-input.ts`, `workflow-urgency.ts`, `workflow-receipts.ts`: dialog layout specs and dev workflow specs assert their copy/labels.

## New patterns
- **NEW-dev-proofs: formal verification of dev-only code.** `workflow-triggers.ts` (Lemma/Dafny via `LemmaScript-files.txt`) and `workflow-trigger-runtime.ts` (Quint `trigger-cursor-replay`, services manifest) are reachable only in the `?mode=dev` simulator that production builds stub out. Proof and model upkeep is spent on a development fixture. Treatment: retire the proofs/models with the simulator, or (if the simulator stays) exclude dev-only modules from the formal ledger. Related to P6/T10 but distinct: not historical, not upstream — dev-only.
- **NEW-import-specifier pins.** Tests and Quint harnesses rewrite a *different* file's import line by literal text (`'./video-transcode'`, `import {iconStyle} from '../icon-style';`, `'workflow-focus$'`). Renaming or re-pathing a module silently breaks these stubs. Fold into T2/T10 treatment.

## Owner questions
1. Keep or delete the browser dev workflow simulator (`simulated-workflows.ts` + 14 dev-only `workflow-*` files, label-driven engine) — and with it the Lemma proof of `workflow-triggers.ts` and the Quint `trigger-cursor-replay` model?
2. A1: may the legacy envelope readers go (voice.ts pre-journal recovery branch and `migrateAudio`, workflow-notices legacy comparisons, workflow-history "⤓ Older" download, workflow-drafts legacy reader)?
3. A3: delete the simulated Wallet (workflow-receipts `recordWorkflowExpense`/`datedReceiptWallet`)?
4. `DailyApps.restoredResult`/`restoreSelected`: no renderer consumer — should Android stop retaining dangling results, or should the renderer consume them?
5. Web plugin parity: keep `BrowserVoice.saveRecording`, `migrationStatus` and `DailyApps.reminderDecision` (no renderer caller; specs and native tests only)?
6. Is the `main.tsx` adapter order (workflow/automations installed after simulated apps under `?workflows=agent`) intentional, so the two install sites must stay separate?
7. Main.tsx text-pinned tests (14 files + 10 Quint harnesses): delete per T1/T2 before splitting, or carry them through the split?
