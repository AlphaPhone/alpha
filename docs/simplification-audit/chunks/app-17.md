# Chunk app-17 — prototype settings, SMS, telephony, shade, review dialogs

Per-file reports are in `docs/simplification-audit/files/apps/app/src/prototype/<file>.md`. The harness refused to write the reports for `summary-note-review.ts` and `summary-source.ts` (file names containing "summary"). Their findings are recorded in full in the sections below.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/prototype/settings-adapter.ts | SPLIT (+ ~65 lines deleted, ~450 moved to runtime/ and settings/ modules) | 1281 | ~750 (≈450 after page builders move) |
| apps/app/src/prototype/share-panel-adapter.ts | SIMPLIFY | 36 | ~33 |
| apps/app/src/prototype/sms-adapter.ts | SIMPLIFY | 268 | ~240 |
| apps/app/src/prototype/source-review-dialog.ts | KEEP (move to runtime/review-dialog.ts; make it the only dialog scaffold) | 17 | 17 |
| apps/app/src/prototype/subview-accessibility.ts | SPLIT (reply announcer → reply-announcer.ts) | 213 | ~140 (+~70 in new file) |
| apps/app/src/prototype/summary-note-review.ts | SIMPLIFY (rebuild on openReview) | 28 | ~16 |
| apps/app/src/prototype/summary-source.ts | SIMPLIFY (drop alias re-exports; move to runtime/) | 9 | ~5 |
| apps/app/src/prototype/system-bar-appearance.ts | KEEP (minor; becomes the only bar-appearance writer) | 18 | ~16 |
| apps/app/src/prototype/system-shade.ts | SIMPLIFY | 133 | ~115 |
| apps/app/src/prototype/telephony-attention.ts | SIMPLIFY | 82 | ~72 |
| apps/app/src/prototype/telephony-presenters.ts | KEEP (minor; optional move to runtime/) | 117 | ~115 |
| apps/app/src/prototype/telephony-review.ts | SIMPLIFY (small) | 68 | ~62 |
| apps/app/src/prototype/template-source.ts | KEEP | 10 | 10 |

### Findings for the two files whose reports could not be written
**summary-note-review.ts** (28 lines; importer `agent-adapter.ts:49`, called at L1985 and stored as `this.closeSummaryReview`; pins: `test/browser/content-review-layout.spec.ts`, `feature-parity.mjs:426`)
- L8-10, 17, 21-24, 27 (C4): this file re-implements `openReview`: the dialog, the `.os` theme-token copy, the region, the footer, the pagehide/visibility/alpha-back/cancel teardown and focus return. It does **not** call `holdPhoneInert`. Change: build it on `openReview<boolean>`. The caller then keeps an `AbortController` and stores `()=>controller.abort()` as `closeSummaryReview` (cross-file with `agent-adapter.ts:1984-1985`). Risk: medium, because this adds the inert phone (owner sign-off).
- L13-14 (D12): inline `style.cssText` on the inputs. Change: move to one CSS rule under `.note-source-dialog`.
- L5 (C1): the inline save-input type. Change: export `SummaryNoteDraft` and reuse it in `agent-adapter`.
- L26 (B1): `catch{report('Save unconfirmed')}` is specified behaviour. Keep it.
- Verification: the Playwright specs `content-review-layout`, `summary-source-note`, `web-summary-note` and `canonical-notes`.

