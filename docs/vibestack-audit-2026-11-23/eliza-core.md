# eliza-core: develop `packages/core` + `packages/contracts` vs vibestack `packages/core` + `spec/core`

Trees: develop `eliza-develop` at 7a124190a1; vibestack `eliza-vs` at 769b4f00d (branch vibestack-dp, 2026-11-22 20:03 -0800); consumer `alpha-vs` at 3d7ca9727, legacy `alpha-develop`.
Read-only audit. Nothing was built, generated, run or checked with Quint or Dafny; every verdict is from reading source.

## Summary

- Develop PRs since 2026-11-13 touching the slice: 42 (first-parent). Plus the slice's focus areas and the 30 `packages/contracts` modules the phone app read on develop.
- Verdicts: 35 OK, 15 NOT_APPLICABLE, 19 gaps (1 high, 5 medium, 13 low). Gap classes: 2 UNIMPLEMENTED, 3 CHANGED, 4 MISSING, 6 UNMODELED, 4 UNVERIFIED. Two gaps are already named in wave3.md (08, 18).
- `packages/core` itself is a faithful file-by-file port. 390 of develop's 396 non-test source files have a `.vibe` of the same path; the six without one are not used by the phone. A scan of every string literal, regex literal and numeric constant in develop's files against the port found 113 literals, 4 regexes and a handful of constants with no match, and I read each: all are refactors (logging text, schema validators replaced by generated or Effect code) except the items listed as gaps 07 to 11.
- The losses are not in core's library code. They are in what reaches it. The vibestack phone turn (`packages/agent/src/conversation/message-service.vibe`) is its own pipeline and calls only a small part of core, so several core behaviours the develop phone relied on are specified and ported but no code path reaches them (gaps 01, 02, 03).
- `packages/contracts` has no vibestack package. Its phone-facing modules were re-homed in `packages/agent`, `packages/os`, `packages/browser`, `packages/workflow`, `packages/notes` and `packages/calendar`. I checked each contracts PR by its distinguishing regex or field and found the device-proposal port carried them (contrary to the older "skipped" rows in parity-results.json). The telephony capability set is smaller than develop's (gap 04).
- Verdict: not at parity. Gap 01 blocks the phone outright with Alpha's current `host.json` (the agent refuses to boot), and its only workaround removes secret and PII masking. Gaps 02 to 04 are owner-visible behaviour changes.

## Gaps

### eliza-core-01 (high, UNIMPLEMENTED) Secret and PII masking cannot be turned on for the phone, and Alpha's launch asks for it
- Behaviour: on develop the phone agent ran with `ELIZA_SECRET_SWAP_ENABLED` and `ELIZA_PII_SWAP_ENABLED` on. Contact numbers, emails, names and credentials reached the model provider as `__ELIZA_CONTACT_…`/`__ELIZA_SECRET_…` references and pseudonyms, and were restored at the tool and reply boundary.
- Develop: `packages/core/src/runtime.ts:836` (`isSecretSwapEnabled`), `:863` (`createSecretSwapSession`); enabled by `alpha-develop/android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java:688-689`.
- Vibestack: the core machinery and rules exist (`spec/core/secretSession.md:13,67,89,121,147`; `packages/core/src/security/secret-swap.vibe`; `packages/core/src/runtime/agent-settings.vibe:240-246`). But `packages/agent/src/host/process.vibe:151-152` returns `Result.fail("Config")` when the launch has `privacy.secretSwap` or `privacy.piiSwap`, `:256` always passes `privacy: { kind: "off" }`, and `:247` creates the runtime with `settings: {}`. `spec/agent/plugins/profile.md:66,83` names a core privacy plugin `@elizaos/core/privacy`; no such plugin exists in `packages/core/src`. `packages/os/android/agent-service/src/main/java/ai/eliza/os/agent/AgentConfig.java:214` forwards the switches from `host.json` into the launch.
- Alpha: `alpha-vs/android/agent/host.json:15-18` sets both switches true.
- Impact: with Alpha's host.json as written the agent fails to boot with `Config`. If Alpha drops the switches the phone runs with no masking: real contact numbers, emails and names go to the model provider, and the stable-reference prompt cache (#39984, #40174) and the `__ELIZA_CONTACT_` copy rules of the telephony grounding are never exercised on a device.
- Smallest fix: in `process.vibe`, stop refusing the switches and set `ELIZA_SECRET_SWAP_ENABLED`/`ELIZA_PII_SWAP_ENABLED` (and stable references, gap 07) on the runtime when they are on; register the PII scrub service as the privacy step. Add a boot test with both switches on.
- Not in wave3.md.

