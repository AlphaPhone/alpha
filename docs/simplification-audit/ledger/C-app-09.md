# C-app-09 ledger (stage C, in-file cleanup)

Files owned: `apps/app/src/prototype/agent-adapter.ts`, `apps/app/src/prototype/agent-calendar-adapter.ts`,
`apps/app/src/prototype/asset-manifest.json`, `apps/app/src/prototype/assistant-draft-controller.ts`.
The A1/A2/A3 deletions (legacy Calendar authority, Previous-notes engine, Wallet terms) had already landed; findings
covered by them were not repeated.

## Done

### agent-calendar-adapter.ts
- `port()`: the `typeof getAppRecordClient==='function'` probe and casts replaced by `connectionController.getAppRecordClient()` (always defined, typed `AppRecordPort|null`) (B2).
- `owner.S?.()?.view` → `owner.S().view`; `update?.apply` → `update.apply` (model.js defines `componentDidUpdate`); `selection?.call` and `displaySources?.()` called directly (calendar-adapter installs both before this adapter, main.tsx); `this.canonicalCalendarDraftEntryBlocker?.(…)` and `owner?.calendarFormCommitted?.(f)` call the always-installed hooks directly (canonical-calendar-drafts / calendar-form-draft-adapter, same `!fixture` block) (B2).
- `calendarConnectionScope`: the two inline `JSON.stringify([calendarOwnerKey(t),t.sessionId,t.scope])` copies now use `mapBinding`; `mapBinding` builds the same text with `sessionKey` (lib/session-key, B1 map; byte-identical) (C3).
- `zone()` → `deviceTimeZone()||'UTC'`; the two `86400000` day literals → `DAY_MS` (lib/civil-date, B1 map) (C3).
- `calendarErrorText` uses `errorText(error, typeof error==='string'?error:'')` (lib/error-text, identical) (C3).
- Recurrence scope labels: one `SCOPE_LABEL` table used by the event-detail and the form scope pickers; copy unchanged (C3).
- The second `views.calendar.render` wrapper that only set `out.deepOpening` is folded into the main render (both the device-scope and canonical returns set it with the same expression) (D2/C3). `calendar-adapter.ts:174` still carries its own copy (not owned).
- `componentDidUpdate(...args:any[])` → `unknown[]`; `rows.find((e:any)=>…)` loses the `any` annotation (types narrowed).

### agent-adapter.ts
- `declineProposal` un-exported (no importer; A7).
- `api.assist` deleted (no caller in apps/test, no template binding) (A7).
- Stale "Until the pin carries photos-view-agent.patch / notes-organize-agent.patch" comments and the `photosView:unknown` / `organize:unknown` aliases and `as unknown as LibraryAgentResult` cast removed; the upstream union already names these (tsc confirms) (A8/B2). Unused `LibraryAgentResult` import dropped.
- "PLAN section 4" and "issue 408" references removed from comments (A8).
- `typedSendBinding()` now the single send-binding helper: `p.send`'s inner duplicate `sendBinding` deleted; `getCloudEnvironment?.()` → `getCloudEnvironment()` (always defined); built with `sessionKey` (same text) (C3, B2).
- `p.send`: `this.stopVoiceConversation` was used as a boolean that is always true (voice-adapter installs it unconditionally after this adapter in the same `!fixture` block): context refresh and binding capture are unconditional, `stopVoiceConversation()` called directly (B2).
- Direct calls instead of `?.` for always-installed methods: `cancelReadReplyCompletions` (defined in this file; 4 sites), `resumeReadReplyVoice`, `retireReadReplyVoice`, `prepareDeviceReadReview` (voice-adapter; the `typeof … !== 'function'` refusal removed) (B2).
- Native plugin modules (B2 map): four `registerPlugin<AlphaTelephonyPlugin>('AlphaTelephony')` → `alphaTelephony`; `registerPlugin<any>('AlphaContacts')` → `alphaContacts` (results still parsed by the native-address-book parsers); five inline `AlphaCalendar` shapes → `registerPlugin<AlphaCalendarPlugin>` (readAgenda site `AlphaCalendarPlugin&AlphaCalendarBrowserMethods`); inline `postWorkflow` shape → `AlphaNotificationsPlugin`. Names registered are unchanged; `platform-plugins` shares one proxy per name.
- `canonicalNotesKey` builds its key with `sessionKey` (same text).
- Nine `x instanceof Error ? x.message : fallback` sites → `errorText(x, fallback)`; `new DOMException('Workflow cancelled','AbortError')` → `abortError('Workflow cancelled')` (B1 map, identical).

## Deleted tests and formal artefacts
- None.

## Pins left broken
- `specs/quint/refinement/application/composer-send.mjs`: already broken by A2 (anchor `    // Canonical is the default;`). Its `p.send` slice now also references the module-level helpers `typedSendBinding`, `errorText` and `sessionKey`, which an import-based port must provide.
- `specs/quint/application/manifest.json` / `services/manifest.json`: no pinned symbol name was renamed or removed (`declineProposal` is not pinned; `cancelReadReplyCompletions`, `stopVoiceConversation`, etc. keep their names). No change needed.