**summary-source.ts** (9 lines; importers: `agent-adapter.ts:50`, `browser-adapter.ts:12`, `note-web-source-adapter.ts:1`, `summary-note-review.ts:2`, `voice-adapter.ts:15`, `browser/content-question.ts:1`)
- L4-7 (D4/C7): the aliases `WebSource=WebSourceLink`, `RecordingSource`, `SummarySource` and the re-exports of `recordingRevision`/`recordingSourceOf` add nothing. `runtime/note-origin.ts:6` already imports `recordingRevision` straight from upstream, so the same symbol has two import paths. Change: importers use the upstream names, and this file keeps only `webSourceOf`/`summarySourceOf`, which bind `sensitiveReadingUrl`.
- L1-2 (D13): deep `.eliza` relative imports. L-file (D11): move the file to `runtime/summary-source.ts`.
- Verification: the Playwright summary/web-summary/canonical-notes specs, `test/note-origin.test.mjs` and `test/browser-reviewed-link-provenance.test.mjs`.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `Bag = Record<string,any>` | type | settings-adapter.ts:42, sms-adapter.ts:35, share-panel-adapter.ts:3, subview-accessibility.ts:6, telephony-attention.ts:17 | ~50 files in prototype/ and browser/ | `prototype/shell-types.ts` (`ShellHost`, `ViewApi`, `ViewValues`) |
| `ReplyShell = Record<string,any>` | type | subview-accessibility.ts:157 | `Bag` in the same file | `ShellHost` |
| `OpenThread` | type | sms-adapter.ts:12 | `runtime/connection-ui.tsx:2283` (`draftSmsReply` param), `runtime/telephony-executor.ts:45` (`openThread()` return) | `runtime/telephony-executor.ts` |
| `SystemBars` | type | system-bar-appearance.ts:1 | Capacitor `SystemBars` (same name, different API) in `agent-adapter.ts:80`; AlphaDevice typings ×18 | `native/alpha-device.ts` |
| AlphaDevice plugin typings | const | settings-adapter.ts:112, system-shade.ts:75 | 18 `registerPlugin('AlphaDevice')` sites (browser/device-adapter, notifications ×3, register, simulated-workflows, main ×2, agent-adapter, camera-adapter, maps-adapter, voice-adapter, accessibility-timeout, crash-log, text-share, startup-permissions) | one typed module per plugin |
| AlphaNotifications / ElizaSystem / AlphaPhotos / AlphaTelephony typings | const | settings-adapter.ts:123,124,44; sms-adapter.ts:46; telephony-attention.ts:40 | AlphaNotifications ×8, ElizaSystem ×5, AlphaPhotos ×3, AlphaTelephony ×7 | one typed module per plugin |
| `PhotoAccess` | type | settings-adapter.ts:43 | camera-adapter.ts:101,131 | `native/alpha-photos.ts` |
| `RoleRow` | type | settings-adapter.ts:125 | upstream `@elizaos/capacitor-system/settings` parser row | import upstream |
| `mergeDeviceFacts` | helper | settings-adapter.ts:341 | inline twin in `refresh()` settings-adapter.ts:592-599 (different semantics) | one helper, used by `refresh()` |
| app-update policy (`UPDATE_*`, `parseUpdateManifest`, `updateCheckDue`, `updateIdle`, `automaticUpdateIdle`, `AppUpdate`) | const/helper/type | settings-adapter.ts:145-228 | `scripts/publish-update-manifest.ts` (imports it), `AlphaDevicePlugin.UPDATE_MAX_BYTES` | `runtime/app-update.ts` |
| appearance storage (`APPEARANCE_KEY`, `readAppearanceChoice`, `resolveAppearance`, `hasAppearancePreview`) + 2 inline writers | const/helper | settings-adapter.ts:256-270, 684, 1136 | each other | `runtime/appearance.ts` |
| `settingsParents` / `nestedParents` | const | settings-adapter.ts:722, 1261 | each other (they disagree on `problems`) | one `PARENTS` table |
| `categoryNames` / `categories` | const | settings-adapter.ts:717, 1203 | each other | one table |
| row factories `info/nav/group/action/permissionInfo` | helper | settings-adapter.ts:755-775 | passed into `passwords/password-manager.ts` as `helpers` | `prototype/settings/rows.ts` |
| permission-word maps | helper (inline) | settings-adapter.ts:1107-1112, 1233, 1251 | each other (3×) | one `permissionWord()` |
| photo-scope word map | helper (inline) | settings-adapter.ts:844, 1254 | each other | one `photoScopeWord()` |
| toggle track literal / subpage skeleton | const (inline) | settings-adapter.ts (7× / 13×) | `model.js` `api.track/kx`, `stTog` | `toggle()` / `subpage()` helpers, later a CSS class |
| Lucide URL `'/icons/lucide/'+name+'.svg'` | helper (inline) | settings-adapter.ts:1264 | 8 files | `lucideIconUrl()` in `apps/app/src/icon-style.ts` |
| session identity `JSON.stringify([...])` | helper (inline) | settings-adapter.ts:659,662; subview-accessibility.ts:195 | main.tsx:102,430; agent-adapter.ts:443,1429,1694; agent-calendar-adapter.ts:142 | `runtime/session-key.ts` |
| contact-name map loop | helper (inline) | sms-adapter.ts:128-129, telephony-attention.ts:33-36 | phone-adapter.ts:103 | `telephony-presenters.ts` `contactNames()` |
| invalidate-review sequence | helper (inline) | sms-adapter.ts (9×) | — | local `invalidateReview()` |
| `Thread`/`Call`/`Voicemail` | type | telephony-presenters.ts:96-98 | upstream `SmsThread`, `TelephonyCallLogEntry`, `VoicemailEntry` | `Pick<>` of upstream types |
| `ICON` path strings | const | telephony-review.ts:12-15 | `model.js:37,41,61,85` `IC.send/phone/check/trash` | icon names |
| review-dialog scaffold + theme-token copy | helper | source-review-dialog.ts:4-17 (canonical), summary-note-review.ts:8-27 | file-email-review.ts:14, note-web-source-adapter.ts:14, note-source-adapter.ts:53, runtime/calendar-sync-settings.ts:205, browser/content-question.ts:9 | `openReview` in `runtime/review-dialog.ts` |
| `WebSource`/`RecordingSource`/`SummarySource` aliases | type | summary-source.ts:4-6 | upstream `*SourceLink` | upstream names |
| `FOCUSABLE` selector | const (inline) | subview-accessibility.ts:89,129 | each other | one const |
| `HOME` selector literal | const | system-shade.ts:35 vs :87 | each other | `HOME.home` |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| settings-adapter `note` row helper (L756) | Never called (no `note(` in the file) | Confirmed |
| settings-adapter `cloud-plan` page and unused `day` helper (L919-924) | Nothing in `apps/` sets `page:'cloud-plan'`, and `day` is never called | Confirmed |
| settings-adapter `'Privacy & data'` branch (L1100-1121) and `voicePrivacyRow` (L229-236) | Page `privacy` always goes to `permissionsPage` (L732/L737) and the top row is deleted (L1180). `voicePrivacyRow` has 0 external users. | Confirmed by reading the code; check with one Playwright visit |
| settings-adapter `Models` page branch, `inferenceProvider` read, `residentProvider/inferenceModel` (≈25 lines) | The only entries are the top "Models" row (deleted at L1179) and the dead Privacy page | Plausible: needs a reachability probe |
| settings-adapter first `definition.back` wrap (L352-357) | The outer wrap (L723-728) handles `password-entry` the same way before it delegates | Confirmed |
| settings-adapter second `componentDidUpdate` wrap (L705-710) | It can merge into the first wrap (L675) | Confirmed |
| settings-adapter `installedRows` (L142-144) | Only `test/settings-truth.test.mjs` uses it | Confirmed |
| settings-adapter `mergeDeviceFacts` (L341-346) or its inline twin | Production never calls it, yet it is tested and Quint-pinned | Confirmed (owner picks which semantics stays) |
| settings-adapter `browserDevProfile` alias (L48) | `dev-profile.ts:7` already includes `devSurfacesEnabled` | Confirmed |
| `settingsParents.history` / `nestedParents.history` | Nothing sets `page:'history'` | Plausible |
| sms-adapter `nativeReceipts`, `nativeSim` render values | 0 template bindings and 0 readers anywhere | Confirmed |
| sms-adapter template-unbound `nativeRows/nativeInThread/nativeSims/nativeSend/nativeSendMms/nativeAttachments/nativeClear` + `simLabel` | Not bound in template.html. Only host tests and Quint replays drive them. | Confirmed test-only (needs test migration) |
| sms-adapter `views.messages.reply=()=>null` (L198) | `agent-adapter.ts:1939` replaces `p.reply` globally | Confirmed redundant (research) |
| share-panel `emailUnavailable` option (adapter L16/23/29 + `runtime/share-panel.ts` `SharePanelOptions`) | Never read: the only occurrence in share-panel.ts is the type | Confirmed |
| system-shade re-exports `overflowPullDecision`, `PULL_SLOP`, `STATUS_BAND`, types `PullContext/PullStart/ShadeSurface` | 0 importers through this module | Confirmed |
| telephony-attention re-export line 15 and the `readTelephonyAttention` export | 0 external importers | Confirmed |
| telephony-presenters exports `nameOf`, `Names`, `CallKind`, `AttentionRow`, `AttentionCard` (export keyword only) | 0 external importers | Confirmed |
| telephony-review exports `contactChangeLines`, `presentTelephonyReview` (export keyword only) | 0 external importers | Confirmed |
| summary-source alias re-exports (L4-7) | Pure renames. `recordingRevision` is already imported from upstream by `runtime/note-origin.ts` | Confirmed |
| summary-note-review hand-rolled dialog scaffold | It duplicates `openReview` | Confirmed (merge, not pure delete) |
| settings-adapter legacy calendar recovery rows (L862-870) | Covered by research P10 | Owner decision |