### eliza-core-02 (medium, UNIMPLEMENTED) Core's confirmation-reply reader has no caller; to-dos read "yes" with an English-only prefix regex
- Behaviour: develop settled a pending confirmation from the owner's actual reply with one reader: a refusal anywhere wins over an opening yes, a question or a bare thanks stays pending, and yes/no words are read in English, Spanish, French, German, Korean, Chinese and Japanese (#39569, #39703).
- Develop: `packages/core/src/utils/confirmation.ts:274` (`isAffirmativeConfirmationReply`), `:297` (`requireConfirmation`), `:375`; callers `plugins/plugin-todos/src/actions/todo.ts:1115`, `plugins/plugin-maps/src/action.ts:1841`, `plugins/plugin-assistant/src/actions/contact.ts:1498`, `plugins/plugin-assistant/src/features/messaging/triage/actions/manageMessage.ts:183`.
- Vibestack: rule `spec/core/confirmation.md:11` and code `packages/core/src/utils/confirmation.vibe:63-68,189,253,275` are present, with #39703's words. No file outside `packages/core` imports `requireConfirmation`, `gateDestructiveConfirmation` or `isAffirmativeConfirmationReply`. `packages/assistant/src/todos.vibe:17-21` decides with `/^\s*(?:yes|yeah|yep|yup|sure|ok(?:ay)?|confirm(?:ed)?|do it|go ahead|please do)\b/iu`.
- Impact: "yes, actually no don't" and "ok?" add the duplicate to-do; "sí", "はい", "네", "好的" are not a yes; #39703's refusal words never apply on the phone. The Maps share and contact confirmations of develop have no reply gate at all (those belong to the maps and agent slices to judge).
- Smallest fix: make `todos.vibe` `affirms` call core's `isAffirmativeConfirmationReply` with the message, and use `requireConfirmationPromise` wherever a vibestack action asks "reply yes".
- Not in wave3.md.

### eliza-core-03 (medium, CHANGED) Earlier messages reach the model with no time, because the phone turn does not use core's context renderer
- Behaviour: develop printed each historical message as `[message_at=MM-DD HH:MM] …` in the owner's zone (#40037), so the model could answer "what did I ask this morning" and order events against the clock line.
- Develop: `packages/core/src/runtime/context-renderer.ts:121,168`.
- Vibestack: the function is ported (`packages/core/src/runtime/context-renderer.vibe:87`) but has no rule in `spec/core` and no caller outside core. The phone turn builds history as bare chat messages: `packages/agent/src/conversation/message-service.vibe:173-181` (`{ role, content: text }`), with one clock line for now (`clock.vibe`). The same holds for the rest of core's planner context: `renderContextObject`, `compactHistoricalReceiptSegments`, `runResponseHandlerEvaluators`, `HANDLE_RESPONSE_SCHEMA` and `buildFailureReplyPrompt` have no consumer in any vibestack package.
- Impact: the model cannot tell when an earlier message was said. Core-side ports of #40028 (ack examples), #40037 (outcome legend) and #40186 change text the phone never sends.
- Smallest fix: stamp history messages in `message-service.vibe` with core's stamp (export `historyMessageStamp` or pass `createdAt` through `windowHistory`), and add the rule to `spec/agent/conversation/planning.md`.
- Not in wave3.md.

