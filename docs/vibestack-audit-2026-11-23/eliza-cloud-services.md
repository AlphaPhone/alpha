# eliza-cloud-services: develop 7a124190a1 vs vibestack-dp 769b4f00d

Slice: develop `packages/cloud` (chat proxy, model catalog and cost, speech, managed Google, Maps and
Gmail proxies, rate limits), `plugins/plugin-elizacloud`, `plugin-openai`, `plugin-anthropic`;
vibestack `packages/cloud`, `spec/cloud`, and the agent's cloud and own-key model providers where they
are the counterpart of the three plugins. Read-only: nothing was built, generated or run.

Paths: `D:` = `/home/shaw/.cache/vibeaudit/eliza-develop`, `V:` = `/home/shaw/.cache/vibeaudit/eliza-vs`,
`A:` = `/home/shaw/.cache/vibeaudit/alpha-vs`, `AD:` = `/home/shaw/.cache/vibeaudit/alpha-develop`.

## Summary

| Class | Count |
|---|---|
| OK | 23 |
| NOT_APPLICABLE | 32 (26 PRs, 6 behaviours) |
| UNIMPLEMENTED | 1 |
| MISSING | 6 |
| CHANGED | 7 |
| UNVERIFIED | 3 |
| UNMODELED | 0 |

Verdict: **not at parity.** The vibestack Cloud's chat route cannot serve the vibestack agent as both
are written: it refuses `tools` (and every tool message), and it adds a 500-token output cap to every
call that names none. Either one breaks every planned turn that goes through the Cloud. Three more
gaps break a shipped phone feature once Alpha Cloud is the vibestack Cloud: linked Google Calendar
sync (`sync-v1` is gone), the model id the app binds (`cerebras/qwen-3.8-27b` cannot be a profile
id), and the hosted-results Google delegation. Speech (batch and realtime), Maps and the Gmail and
Calendar routes the phone calls are present with the same paths. Only one gap is in wave3.md
(the Qwen prompt cache key).