## Cross-file actions
1. **Move app-update policy out of settings-adapter**: `settings-adapter.ts` L135-228 + L272-296 → `runtime/app-update.ts`. This touches `main.tsx:70`, `scripts/publish-update-manifest.ts`, `LemmaScript-files.txt:12`, `specs/lemma/apps/app/src/prototype/settings-adapter.dfy(.gen)` (regenerate under the new path), `specs/lemma/README.md:185`, the marker-slicing tests (`test/settings-truth.test.mjs`, `test/app-update-automatic.test.mjs`, `test/publish-update-manifest.test.mjs`, `specs/quint/refinement/application/automatic-app-update-schedule.mjs`), `specs/quint/refinement/{application/mounted-update-admission,native/update-staging,native/update-barrier}.mjs`, `test/app-update.test.mjs`, `test/fixtures/UpdateDownloadTest.java`, the `specs/quint/application/manifest.json` and `specs/quint/native/manifest.json` pins, and the `AlphaDevicePlugin.java:233,667` comments.
2. **Appearance storage**: move it to `runtime/appearance.ts`. This touches `main.tsx:70`, `settings-adapter.ts` (L256-270, L684, L1136) and `test/fixtures/appearance-preference.mjs`.
3. **Dead Privacy/Models pages**: delete them in `settings-adapter.ts` together with their scrub rows in `native-adapter.ts:307-308,340` (`'Privacy & data'`, `'Leaves this device'`, `'Inference model'`).
4. **mergeDeviceFacts**: make `settings-adapter.ts refresh()` the one user, or delete the function. This touches `test/settings-text-scale-refresh.test.mjs`, `specs/quint/application/manifest.json` and `specs/quint/application/README.md`.
5. **share-panel emailUnavailable**: change `share-panel-adapter.ts` and `runtime/share-panel.ts` (`SharePanelOptions`) together.
6. **OpenThread type**: export it from `runtime/telephony-executor.ts` and import it in `sms-adapter.ts` and `runtime/connection-ui.tsx:2283`.
7. **contactNames helper**: add it to `telephony-presenters.ts` and use it from `sms-adapter.ts:129`, `phone-adapter.ts:103` and `telephony-attention.ts:33`.
8. **One review-dialog scaffold**: move `source-review-dialog.ts` to `runtime/review-dialog.ts`. Migrate `summary-note-review.ts` (plus the `agent-adapter.ts:1984-1985` caller), `file-email-review.ts`, `note-web-source-adapter.ts`, `note-source-adapter.ts`, `runtime/calendar-sync-settings.ts` and `browser/content-question.ts`. Update `calendar-availability-review.ts`, `notes-query-review.ts`, `test/browser/notes-named-review.spec.ts` and `test/browser/notes-query-review.spec.ts`.
9. **One system-bar owner**: fold `agent-adapter.ts:1532-1535` (`SystemBars.setStyle` from `out.sbColor`) into `system-bar-appearance.ts`, or decide on the reverse.
10. **System-shade re-exports**: `model.js:20` and `main.tsx:48` import `emptyHomeShadePull`/`shadeSurface` from `@elizaos/capacitor-system/shade`. Also update `scripts/test-canonical-notification-navigation.ts`.
11. **Reply announcer split**: `subview-accessibility.ts` L146-213 → `prototype/reply-announcer.ts`. This touches `main.tsx:16` and `test/final-ui-lifecycle.test.mjs` (it slices at `type ReplyShell =`).
12. **sms-adapter unbound native values**: rewrite `test/image-sms.test.mjs`, `test/sms-incomplete-rows.test.mjs`, `specs/quint/refinement/services/{sms-send-replay,mms-compose-replay}.mjs` and `specs/quint/services/manifest.json` against the designed values, then delete the values.
13. **summary-source aliases**: update the 6 importers (`agent-adapter.ts`, `browser-adapter.ts`, `note-web-source-adapter.ts`, `summary-note-review.ts`, `voice-adapter.ts`, `browser/content-question.ts`).
14. **telephony-review icons**: return icon names instead of path data. This touches `template.html:64-72` and possibly `dc-lite.js` icon lookup (research P16).
15. **Typed plugin modules**: AlphaDevice, AlphaNotifications, ElizaSystem, AlphaPhotos and AlphaTelephony call sites across `apps/app/src` (see the types table).