### eliza-core-04 (medium, CHANGED) Five telephony capabilities of develop's contract have no vibestack counterpart, and Alpha's port still declares three of them
- Behaviour: develop's `telephony-actions` contract offered `phone.keypad.v1` (`phone_keypad`), `contacts.show.v1` (`contact_show`), `contacts.read.v1` (`contact_read_selected`), `contacts.write.v2` (`contact_update` with `add`/`remove` of single values) and `sms.compose.v2` (`sms_compose` with a `target` number or contact, `draft: true`, `replyThreadId`).
- Develop: `packages/contracts/src/telephony-actions.ts:18-52,67-78,284,415-424,479,525,595-685`.
- Vibestack: `packages/agent/src/device-actions/operation-schemas/telephony.vibe:128` (`ContactUpdate {type, query, set}`), `:146` (`SmsCompose {type, query, body}`); `spec/agent/deviceActions/capabilities.md:51-52` lists only `sms.compose.v1` and `contacts.write.v1`. No `phone_keypad`, `contact_show` or `contact_read_selected` in any `eliza-vs` source or spec. The device-proposal plan records this as a decision (`~/.cache/vibecut/device-proposal-plan.md:408,438`: keypad maps to `phone_dial`; no contact show/read).
- Impact: "show me Sam's contact", "what's this contact's number", "open the keypad" and "add this number to Sam, keep the others" are no longer offered. A draft to a typed number rides `sms_compose.query`, which develop reserved for names.
- Smallest fix: owner decision. Either add the three operations and the two v2 forms to `telephony.vibe` and `capabilities.md`, or remove them from Alpha's port (see contract mismatches).
- Not in wave3.md.