43 develop PRs since 2026-11-13 touch the slice paths. 26 are not applicable, 9 belong to the
identity, billing and decisions slices (see Not covered), and the remaining 8 (#40174, #40037,
#39984, #39957, #39875, #39842, #39832, #39829) are judged below.

## Gaps

### eliza-cloud-services-01 (high, UNIMPLEMENTED) The chat route refuses tools and every tool message
- Behaviour: develop's `POST /api/v1/chat/completions` takes `tools`, `tool_choice`, `tool` role
  messages and assistant `tool_calls`. The phone's planner offers tools on every step.
- develop: `D:packages/cloud/api/v1/chat/completions/route.ts:406-422` (roles, `tool_calls`,
  `tool_call_id`), `:448-449`, `:3151-3152`, `:3254`.
- vibestack: the rule lists `tools` and `tool_choice` in `acceptedFields`
  (`V:spec/cloud/services/inference.md:60`), but the code takes its list from the schema
  (`V:packages/cloud/src/services/chat-request.schema.ts:39-52`), which has neither, and refuses any
  other field as `400 invalid_request unsupported_field`
  (`V:packages/cloud/src/services/chat-request.vibe:22`). Message roles are
  `system|developer|user|assistant` only and extra message keys fail
  (`chat-request.schema.ts:19-22`, `chat-request.vibe:23`). The test asserts the refusal:
  `V:packages/cloud/test/inference/admission.test.vibe:71,91` (`tools: []` → unsupported_field).
  The agent sends all of them: `V:packages/agent/src/models/chat.vibe:166-181` (`role: "tool"`,
  `tool_calls`, `reasoning`, `name`, `content: null`), `:124` (`type: "file"` parts), `:514-520`
  (`top_p`, `stop`, `frequency_penalty`, `presence_penalty`, `seed`, `tools`, `tool_choice`);
  `V:packages/agent/src/conversation/planning.vibe:237,254`.
- Impact: every planning step through the Cloud is answered 400. The agent's tests use a cloud fake,
  so nothing catches it.
- Smallest fix: add `tools`, `tool_choice`, the `tool` role, `tool_calls`, `tool_call_id`, nullable
  assistant content, `name`, and the sampling fields the agent sends to `ChatRequest`; change the
  admission test; extend the rule for message shapes.

### eliza-cloud-services-02 (high, CHANGED) The Cloud adds a 500-token output cap to a call that names none
- Behaviour: #40174, no output cap by default. develop uses 500 only to estimate the hold and sends
  the provider a cap only when the caller sent one.
- develop: `D:packages/cloud/api/v1/chat/completions/route.ts:1707` (`effectiveMaxTokens =
  request.max_tokens`), `:1729-1730` (estimate), `:2724-2726` and `:3257` (sent only when set).
- vibestack: `V:packages/cloud/src/services/chat.vibe:18-20` always writes `max_tokens: max`, where
  `max` is the quoted output, `max_completion_tokens ?? max_tokens ?? defaultOutputTokens`
  (`V:packages/cloud/src/services/chat-request.vibe:67-69`, `V:spec/cloud/services/inference.md:139`,
  500). The rule says the body is "passed to the provider as sent" (`inference.md:34`), so the code
  also departs from its own rule. Wave 2 removed the agent's own caps, so agent calls now arrive
  with none and get 500.
- Impact: every Cloud reply, plan and image description is cut at 500 output tokens, reasoning
  included. This is the truncation #40174 removed (the owner's "no caps" decision).
- Smallest fix: send no cap when the caller sent none; keep 500 (or a larger figure) for the quote
  only, and settle from reported usage as now. wave3.md item B names only the assistant package caps.

### eliza-cloud-services-03 (high, MISSING) Linked Google Calendar sync (`sync-v1`) has no Cloud route
- Behaviour: `GET sync-v1/capabilities`, `GET|POST|PATCH|DELETE sync-v1/event`.
- develop: `D:packages/cloud/api/v1/eliza/google/calendar/sync-v1/route.ts:1-24`,
  `D:packages/cloud/shared/src/lib/services/agent-google-connector/calendar-sync-routes.ts:143-197`.
- vibestack: `V:spec/cloud/services/google/calendar.md:11` says "`sync-v1` is gone"; no route in
  `V:packages/cloud/src/services/google/calendar.vibe:663-670`; no `googleCalendarSync` in the cloud
  client (`V:packages/cloud/src/client/google.vibe:221-287`). Vibestack's own calendar package still
  calls it: `V:packages/calendar/src/linked-sync/google-port.vibe:46`. The replacement event routes
  take no recurrence rule (`calendar.md:75`).
- Impact: the phone's calendar link to Google (consent, capability read, event writes) gets 404.
  Callers: `A:android/app/src/main/java/ai/alphacompute/alphaphone/AlphaConnectionPlugin.java:206`,
  `CalendarSyncConsent.java:11`, `connection/CloudConnectionPolicy.java:159-161`.
- Smallest fix: port the five `sync-v1` routes and a client method, or move linked-sync and Alpha's
  Android callers to the `calendar/events` routes and add what they lack (recurrence, exact
  reference reads).

### eliza-cloud-services-04 (high, CHANGED) A provider-prefixed model id can no longer be offered
- Behaviour: the phone asks for `cerebras/qwen-3.8-27b`.
- develop: the Cloud normalises the id (`D:packages/cloud/api/v1/chat/completions/route.ts:1634`);
  `AD:test/cloud-sdk-routing.test.mjs` asserts the request model is `cerebras/qwen-3.8-27b`.
- vibestack: a model is chosen by exact id (`V:spec/cloud/services/models.md:35,42-48`) and a profile
  id cannot contain `/` (`V:packages/cloud/src/profile/profile.schema.ts:26`). Alpha Cloud's profile
  lists `qwen-3.8-27b` (`A:cloud/src/profile.vibe:6,109`) while the app binds
  `cerebras/qwen-3.8-27b` (`A:apps/app/src/account/inference.vibe:9,31`).
- Impact: if the native host passes that id through, every chat is `400 model_unavailable` on Alpha
  Cloud. Not checked: what the native launch document finally sends.
- Smallest fix: allow `/` in a model id, or accept a `provider/model` alias, or change the app
  constant when the Cloud is the vibestack one.

### eliza-cloud-services-05 (medium, MISSING) A provider 400 loses its code, and is answered 502
- Behaviour: #40037 (cloud half). A provider 400 is answered 400 with the provider's listed `code`
  and `param` (`parser_error`, `context_length_exceeded`, ...), so the runtime re-sends Stage 1 once
  after a tool-call parse failure and never retries a request that cannot succeed.
- develop: `D:packages/cloud/api/v1/chat/completions/route.ts:985-1010` and
  `getProviderRequestErrorFields`, `:1095,1140-1142`, `:2584-2588`.
- vibestack: every provider 4xx except 429 becomes `502 provider_invalid_response` with no code
  (`V:packages/cloud/src/services/chat-stream.vibe:17-21`). The rule says 400/422 →
  `400 invalid_request` and 413 → `413` (`V:spec/cloud/services/inference.md:253-256,278-281`), so
  code and rule disagree. The agent reads 502 as a provider issue and retries it
  (`V:spec/cloud/client.md:308`, `V:spec/agent/models/binding.md:137,144`); its `parser_error`
  re-send (`V:packages/agent/src/models/chat.vibe:325-328`) can fire only on the own-key route.
- Impact: an over-long context or a malformed tool call is retried as an outage on the Cloud route.
- Smallest fix: map 400/422/413 as the rule says and pass the listed `code` and `param` through.
  parity-results.json records #40037 as partial for the agent only.

### eliza-cloud-services-06 (medium, CHANGED) A provider rate limit reaches the agent as an outage
- Behaviour: #39984. A provider 429 is a 429 to the caller; the turn waits at most 5 s and re-sends
  once.
- develop: `D:packages/cloud/api/v1/chat/completions/route.ts:1124-1134`, `:2584-2588`.
- vibestack: provider 429 → `503 provider_unavailable` with the provider's retry time
  (`V:packages/cloud/src/services/chat-stream.vibe:21`, `inference.md:256`). The agent classes 503 as
  `CloudUnavailable` → `RetryEnvelope` (`V:spec/agent/models/binding.md:136,144`), not
  `CloudRateLimited`, so `sentAtMostTwice` (`V:packages/agent/src/conversation/planning.vibe:172`)
  does not apply.
- Impact: a rate-limited model is retried on the outage path, which spends more of the bucket that
  refused it.
- Smallest fix: answer a provider 429 as `429 rate_limited` with its retry time.

### eliza-cloud-services-07 (medium, CHANGED) A rate limit holds the account for the provider's whole Retry-After
- Behaviour: at the pin the direct Cerebras route holds a refused model for at most 4 s, per model,
  with no setting, so the 5 s re-send reaches the provider; the Cloud route holds nothing.
- develop: `D:plugins/plugin-openai/models/text.ts:2656-2669` (`RATE_LIMIT_MAX_HOLD_MS = 4_000`),
  `:2793`; `D:plugins/plugin-elizacloud/src/models/text.ts:566`.
  `AD:test/agent-launch-token-budget.test.mjs:14,39-41` lists `OPENAI_RATE_LIMIT_MAX_HOLD_SECONDS` as
  retired and requires the constant.
- vibestack: the hold is 0 (the provider's time stands, for the whole account) unless the launch
  sets `OPENAI_RATE_LIMIT_MAX_HOLD_SECONDS` or `CEREBRAS_RATE_LIMIT_MAX_HOLD_SECONDS`
  (`V:packages/agent/src/models/binding.vibe:116-122,134`, `V:spec/agent/models/binding.md:296-318`).
  Alpha's port launcher must not set them (`A:test/agent-launch-token-budget.test.mjs:14`).
- Impact: after a 429 with Retry-After 59, the re-send 5 s later is refused by the local hold, on
  both routes. This is the measured failure the 4 s constant fixed.
- Smallest fix: default the hold to 4 s (Cerebras own-key and Cloud) without a setting.

### eliza-cloud-services-08 (medium, MISSING, in wave3.md B) No prompt cache key
- develop: `D:packages/cloud/api/v1/chat/completions/route.ts:431,474-510,2727-2730`;
  `D:plugins/plugin-elizacloud/src/models/text.ts:1402-1455,1623-1625`.
- vibestack: `prompt_cache_key` is not an accepted field (`chat-request.schema.ts:39-52`) and the
  agent sends none (`V:packages/agent/src/models/chat.vibe:506-521`).
- Impact: no stable cache routing on Cerebras; higher cost and latency per turn.
- Fix: wave 3 item B must also add the field to the Cloud's `ChatRequest` and forward it.

### eliza-cloud-services-09 (medium, MISSING) Cloud Google delegation for hosted results
- develop: `D:plugins/plugin-elizacloud/src/services/cloud-google-delegation.ts:129-730`,
  `D:packages/app/src/api/cloud-google-delegation-routes.ts`.
- vibestack: none. `V:spec/os/android/deepLinks.md:13-14` ("cloud issues no app delegations");
  `V:spec/os/android/secureStore.md:28` says os does not support a `cloud-delegation:` slot;
  `V:packages/workflow/src/routes.vibe:104-108` has hosted routes but no `cloud-delegation/*`.
- Impact: Alpha's port still calls `POST /api/workflow/hosted/cloud-delegation/{start,status,
  complete,cancel,revoke}` (`A:apps/app/src/account/delegation.vibe:55`,
  `A:apps/app/src/workflows/sources.vibe:151,280`) and still captures
  `alphaphone://cloud-delegation` (`A:android/.../AlphaConnectionPlugin.java:26-41`). Those calls get
  404. Not checked: whether the legacy phone ever had `ELIZA_CLOUD_DELEGATION_*` set (no launcher
  sets it in `AD:`), so the feature may already have been unavailable.
- Smallest fix: the owner decides: port the delegation service and routes, or remove the panel and
  the deep link from Alpha's port.

### eliza-cloud-services-10 (medium, CHANGED) Cached prompt tokens are charged at the full input price
- develop: `D:packages/cloud/shared/src/lib/services/ai-billing.ts:363-374` (Cerebras billable input
  is input minus cache reads and writes).
- vibestack: `V:spec/cloud/services/models.md:129-130` ("Cached tokens are charged at the input
  price"), `V:packages/cloud/src/services/models.vibe:92-106`.
- Impact: the plan allowance is spent faster on a cache-heavy conversation. Not checked: the rate
  develop charges for the cached part.
- Smallest fix: a cached-input price per model row.

### eliza-cloud-services-11 (medium, MISSING) Balance purchase `POST /api/v1/credits/checkout`
- develop: `D:packages/cloud/api/src/_router.generated.ts:2337`.
- vibestack: no route (`V:spec/cloud/client.md:164-188` billing table has none).
- Impact: `A:apps/app/src/account/billing.vibe:216` and
  `A:android/.../ConnectionRoutes.java:53,62` call it; "add balance" cannot open a checkout.
  Belongs to the billing slice; listed here because it is a `packages/cloud` contract.

### eliza-cloud-services-12 (low, MISSING) Place search ordered by distance
- develop: #39842, `D:packages/cloud/shared/src/lib/services/maps/contract.ts:166-167,244-248`
  (`rank: "distance"`, `distanceRank` capability), `google-provider.ts` (`MAX_SEARCH_PAGE`, `metersBetween`);
  `D:plugins/plugin-maps/src/cloud-adapter.ts:452-467`.
- vibestack: `V:packages/cloud/src/services/maps.schema.ts:40-44` has `query`, `near`, `limit` only;
  no `rank` in `V:packages/maps/src`.
- Impact: "the closest X" returns the most relevant places near the point, not the nearest.

### eliza-cloud-services-13 (low, CHANGED) Refusal bodies changed shape
- develop: `{error: {message, type, code, retryAfterSeconds, retryAt, resetAt}}`
  (`route.ts:2590-2603`, `D:plugins/plugin-elizacloud/src/models/text.ts:615-624`).
- vibestack: `{error: "<code>", errorDescription, retryable, retryAt?: ms, resetsAt?: ms, reason?}`
  and `Retry-After` on 429 and 503 only (`V:packages/cloud/src/http/refusal.vibe:8-15,41-52`). The
  agent's client reads the new shape (`V:packages/cloud/src/client/errors.vibe`).
- Impact: Alpha's Android voice reader still parses the old one
  (`A:android/.../AlphaVoiceCloudPlugin.java:174-181`, `CloudVoiceLimit.java:42-58`): it keeps only
  `Retry-After`, and loses the limit code and the allowance reset time (a 402 carries no header).

### eliza-cloud-services-14 (medium, UNVERIFIED) Image description through the Cloud
- vibestack serves it as a chat completion with an image part, refused unless the chosen model has
  `vision` (`V:spec/cloud/services/models.md:46`). Alpha Cloud's profile offers one model with
  `vision: false` (`A:cloud/src/profile.vibe:109`). develop: `D:plugins/plugin-elizacloud/src/models/image.ts`.
- Not checked: which image model the native launch names. If it is the Cloud's, photo descriptions
  are `model_unavailable` on Alpha Cloud.

### eliza-cloud-services-15 (low, UNVERIFIED) Streamed usage and reasoning-effort validation
- The Cloud strips `usage` from a stream unless the caller sent `stream_options.include_usage`
  (`V:packages/cloud/src/services/chat-stream.vibe:74-80`); the agent never sends it
  (`V:packages/agent/src/models/chat.vibe:462`). develop has the same contract (`route.ts:3407-3413`);
  not checked whether develop's SDK asked for usage. If it did, streamed Cloud turns now report no
  token use.
- develop refuses an effort the model does not document (`route.ts:295-345,1597-1616`); vibestack
  forwards any of five values, and a provider 400 then becomes a 502 (gap 05).

### eliza-cloud-services-16 (medium, UNVERIFIED) Vibestack usage in spec/cloud
- `V:spec/lock.json` holds five documents, all `spec/app/*.md` and `spec/index.md`. No `spec/cloud`
  document is in the lock, so no cloud rule is accepted and no proof is recorded, simulated or not.
- All 171 `###` rules in `spec/cloud/{services,shared}`, `client.md`, `deployment.md` and `index.md`
  have a Quint block.
- Proofs exist for inference, models, speechRelay, rateLimit, google/connection, google/mailRead,
  client, index, returnPages. None for maps, speech, speechSession, google/calendar,
  google/mailOperations, metering, dispatchOnce.
- Conformance drivers (`V:packages/cloud/test/drivers/`) cover 15 specs; among services only
  `speechRelay`. Inference, models, speech, speechSession, maps and all of managed Google are tested
  by hand-written journeys only, and one of them asserts the opposite of its rule (gap 01).
- Scratch tests are in the tree: `V:packages/cloud/test/zz-wp5u4-scratch.test.vibe`,
  `zz-wp7-maps-tmp.test.vibe`, `zz-wp8-g5-scratch.test.vibe`.
- `V:packages/cloud/gen` is absent, so the generated modules the sources import were not read.

## Contract mismatches with Alpha's port

1. Chat body: the bundled agent sends `tools`, `tool_choice`, `tool` messages, `tool_calls`,
   `reasoning`, `name`, `top_p`, `stop`, `seed`, penalties and `file` parts; the Cloud refuses all
   (gap 01).
2. Model id `cerebras/qwen-3.8-27b` (`A:apps/app/src/account/inference.vibe:9`) vs profile id
   `qwen-3.8-27b` and an id pattern without `/` (gap 04).
3. `/api/v1/eliza/google/calendar/sync-v1/capabilities` and `/event`
   (`AlphaConnectionPlugin.java:206`, `CalendarSyncConsent.java:11`, `CloudConnectionPolicy.java:159-161`):
   not served (gap 03).
4. `POST /api/v1/credits/checkout` (`A:apps/app/src/account/billing.vibe:216`): not served (gap 11).
5. Resident `POST /api/workflow/hosted/cloud-delegation/*` and the `cloud-delegation` deep link: no
   upstream route or callback (gap 09). Alpha keeps its pending record under
   `account-delegation:v1:` (`A:apps/app/src/account/deployment.ts:80`); whether os admits that slot
   name was not checked (os refuses `cloud-delegation:`).
6. Voice refusal body: Android reads `error.code`, `error.retryAt` and `error.resetAt` as ISO
   strings and `error.retryAfterSeconds`; the Cloud sends `error` as a string and `retryAt`,
   `resetsAt` as millisecond numbers (gap 13). The five cache-warming codes in
   `CloudVoiceLimit.java:26-27` are never sent (harmless).
7. `A:test/agent-launch-token-budget.test.mjs:28-41` reads `vendor/eliza/plugins/plugin-assistant/...`,
   `packages/agent/src/runtime/runtime-settings.ts` and `plugins/plugin-openai/models/text.ts`
   (`RATE_LIMIT_MAX_HOLD_MS`), none of which exist in vibestack, and forbids the only setting that
   shortens the vibestack hold (gap 07).
8. `/api/v1/eliza/agents/...` (`HostedTransport.java:36`), `/api/auth/cli-session` and
   `/api/auth/pair` (`CloudConnectionPolicy.java`): the vibestack Cloud serves none (it hosts no
   agent). Identity slice.
9. Alpha Cloud's profile has no vision model (gap 14).

Matching: `@elizaos/cloud/worker` (`cloudWorker`, `CloudBindings`, `WorkerExecution`),
`@elizaos/cloud/profile` (`parseProfile`, `CloudProfile`, `EnvironmentProfile`, `CloudEnvironment`,
`ProfileInvalid`) and `@elizaos/cloud/client` (`createCloudClient`, `lookupPath`, `HttpMethod`,
`checkEntitlement`, `nextRefreshDelay`, `parseEntitlementKeys`, `snapshotFromResponse`,
`subscriptionView`) all exist. Batch speech matches Alpha's Android callers field for field.

## Confirmed OK

| Behaviour | develop | vibestack rule | vibestack code |
|---|---|---|---|
| Hold before dispatch, charge reported usage, 500-token estimate | `route.ts:1724-1730` | `inference.md` "A request is admitted only..." | `services/chat.vibe:44-90` |
| Stream framing, one `[DONE]`, hang-up charge | `route.ts:2600+` | `inference.md` "A stream ends in exactly one [DONE]..." | `services/chat-stream.vibe` |
| 20 percent markup on model prices | `shared/src/lib/promotion-pricing.ts:9` | `models.md` "Each side costs its tokens at its price plus 20 percent" | `services/models.vibe` |
| `GET /api/v1/models` list | `_router.generated.ts:3337` | `models.md` "The list shows exactly the models a text call can use" | `services/models.vibe:99-111` |
| Device key limited to 120 requests a minute before lookup | `api/src/bootstrap-app.ts:654-657` | `identity/requestAuth.md:88` | `http/request-auth.vibe:39,56` |
| 429 and 503 carry a retry time and `Retry-After` | `route.ts:1442-1443,1546` | `shared/rateLimit.md:137` | `http/refusal.vibe:41-52` |
| Maps route set (capabilities, geocode, reverse, places search and details, routes, viewport, tile) | `_router.generated.ts:3106-3141` | `maps.md:35,70` | `services/maps.vibe:319-329` |
| Tiles keep their own limit and a key per tile | `api/src/lib/maps-route.ts:297-300` | `maps.md:92` | `services/maps.vibe` |
| One shared tile session, Server-Timing (#39829, #39832) | `maps/google-provider.ts:108` | `maps.md:328` | `providers/maps.vibe:390`, `services/maps.vibe:113,297` |
| STT upload: `audio`, `provider`, `languageCode`; `transcript`; `X-Eliza-STT-Provider` | `api/v1/voice/stt/route.ts` | `speech.md:181` | `services/speech.vibe` `hear` |
| TTS: `text`, `format`, 5,000 characters; `X-Eliza-TTS-Provider` | `api/v1/voice/tts/route.ts` | `speech.md:32,114` | `services/speech.vibe` `speak` |
| TTS retried under its Idempotency-Key is not charged again (#39875) | PR #39875 | `speech.md:237` | `services/speech.vibe` `synthesisRequestId` |
| Realtime speech routes consent, session, ws, revoke | `api/v1/voice/speech/route.ts:95,171,345,355` | `speechSession.md:35-115` | `speech-session.vibe:483-485`, `speech-relay.vibe:511` |
| Window of 60 s, 4,096 characters, 8 MiB | `packages/host/src/voice/speech-relay-session.ts:24-31` | `speechSession.md:155` | `speech-session.vibe` |
| A renewed session is not retired by an old deadline (#39957) | PR #39957 `speech-relay-coordinator.ts` | `speechSession.md:233` | `speech-session.vibe:329` |
| Renewal while the relay ends (#39516) | PR #39516 | `speechRelay.md:412` | `speech-relay.vibe:325-346` |
| Managed Google status, accounts, disconnect, connect initiate and native, callback | `_router.generated.ts:2836-2921` | `google/connection.md` | `http/routes/google.vibe:68-74`, `managed-browser.vibe:286-289` |
| Gmail search, read, triage, inbox-v1 capabilities, thread, attachment, drafts, draft | `api/v1/eliza/google/gmail/inbox-v1/route.ts:58-95` | `google/mailRead.md` | `google/mail-read.vibe:452-460` |
| Reviewed Gmail operations: prepare, dispatch, receipt | `inbox-operation-routes.ts` | `google/mailOperations.md` | `google/mail-operations.vibe:572-576` |
| Calendar calendars, feed, events with If-Match and Idempotency-Key | `api/v1/eliza/google/calendar/**` | `google/calendar.md:75` | `google/calendar.vibe:663-670` |
| Google tokens stay sealed in the Cloud | `agent-google-connector/*` | `google/connection.md:142` | `shared/sealing.vibe`, `grant-access.vibe` |
| Worker entry, profile binding, scheduled sweeps | `AD:cloud/worker.ts` | `deployment.md:309-380` | `worker.vibe:14-17`, `worker/canonical.vibe:26` |
| Cloud client exports Alpha imports | n/a | `client.md:92` | `client/index.vibe` |

Not applicable (the phone never used it, or vibestack leaves the subsystem out on purpose):
PRs #39725, #39705, #39700, #39770, #39652, #39788, #39706, #39696 (payment requests, ads, containers,
MCP, Twilio, web search); #40023, #40022, #39985, #39974, #39972, #39965, #39918 (Steward and staging
CI); #39713, #39733, #39738, #39737, #39846, #39804, #39754, #39630, #39622, #39732 (cleanup, test
timing, migrations, env names); #39847 (ElevenLabs voice expiry). Behaviours: `/api/v1/embeddings`
(the phone embeds locally), `/api/v1/responses` (the agent uses chat completions only),
`plugin-anthropic` (the phone runs Qwen on Cerebras only), the Workers AI and Kokoro speech fallback
with its cache-warming 503 (the phone requires Cartesia), voice clone, list and jobs, hosted agents.

## Not covered

- Identity, sessions, native clients, device keys and password backup (#39789, #39859, #39912,
  #40088, #39991, #39803); billing, subscriptions, entitlements and referrals (#39797); browser
  decisions (#39929, `/api/v1/decisions`). Other slices; their prior dispositions were not re-checked.
- Answer shapes of Gmail, Calendar and Maps routes field by field against Alpha's readers; only
  routes, auth class and headers were compared.
- The realtime relay frame protocol against develop's `speech-relay-wire`; only routes, window
  budgets and two fixes were checked.
- Plan request limits: develop uses burst and sustained buckets with tiers from the database,
  vibestack fixed windows of 60/120/300 and 30/60/120 a minute; values not compared.
- develop Gmail routes `history`, `message-send`, `reply-send`, `subscription-headers` against
  `inbox-v1`.
- The rest of `plugin-openai` and `plugin-elizacloud` (schema compatibility, the Cerebras tool
  argument envelope, tokenizer cache, diagnostics) against `packages/agent/src/models`.
- What Alpha's native host puts in the launch document (cloud model ids, image model).
- Nothing was run: no tests, gen, Quint, Dafny, Worker build or deploy.

## Skeptic verdicts

Checked 2026-11-22 against eliza-vs (769b4f00d), develop 7a124190a1, alpha-vs, alpha-develop and the
seven w3-* checkouts. No w3-* checkout changes `packages/cloud` or `spec/cloud` (`diff -rq` empty for
all seven), so no Cloud-side gap is in flight. Nothing was run.

- eliza-cloud-services-01: confirmed. `ChatRequest` has no tools, tool_choice, tool role, tool_calls, top_p, stop, seed, penalties or name (packages/cloud/src/services/chat-request.schema.ts:19-22,39-52); any other field is 400 unsupported_field (chat-request.vibe:22); the test asserts it for `tools: []` (test/inference/admission.test.vibe:71,91). The rule lists tools and tool_choice (spec/cloud/services/inference.md:60). The agent posts tools on every planner step straight to `/api/v1/chat/completions` (packages/agent/src/models/cloud-provider.vibe:13, chat.vibe:506-521, conversation/planning.vibe:254-256). It is the only inference route (chat.vibe:98) and Alpha Cloud adds none (alpha-vs/cloud/src). develop takes them (route.ts:406-422,448-449).
- eliza-cloud-services-02: confirmed. `providerBody` always writes max_tokens or max_completion_tokens = the quoted output (packages/cloud/src/services/chat.vibe:18-20,51), which is 500 when the caller sent none (chat-request.vibe:67-69; inference.md:132-139). develop sends a cap only when the caller did (route.ts:1707, 2724-2726). The agent sends none by default (packages/agent/src/models/chat.vibe:496-499,511).
- eliza-cloud-services-03: confirmed. No sync-v1 route or client method in packages/cloud/src; spec says "`sync-v1` is gone" (spec/cloud/services/google/calendar.md:11); packages/calendar/src/linked-sync/google-port.vibe:46 still calls it, in eliza-vs and in all seven w3-* checkouts. Alpha's port calls it (android CalendarSyncConsent.java:11, connection/CloudConnectionPolicy.java:159-161, AlphaConnectionPlugin.java:206). develop serves it (api/src/_router.generated.ts:2861).
- eliza-cloud-services-04: confirmed for the Cloud; phone exposure still open. A model is chosen by exact id (packages/cloud/src/services/models.vibe:43-45; spec/cloud/services/models.md:42-48) and an id cannot hold '/' (profile.schema.ts:26,75); develop strips the prefix (shared/src/lib/pricing.ts:257-268). The agent posts the launch's model id unchanged (packages/agent/src/models/cloud-provider.vibe:13). What the launch names is not decided in alpha-vs: android/agent/host.json says `model: {backend: "none"}`; the native host admits only `cerebras/qwen-3.8-27b` (runtime/NativeProviderAdmission.java:19,102) and exports it as ELIZAOS_CLOUD_SMALL_MODEL/LARGE_MODEL (:115-116), which the vibestack agent never reads (no match in eliza-vs packages or spec); the port's own launch check requires `qwen-3.8-27b` (cloud/src/runtime-config.vibe:11,56-57), which Alpha Cloud serves. The two constants must be reconciled when the launch model is wired.
- eliza-cloud-services-05: confirmed. Every provider 4xx except 429 becomes 502 provider_invalid_response with no provider code or param (packages/cloud/src/services/chat-stream.vibe:17-21; providers/llm.vibe:53 keeps only status and Retry-After). The rule says 400/422 -> 400, 413 -> 413 (inference.md:279), so code and rule disagree, and neither passes the code. The agent's parse re-send needs a 400 body with `parser_error` (packages/agent/src/models/chat.vibe:325-330) and reads 502 as CloudProviderIssue, a retry envelope (spec/cloud/client.md:308; spec/agent/models/binding.md:137). develop passes the listed codes (route.ts:985-1010, 1140-1142).
- eliza-cloud-services-06: confirmed. Provider 429 -> 503 provider_unavailable with the provider's retry time, in code (chat-stream.vibe:21) and in the rule (inference.md:279). The agent reads any 5xx as CloudUnavailable -> RetryEnvelope (client.md:310; binding.md:136); only status 429 reaches the one 5 s re-send (planning.vibe:163-165). develop answers 429 (route.ts:1124-1134).
- eliza-cloud-services-07: confirmed. The hold is the provider's whole retry time unless the launch sets a hold setting (packages/agent/src/models/binding.vibe:116-122,134; binding.md:296-311), identical in all w3-* checkouts; develop bounds it at 4 s with no setting (plugin-openai/models/text.ts RATE_LIMIT_MAX_HOLD_MS, :2793). A 59 s hint waits 5 s (planning.md:134-137) and the re-send is refused at startCall (binding.vibe:183-186). Correction to the impact: on the Cloud route a provider 429 arrives as 503 (gap 06) and holds nothing; the hold there applies to the Cloud's own 429.
- eliza-cloud-services-08: confirmed (Cloud half); agent half is in flight. w3-agentcore sends `prompt_cache_key` for Qwen on the cloud and Cerebras routes (w3-agentcore packages/agent/src/models/chat.vibe:494-499,522; conversation/planning.vibe:171-174; spec/agent/models/binding.md:236-253). No checkout adds the field to the Cloud's `ChatRequest` or forwards it, so once w3-agentcore merges every keyed planner and evaluator call through the Cloud is 400 unsupported_field. develop takes and forwards it (route.ts:431, 474-510, 2727-2730).
- eliza-cloud-services-09: confirmed. No delegation service or `/api/workflow/hosted/cloud-delegation/*` route in eliza-vs or any w3-* checkout (packages/workflow/src/routes.vibe:104-112; spec/os/android/deepLinks.md:13-14; secureStore.md:28-29). Alpha's port calls them (apps/app/src/account/delegation.vibe:55; workflows/sources.vibe:151,280). The unchecked item: develop requires six ELIZA_CLOUD_DELEGATION_* settings (cloud-google-delegation.ts:666-698) that only the managed control plane supplies (packages/cloud/shared/src/lib/services/managed-cloud-owner-config.ts:1,15-21); no launcher in alpha-develop or develop's plugin-native-agent sets them, so on the phone's own resident the legacy routes most likely answered an error, not a delegation. Not established for a phone attached to a Cloud-hosted agent.
- eliza-cloud-services-10: confirmed. vibestack charges cached tokens at the input price (spec/cloud/services/models.md:128-130; packages/cloud/src/services/models.vibe:85-97). develop charges nothing for them on Cerebras: billable input is input minus cache reads and writes, and only that is priced (shared/src/lib/services/ai-billing.ts:363-374, 539-552). That settles the unchecked rate: zero.
- eliza-cloud-services-11: confirmed. Only `/api/v1/subscriptions/checkout` and `/confirm` exist (packages/cloud/src/billing/checkout.vibe:424,435; client/routes.vibe:93-94); balance is added only by the operator command (operator/accounts.vibe:52). No `/api/v1/credits/*` in eliza-vs, any w3-* checkout or alpha-vs/cloud. Alpha's port calls it (apps/app/src/account/billing.vibe:216; android ConnectionRoutes.java:53). develop has it (api/src/_router.generated.ts:2337).
- eliza-cloud-services-12: confirmed, with a smaller impact than stated. The Cloud search takes query, near, limit only (packages/cloud/src/services/maps.schema.ts:40-44; providers/maps.vibe:397) and there is no rank or distanceRank in packages/maps or any w3-* checkout. But the agent sorts the returned places by distance from the phone (packages/maps/src/plugin.vibe:121), so "closest first" holds within the page. The difference: develop's distance rank reads the 20-place page and orders it before cutting to the limit (maps/google-provider.ts:439-445); vibestack orders only the `limit` places (default 10) the provider ranked by relevance, and no rule states the ordering.
- eliza-cloud-services-13: confirmed. Body is `{error: "<code>", errorDescription, retryable, retryAt?, resetsAt?, reason?}` with times as numbers (packages/cloud/src/http/refusal.vibe:8-15,29-41) and Retry-After only for a RetryAt wait on 429/503 (:44-46). Alpha's reader takes `error` as an object, `code`, string `retryAt` and `resetAt` (alpha-vs android AlphaVoiceCloudPlugin.java:174-181; CloudVoiceLimit.java:42-58), so it keeps only Retry-After. An Alpha port fix, not an upstream one.
- eliza-cloud-services-14: confirmed. An image part makes the Cloud refuse a model without vision before any provider call (spec/cloud/services/models.md:46; packages/cloud/src/services/models.vibe:43-45) and Alpha Cloud's one model has vision false (alpha-vs/cloud/src/profile.vibe:109). The port's launch check names that model as the image model (cloud/src/runtime-config.vibe:11), the native host exports it as ELIZAOS_CLOUD_IMAGE_DESCRIPTION_MODEL (runtime/NativeProviderAdmission.java:117), unread by vibestack, and host.json names no model, so no path found describes a photo. Legacy sent the same Qwen id for images (develop plugin-native-agent NativeProviderAdmission.java:116) and develop's Cloud has no vision gate (no "vision" in route.ts). Not established: whether that model described images on the legacy phone.
- eliza-cloud-services-15: confirmed for usage; the effort half does not reach the phone. The Cloud forwards the usage frame only on `stream_options.include_usage` (packages/cloud/src/services/chat.vibe:80; chat-stream.vibe:75-80); the agent's body never carries it (packages/agent/src/models/chat.vibe:462,506-521; no `include_usage` under packages/agent in eliza-vs or any w3-* checkout), and the planner streams (planning.vibe:254-258). develop's plugin asked on every streamed call (plugin-elizacloud/src/models/text.ts:2474), which settles the unchecked item. The agent sends only `low` or `none`, and only to a family that documents it (chat.vibe:494,505), so the Cloud's missing per-model effort check is not reachable from the phone.
- eliza-cloud-services-16: confirmed. spec/lock.json names spec/app/*.md and spec/index.md only, in eliza-vs and all w3-* checkouts. Proof files exist for inference, models, speechRelay, google/connection, google/mailRead and shared/rateLimit; none for maps, speech, speechSession, google/calendar, google/mailOperations, shared/metering or shared/dispatchOnce. packages/cloud/test/drivers has 15 drivers, of the services only speechRelay. packages/cloud/gen is absent. Correction: there are 11 `zz-*` scratch files in packages/cloud/test, not 3. The 171-rule Quint count was not recounted.
