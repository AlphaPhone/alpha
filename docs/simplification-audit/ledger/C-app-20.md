# C-app-20 ledger (runtime a–c, abort-signal … clock-handoff-history)

Files deleted by stage A (skipped): calendar-linked-provider.ts, calendar-linked-storage.ts, calendar-linked-store.ts,
calendar-sync-host.ts, calendar-sync-settings.ts. Unexports that were already present in the working tree when
this unit started (accessibility-timeout port types, `WorkflowRunCard`, `AlphaClientState`, `AOSP_TELEPHONY_PLUGIN`,
`ALPHA_TELEPHONY_UNAVAILABLE`, `AppRecordInvalidation`, automations-protocol types, `CalendarApprovalConnection`)
and the A1/A2 deletions (agent-calendar preservation, `canonicalHomeCalendar`, unused `date`, always-on-listener
`assistantInvocation`/`MODAL`, browser-notes legacy archive, clock-handoff legacy key) were kept as found.

## Done

- abort-signal.ts: the duplicated cancel-unconfirmed copy is one `CANCEL_UNCONFIRMED` constant (C6; copy unchanged).
- accessibility-timeout.ts: `TimeoutPort` = `Pick<AlphaDevicePlugin,'recommendedTimeout'>` from `native/alpha-device.ts` (C2, B2 map).
- agent-calendar-client.ts: one `assertCurrent()` closure for the three owner checks (C6); dropped the
  `AppRecordPort` re-export and the `AgentCalendarClient` alias (D4); returns upstream `CalendarApi`.
  `scripts/test-agent-calendar-mutation-flow.ts`: one-line import fix (`AppRecordPort` from app-record-route-policy).
- agent-calendar-view.ts: `DAY` → `DAY_MS` (B1 map); `calendarFormRange` unexported (A7).
- agent-calendar.ts: `sha256Hex` (B1 hash), `isRecord` (B1 parse), one `bindingKey(port)` via `sessionKey` for the
  seven owner/session/scope tuples (C3), persisted cache keys as three constants with unchanged values (C6),
  `servesEvent` (lenient connector match, three sites) and `readableRole` (five sites) predicates; each site keeps
  its existing strict/lenient rule (C3/D9). Imports `AppRecordPort` from app-record-route-policy and `CalendarApi`
  from upstream.
- alpha-client.ts: removed optional `close?()` and the `old?.close?.()` try/finally (B2/A7; no transport defines it);
  `agentSessionKey(session)` (B1 session-key); one `cancelled()` error factory for the four identical
  "Request cancelled." sites; `RECEIPT_STATUSES` const drives `OperationReceipt.status` and both status checks (C6);
  inline `import(...)` type expressions became top-level `import type` (D12).
- always-on-listener.ts: dropped unused type re-exports `AssistantInvocation`, `ListenerState` (A7).
- aosp-image.ts: issue/decision numbers removed from the header (A8).
- aosp-telephony.ts: deleted the seven unused alias types and the eleven re-exports with no importer through this
  path (A7/D4); header no longer mentions issue numbers or "legacy export names" (A8). Manifest-pinned names kept.
- action-message-presentation.ts: the 14-line upstream-history essay is a 5-line description (A8).
- assistant-draft-store.ts: `sha256Hex(binding)` (B1 hash; slot string unchanged).
- automations-protocol.ts: `object()` uses `expectRecord` with the same error (B1 parse); re-exports narrowed to the
  three names used through this path (`localDate`, `workflowNextClockOccurrence` dropped; `workflowSnoozeTime` stays
  for test/polish-automation-when); comment drops the upstream issue/pin reference (A8).
