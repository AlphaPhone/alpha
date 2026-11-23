# C-app-17: prototype settings, SMS, telephony, shade, review dialogs (stage C)

Files owned: the 13 files in `chunks/app-17.files.txt`. All still exist. Stage A had already removed the legacy
calendar recovery rows, the `legacyChanged` recovery probe, `voicePrivacyRow`'s export, share-panel
`emailUnavailable`, sms `views.messages.reply=()=>null`, the system-shade type re-exports and several unexports;
those are not repeated here.

## Done

- `prototype/settings-adapter.ts`
  - Deleted the unused `note` row helper (A7).
  - Deleted the unreachable `cloud-plan` Account page and its unused `day` helper; nothing in `apps/` sets
    `page:'cloud-plan'` (A7). The block's `residentPlanSettings()` read went with it.
  - Deleted the first `definition.back` wrapper (password-entry): the outer wrapper routes `password-entry` to
    `password-provider` with `leavePasswordEntry()` before it delegates, and the model's settings `back` always
    returns a boolean, so the inner branch could not run (A7/D2; `test/password-manager.test.mjs` already proves
    the outer route bypasses the inner one).
  - Deleted `installedRows` (its only user, `test/settings-truth.test.mjs`, was deleted in stage A) (A7/D7).
  - `browserDevProfile` imported from `browser/dev-profile` directly; the local re-AND with `devSurfacesEnabled`
    is gone (B4). `dev-profile.ts` already includes the same flag; the bundle audit names the strings that would
    leak if it stopped folding.
  - Plugin typings from `native/` (B2 map, C2): `AlphaDevice` → `AlphaDevicePlugin`; `AlphaNotifications` →
    `AlphaNotificationsPlugin & Pick<AlphaNotificationsBrowserMethods,'setAlertPreferences'>` (its two callers run
    only off native); `ElizaSystem` → `System` from `native.ts`; `AlphaPhotos` → `alphaPhotos` singleton, local
    `PhotoAccess` → `LibraryAccess` (types.md row).
  - Session identity tuple at `lastBinding`/`next` → `sessionKey(...)` from `lib/session-key` (B1 map R19; same
    bytes).
  - `systemScheme()`: removed the try/catch around `matchMedia` (cannot throw in WebView) and the `?.` on its result
    (B1).
  - `alpha:settings-page` handler: the inline `Set` plus 4-way ternary became one module table
    `NAVIGATION_CATEGORY` (page → category); same pages, same categories (D9).
  - Un-exported `LicenseNotice`, `readRoles`, `roleValue`, `buildVersion` (0 importers outside the file; tests
    that transplant them do so by text) (A7).
  - Comment noise: issue numbers `#424`, `#395` removed; the `settings-facts:begin` marker comment no longer names
    the deleted `settings-truth` test (marker text itself unchanged) (A8).
- `prototype/sms-adapter.ts`
  - Deleted render values `nativeReceipts` and `nativeSim` (0 bindings, 0 readers) (A7).
  - One local `invalidateReview()` replaces seven copies of `draftRevision++;operationId='';resetMms(false);notice='';receipt=null`;
    shared `pickSim(id)` and `removePicture(index)` serve both the designed view and the `native*` values (C3).
    The `picks` row (which never cleared `receipt`) and the cases that skip `resetMms` keep their own sequence.
  - `threadRows()` typed `SmsMessage[]` through a type-guard filter; the two `as any` casts (`threadId`, `full`)
    are gone (B3/C1).
  - Un-exported `OpenThread`, `SmsReplySuggester`, `AskedDraft` (0 importers) (A7).
- `prototype/share-panel-adapter.ts`: `isAbortError` from `lib/abort` (B1 map); one local `composeEmail(api, snapshot)`
  for the two Inbox-compose calls (C3).
- `prototype/subview-accessibility.ts`: the `['inbox','workflows']` loop with an `if(name==='inbox')` inside became
  two blocks, each creating only what its template binds (inbox no longer returns `runFocus`/`builderFocus`, and
  workflows no longer creates the three unused inbox modals or returns `composeFocus`; checked against
  `template.html`) (D9/D10); one `FOCUSABLE` selector const (C6); `#411` removed from a comment (A8).