## Text/path pins
- settings-adapter.ts:
  - Marker slicing: `// settings-facts:*` (test/settings-truth, app-update-automatic, publish-update-manifest, quint automatic-app-update-schedule), `// settings-reads:*` (comms-settings, quint-settings-listener-reads) and `// calendar-settings:*` (calendar-settings-simplicity, assistant-settlement-delivery, calendar-sync-settings-navigation).
  - Literal line slices: `test/recovery-restart-presentation.test.mjs:26` and `test/settings-truth.test.mjs:178`.
  - Formal and other pins: `LemmaScript-files.txt`, `specs/lemma/.../settings-adapter.dfy`, and 42 path refs + 32 symbol pins in `specs/quint/application/manifest.json`. Also `specs/quint/{legacy,native}/manifest.json`, `specs/quint/legacy/settings-nav/check-settings-nav-refinement.mjs`, `test/support/feature-parity.mjs:421`, ~30 other test files, and the `SettingsNativeInstrumentedTest`/`SettingsRolesInstrumentedTest` Java tests.
- sms-adapter.ts:
  - `specs/quint/services/manifest.json` (20 refs) and `specs/quint/native/manifest.json`.
  - The replays `sms-send-replay.mjs` and `mms-compose-replay.mjs`.
  - Tests: `test/fixtures/observed-sms-adapter.mjs`, `test/image-sms.test.mjs`, `test/sms-incomplete-rows.test.mjs` and `test/browser/aosp-telephony-views.spec.ts`.