- browser-cloud-resident.ts: unexported the five `BrowserProvider*` types (A7).
- calendar-approval.ts: approval-id regex compiled once instead of per call.
- calendar-day-observation.ts: `CalendarDaySurface` unexported (A7).
- calendar-edit-draft.ts: `only()` uses `isRecord` (B1 parse inline form).
- calendar-form-draft.ts: one `validZone` (two sites), one `draftDate` (two sites), `deviceTimeZone()` (B1 civil-date,
  two sites), local `day` → `civilDay` and `86400000` → `DAY_MS` (identical definitions in lib/civil-date.ts).
- canvas-geometry.ts: issue number removed from header (A8); `SPLIT_CANVAS`, `LARGE_TEXT` unexported (A7).
- client-observation-support.ts: `ClientObservationBinding` unexported (A7); identity tuple via `sessionKey`
  (B1); inline object guard → `isRecord` (B1).
- clock-agent-review.ts: uses `alphaActionJournal` from `native/alpha-action-journal.ts` instead of its own
  `registerPlugin<ClockReviewBridge>` (B2 map).
- clock-contract.ts: deleted re-exports with no importer: `CLOCK_CAPABILITY`, `ClockOperation`, `ClockResult`,
  `ClockHandoffResult`, `ClockSetRequest`, `ClockDraftRequest` (A7).
- All new `lib/` and `native/` imports in these files carry the `.ts` extension, because several of these modules
  are imported directly by Node's type-stripping test loader.

## Deleted tests and formal artefacts

None.

## Pins left broken

None caused by this unit. Pre-existing failures observed while verifying (not caused here):
`test/quint-agent-calendar-{refresh,mutation,sync-control,event-return}.test.mjs` (A1 preservation removal, listed in
A1.md), `test/quint-composer-send.test.mjs` (missing source anchor in another file),
`test/note-origin.test.mjs`, `test/calendar-end-after-start.test.mjs`, `test/scan-all-day-draft.test.mjs` (they
fail because `runtime/note-origin.ts`, another owner's file, imports `../lib/hash` without `.ts`, which Node's
strip-only loader cannot resolve).

## Skipped

- Shared module defect: `lib/parse.ts` imports `./ids` without an extension, so any module imported directly by a
  Node `.mjs` test cannot use it. Because of that `calendar-approval.ts` keeps its local `object` guard (its tests
  import it natively). Fix belongs to the lib owner (add `.ts`).
- abort-signal.ts: polyfill deletion (Q-BUILD-7 open); move of `runProviderConfiguration` (stage F); `raceAbort`
  (B1 map: leave local); `abortError()` (would create an import cycle with lib/abort.ts, and
  test/abort-signal-compat imports the file as stripped text without resolving imports); L29 sync try kept
  (the `!`-asserted native method can throw synchronously when absent).
- accessibility-timeout.ts: module-load port and removing `.catch(()=>{})` on listener registration (plugin
  boundary; behaviour change risk).
- agent-calendar-client.ts: merge into app-record-port (stage F); local method allowlist kept (request guard).
- agent-calendar-view.ts: merging the two timing validators (they differ: isFinite vs isSafeInteger).
- agent-calendar.ts: `ClientFactory` injection (tests and quint harnesses pass clients); bootstrap diagnostics
  (Q-CAL-6 open); `refresh()` extraction and `savedCalendar` split (larger refactor without new value in-file).
- alpha-client.ts: drop `(reply as AgentReply)` cast (pinned by regex in test/agent-always-local.test.mjs);
  dev loopback origin (P4 / retired `'local'` kind, cross-file); abort race (B1 map: leave local); shape
  re-validation of transport replies (trust boundary, medium risk); types move to agent-types.ts (stage F).
- always-on-listener.ts: `listener` alias (pinned by the transplant in test/voice-in-chat-only.test.mjs); dormant
  invocation half and its comment (D7); timeout race (not in B1 map).
- aosp-image.ts: inlining `detectAospImage` and dropping `admittedAospViews`' second parameter (used by behavioural
  tests aosp-image-capability, aosp-sms).