- `prototype/system-shade.ts`: dropped the unused re-exports `overflowPullDecision`, `PULL_SLOP`, `STATUS_BAND`
  (D4/A7); `markHomeFits` un-exported; the Home selector literal now uses `HOME.home` (C6); removed the
  `typeof ResizeObserver` capability guard and its `else markHomeFits()` fallback (B2); `AlphaDevice` typed as
  `Pick<AlphaDevicePlugin,'openNotificationShade'>` (B2 map); issue numbers removed from the header comment (A8).
- `prototype/system-bar-appearance.ts`: local `SystemBars` type replaced by `SystemBarsPort` from
  `native/alpha-device` (B2 map; `main.tsx` already uses it); `shell` typed; base `componentDidMount`/
  `componentDidUpdate` called directly (B2).
- `prototype/telephony-attention.ts`: deleted the re-export line and the `Bag` type; `listVoicemail` called through
  the typed client (no `as Bag`, no `?.`); threads narrowed with a type-guard filter so both `NonNullable<…>` casts
  are gone (A7/B2/C1).
- `prototype/telephony-presenters.ts`: `Thread`/`Call`/`Voicemail` are `Pick<>`s of the upstream contract types
  (types.md row); `Names`/`nameOf` un-exported; one `callerName()` replaces the two copies of
  number→contact/cached/display resolution; `phoneCardTarget` (exported only for a test) inlined into
  `presentTelephonyAttention` (C1/C3/D7).
- `prototype/telephony-review.ts`: one `contactLines()` for the numbers-then-emails list built three times (C3);
  base `componentDidMount`/`componentWillUnmount` called directly (B2).
- `test/telephony-presenters.test.mjs` (behavioural): the two `phoneCardTarget` assertions now assert the same
  outcomes through `presentTelephonyAttention(...).phoneTab`.

Untouched: `source-review-dialog.ts`, `summary-note-review.ts`, `summary-source.ts`, `template-source.ts` (see
Skipped).

## Deleted tests and formal artefacts

- `test/cloud-plan-cancel.test.mjs`: transplant (slices the `cloud-plan` page block out of settings-adapter); it
  covered only the deleted unreachable page.

## Pins left broken

None found. All Quint manifest symbol pins naming my files were re-checked by script after the edits (every
`{path,name}` still matches); the LemmaScript extraction for `settings-adapter.ts` regenerates an identical
`settings-adapter.dfy.gen` and Dafny verifies it (12 verified, 0 errors).

Text pins I kept intact on purpose (they constrain later work): the `settings-facts`, `settings-reads` and
`calendar-settings` marker regions; the slices `const UPDATE_KEY`…`/** Keep the reference settings components`
(update-staging), `export function mergeDeviceFacts(`…`export function installSettingsAdapter(`,
`  p.componentDidUpdate = function (previousProps…`…`  p.componentWillUnmount` (appearance fixture),
`    this.passwordLifecycle…`…`    let lastBinding =`, `  const settingsBack = definition.back;`…`  definition.render =`,
the `resumedUnread`/`settingsResumeRead(this.S?.().view)` regexes in `comms-settings`, `type ReplyShell =`
(final-ui-lifecycle), and the system-shade timeout slices.

## Skipped

- Open owner questions (not implemented): Q-UI-2 Privacy & data / Models pages and `voicePrivacyRow`; Q-UI-3 one
  `PARENTS` table (`settingsParents` vs `nestedParents` disagree on `problems`); Q-UI-5 `summary-note-review` on
  `openReview` (adds the inert phone); Q-UI-7 `mergeDeviceFacts` vs the inline merge in `refresh()`; Q-UI-8 one
  system-bar owner (Capacitor `SystemBars.setStyle` in agent-adapter). sms-adapter template-unbound `native*` values
  (`nativeRows`, `nativeInThread`, `nativeSims`, `nativeSend`, `nativeSendMms`, `nativeAttachments`, `nativeClear`,
  `simLabel`): host tests and the Quint SMS/MMS replays drive them (delete-candidates B212 "no"; chunk Q6).
- Moves and splits (stage F): app-update policy → `runtime/app-update.ts`, appearance → `runtime/appearance.ts`,
  licences, diagnostics export, browser-store recovery and page builders out of settings-adapter; reply announcer →
  `reply-announcer.ts`; `source-review-dialog.ts` → `runtime/review-dialog.ts`; `summary-source.ts` → `runtime/`;
  presenters → `runtime/`; dev HTML paths in `template-source.ts`.
- `summary-source.ts` alias removal: needs edits to five other owners' imports (and deep `.eliza` paths there until
  the `@eliza/*` alias exists, D13); left for the move.
