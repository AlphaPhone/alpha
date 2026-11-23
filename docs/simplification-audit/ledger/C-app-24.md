# C-app-24: apps/app/src/runtime (hosted-digest-ui … native-assistant-draft-recovery)

Already gone before this unit: `legacy-calendar-preservation.ts` (A1), `live-segment-stream.ts` (A3). Already done by
earlier stages: the `testMocksEnabled && connection.kind==='cloud'` read in hosted-digest-ui.tsx (A4), the
`legacy`/`legacyChanged` fields in native-assistant-draft-recovery.ts and the legacy localStorage seed in
media-copy-intent.ts (A2).

## Done

- `hosted-digest-ui.tsx`: `nativeSources` typed `AlphaHostedResultsPlugin` (B2 map); `nativeCalendars` typed
  `Pick<AlphaCalendarPlugin,'requestWorkflowReadAccess'|'workflowCalendars'>` (B2 map; the existing
  `status!=='ready'` check now narrows `calendars`); slot owner tuple → `agentOwnerKey(session)` and the hash kept as
  `scope` instead of re-slicing the slot (B1 R19, finding #19; slot bytes unchanged); initial zone →
  `deviceTimeZone()` (B1); duplicated `Intl.DateTimeFormat` validity try/catch → local `validTimeZone` (C3);
  snapshot form `168` literals → `DIGEST_SOURCE_MAX_HOURS` (C6); issue/decision citations dropped from comments
  (#394 ×2, eliza#35906 + test pointer, P-43) (A8).
- `hosted-live-source-ui.tsx`: `168` → `DIGEST_SOURCE_MAX_HOURS`; the three range checks computed once as
  `limitsValid` and used by `prepare()` and the Review button (C6).
- `hosted-result-notices.ts`: local `HostedResultRoute`/`HostedResultNative` replaced by imports from
  `native/alpha-hosted-results` (`HostedResultRoute` re-exported for browser/hosted-results.ts) (B2 map, C2); the four
  `signal.throwIfAborted();if(!binding.current())throw` copies → local `fence()` (C3); tap result union named
  `HostedResultTap`.
- `hosted-notice-question.ts`: `Result` = imported `HostedResultTap` instead of `Awaited<ReturnType<…>>` (C1).
- `hosted-digests.ts`: `DigestCalendarChoice` un-exported (no importer) (A7).
- `image-preview.ts`: nine add/remove listener pairs registered with one `AbortController` signal (D8).
- `inline-modal.ts`: assistant-layer selector written once as `ASSISTANT_LAYERS` (C6). (The AbortController listener
  change was tried and reverted: see Skipped.)
- `inbox-attachment.ts`: dead `AttachmentRefusedError`/`attachmentRefused` re-export deleted (no importer); `export *`
  narrowed to `export type {MailAttachment}` (only names imported from this path) (A7, D4).
- `inbox-local-store.ts`: two identical-body slot branches merged into one regex (C5); inline SHA-256 hex →
  `sha256Hex(JSON.stringify(owner))` (B1 R1). Keys byte-identical.
- `inbox-operation.ts`: `InboxOperationDependencies` un-exported (A7).
- `inbox-edit-coalescer.ts`: `EditCoalescer` un-exported; timer-port comment states the Quint replay use (A7).
- `local-agent.ts`: `native` is the typed `agent` singleton from `native/agent` (B2 map); `NativeRequestPort` from
  `native/agent` (re-exported; `cancelRequest` required, `!` dropped); unused `registerPlugin`/port-type imports
  removed; `localAgentRefusal` deleted (no product caller) (A7); `localAgentAvailable` and `LocalAgentMethod`
  un-exported (A7); `nativeVoiceTraceId` regex → `isLowerUuid` (B1); three bindingGuard regexes → `isSha256Hex` (B1
  R5); `CLOUD_PROVIDER_MODEL` replaces `'cerebras/'+LOCAL_PROVIDER_MODEL` and `'cerebras/qwen-3.8-27b'` (C6);
  `awaitLocalAgentStopped` default sleep → `delay(ms)` (B1, identical); `typeof text!=='string'` on a typed
  `text:string` dropped (B3).
- `local-agent-native-stream.ts`: `NativeStreamPort` from `native/agent` (re-exported for scripts); envelope/frame
  typed (`unknown` → local frame types) instead of `any`; hand-written abort race → `raceAbort(addition,bounded)`
  with its listener bookkeeping (`rejectAddition`) removed (B1/B2, C3).
- `local-agent-native-events.ts`: `NativeVoiceEventPort` from `native/agent` (re-exported); frame typed instead of
  `any` (B2, C1).
- `local-agent-stream.ts`: local UUID regex → `isUuid` (B1 map: `/i` variant); typeof checks on the typed in-process
  request dropped (B3); repeated label check after `genuineBatchProgress` removed (B3).
- `local-agent-storage.ts`: duplicated recovery-binding check → `checkRecoveryBinding()` (C3, messages kept);
  plain-object guard → `isRecord` (B1).
- `local-reply-speech.ts`: local `Bridge` → `Pick<AlphaVoiceCloudPlugin,…>` (B2 map, optional hold calls kept).
- `local-voice.ts`: inline plugin type → `Pick<AlphaVoiceCloudPlugin,…>` (B2 map); binding tuple written once as
  module-level `voiceBinding()`; `Capacitor.isNativePlatform()?'device':'browser'` computed once per voice (C3).
- `mail-html.ts`: https-without-credentials check written once as `safeHttps` (C3).
- `managed-service-routes.ts`: issue number dropped from comment (A8).
- `mock-admission.ts`: inline plugin type → `AlphaConnectionTestMethods` (B2 map).
- `test/connection-step-contracts.test.mjs`: removed the two `localAgentRefusal` assertions (feature deleted); the
  `status`/`source` assertions of the same test stay.

## Deleted tests and formal artefacts

None (only two assertions removed, above).

## Pins left broken

None caused by this unit that I could find. Lemma: hosted-digests.ts, inbox-edit-coalescer.ts and inbox-operation.ts
changed only by an un-export / comment; extraction compared before/after (see Verification).

## Skipped

- Whole-file shim deletions `inbox-unsaved-record.ts`, `mail-preview.ts`, `maps-contract.ts`, `live-voice.ts`,
  `image-sms.ts` aliases, `inbox-operation.ts` test-only re-exports, `hosted-digests.ts` `export *`: importers in other
  owners' files, scripts, esbuild stub keys and Quint/feature-parity path pins; stage F (D4/D13).
- `Pending.phase` required / `digestPhaseDiscardable` / `advancesPendingDigest` older-record case: Q-LEG-11 (Lemma +
  Quint text).
- `maps-event-return.ts` (Bag typing, B3 validator, `isSha256Hex`): Q-CAL-2 open; the Quint maps-event-return and
  map-plane-ownership harnesses strip imports and eval the file, so a new import would break them.
- `managed-service-routes.ts` route table and sync-v1 admissions: Q-CAL-4; `isOperationId` not adopted because
  test/managed-service-routes.test.mjs imports the file in plain Node and lib/ids.ts has an extensionless vendor import.
- `media-copy-intent.ts` (`isAndroid`, read-back, `isOpaque36`): Quint media-copy-intent replay stubs
  `@capacitor/core` per trace and pins source text; left as is.
- `hosted-live-source-ui.tsx` locale fix: Q-UI-10. `hosted-digest-ui.tsx` modal lifecycle → createInlineModal, dev
  factory, splits, listener helper, style constants: stage F / cross-file. `digestToggledSpec` inline: kept (behavioural
  test hosted-digest-panel pins the pause invariant through it).
- `inline-modal.ts` AbortController listeners: reverted; JSDOM in test/quint-inline-modal-focus rejects Node's
  AbortSignal.
- `local-reply-speech.ts` `holdSpeechEngine` removal (NEW-2) and `openMicrophoneAvailable`: caller in
  prototype/voice-adapter.ts (other owner), B2 map says keep the optional calls.
- `local-agent.ts`: "Update Alpha" guards and `!` assertions (pinned by provider-configuration-cancellation /
  provider-key-manager-bridge source regexes), B1 `raceAbort`/`delay`/`expectRecord` inside `LocalAgentProtocol`
  (local-agent-feature-starting transplants the class with a fixed injected name set), `recoveries` counter
  (scripts/test-local-agent-stream.ts asserts it), `residentAttachable`/test seams (scripts), dev bridge/speech/
  provider moves (stage F, Q-HOST-7).
- `inbox-operation.ts` `receiptReads` static: caller prototype/inbox-provider-controls.ts (other owner) and a
  behavioural test call it.
- `local-speech-text.ts` typeof checks: inputs come from untyped agent reply text.

## Verification

- `npx tsc --noEmit`: 0 errors (whole project).
- `node scripts/typecheck-scripts.ts`: 1 error, in scripts/test-agent-context-browser.ts (not related to this unit).
- `node --test` on 18 local-agent/voice files (connection-step-contracts, native-request-cancel, native-start-cancel,
  local-agent-feature-starting, provider-configuration-cancellation, provider-key-manager-bridge,
  resident-binding-guard-return, connection-routes, upstream-owner-gate-compat, direct-browser-transcription,
  local-agent-native-events, local-agent-native-stream, local-agent-contracts, local-reply-speech, local-speech-text,
  local-conversation-cleanup, navigation-voice-pause, live-voice): 112 pass, 2 fail. Both failures are in other owners'
  files: connection-step-contracts "on-device agent's own 401" (connection-ui.tsx transplant now needs `isAbortError`)
  and live-voice "native speech bridge" (regex on native-live-voice.ts).
- `node --test` on 38 hosted/inbox/mail/quint files (list in the unit's scratch): 101 pass, 4 fail. Not this unit:
  inbox-draft-copies (inbox-drafts.ts behaviour; this unit's inbox modules are mocked there),
  quint-browser-hosted-result-notice (`randomHex` in browser/hosted-results.ts), quint-observation-turn-dispatch
  (connection-ui.tsx slice). quint-inline-modal-focus failed on this unit's AbortController change, which was reverted;
  two reruns of quint-inline-modal-focus after the revert timed out at the test's 170 s limit with machine load ~130 (no assertion failure); not confirmed green.
- Lemma: `npm run lemma:check` not run (it regenerates every proof while other units edit Lemma sources). An extraction before/after comparison was started and stopped under load before it finished; the three Lemma-listed files changed only by un-exporting a type/interface and one comment, no `//@` annotation or verified function changed. The temporarily swapped files were restored and checked.
- Playwright, Android build, `npm run audit:bundle`: not run.