- aosp-telephony.ts: re-exports used only by upstream-parser tests (tests still import them); `AlphaTelephonyPlugin`
  alias (B2: delete after the other importers move; they are other owners').
- action-message-presentation.ts: split (stage F); shared CHOICE parser (cross-file); `isRecord` in `runCard`
  (test/fixtures/cloud-voice-view.mjs transplants the workflow section without imports, used by ~10 tests);
  label-keyed behaviour (needs writers elsewhere); notice-constant unexports (behavioural test imports them).
- app-record-completion.ts / automation-completion.ts / app-record-route-policy.ts / automations-route-policy.ts:
  merges (stage F); note-operation names (Q-UP-2 open).
- app-speech.ts: test-mocks branch (D5, behaviour); foreground helper (no lib/foreground); `raceAbort`/`abortError`
  (not in map / test/app-speech-route.test.mjs evaluates stripped text).
- assistant-draft-record.ts, calendar-availability.ts: file deletions need importer and manifest edits (stage F).
- automations-protocol.ts: `automationWhen` zone parameter (adapter and test pass it positionally); snooze log-text
  match (Q-UP-2 open).
- browser-cloud-resident.ts: move to dev/ and dev bridge client (stage F, Q-HOST-7 open); `import.meta.env` shim
  (Node tests import the file).
- calendar-approval-client.ts: decision allowlist (security guard, pinned by upstream-owner-gate-compat);
  parameter property (Node strip-only loader rejects parameter properties).
- calendar-edit-draft.ts, canonical-calendar-draft.ts, calendar-form-draft.ts: codec merge (stage F), `Form`/`Bag`
  types (no owner export yet), self round-trip (owner check), device-calendar surface (Q-CAL-2 open).
- calendar-day-observation.ts: predicate split (cosmetic).
- client-observation-support.ts: session re-validation in `key()` (tests drive the cache with crafted bindings);
  abort race (not in map).
- clock-contract.ts: alias renames and test-only helpers (behavioural tests import them); merge into clock.ts (F).
- browser-note-documents.ts, browser-notes-document.ts: moves (stage F); nothing left in-file.

## Verification

- `npx tsc --noEmit -p .`: no errors in owned files (one error in another owner's file at the time:
  `runtime/view-navigation.ts`, earlier `prototype/workflow-authoring.ts`).
- `npm run --ignore-scripts typecheck:scripts`: no errors in owned files or the edited script.
- `node --test` on 49 host tests covering these modules (accessibility-timeout, abort-signal-compat,
  provider-configuration-cancellation, provider-key-manager-bridge, action-message-presentation,
  system-notice-collapse, checkin-choice-presentation, workflow-reply-markup, maps-chat-markup,
  aosp-image-capability, aosp-sms, aosp-telephony, phone-adapter, image-sms, automations-unified,
  polish-automation-when, automation-completion, calendar-approval-client, calendar-approval-ui,
  calendar-day-context, client-observation-handshake, calendar-form-inputs, clock-repeat-days,
  reminder-lifecycle-pure, google-calendar-connect, google-calendar-link-status, alpha-client-*,
  canvas-geometry, voice-in-chat-only, always-on-listener, agent-always-local, upstream-owner-gate-compat,
  browser-provider-transport, quint-client-observation-support, quint-calendar-approval-review, …,
  local-speech-playback, cloud-voice-profile): 445 pass, 0 fail.
- Quint host tests: agent-calendar-mutation, quint-accessible-toast-lifetime, quint-automation-request-settlement,
  quint-phone-session, quint-saved-service-read, quint-scheduled-snooze-admission, quint-maps-share-choice pass; the failures listed under
  "Pins left broken" are pre-existing.
- LemmaScript: regenerated `canvas-geometry.dfy.gen` with `lsc gen --backend=dafny` in the scratchpad; identical to
  the committed file apart from the options header line (the check script was not run).
- Not run: `npm run build`, `npm run audit:bundle`, Playwright, Android (no Java touched).