- Folding the second `componentDidUpdate` wrapper (resumedUnread) into the first: `test/fixtures/appearance-preference.mjs`
  transplants the first wrapper verbatim and would then reference `resumedUnread`/`refresh` it does not define.
  Behavioural fixture, kept.
- `isRecord`/`isSha256Hex` (B1 map) inside `parseUpdateManifest`: the `settings-facts` region is loaded
  dependency-free by `app-update-automatic`, `publish-update-manifest` and the Quint update harnesses; an import
  would be undefined there. Left until the region moves to `runtime/app-update.ts`.
- `sessionKey` in the reply announcer (subview-accessibility): `final-ui-lifecycle` transplants the announcer from
  `type ReplyShell =` with a fixed global set; left with the announcer split.
- Toggle/subpage row helpers and permission/photo word maps in settings-adapter: several sites are inside the
  `calendar-settings` transplanted region; a helper defined outside it would be undefined there. Left for the
  page-builder split.
- `lucideIconUrl()`: no such helper exists in `icon-style.ts` (not mine); not added.
- `Bag`/`Component:any` → `shell-types` (B3): optional per-adapter migration; not done in these files (no single
  adapter here would drop its `Bag` fully without retyping the render outputs).
- `telephony-review.ts` `typeof document !== 'undefined'`: agent-adapter bundles are run under Node by host tests
  (`aosp-sms`, `sms-agent-flow`), so the guard may be load-bearing there.
- `contactNames()` helper in presenters: sms-adapter also builds `people`, phone-adapter is not mine; the three loops
  differ in what they collect.
- `DailyApps.addListener(...).catch(() => null)` in settings: removing it turns a registration failure into an
  unhandled rejection (behaviour change); kept.
- `OpenThread` to `runtime/telephony-executor.ts`: owned elsewhere; un-exported here instead.
- `share-panel-adapter` `Bag`/`views` → `hasInbox` parameter: changes the installer signature used by `main.tsx`.

## Verification

- `npx tsc --noEmit` (whole repo): 1 error, in `prototype/workflow-authoring.ts` (`deviceTimeZone`, another
  implementer's file); none in my files or caused by my change.
- Host tests touching my files, run one by one with `node --test` (Node 26.13.0), all green except one not mine:
  app-update-automatic 16/16, app-update 4/4, comms-settings 5/5, diagnostics-export 20/20, final-ui-lifecycle 16/16,
  locale-time-usage 2/2, password-manager 11/11, publish-update-manifest 5/5, quint-settings-capability-reads 1/1,
  quint-settings-listener-reads 1/1, quint-settings-session 1/1, recovery-restart-presentation 4/4, reset-wiring 2/2,
  settings-refresh-text-scale 6/6, settings-text-scale-refresh 3/3, settings-text-scale-settlement 5/5,
  subscription-entitlement 6/6, voice-in-chat-only 3/3, share-panel-adapter 2/2, share-panel-watch 4/4, image-sms
  10/10, sms-incomplete-rows 3/3, system-bar-appearance 2/2, gesture-zones-single-instance 3/3, quint-shade-pull
  2/2, system-shade-timeout 4/4, system-shade 11/11, telephony-attention-lifecycle 3/3, telephony-presenters 7/7,
  browser-reading-capability 7/7, dc-lite-keys 2/2, appearance-preference 5/5. `note-origin` fails before reaching
  my file: `runtime/note-origin.ts` imports a missing `lib/hash` (another implementer's edit in progress).
- Quint replay tests (baseline before my edits → after): automatic-app-update-schedule pass → pass; mms-compose
  3/3 → 3/3; canonical-calendar-editor-close, legacy-settings-nav-refinement and mounted-update-admission were
  already failing at baseline (unchanged). On a first run under heavy machine load, quint-sms-send case 1 hit
  `spawnSync … ETIMEDOUT` (Quint simulator 120 s limit), historical-calendar-navigation reported "Refinement input
  changed during checking" (parallel edits) and native-update-staging failed once; rerun one at a time afterwards:
  quint-sms-send 2/2, quint-historical-calendar-navigation 1/1, quint-native-update-staging 1/1.
- LemmaScript: `lsc gen-check` for `settings-adapter.ts` regenerated an unchanged `.dfy.gen`; `lsc check` → Dafny
  12 verified, 0 errors.
- Not run: `npm run --ignore-scripts build` and `npm run audit:bundle` (shared `dist/` with parallel implementers),
  Playwright, Gradle (no Java touched).
