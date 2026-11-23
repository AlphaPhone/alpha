# eliza-cloud-identity: develop packages/cloud + packages/auth vs vibestack packages/cloud + spec/cloud

Trees read: `eliza-develop` 7a124190a1, `eliza-vs` vibestack-dp 769b4f00d, `alpha-develop` dd63c6bc6, `alpha-vs` 3d7ca9727.
Nothing was run (no gen, typecheck, tests, Quint or Dafny). `eliza-vs/packages/cloud/gen` is absent in this tree, so
generated tables were read from their Quint source in `spec/cloud/*.md`.

## Summary

- 42 develop PRs since 2026-11-13 touch `packages/cloud` or `packages/auth`: 24 not applicable (Steward, infra,
  services vibestack does not host, test-only), 5 confirmed present for this slice, 13 belong to other slices (speech,
  maps, inference, password backup, the os device half).
- 23 behaviours confirmed OK (spec rule and code both read), 27 not applicable, 17 gaps (1 already in wave3.md).
- Verdict: **the Cloud server side of identity, device keys and billing is ported faithfully, but the phone cannot
  use it yet.** Vibestack redesigned the Cloud wire (own sign-in instead of Steward, snapshot v3, entitlement v3,
  new command and refusal shapes). Alpha's port pairs the new billing client with the old Steward sign-in client, and
  ships the develop-wire Eliza Cloud as its default authority. No single Cloud serves both halves: against a develop
  Cloud a paying owner reads as "needs a plan"; against a vibestack Cloud the phone cannot sign in. Add funds is gone,
  an upgrade's invoice page cannot be opened, and the device no longer checks whose entitlement it accepted.

## Gaps

### eliza-cloud-identity-01 (high, CHANGED): sign-in wire replaced; Alpha's native client still speaks Steward
- Behaviour: the phone signs in with email code, SMS code or Google through Steward routes, gets a Steward JWT
  session, then connects, exchanges and acknowledges an `eliza_mobile_` key.
- Develop: `packages/auth/android/src/main/java/ai/eliza/auth/cloud/CloudSignInRoutes.java` (route set),
  `CloudEmailCode.java`, `CloudSmsCode.java`; Cloud `packages/cloud/api/auth/steward-session/route.ts`. Phone:
  `alpha-develop/android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCloudSignInClient.java:451,658,686,821,1036,1269`.
- Vibestack: no `/steward/*` route anywhere (`grep -ri steward eliza-vs/packages eliza-vs/spec` is empty). Sign-in is
  `/api/v1/auth/{email,sms}/code/{send,verify}`, `/api/v1/auth/google/*`, `/api/v1/auth/mfa/*`
  (`spec/cloud/client.md:122-158`, `packages/cloud/src/identity/code-challenges.vibe:258-288`,
  `identity/federated.vibe:477-490`). Sessions are opaque `eliza_session_…` tokens, not JWTs
  (`packages/cloud/src/http/request-auth.vibe:37`, `identity/sessions.vibe:109`). The device half is
  `packages/os/android/sign-in` (os slice).
- Alpha's port: `alpha-vs/android/.../AlphaCloudSignInClient.java:451,658,686,821,1036,1208,1269` and
  `cloud/CloudEmailCode.java:18-19`, `cloud/CloudSmsCode.java:10-11`, `cloud/CloudSignInRoutes.java:14-17` are a
  verbatim copy of the develop client. `BillingAuthorityRoutes.java:78` parses a JWT `exp` from the session.
- Impact: a phone built from alpha-vs cannot sign in to a Cloud deployed from eliza-vs (which is what
  `alpha-vs/cloud/src/worker.vibe` deploys). In-app cancel, undo, upgrade and downgrade (FreshSession routes) also
  fail, because the billing authority gets its session from the Steward email-code route.
- Smallest fix: move Alpha to upstream's `ElizaSignIn`/`ElizaCloud` plugins, or port `AlphaCloudSignInClient` and
  `AlphaBillingAuthorityPlugin` to `/api/v1/auth/*` and opaque sessions (`accessToken`, `accessExpiresAt`).