### eliza-core-05 (medium, UNVERIFIED) A turn that fails with no typed cause: develop reports `provider_issue`, vibestack stores nothing and answers 503
- Develop: `packages/contracts/src/contracts/chat.ts:216` (`chatTerminalFailureFromRuntime`, #39930) maps the runtime's `transient_failure` to the public `provider_issue`, so the client shows a retryable failure instead of an apology.
- Vibestack: `packages/agent/src/conversation/message-service.vibe:236-246` gives a non-`ModelRefusal` failure no `failureKind` and calls no callback; `spec/agent/conversation/turns.md:148-156` says such a turn answers 503 `ASSISTANT_RESPONSE_UNAVAILABLE`. I did not trace Alpha's client handling of that 503, and pending-40193.md says draft #40214 changes these fields.
- Impact if unhandled: a network blip mid-turn shows a generic error with no Retry. Agent and alpha auditors should confirm.
- Smallest fix: map the untyped failure to `provider_issue` in `message-service.vibe`.

### eliza-core-06 (medium, UNVERIFIED) No recorded proof or acceptance for any core rule
- `spec/lock.json` is the 4,009-byte starter lock: it lists `spec/app/echo.md`, `tally.md`, `words.md`, `index.md` (files that do not exist) and no `spec/core` entry; `unproved` is `{}`. Upstream `origin/vibestack` has the same file, so this predates the port.
- All 546 `###` rules in the 169 `spec/core/**/*.md` files have a Quint block. 129 have a `*.proof.dfy`; 40 do not, including `confirmation`, `privacy`, `runtime`, `plugins`, `execution`, `media`, `scheduling`, `services`, `sessions`, `receipts`, `catalog`.
- `packages/core/test` has 2 test files (`core.test.vibe`, 5,224 lines; `canonical-recall.test.vibe`) and 5 conformance drivers (`accountBridges`, `environment`, `identityGroups`, `responseEvaluation`, `timingRegistry`) for 169 spec documents. `gen/` is git-ignored and absent, so no generated conformance case exists in the tree.
- Impact: no artifact shows that the code satisfies the rules cited below as OK. My OK verdicts are from reading.
- Smallest fix: run `gen`, `check` and accept for `spec/core`, commit the lock.

### eliza-core-07 (low, CHANGED) Stable references still need their own setting; develop turns them on with secret swap (#40174)
- Develop: `packages/core/src/runtime.ts:856-857` (`if (conversation === undefined || !this.isSecretSwapEnabled()) return undefined`); `ELIZA_SECRET_SWAP_STABLE_REFERENCES` no longer exists. `character-schema.ts:196` drops `defaultMaxTokens`.
- Vibestack: `packages/core/src/runtime/agent-settings.vibe:259` gates on `SECRET_SWAP_STABLE_REFERENCES_SETTING`; `spec/core/secretSession.md:91` states the old behaviour. `character-schema.vibe:158,174` still accepts and keeps `defaultMaxTokens` (nothing reads it; `spec/core/models.md:162` and `model-dispatch.vibe:622-647` take no cap from settings, which is correct).
- Impact: once gap 01 is fixed, every turn re-mints references and pseudonyms, so the provider prompt cache misses and an earlier turn's text changes bytes.
- Smallest fix: gate `swapStableKey` on `SECRET_SWAP_ENABLED_SETTING`, drop the second setting, update the rule text.

### eliza-core-08 (low, MISSING, in wave3 A) #40186 proposal legend sentence
- Develop: `packages/core/src/runtime/historical-receipt-wire.ts:253-254` adds "A reason that says it never ran means the owner declined it or it expired…".
- Vibestack: `packages/core/src/runtime/historical-receipt-wire.vibe:166` has the old sentence. Unreached on the phone turn in any case (gap 03).

### eliza-core-09 (low, MISSING) #39930 core failure vocabulary
- Develop: `security/model-failure.ts:445` (transient failure reply rule: do not name the app or data that failed, do not promise a retry works); `utils/model-errors.ts:203-205` (Bun `ConnectionRefused`/`ConnectionClosed`/`FailedToOpenSocket` in `NETWORK_ERROR_CODES`), `:383` (`isModelConnectionError`).
- Vibestack: `security/model-failure.vibe:320` has the old one-line rule; `utils/model-errors.vibe:171-185` lacks the three codes (they are in `model-failure.vibe:190-192`); no `isModelConnectionError`. None has a vibestack consumer, and vibestack runs on Node, so the phone impact is nil today.
- Smallest fix: copy the three hunks so the exports match develop.

### eliza-core-10 (low, MISSING) #39842 core Notes operations and folder metadata
- Develop: `actions/task-extraction-context.ts:276` adds `restore` and `move` to `NOTES_REQUEST_OPERATIONS`; `runtime/context-renderer.ts:292` treats `notesFolders` as host metadata.
- Vibestack: `actions/task-extraction-context.vibe:265-273` has six operations; `packages/notes/src/request-effect.vibe:19` maps `restore-note` to `update`. `context-renderer.vibe:219` has no `notesFolders`.
- Impact: a turn classified as "restore" or "move" is judged as an update. Notes auditor should confirm the owner-visible effect.

### eliza-core-11 (low, MISSING) #39882 explicit patch fulfilled by an update
- Develop: `actions/task-extraction-context.ts:1270` (`alternateEdit`). Vibestack: absent from `task-extraction-context.vibe` (around `:1253-1262`). The earlier port note says Notes registers its update as `patch`, which would make it unnecessary; I did not verify that.

### eliza-core-12 (low, UNMODELED) Proxy client address is judged per comma element (#39640)
- Develop `security/loopback-trust.ts:66`; vibestack code `security/loopback-trust.vibe:135-138`. `spec/core` has no rule on loopback trust or proxy headers (the file cites `spec/core/privacy.md`'s scrub story).

### eliza-core-13 (low, UNMODELED) Canonical recall renews an expired delivery audience before the turn check (#39634)
- Develop `access-control/provenance-envelope.ts:645`; vibestack code `access-control/provenance-envelope.vibe:504`. `spec/core/audienceRegistry.md:67` covers renewal validation, not that recall renews first.

### eliza-core-14 (low, UNMODELED) Corpus pseudonym map is assembled one item at a time (#39637)
- Develop `services/pii-scrub.ts:116`; vibestack code `services/pii-scrub.vibe:88,210`. No rule in `privacy.md`, `privacyService.md` or `corpusPseudonyms.md`.

### eliza-core-15 (low, UNMODELED) A map coordinate is never a phone number (#39930)
- Develop `security/phone-span-context.ts:56`; vibestack code `security/phone-span-context.vibe:13`, `pii-detectors.vibe:328`, `entity-recognizer.vibe:67`. No rule.

### eliza-core-16 (low, UNMODELED) Which failures fail over to the next model registration
- Vibestack code `security/model-failure.vibe:183-240` (refused connection, 5xx, rate limit, timeout words) matches develop. `spec/core/models.md:48` only says eligible failures advance; nothing defines eligible. The file's spec citation is the unrelated scrub story. Same pattern for `external-content.vibe`, `mcp-server-config.vibe`, `phone-span-context.vibe`, `model-errors.vibe`, `model-retry.vibe`, `chat-upload-limits.vibe` and the late-bound DNS lookup of #39882 (`network/node-pinned-fetch.vibe`).

### eliza-core-17 (low, UNVERIFIED) #39957 calendar read flags
- Develop `packages/contracts/src/calendar.ts:887-891` (`source: "builtin"`, `plainNextEvent`, `singleDaySearchDate`). No match for the two names in `eliza-vs/packages`, `eliza-vs/spec` or `alpha-vs/apps/app/src`. Calendar auditor to judge.

### eliza-core-18 (low, UNVERIFIED, in wave3 C) #39947 invitation response contract
- Develop `packages/contracts/src/calendar.ts` `RespondLifeOpsCalendarEventRequest`. Vibestack calendar has `tentative` in `plugin/routes.vibe` and `mutations/provider-port.vibe`; wave3 C still lists the Google respond provider and `notifyAttendees`.

### eliza-core-19 (low, UNMODELED) #39945 pause applies only to the reviewed workflow version
- Develop `packages/contracts/src/workflow-client.ts` (`WorkflowPauseRejected`, `expectedVersionId`); vibestack code `packages/workflow/src/client/workflow-client.vibe:126`. No rule naming it found under `spec/workflow`.

## Contract mismatches with Alpha's port

`alpha-vs/apps/app/src/**` imports nothing from `@elizaos/core` or `@elizaos/contracts` (0 imports; develop's app had 29 import sites). The mismatches are in configuration, operations and leftovers:

1. `alpha-vs/android/agent/host.json:15-18` sets `privacy.secretSwap` and `privacy.piiSwap` true; `eliza-vs/packages/agent/src/host/process.vibe:151-152` fails boot for either (gap 01).
2. `alpha-vs/apps/app/src/telephony/actions.vibe:81,327`, `actions.schema.vibe:7-11`, `operations.vibe:22-46`, `assistant/review.vibe:143` declare operations `phone_keypad`, `contact_show`, `contact_read_selected` and advertise `phone.keypad.v1`, `contacts.show.v1`, `contacts.read.v1`. None exists in `eliza-vs` code or spec (gap 04).
3. `alpha-vs/android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java:703-704` still sets `ELIZA_SECRET_SWAP_ENABLED`/`ELIZA_PII_SWAP_ENABLED` in a process environment; the vibestack agent service reads `host.json`, not this map.
4. `alpha-vs/scripts/upstream-core-sources.ts:5-17` pins sha256 of develop paths (`packages/core/src/services/task.ts`, `runtime/turn-controller.ts`, `runtime/room-handler-queue.ts`, `runtime/embeddings.ts`, `plugin-lifecycle.ts`, `plugins/plugin-notes/...`, `plugins/plugin-sql/...`). `eliza-vs` has `.vibe` files and no `plugins/` tree.
5. Tests in `alpha-vs/test` still resolve develop modules that `eliza-vs` does not have: `client-feature-preparation.test.mjs:229,248,402-405` (`@elizaos/contracts/client-turn-observation`, `packages/contracts/src/calendar-linked-sync.ts`, `packages/core/src/{view-interaction,logging,speech}.ts`), `telephony-executor.test.mjs:15,425` (`@elizaos/contracts/telephony-actions`), `screen-copy-mappings.test.mjs:182` (`@elizaos/contracts/workflow-client`), `development-cartesia-conversation.test.mjs:218-220`, `agent-launch-token-budget.test.mjs:31` (reads `vendor/eliza/packages/core/src/security/secret-swap.ts`), `specs/quint/refinement/services/workflow-engine/ports.mjs:56-57`.
6. `alpha-vs/apps/app/package.json:30` depends on `@elizaos/core` though no source imports it. Harmless.

Core exports the develop app used by name and that still exist in `eliza-vs` core, should the port need them: `sanitizeSpeechText` (`speech.vibe`), `findViewActionHandoff`/`ViewActionHandoff` (`view-interaction.vibe`), `NAVIGATE_VIEW_EVENT`/`normalizeCompletedActionHandoffId` (`events.vibe`), `SingleFlightMemo` (`read-memo.vibe`), `MAX_CHAT_UPLOAD_ATTACHMENTS`, `CHAT_IMAGE_MIME_TYPE_SET`. `MAX_CHAT_IMAGE_INTAKE_BYTES` is gone from core; the 20 MiB intake is `spec/files/library.md:76` and `packages/files/src/storage/library-volume.vibe:455`.

## Confirmed OK

| Item | Vibestack rule | Vibestack code |
|---|---|---|
| #39635, #40171 git helper keys never reach a child | `spec/core/security.md:37` | `packages/core/src/security/spawn-env-policy.vibe:43-44,89-106` (no vibestack caller spawns through it) |
| #39703 だめ/やめ/算了 are refusals | `spec/core/confirmation.md:11` | `utils/confirmation.vibe:63-68,80-81` (reach: gap 02) |
| #39707 connector send restores pseudonyms first | `spec/core/secretSession.md:147` | `runtime/connector-registry.vibe:264,273-279` |
| #39690 pseudonyms before placeholders; NER never reads a reference | `spec/core/secretSession.md:147` | `runtime/execute-planned-tool-call.vibe`, `security/secret-swap.vibe` `maskReferencesForPiiRecognition` |
| #39984 stable references, reserved example contacts, contact-kind line | `spec/core/secretSession.md:89,121` | `security/secret-swap.vibe`, `runtime/model-dispatch.vibe` (`kindsFollowMessages`, `appendToLatestUserMessage`) |
| #39984 model-call log sizes and usage | `spec/core/models.md:133` | `runtime/model-dispatch.vibe:845-849`, `runtime/model-policy.vibe` `readTokenUsageFromResponse` |
| #39984 request notes leave with their request | `spec/core/context.md:162` | `runtime/completion-context.vibe` `requestNoteSources` |
| #40037 extractor re-send after a temporary 429 | `spec/core/models.md:179` | `actions/extractor-pipeline.vibe` (`extractorResendWait` from gen) |
| #40037 recorded outcome legend | `spec/core/context.md:79` | `runtime/historical-receipt-wire.vibe:256-292` |
| #40174 no output cap from settings | `spec/core/models.md:162` | `runtime/model-dispatch.vibe:622-647` |
| #40067 Browser page in the turn, wrapped as external content | `spec/agent/conversation/turnContext.md:132` | `agent/src/conversation/turn-context.schema.vibe:71`, `message-service.vibe:98-116`, `core/src/security/external-content.vibe:51,61` |
| #39989 phone position with a message | `spec/agent/conversation/turnContext.md:111` | `agent/src/conversation/turn-context.schema.vibe:31,164` |
| #39850, #39956, #39990 dial number forms | `spec/agent/deviceActions/telephony.md:53` | `agent/src/device-actions/proposal/telephony/dial-number.vibe:2-33` (regexes identical to `contracts/phone-dial.ts`) |
| #39967, #39990 draft recipient and "and send it" | `spec/agent/deviceActions/telephony.md:230` | `…/telephony/request.vibe:41,70-73` |
| #39883, #39920 latest sender, whole address, spoken numbers | `spec/agent/deviceActions/telephony.md:269,296`; `spec/os/android/messages.md:365` | `agent/src/device-actions/latest-sender.vibe`, `…/telephony/spoken-number.vibe` |
| #39842, #39882, #39919, #39932, #39990, #40193 browser grounding | `spec/browser/requestGrounding.md` | `browser/src/grounding.vibe:190,219,448-452` (all 42 regexes of `contracts/browser-request-grounding.ts` present; page links are the 4th argument, so wave3 A's #40193 item looks landed) |
| #39808 fork from an edited message | `spec/agent/conversation/conversations.md:232,290` | `agent/src/conversation/fork.vibe:30,96-128,147` |
| #39796, #39805 single message delete, contact fields | `spec/os/android/messages.md:271`; `spec/os/android/contacts.md:115,136` | `os/android/messages/.../MessageDeletion.java`, `os/android/contacts/.../ContactsEditor.java:525` |
| #39733 `electrobun:` is not a local app origin | none specific | `security/loopback-trust.vibe` (protocol absent) |
| #39683 20 MiB image intake | `spec/files/library.md:76` | `files/src/storage/library-volume.vibe:455,479` |
| CURRENT_TIME grounding | `spec/agent/conversation/planning.md:293,325` | `agent/src/conversation/clock.vibe` (line text identical to develop's `currentTime.ts`) |
| Old history deferred in fixed steps | `spec/core/context.md:133` | `core/src/runtime/history-window.vibe`; `message-service.vibe:179` |
| Document source segments | `spec/core/storage.md:12,29,51,76` | `database/document-source-segments.vibe` |
| Message content segments | `spec/core/ingressSnapshots.md` | `runtime/message-content-segments.vibe`, `message-content-storage.vibe`; read by `agent/src/conversation/history.vibe:42-55` |
| Spoken text | `spec/core/packageExports.md:173` | `spoken-text.vibe`, `speech.vibe` |
| Model fallback budget and cancellation | `spec/core/models.md:48,86,103` | `runtime/model-dispatch.vibe` |
| Streaming context depth and attempt leases | `spec/core/streamDepth.md`, `modelAttemptLeases.md` | `streaming-context.vibe` |
| Outbound envelope guard | `spec/core/security.md:87,102` | `security/outbound-envelope-guard.vibe`, `guarded-stream.vibe` |
| Blocked fetch addresses, process-only keys, log redaction | `spec/core/security.md:13,56,68` | `network/ssrf.vibe`, `security/process-env-policy.vibe`, `security/log-redaction.vibe` |
| Secret placeholders and restoration | `spec/core/secretSession.md:13,67` | `security/secret-swap.vibe` |

NOT_APPLICABLE (15): #40203 (deletes develop Quint fixtures), #39996 (develop Quint inventory), #39992 (test formatting), #39715 (SSH runtime, absent), #39738 (trajectory file recorder, absent), #39737 (deprecation comment), #39942 and #39957 core `requiredViewNavigation` (view opening is the `open_view` device operation, `spec/agent/deviceActions/surfaces.md:71`), #39882 `pageHistory` (Back/Forward is `browser_history`, `spec/browser/remoteControl.md`), #39882 view-target resolver (`packages/maps/src/routing.vibe:151-161` takes its own `namesView`), and the six develop files with no port: `model-gateway.ts`, `catalog/apps.ts`, `services/trajectory-export.ts`, `types/trajectory-export.ts`, `services/optimized-prompt-resolver.ts`, `security/secret-swap.bench.ts` (orchestrator, app catalog, training export, benchmark; no Alpha reference).

## Not covered

- Behaviour inside the re-homed contracts beyond the PR hunks: `native-telephony.ts` (2,070 lines), `telephony-actions.ts` result validators and receipt sentences, `device-reviews.ts`, `native-notes-query.ts`, `calendar.ts`, `calendar-linked-sync.ts`, `workflow-device.ts`, `workflow-intents.ts`, `workflow-approval-poster.ts`, `notice-routes.ts`, `deletion-window.ts`, `device-action-execution.ts`, `remote-agent-pairing.ts`, `native-telephony-session.ts`. I confirmed a home exists and checked literals and regexes; the validators were rewritten as Effect schemas, so a line-level comparison belongs to the agent, os, notes, calendar and workflow slices.
- The agent turn pipeline itself (planning, re-sends, failure kinds, storage adapter, routes). I read it only to decide whether core is reached.
- Core areas with no phone use on develop that I did not read: connectors and OAuth account pool, pairing, meetings, tunnel service, discord policy, training/prompt optimisation, catalog and registry generation, capability router, agent backup contracts, computer-use contracts, wallet contracts.
- Develop PRs before 2026-11-13: covered only through the whole-tree literal, regex and constant scan against develop HEAD, not PR by PR.
- Nothing was executed: no `gen`, `check`, Quint, Dafny, typecheck or test run. Gap 06 is a file inventory, not a check result.
- `spec/core/baseline/*.json` (the recorded develop surface) was not compared with develop HEAD.