## Skipped
- `assistant-draft-controller.ts` deletion (D4): removing the alias breaks the live Quint harnesses `specs/quint/refinement/application/portable.mjs`, `canonical-calendar-editor-close.mjs`, `calendar-adapter-fixture.mjs` (specifier regex + `AssistantDraftController` stub), both manifests and `test/quint-conformance.test.mjs` (`sourceModule` path), and needs the import changed in five files other implementers are editing. Do it with the stage E harness port.
- Cosmetic edits reverted because they broke behaviour-covering transplant tests that also cover much else: `planActionCard` lookup table (broke `test/pending-action-failure-boundary.test.mjs`), `sessionKey` in `recoverPendingActions` (broke `test/pending-action-background-recovery.test.mjs`), `delay()` in `settleFirstSendSlot` (broke `test/fixtures/first-send-draft-migration.mjs`), and dropping `?.` on `calendarSelection`/`calendarDayObservation`/`settingsSelection` in `context()` (broke `test/committed-view-observation.test.mjs`, whose fake shell lacks them). Apply after stage E retires those transplants.
- Quick-settings tiles, brightness handoff, `shadeN` `n4` filter, `headsOk`, `alphaDevice`/`elizaSystem` plugin consts: Q-DEV-9 (in-app tiles) is open; moving to `dev/` is stage F.
- `SystemBars.setStyle` writer: Q-UI-8 open.
- Notes refusal copy (Q-NOTES-2), `[Calendar saved startup]` diagnostics (Q-CAL-6): open questions.
- `calendarAuthorityChoices` → `useAgentCalendar` (D10): changes an output field read by label in `settings-adapter.ts` (not owned); coordinate.
- Shared read-cache owner with `inbox-cloud-adapter.ts`, coded refusals instead of copy matching (`preDispatchRefusals`, `OWNER_ERRORS`), staleness-fence factory (`deviceFence`), device-executor table, agent-adapter split, `prototype/agent/` folder: cross-file or stage F (split).
- `Shell = any` / `Bag` → `ShellHost`/`ViewApi`: agent-adapter uses about 150 untyped shell fields attached by itself and other adapters; B3 says migrate one adapter per change and do not add adapter fields to `ShellHost`. Left for the D3 work.
- Module-level `typeof window!=='undefined'` guard around the pagehide listener: kept; Node-evaluated slices of this file still rely on it (D7, stage E).
- `typeof HTMLElement.prototype.hidePopover` guard: minimum WebView not confirmed.
- `p.startVoice` override (possibly superseded by voice-adapter), `api.say` neutraliser, `typeof out.goCalendar==='function'`, `typeof this.openWorkflowRun`: depend on fixture/dev-surface decisions or conditional installs; kept.
- Silent `catch{}` review (B1): each is either documented fire-and-forget or covered by transplant tests; not changed in this pass.
- `asset-manifest.json`: KEEP (provenance data, no consumer); moves with fixtures in stage F (Q-DEV owner question 6).
- `@eliza/*` alias for deep `.eliza/client-features` imports: stage F (D13).

## Verification
- `npx tsc --noEmit` (whole project): no errors in owned files; the only errors are in `prototype/browser-adapter.ts` (another implementer's file, mid-edit).
- Host tests touching these files, run with `node --test` (one process per file, in parallel) after the final edit:
  agent-always-local 9/0, alpha-client-consumed-approvals 3/0, aosp-sms 12/0, browser-calendar-open-source 4/0,
  browser-command-refusals 7/0, browser-receipt-order 53/0, canonical-calendar-draft-ownership 6/0,
  chat-navigation-detent 9/0, chat-stop-controls 1/0, chat-ui-failed-turn 5/0, cloud-prewarm 5/0,
  committed-device-changes 2/0, committed-view-observation 23/0, development-voice-navigation 16/0,
  first-send-draft-migration 5/0, history-initial-state 11/0, home-cards 17/0, optional-view-channel-chat 3/0,
  pending-action-background-recovery 4/0, pending-action-failure-boundary 24/0, photo-library 19/0,
  quint-conformance 9/0, retired-shell-work 2/0, shade-tile-facts 13/0, system-notice-collapse 10/0,
  voice-prepared-navigation 8/0.
  calendar-mounted-edit-admission (3/0), calendar-mounted-editor (1/0) and camera-rapid-leave (3/0) pass when run in a
  smaller batch; with 31 files in parallel they time out (TimeoutError), as before the change.
  Failing before and after, not caused here: quint-back-dispatch (page.evaluate `snapshot` of undefined, also in the
  pre-change baseline), quint-workflow-clock-admission (missing `scripts/test-clock-handoff-flow.ts`).
- Not run: `npm run verify`, Quint refinement harnesses, Playwright, `vite build`, `audit:bundle`, any Android build
  (no Java touched).