- wave3.md G names only the separate credential slots ("ElizaCloud DeviceCustody key separate from AlphaCloudSignIn's
  cloud:production key", "All unbuilt"); the route and session-format mismatch is not listed.

### eliza-cloud-identity-02 (high, CHANGED): billing and entitlement wire is not readable across develop and vibestack Clouds
- Behaviour: the phone reads its plan from the signed entitlement and `GET /api/v1/billing/limits`.
- Develop: snapshot v2 `{success, data:{v2:{subscription: Observed, balance: Observed}}}`
  (`packages/cloud/sdk/src/account-billing-snapshot.ts:524`, `api/v1/billing/limits/route.ts:49`); entitlement `ver` 2
  (`sdk/src/subscription-entitlement.ts:63`); commands `PREPARED|OUTCOME_UNKNOWN|APPLIED|FAILED|SUPERSEDED`; upgrade
  payment `{command, continuation:{hostedInvoiceUrl}}`; refusals `{success:false, error:<text>, code}`. Parsed by
  `alpha-develop/apps/app/src/runtime/cloud-plans.ts`.
- Vibestack: snapshot `schemaVersion: 3`, flat, millisecond times (`packages/cloud/src/client/views.vibe:75`,
  `billing/snapshot.vibe:163-176`); entitlement `ver` 3 and anything else refused (`client/entitlement.vibe:40,130`);
  commands `dispatched|unknown|awaiting_payment|succeeded|rejected` (`views.vibe:100`); payment `{url}`
  (`views.vibe:122`); refusals `{error:<code>, errorDescription, retryable, retryAt?, resetsAt?, reason?}`
  (`http/refusal.vibe:9-16`). Rules: `spec/cloud/billing/entitlements.md:238`, `spec/cloud/client.md:275`.
- Alpha's port uses the vibestack parsers (`alpha-vs/apps/app/src/account/billing.vibe:6-9`,
  `account/entitlement.vibe:6`) but ships Eliza Cloud as its authority with the cutover flag off
  (`alpha-vs/cloud/deployment.json:17-24`, `cloud/generated/client-deployment.ts:5`).
- Impact: against a develop-wire Cloud every plan read fails: the entitlement is `WrongVersion`, so `SignedInvalid`,
  so `NeedsAPlan` (`alpha-vs/apps/app/spec/account/plan.md:25`). A paying owner loses Cloud inference. Against a
  vibestack Cloud billing reads work but sign-in does not (gap 01).
- Smallest fix: cut the app and the Cloud it addresses over together; do not ship an alpha-vs build that addresses a
  develop-wire Cloud. If both must coexist, the client needs a develop-wire reader.

### eliza-cloud-identity-03 (high, MISSING): Add funds (`POST /api/v1/credits/checkout`)
- Develop: `packages/cloud/api/v1/credits/checkout/route.ts:2-5` (Stripe checkout for organization credits, $5 to
  $1,000, `Idempotency-Key` header required at `:118-120`, answers `{url, sessionId}` at `:288`). Phone:
  `alpha-develop/apps/app/src/runtime/cloud-protocol.ts:258-264`.
- Vibestack: deliberately absent. `spec/cloud/billing/funds.md:11-13`: "Credits are never sold in the app: the
  operator adds them". No route (`grep credits/checkout eliza-vs/packages/cloud/src` is empty) and no entry in the
  device route table (`spec/cloud/client.md:159-182`).
- Alpha's port still calls it (`alpha-vs/apps/app/src/account/billing.vibe:216`). `cloud.json` sends only routes
  `lookupPath` lists (`platform/cloud-live.vibe:34`), so the call is refused as `NoRoute` before it leaves the phone,
  on every deployment. It also sends no `Idempotency-Key`, which develop Cloud requires.
- Impact: Add funds never opens a payment page. On a vibestack Cloud an owner without a plan has no way to buy
  credits; only the operator's `credits add` funds an account.
- Smallest fix: owner decision. Either port the route (spec in `billing/funds.md`, device route with
  `Idempotency-Key`) or remove Add funds from the Alpha port.

### eliza-cloud-identity-04 (high, UNIMPLEMENTED, listed in wave3 G): device enrollment headers never reach the agent
- `/api/client-devices/{register,context,view-profile}` exist (`eliza-vs/packages/agent/src/device-actions/enrollment.vibe:155-161`,
  `spec/agent/deviceActions/index.md:31,82`) and require `x-eliza-device-id` and `x-eliza-device-key`
  (`enrollment.vibe:27-28,65-68`). wave3.md G says the native agent channel carries no headers. Not re-derived here.

### eliza-cloud-identity-05 (medium, CHANGED): an upgrade's invoice page cannot be opened
- Develop: the phone opens `checkout.stripe.com` and `invoice.stripe.com`
  (`alpha-develop/apps/app/src/runtime/cloud-protocol.ts:266-271`, `cloud-plans.ts:128-137`).