- subview-accessibility.ts: `test/accessibility-coverage.test.mjs:187,298-300` (regexes per POPUPS entry), `test/final-ui-lifecycle.test.mjs` (`type ReplyShell =` slice) and `specs/quint/application/manifest.json` (3).
- system-shade.ts: `test/system-shade.test.mjs` (source regexes), `test/system-shade-timeout.test.mjs` (slices at `/** Reads what a pull started on.`, `export const SHADE_REQUEST_TIMEOUT` and `  p.expandAndroidShade = async function () {`), and `specs/quint/application/manifest.json` (10 refs).
- telephony-attention.ts: `test/telephony-attention-lifecycle.test.mjs` (stubs import specifiers `../runtime/aosp-image`, `./native-adapter`, `./mvp-features` and `../platform-plugins`) and `specs/quint/native/manifest.json:4536`.
- telephony-presenters.ts: `specs/quint/refinement/native/telephony.mjs:147` (imports by path) and `specs/quint/native/manifest.json:4537`.
- share-panel-adapter.ts: `test/share-panel-adapter.test.mjs`, `test/share-panel-watch.test.mjs` (strip-types transplant) and `specs/quint/application/manifest.json`.
- source-review-dialog.ts: `test/browser/notes-named-review.spec.ts` and `test/browser/notes-query-review.spec.ts` (read and strip types).
- system-bar-appearance.ts: `test/system-bar-appearance.test.mjs` (regex on the `main.tsx` call line and on the `AlphaDevicePlugin.java` body).
- template-source.ts:
  - `test/dc-lite-keys.test.mjs:14` and `test/browser-reading-capability.test.mjs:157` (they replace the dc-lite import line).
  - `test/voice-in-chat-only.test.mjs:33` (regex on L10).
  - The comment markers in `template.html:4564,4591`.
- All 13 files are listed in `test/support/feature-parity.mjs:421-433`. system-bar-appearance and template-source also have owner entries at L31 and L39.

## New patterns
- **NEW-A: Two writers for one device output.** Android system-bar appearance is set by `system-bar-appearance.ts` (`AlphaDevice.setSystemBarAppearance`, from the theme) and by `agent-adapter.ts:1534` (Capacitor `SystemBars.setStyle`, from `out.sbColor` in `renderVals`). They are separate plugins with no coordination, so the last writer wins. Treatment: one owner computes the final appearance from every input.
- **NEW-B: The proof covers a twin, not the running code.** `mergeDeviceFacts` is proved and tested, but the production `refresh()` runs an inline variant with different semantics. Treatment: the production path must call the proved function, or the proof and test go.
- **NEW-C: Parent/back tables that disagree.** `settingsParents` (hardware Back) and `nestedParents` (on-page Back label and handler) give different parents for the same page (`problems`). Treatment: one navigation table drives both.

## Owner questions
1. The Settings "Privacy & data" and "Models" prototype pages are unreachable in product builds (the page `privacy` always becomes the App permissions page). Can they be deleted, along with their native-adapter scrub rows?
2. `mergeDeviceFacts` (proved and tested) and the inline merge in `refresh()` differ: the inline version deletes text-size keys that the previous facts lacked. Which semantics is intended?
3. Problems page Back: should hardware Back and the on-page Back both return to About? Today they go to About and Developer respectively.
4. Should Android system-bar appearance have one owner (theme plus immersive dark views), replacing the separate Capacitor `SystemBars.setStyle` call in agent-adapter?
5. The summary-note review dialog does not make the phone inert (`holdPhoneInert`), unlike `openReview`. Is adopting `openReview` (and so inerting the phone) acceptable?
6. The sms-adapter `native*` render values that only tests and Quint replays use: may the tests and replays move to the designed-view values so those values can be deleted?