- Vibestack: Cloud answers an `https://invoice.stripe.com/i/…` page for an upgrade that needs payment
  (`packages/cloud/src/billing/upgrade-commands.vibe:246`), but the phone's link policy lists only
  `checkout.stripe.com`, `billing.stripe.com` and `accounts.google.com`
  (`packages/os/android/sign-in/src/main/java/ai/eliza/plugins/signin/CloudRequestPolicy.java:20`,
  `spec/os/signIn/cloudRequests.md:241`). Alpha's port records this as known
  (`alpha-vs/apps/app/spec/account/billing.md:196-200`).
- Impact: Plus to Pro with a card that needs confirmation stays "pending"; the owner cannot pay from the phone.
- Smallest fix: add `invoice.stripe.com` to `providerHosts` (spec and `PROVIDER_HOSTS`) and to Alpha's `paymentHosts`.

### eliza-cloud-identity-06 (medium, UNIMPLEMENTED): the device does not check whose entitlement it accepted
- Develop: `sub` and `org` are compared with the signed-in account and a mismatch is treated as a rejected sign-in
  (`packages/cloud/sdk/src/subscription-entitlement.ts:249-254,271-282,836-840,909-913`).
- Vibestack rule: `spec/cloud/billing/entitlements.md:191-197` ("`sub` and `org` against the account it signed in
  with", `subjectMatches`, `organizationMatches`). Code: `EntitlementExpectation` has only keys, issuer, audience and
  now (`packages/cloud/src/client/entitlement.vibe:65-70`), and `verifyEntitlement` (`:114-137`) never compares `sub`
  or `org`. The test checks the audience only (`packages/cloud/test/cloud.test.vibe:2713-2718`). Alpha's port does
  not compare either (`alpha-vs/apps/app/src/account/entitlement.vibe:119-131`).
- Impact: an entitlement for another account (a stale answer across an account switch, or a Cloud fault) is accepted
  as this account's plan.
- Smallest fix: add `userId` and `organizationId` to `EntitlementExpectation` and a `WrongAccount` check; Alpha
  passes the session account and treats it as a rejected sign-in.

### eliza-cloud-identity-07 (medium, CHANGED, contract): the allowance reset time is never read
- Develop Cloud names it `resetAt` (ISO or epoch) at the top or under `error`; the SDK read it
  (`packages/cloud/sdk/src/subscription-entitlement.ts:1239-1298`).
- Vibestack: `resetsAt`, epoch milliseconds, top level; `error` is a string code
  (`packages/cloud/src/http/refusal.vibe:9-16,37`; `spec/cloud/client.md:277-281`). `Retry-After` is sent only on 429
  and 503 (`refusal.vibe:42-44`).
- Alpha's port reads `error.resetAt ?? resetAt` (`alpha-vs/apps/app/src/platform/cloud-fetch.ts:30-37`) and
  `message`/`error` for the text (`platform/native.schema.vibe:57`), not `errorDescription`.
- Impact: an exhausted allowance shows no reset time, and the notice shows the code (`allowance_exhausted`).
- Smallest fix: Alpha reads refusals with upstream's `readCloudError`, or reads `resetsAt` and `errorDescription`.

### eliza-cloud-identity-08 (medium, UNVERIFIED): no way to carry accounts from a develop Cloud database
- Looked at: the thirteen operator commands (`eliza-vs/packages/cloud/src/operator/*.vibe`,
  `spec/cloud/operator.md:25`): credits add, account devices/revoke-devices/delete, grants, client, prices. None
  imports users, credit balances, subscriptions or device keys. The compatibility code (`legacyRegistrations`,
  `isFlatGrant`, `0112_google_connection_compat.sql`) is for an earlier vibestack Worker, not develop's schema.
- Impact if true: every owner of the develop-based Alpha Cloud signs in again as a new account, and credits and
  subscriptions do not follow. A runbook outside this tree may cover it.

### eliza-cloud-identity-09 (medium, UNVERIFIED, contract): an account with no email cannot be adopted
- Vibestack answers `email: null` for a phone-number account
  (`eliza-vs/packages/cloud/src/identity/accounts.vibe:189`); develop also answers a nullable email
  (`packages/cloud/api/v1/user/route.ts:90`). Alpha's schema is `email?: string`
  (`alpha-vs/apps/app/src/account/signIn.schema.vibe:92`), and every fixture supplies a string
  (`apps/app/test/account/platform.vibe:72`). If a vibelang optional key refuses `null` (upstream writes
  `Schema.NullOr` where null is meant), `readUser` fails and the session is never adopted
  (`account/session.vibe:74-86`). Not run.
- Smallest fix: `email?: string | null`.

### eliza-cloud-identity-10 (medium, CHANGED, contract): `/api/v1/decisions` is not a device route
- Cloud serves it as a Worker-only route (`eliza-vs/packages/cloud/src/clef-decisions.vibe:5`,
  `worker/legacy.vibe:112`), but `spec/cloud/client.md` does not list it, so `lookupPath` answers `Unlisted`.
  Alpha's port calls it through `cloud.json` (`alpha-vs/apps/app/src/voice/conversation.vibe:83,433`): refused
  `NoRoute`. Voice slice owns the behaviour.
- Smallest fix: list the route in `deviceRoutes`, or call it outside `cloud.json`.

### eliza-cloud-identity-11 (low, CHANGED): the hosted plan page has no counterpart
- Develop: "Manage plan" opens `https://<agents host>/cloud/billing`
  (`alpha-develop/apps/app/src/runtime/cloud-protocol.ts:59-63,234-238`). Vibestack Cloud hosts only return pages
  (`spec/cloud/returnPages.md`); the nearest is `POST /api/v1/subscriptions/portal`
  (`packages/cloud/src/billing/invoices.vibe:332`). alpha-vs opens no such page
  (`grep cloud/billing alpha-vs/apps/app/src` is empty), and the os link policy would refuse the agents host.

### eliza-cloud-identity-12 (low, UNIMPLEMENTED): a later entitlement version is refused
- Rule: "A later `ver` is accepted" (`spec/cloud/billing/entitlements.md:196`, `e.ver >= entitlementVersion`). Code:
  `claims.ver !== entitlementVersion` throws (`packages/cloud/src/client/entitlement.vibe:130`). Develop accepted any
  version from 1 (`sdk/src/subscription-entitlement.ts:297-304`). A Cloud that adds a claim locks out older phones.

### eliza-cloud-identity-13 (low, CHANGED): redeem is not replayed after a lost reply
- Develop replayed once with the same key (`packages/cloud/sdk/src/cloud-account-billing.ts:316-343`). Vibestack's
  client sends once (`packages/cloud/src/client/client.vibe:414-417`), as does Alpha's port
  (`account/billing.vibe:225`). The server answers a second redemption by the same organization with the same grant
  (`spec/cloud/billing/grantCodes.md:155-160`), so the owner's own retry succeeds.

### eliza-cloud-identity-14 (low, CHANGED): entitlement keys are fetched on every plan check
- Develop cached keys for an hour per issuer (`sdk/src/subscription-entitlement.ts:59,762-786`) and retried from
  30 s. Vibestack's client is stateless (`spec/cloud/client.md:12`) and retries from 5 s (`client.md:330-335`);
  Alpha's port reads the keys before each entitlement (`account/entitlement.vibe:119-124`).

### eliza-cloud-identity-15 (low, MISSING): `packages/auth` client modules have no upstream home
- `packages/auth/src/auth/cloud-resident-binding.ts:28` (seven-day offline plan grace, rebind queue, replace
  credential) and `native-cloud-sign-in.ts:17-43` (renderer contract and failure codes), plus the thirteen
  `packages/auth/android` classes, are gone upstream. Alpha's port carries its own copies
  (`alpha-vs/apps/app/spec/account/plan.md:119-144`, `account/signIn.schema.vibe`,
  `android/.../alphaphone/cloud/*.java`). No phone impact if the Alpha audits confirm them; upstream fixes no longer
  arrive.

### eliza-cloud-identity-16 (low, UNVERIFIED): device answers differ in two fields
- `GET /api/client-devices/capabilities` no longer carries `externalIdentity`
  (develop `packages/agent/src/api/device-action-routes.ts:133-151`; vibestack `enrollment.vibe:150`), which
  `alpha-vs/android/.../HostedTransport.java:38` still reads. Register no longer answers `userTextFormatVersion: 1`
  (develop `plugins/plugin-assistant/src/services/device-actions/service.ts:2146,2169`;
  `alpha-develop/apps/app/src/runtime/connection-ui.tsx:1206`). Agent slice; not traced further.

### eliza-cloud-identity-17 (low, UNVERIFIED): formal coverage of the cloud spec
- 38 cloud spec files, 368 rules, each with Quint. `spec/lock.json` holds no cloud entry (see
  `formal-eliza-static.md`). Conformance drivers exist for 15 files; none for `client`, `deployment`, `operator`,
  `returnPages`, `nativeClients/registry`, `billing/{checkout,entitlements,grantCodes,plans,subscriptionCommands,subscriptions}`,
  `identity/requestAuth` or any service. Ten `zz-*` scratch files remain in `packages/cloud/test`.

## Contract mismatches with Alpha's port

1. `/steward/auth/*` (providers, email and SMS code, oauth exchange, google native challenge/verify, mfa complete,
   logout): called by `alpha-vs/android/.../AlphaCloudSignInClient.java`; not served by eliza-vs (gap 01).
2. Steward JWT session (`validStewardToken`, `sessionExpiry`): eliza-vs sessions are opaque `eliza_session_…`
   (gap 01).
3. `POST /api/v1/credits/checkout`: called at `account/billing.vibe:216`; not in `deviceRoutes`, not served (gap 03).
4. `POST /api/v1/decisions`: called at `voice/conversation.vibe:433`; not in `deviceRoutes` (gap 10).
5. Refusal field `resetAt` and `message`: eliza-vs sends `resetsAt` and `errorDescription` (gap 07).
6. `UserRow.email?: string` against `email: null` (gap 09).
7. `invoice.stripe.com`: answered by Cloud, refused by `ElizaCloud.openExternal` (gap 05).
8. `GET /api/v1/app-auth/mobile/config`: eliza-vs answers no `success` field
   (`native-clients/registry.vibe:163-171`); the ported `CloudSignInReadiness.registered` is handed
   `registration.data.opt("success")` (`AlphaCloudSignInClient.java:447`). Moot until gap 01 is fixed.
9. Billing authority bodies allow `expectedSubscriptionRevision` 0 (`BillingAuthorityRoutes.java:30`); eliza-vs
   refuses below 1 (`billing/commands.vibe:620`). Harmless: a live subscription's revision is at least 1.

Every `@elizaos/cloud` export alpha-vs imports exists with the used shape: `createCloudClient`, `lookupPath`,
`HttpMethod`, `CloudClient`, `checkEntitlement`, `nextRefreshDelay`, `parseEntitlementKeys`, `snapshotFromResponse`,
`subscriptionView`, `checkoutFromResponse`, `commandFromResponse`, `paymentFromResponse`, `reviewFromResponse`,
`redeemResultFromResponse` (`packages/cloud/src/client/index.vibe`); `parseProfile`, `CloudProfile`,
`CloudEnvironment`, `EnvironmentProfile`, `ProfileInvalid` (`profile/profile.vibe:5-8,59`); `cloudWorker`,
`CloudBindings`, `WorkerExecution` (`worker.vibe:11-17`). Alpha's `NATIVE_CLIENT_REGISTRY` entry
(`alpha-vs/cloud/src/registration.vibe:31-35,113-116`) matches upstream's `Entry` schema
(`packages/cloud/src/native-registry.vibe:22-30`).

## Confirmed OK

| Behaviour | Spec rule | Code |
|---|---|---|
| Public service document (name, Terms, Privacy) | `spec/cloud/deployment.md:291` | `src/http/routes/foundation.vibe:11-19`, `profile/profile.vibe:142` |
| Config read for one registration | `nativeClients/registry.md:179` | `native-clients/registry.vibe:150-175` |
| Connect: S256, state, five-minute code | `nativeClients/deviceKeys.md:40` | `native-clients/device-keys.vibe:161-183,305-312` |
| Exchange mints one key; sealed copy replays | `deviceKeys.md:138,177` | `device-keys.vibe:243-269,314-327` |
| Acknowledge activates; repeat answers the same | `deviceKeys.md:193` | `device-keys.vibe:329-369` |
| Renewal: 180-day cap, 401/409, reuse ends sign-in | `deviceKeys.md:352,417,431` | `device-keys.vibe:406-463` (develop cap `mobile-app-auth.ts:51`) |
| Sign-out: 204, repeat 401, named successor kept | `deviceKeys.md:521` | `device-keys.vibe:371-398` |
| Key accepted only acknowledged, unexpired, current epoch | `deviceKeys.md:455` | `http/request-auth.vibe:54-78` |
| Store outage is 503, never a credential refusal (#39679, #39682) | `identity/sessions.md:217` | `request-auth.vibe:64,68`, `device-keys.vibe:218,229` |
| `GET /api/v1/user` | `identity/accounts.md:170` | `identity/accounts.vibe:172-195` |
| Referral read and apply | `accounts.md:185,229` | `accounts.vibe:197-221` |
| Plans: Plus $30/$25, Pro $100/$90, rates 120/60 and 300/120 | `billing/plans.md:19-34,65` | `billing/plans.vibe:45-56` (develop `subscription-catalog.ts:149-176`) |
| Entitlement issued and signed; at most 16 keys | `billing/entitlements.md:143,216` | `billing/entitlements.vibe:113-168` |
| An unreadable policy funds nothing (#39797) | `entitlements.md:118` | `billing/policy.vibe:25-57` |
| Billing snapshot with cancel/undo control | `entitlements.md:238` | `billing/snapshot.vibe:160-176` |
| Redeem a grant code, replay by organization | `billing/grantCodes.md:155` | `billing/grant-codes.vibe:241-258` |
| Checkout start, resume, confirm; mobile return | `billing/checkout.md:30,109,120,176` | `billing/checkout.vibe:372-441` |
| Cancel, undo, upgrade, downgrade on a fresh session | `billing/subscriptionCommands.md:27,118,339` | `billing/commands.vibe:603-656`, `upgrade-commands.vibe:263-283`, `downgrade-commands.vibe:343-352` |
| Asset links per registration | `nativeClients/registry.md:163` | `native-clients/asset-links.vibe:17` |
| Return pages: sign-in, billing, payer; app link by package (#39803) | `returnPages.md:23,84,216` | `native-clients/return-routes.vibe:96-99` |
| Registry in the database, applied by the operator (#39991 per-app readiness) | `registry.md:103,253` | `native-clients/registry.vibe`, `operator/clients.vibe:222-225` |
| Session refresh and logout | `identity/sessions.md:87,131` | `identity/sessions.vibe:196-222` |
| Device enrollment routes (register, context, view-profile, revoke) | `spec/agent/deviceActions/index.md:31,66,82` | `packages/agent/src/device-actions/enrollment.vibe:87-161` |

Not applicable (27): PRs #39622 #39630 #39652 #39678 #39696 #39700 #39705 #39706 #39713 #39725 #39733 #39737
#39754 #39770 #39788 #39804 #39846 #39918 #39965 #39972 #39974 #39985 #40022 #40023 (reasons as in
`parity-results.json`, re-read and agreed); Cloud PUT (the phone sent PUT only to on-device agent routes
`/api/triggers` and `/api/lifeops/definitions`, `alpha-develop/apps/app/src/runtime/automations-protocol.ts:125-177`);
the `cli-session` hand-off (development builds only, `cloud-protocol.ts:359-362`); `X-API-Key` presentation (the
phone also sends `Authorization`, `AlphaCloudSignInClient.java:1925-1927`).

## Not covered

- The os device half of sign-in (`packages/os/android/sign-in`, `spec/os/signIn/*`), including queued Google
  cancellation. On develop this is `packages/auth/android/.../CloudSignInPlugin.java:167,904`; the renderer half
  (`alpha-develop/apps/app/src/runtime/cloud-protocol.ts:293-351`) is Alpha's. alpha-vs has no `cancelGoogleSignIn`
  call (`grep` over `apps/app/src` finds only `cancelGoogleWorkspaceReturn`); the os and Alpha auditors should settle it.
- Password backup (#39859, #39912, #40088): `packages/cloud/src/password-backup.vibe` not read.
- Cloud services touched by PRs in these paths: speech (#39847, #39875, #39957), maps (#39829, #39832, #39842),
  inference (#40037 `chat/completions`), Clef quota (#39929), Google sign-in with Gmail (#39789), browser choice (#39666).
- Managed Google routes, maps, speech, chat completions, the operator commands beyond their list.
- Account deletion (the phone calls none of it), invoices and the billing portal.
- Stripe webhook handling (`billing/provider-events.vibe`) and subscription state transitions beyond the rules cited.
- Whether `api.eliza.app` or `alphacompute.cc` will run vibestack at cutover: an owner and devops fact, not in the trees.
- Nothing was executed, so "OK" means the rule and the code path were read, not that they pass.

## Skeptic verdicts

Read-only check of each gap against eliza-develop, eliza-vs, the seven w3-* checkouts, alpha-vs and alpha-develop. Nothing was built or run. No w3-* checkout differs from eliza-vs under `packages/cloud`, `spec/cloud`, `packages/os`, `spec/os`, `packages/agent/src/client`, `packages/agent/src/access` or `device-actions/enrollment.vibe` (`diff -rq`), so no gap here is in flight in wave 3.

- eliza-cloud-identity-01: confirmed. No `steward` anywhere in eliza-vs or any w3-* `packages`/`spec`; eliza-vs serves `/api/v1/auth/*` (`spec/cloud/client.md:121-158`) and opaque `eliza_session_` tokens (`http/request-auth.vibe:36`, `identity/sessions.vibe:108`). alpha-vs sign-in is the `AlphaCloudSignIn` plugin (`apps/app/src/account/signIn.vibe:18`, `session.vibe:17`, registered `MainActivity.java:403`), which still posts `/steward/auth/*` (`AlphaCloudSignInClient.java:451,658,686,821,1036,1269`; `cloud/CloudEmailCode.java:18-19`) and `BillingAuthorityRoutes.java:77-84` parses a three-part JWT `exp`.
- eliza-cloud-identity-02: confirmed. develop signs `ver` 2 and serves snapshot `schemaVersion: 2` (`sdk/src/subscription-entitlement.ts:63`, `account-billing-snapshot.ts:524`); eliza-vs accepts only `ver` 3 and `schemaVersion` 3 (`client/entitlement.vibe:40,130`, `client/views.vibe:75,100,122`). alpha-vs reads with the vibestack client (`account/entitlement.vibe:6,119-131`) while shipping `api.eliza.app` with cutover false (`cloud/deployment.json:17-24`, `cloud/generated/client-deployment.ts:5`); a refused token is `SignedInvalid`, which `spec/account/plan.md:25` maps to `NeedsAPlan`.
- eliza-cloud-identity-03: confirmed. develop route is real (`api/v1/credits/checkout/route.ts:118-120`, legacy caller `cloud-protocol.ts:258-264`). eliza-vs has no such route or device route (grep `credits/checkout` over `packages` and `spec` is empty; `spec/cloud/billing/funds.md:11-13` says credits are never sold in the app); same in every w3-*. alpha-vs still calls it (`account/billing.vibe:216`) through `cloud.json`, which refuses unlisted routes (`platform/cloud-live.vibe:32-36`).
- eliza-cloud-identity-04: confirmed. Listed in `wave3.md` G, but present in no w3-* checkout (AgentSocketClient, AgentChannel, AgentPlugin, `bridges/definitions/agent.ts` and `turn-controller.vibe` are byte-identical to eliza-vs). The agent requires the headers (`enrollment.vibe:26-27,65-68,89,112`) and its socket frame carries them (`access/socket.vibe:25,78`), but the Android client sends only `authorization` and `content-type` (`AgentSocketClient.java:160-165`), `AgentPlugin.ask` reads only method, path and body (`AgentPlugin.java:123-127`) and `AgentRoute` has no headers field (`bridges/definitions/agent.ts:16-20`). alpha-vs passes a `headers` field (`platform/resident-bridge.vibe:95-97`) that this plugin drops.
- eliza-cloud-identity-05: confirmed. Cloud answers `https://invoice.stripe.com/i/...` (`billing/upgrade-commands.vibe:246`); the link policy lists only checkout, billing and Google hosts (`CloudRequestPolicy.java:20`, `spec/os/signIn/cloudRequests.md:240`); alpha-vs's own rule excludes it (`apps/app/spec/account/billing.md:204-209`, `account/billing.vibe:100-101,190`). Legacy opened it (`alpha-develop cloud-protocol.ts:268`, `cloud-plans.ts:135`). No w3-* change.
- eliza-cloud-identity-06: confirmed. develop refuses `account-mismatch` (`subscription-entitlement.ts:249-254,271-282`) and alpha-develop passes the account (`connection-ui.tsx:629,1421`). eliza-vs spec has the rule (`entitlements.md:191-206`) but `EntitlementExpectation` has no account (`client/entitlement.vibe:65-70`) and `verifyEntitlement` compares none (`:114-137`); `checkEntitlement` returns `userId`/`organizationId` (`:167-168`) but alpha-vs reads only plan, end and expiry (`account/entitlement.vibe:128-131`). Partial mitigation: alpha-vs drops an answer read for an earlier sign-in by credential ordinal (`entitlement.vibe:140-143,156-159`), which covers the account switch but not a Cloud fault.
- eliza-cloud-identity-07: confirmed. eliza-vs refusal body is `{error, errorDescription, retryable, retryAt?, resetsAt?, reason?}` (`http/refusal.vibe:8-15,29-40`); alpha-vs reads `error.resetAt ?? resetAt` (`platform/cloud-fetch.ts:30-37`) and `message ?? error` (`platform/cloud-live.vibe:60`, `native.schema.vibe:57`), and reads neither `resetsAt` nor `errorDescription` (grep over `apps/app/src`).
- eliza-cloud-identity-08: confirmed (no importer in any tree). Operator commands are credits add, account devices/revoke-devices/delete, client register/update/apply/disable, grants mint/disable/revoke, prices set/check (`operator/*.vibe`); the 51 migrations start from `0001_foundation.sql`, not develop's schema. alpha-vs's own plan says accounts do not move and recommends signing in again at cutover (`docs/standalone-cloud-plan.md:241-245`), and the database starts empty (`docs/alpha-cloud.md:86`). Whether an out-of-tree runbook exists cannot be read from the trees; it is an owner decision.
- eliza-cloud-identity-09: confirmed by reading, not run. eliza-vs answers `email: null` (`identity/accounts.vibe:189`); alpha-vs declares `email?: string` (`account/signIn.schema.vibe:92`). vibelang lowers a `schema` optional member to `Schema.optionalKey` (vibelang 0.0.13 `skills/vibelang/SKILL.md:41,99`), which admits an absent key and not null; the port writes `?: string | null` where null is meant (`account/delegation.schema.vibe:14`, `shell/overview.schema.vibe:4`). `readUser` then fails and `readAccount` answers undefined (`account/session.vibe:73-82`). develop tolerated null (`alpha-develop cloud-protocol.ts:517-519`).
- eliza-cloud-identity-10: confirmed. `/api/v1/decisions` is served by the Worker (`clef-decisions.vibe:5`, `worker/legacy.vibe:113`) but is absent from the device route table (`spec/cloud/client.md`, `packages/cloud/src/client`, `CloudRequestPolicy.java`: grep `decisions` empty). alpha-vs calls it through `cloud.json` on the Cloud voice route (`voice/conversation.vibe:83,432-433`; `spec/voice/conversation.md:102`), which refuses unlisted routes. No w3-* change.
- eliza-cloud-identity-11: not_applicable_to_phone. The difference is real (eliza-vs hosts no `/cloud/billing`; grep empty), but the legacy phone never opened that page from its UI: `openSubscriptionManagement` (`alpha-develop cloud-protocol.ts:234`) has no caller under `apps/app/src`, only `test/browser/browser-cloud-dev.spec.ts:55` and `scripts/test-cloud-subscription.ts:138`; "Manage plan" opens the in-app manager whatever the cutover flag (`connection-ui.tsx:2988-2996,3914`). alpha-vs also opens only the in-app manager.
- eliza-cloud-identity-12: confirmed. Spec accepts `ver >= 3` (`entitlements.md:196,206`); code refuses anything but 3 (`client/entitlement.vibe:130`), identically in all seven w3-* checkouts. develop accepted any later version (`subscription-entitlement.ts:297-304`).
- eliza-cloud-identity-13: confirmed. develop replays once on a transport failure (`cloud-account-billing.ts:316-343`); eliza-vs `redeem` sends once (`client/client.vibe:414-417`) and alpha-vs sends once with a fresh key (`account/billing.vibe:225`). The server replays by organization (`grantCodes.md:155-160`), so a manual retry succeeds.
- eliza-cloud-identity-14: confirmed. develop caches keys for an hour and retries from 30 s (`subscription-entitlement.ts:54-59`); the vibestack client is stateless and retries from 5 s (`spec/cloud/client.md:12,330-335`); alpha-vs reads the keys before every entitlement (`account/entitlement.vibe:119-124`).
- eliza-cloud-identity-15: confirmed. eliza-vs has no `packages/auth` and no offline-grace or rebind rule (grep for the seven-day window, `offlineWindow`, `rebind` over `spec/cloud`, `spec/os`, `packages/{cloud,os,agent}/src` is empty); develop has `OFFLINE_PLAN_GRACE_MS` (`cloud-resident-binding.ts:28`). alpha-vs carries its own (`account/entitlement.vibe:21`, `spec/account/plan.md:119-144`, 11 of develop's 13 `cloud/` classes; CloudPasswordBackup and CloudSignInPlugin not copied). Parity of those copies is for the Alpha auditors.
- eliza-cloud-identity-16: not_applicable_to_phone. eliza-vs does omit both (`enrollment.vibe:99` register answer, `:147` capabilities offer). In alpha-vs `externalIdentity` is read only by `HostedTransport.java:38`, built only for a non-resident binding (`HostedDelivery.java:17`), and the port's one `configureBackground` call passes `mode: "resident"` (`workflows/results.vibe:179-181`). `userTextFormat` is assigned (`account/enrollment.vibe:273`) and read nowhere; the port has no legacy envelope and always sends the observation as turn metadata (`assistant/composer.vibe:372`), which is what a negotiated `userTextFormatVersion: 1` selected on develop (`alpha-develop phone-context.ts:111-117`).
- eliza-cloud-identity-17: confirmed. `spec/cloud` has 38 spec files and 368 rule headings; `spec/lock.json` lists only `spec/app/*` and `spec/index.md`; `packages/cloud/test/drivers` holds 15 drivers, none for client, deployment, operator, returnPages, nativeClients/registry, requestAuth, checkout, entitlements, grantCodes, plans, subscriptionCommands or subscriptions; 11 `zz-*` files remain in `packages/cloud/test` (10 tests and one helper). Same in every w3-*.
