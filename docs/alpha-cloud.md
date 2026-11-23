# Alpha Cloud

Alpha Phone's own Cloud: sign-in, AI inference, voice, subscriptions and billing for
`ai.alphacompute.alphaphone`, on Cloudflare under `alphaphone.dev`. It is the upstream
`@elizaos/cloud` package (`vendor/eliza` at `upstream.lock.json`, used as a workspace package,
never edited) run with Alpha's own deployment profile, native client registration and web host,
all described by data in this repository. The shipped app still uses Eliza Cloud: everything in
the app that is specific to Alpha Cloud is behind the cutover flag (section 8), which is off by
default.

**To deploy it, follow [the deployment runbook](runbooks/alpha-cloud-deploy.md)** (hosts at
`alphaphone.dev`, accounts, secrets, operator inputs, commands, verification, rollback).

## 1. What the Cloud does, and what it does not

| Need | Upstream piece | Required |
|---|---|---|
| Sign-in: email code, Google | `@elizaos/cloud` identity routes (`/api/v1/auth/*`, `app-auth/mobile/*`) | Yes |
| LLM inference | `/api/v1/chat/completions`, `/responses`, `/models` → Cerebras (`qwen-3.8-27b`, the model the app requests) | Yes |
| Voice | `/api/v1/voice/*` → Cartesia | Yes |
| Subscriptions and billing | Stripe checkout, plan change, cancel/undo, webhooks, entitlements, grant codes, referrals | Yes |
| Maps | `/api/v1/maps/*` → Google Maps Platform | The app calls it |
| Gmail and Calendar | `/api/v1/eliza/google/*` | The app calls it; needs Google verification |
| Everything else Eliza Cloud runs (agents, containers, apps marketplace, Telegram, Twilio, web dashboard) | | Not deployed |

So: inference, voice, Google sign-in, and subscriptions are the core. One Postgres database per
environment and an email sender for sign-in codes are also required. Maps and the Gmail/Calendar
connector are features the app already ships; without their keys those screens report the
service as unavailable, and nothing else breaks.

### Topology

```
phone ──https──> api.alphaphone.dev    API Worker (cloud/src/worker.vibe: upstream's Cloud Worker)  ──Hyperdrive──> Postgres
                                         profile: its static asset alpha-cloud/profile.json, pinned by CLOUD_PROFILE_SHA256
                 blob.alphaphone.dev   R2 bucket (proxied DNS, provisioned)
                 alphaphone.dev  web Worker (cloud/src/edge.vibe)  ──service binding API──> API Worker
Stripe ──webhook──> api.alphaphone.dev/api/stripe/webhook
```

`alphaphone.dev` is the app-link host. Its Worker answers only its own `/health`; every
other `https://alphaphone.dev` address goes to the API Worker through the `API` service
binding (never a public fetch), with `X-Forwarded-Host` naming the web host. The API Worker answers
`/.well-known/assetlinks.json`, the sign-in, checkout and connector returns
(`/alphaphone/auth/callback`, `/alphaphone/billing/return`, `/alphaphone/gmail/callback`) and the
browser Google start from the database registration and upstream's built return pages. The web
Worker has no pages of its own. Staging uses the `-staging` hosts and its own database.

The API Worker reads its whole profile (both environments, with the Terms and Privacy text) from
its static assets, because the profile is larger than a Cloudflare Worker variable may be. The
rendered `CLOUD_PROFILE_SHA256` variable pins the exact text; until the asset it was deployed with
is readable, every request is answered `503`, retryable, and no scheduled sweep runs.

## 2. What is in this repository

| Path | Role |
|---|---|
| `cloud/` (`@alphacompute/alpha-cloud`) | The workspace package that runs upstream `@elizaos/cloud` as Alpha Cloud. |
| `cloud/src/profile.vibe` | Alpha's deployment profile, as data upstream's profile schema accepts: hosts, sender, audience, capabilities, providers, plans and secret names. The operator's reviewed public inputs (`OperatorInputs`: database identity, Terms and Privacy, entitlement public keys, provider ids, prices) complete it. |
| `cloud/src/registration.vibe` | Alpha Phone's native client registration: returns on the web host, Android package and release signers, as a `--seed` document for a local Cloud, a Worker registry and the reviewed file `elizaos-cloud client apply --file` applies. |
| `cloud/src/deployment.vibe`, `cloud/deployment.json` | The app's client deployment (shipped Eliza Cloud rows, Alpha Cloud hosts, credential namespaces) and the `ALPHA_CLOUD_CUTOVER` outputs it writes. |
| `cloud/src/worker.vibe`, `cloud/src/profile-asset.ts` | The API Worker: upstream's Cloud Worker over the profile asset its digest pins. |
| `cloud/src/edge.vibe` | The web host Worker: health, and the API Worker through its service binding. |
| `cloud/src/wrangler.vibe`, `cloud/wrangler/*.template.json` | Both Workers' Wrangler configurations, the API Worker's variables and assets directory, rendered per environment. |
| `cloud/src/cli.vibe` (`alpha-cloud`) | `deployment`, `runtime-config`, `profile`, `seed`, `registration` and `render`. |
| `cloud/resources.json` | Cloudflare account, zone, worker names, blob and sign-in hosts, sender and resource ids. Zero ids are placeholders until `provision`. |
| `cloud/alpha-cloud.env.example` | The names of one environment's secrets file. |
| `scripts/cloud-worker.ts` (`pnpm cloud:worker`) | The operator tool: `profile`, `secrets`, `provision`, `preflight`, `migrate`, `seed`, `prices`, `render`, `check`, `deploy`, `smoke`. |
| `scripts/local-cloud.ts` (`pnpm cloud:local`) | The same Cloud on this computer (`elizaos-cloud serve`, PGlite, loopback mail), for development and contract checks. |
| `.github/workflows/cloud-deploy.yml` | Manual, main-only deploy per environment. |
| `android/.../AlphaBillingAuthorityPlugin.java`, `BillingAuthorityRoutes.java` | Native account session for plan changes and cancellation. |
| `scripts/update-channel-status.ts` (`node scripts/update-channel-status.ts`) | Live OTA channel check. |

## 3. Secrets and operator inputs

The tool keeps one private env file per environment, outside the checkout (for example
`~/.config/alpha-cloud/staging.env`, mode 600; names in `cloud/alpha-cloud.env.example`). You add
the provider values below; `secrets` adds the internal ones (`CLOUD_DIGEST_KEY`,
`CLOUD_SEALING_KEY`, the entitlement signing key `CLOUD_ENTITLEMENT_KEY`, `EMAIL_CODE_SECRET`,
`GOOGLE_CONNECT_TOKEN_KEY`) once and never rotates them. Use test or sandbox keys for staging and
live keys for production.

| Name | Where to get it | Notes |
|---|---|---|
| **Cloudflare** (not in the env file) | An AlphaCompute Cloudflare account that owns the `alphaphone.dev` zone, on Workers Paid | Set `CLOUDFLARE_ACCOUNT_ID` and use a token for that account. Grant Workers Scripts, Routes, KV, R2 and Hyperdrive edit, plus Zone read and DNS edit on `alphaphone.dev`. |
| `DATABASE_URL` | Postgres (Neon, Supabase or Railway) | One database per environment, empty before its first migration. Hyperdrive is created from it. |
| `CEREBRAS_API_KEY` | cloud.cerebras.ai → API keys | Serves `qwen-3.8-27b`. The API Worker reads it as `INFERENCE_API_KEY`. |
| `CARTESIA_API_KEY` | play.cartesia.ai → API keys | Speech to text and text to speech. |
| `RESEND_API_KEY` | resend.com, with `alphacompute.cc` verified as a sending domain | Sends sign-in codes from `noreply@alphacompute.cc`. |
| `GOOGLE_CLIENT_SECRET`, `GOOGLE_CONNECT_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth clients (Web application) in an AlphaCompute project | Authorized redirect URIs: `https://api.alphaphone.dev/api/v1/auth/google/callback` (sign-in) and `https://api.alphaphone.dev/api/v1/oauth/google/callback` (Gmail/Calendar connector); staging: the `api-staging.` host. The client ids go in the operator inputs. |
| `GOOGLE_MAPS_API_KEY` | Google Cloud → Maps Platform key restricted to Geocoding, Places and Routes | |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | `sk_test_` for staging, `sk_live_` for production (the tool refuses a mismatch). |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → add endpoint `https://api.alphaphone.dev/api/stripe/webhook` | Events the Cloud handles: `checkout.session.completed`, `customer.subscription.updated`, `.deleted`, `.pending_update_applied`, `.pending_update_expired`, `invoice.created`, `.paid`, `.payment_failed`, `payment_intent.succeeded`, `.payment_failed`, `charge.refunded`, `charge.dispute.funds_reinstated`. |
| `STRIPE_PUBLISHABLE_KEY` (optional) | Stripe → API keys | Not needed for the app's hosted checkout. |

The operator inputs (`cloud/src/profile.vibe` `OperatorInputs`, one JSON file for both
environments, outside the checkout) hold the reviewed public values: each environment's
`databaseIdentity` (a new random 64-hex value that the first `migrate` writes into the empty
database, so every later command refuses another database), the Terms and Privacy documents, the
entitlement key id and public key that `secrets` printed, the Google client ids, the Stripe
publishable key and the Plus ($30/month) and Pro ($100/month) price and product ids, the speech
voices, models and prices, the Maps coverage, and the Worker's plan, embedding models, model prices
and limits. `cloud/test/fixtures/operator.json` is a fictitious example.

GitHub (for the deploy workflow): create environments `alpha-cloud-staging` and
`alpha-cloud-production` in this repository (`eliza-research/alpha`; the workflow runs only there),
each with secrets `CLOUDFLARE_API_TOKEN`, `ALPHA_CLOUD_ENV` (the whole completed env file) and
`ALPHA_CLOUD_INPUTS` (the operator inputs).

## 4. First deployment (per environment)

```bash
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=@alphacompute/alpha-cloud     # Workers and upstream's return pages
I=~/.config/alpha-cloud/inputs.json E=~/.config/alpha-cloud/staging.env
pnpm cloud:worker secrets --environment staging --env-file $E
# add the printed entitlement public key to the operator inputs ($I), then rerun `secrets`
CLOUDFLARE_ACCOUNT_ID=… CLOUDFLARE_API_TOKEN=… pnpm cloud:worker provision --environment staging --env-file $E --write
pnpm cloud:worker check --environment staging --inputs $I         # render and bundle, no network
CLOUDFLARE_API_TOKEN=… pnpm cloud:worker preflight --environment staging --env-file $E
pnpm cloud:worker migrate --environment staging --inputs $I --env-file $E
pnpm cloud:worker seed --environment staging --inputs $I --env-file $E   # elizaos-cloud client apply --file
pnpm cloud:worker prices --environment staging --inputs $I --env-file $E # elizaos-cloud prices check
CLOUDFLARE_API_TOKEN=… pnpm cloud:worker deploy --environment staging --inputs $I --env-file $E
pnpm cloud:worker smoke --environment staging
```

The profile has no tenant, services origin or credential namespace: upstream's deployment rules
forbid them. There is no separate sign-in Worker; sign-in is part of the Cloud API. The database
identity is the profile's `databaseIdentity` per environment, and an instance refuses another
environment's database.

`seed` renders the reviewed registration file (`alpha-cloud registration`) and applies it with
`elizaos-cloud client apply --file` against the environment's database; the same file is the
Worker's `NATIVE_CLIENT_REGISTRY`. `render` (and `check` and `deploy`, which render first) writes
both Wrangler files and the API Worker's assets directory: upstream's built return pages and the
environment's profile at `alpha-cloud/profile.json`, whose SHA-256 is the `CLOUD_PROFILE_SHA256`
variable. `deploy` uploads the API Worker's secrets with its version using
`wrangler deploy --secrets-file`, then deploys the web Worker, whose `API` service binding names the
API Worker. `secrets --apply` pushes the secrets alone for a rotation. `provision` verifies the
account's zone, KV namespace, Hyperdrive configuration, R2 bucket, proxied DNS for the blob host,
and ownership of the API and web hostnames. It creates missing resources and confirms them by
readback. If a previous run stopped partway, rerun with the same account and environment to
recover the resources by name. Resolve
conflicts in the account or resource configuration before continuing. With `--write`, commit the
updated `cloud/resources.json`. The API and web hosts are Worker custom domains created on
deployment.

`preflight` reads the configured resources from the selected account without changing them. With
`--env-file`, it also checks that Hyperdrive's host, port, database and user match `DATABASE_URL`.
`deploy` repeats these checks with its env file before uploading. Run `preflight` with the frozen
env file before migrating or seeding.
The `smoke` step checks the API health, the Terms and Privacy text, public entitlement keys, the
exact native client and S256 callback binding, the plan catalogue, sign-in methods, the enrolled
release certificate's App Links grant, and the hosted callback page.

Exercise the live integrations after these checks pass.

- In Stripe, send a test webhook and check that it returns 200.
- Mint launch grant codes with `elizaos-cloud grants mint` against the environment's database.

## 5. Subscription management in the app

With the cutover flag on (section 8), Account → Plan opens the plan manager. Nothing is done on a
website. With it off (every distributed build today), Plan and Add funds open the current Cloud's
hosted billing page, as before.

| Action | Authority | Route |
|---|---|---|
| See plans, current plan, renewal or end date | the phone's key | `GET /api/v1/subscriptions/plans`, `GET /api/v1/billing/limits` |
| Subscribe | the phone's key | `POST /api/v1/subscriptions/checkout` (`presentation: "mobile"`). Stripe's page opens and returns to `/alphaphone/billing/return`; the app confirms with `POST …/checkout/confirm`. |
| Switch plan (upgrade or downgrade) | account session | `…/upgrade|downgrade/review`, then `…/confirm`. An upgrade that needs payment action opens Stripe's invoice page. |
| Cancel at period end, or keep the plan | account session | `…/cancel`, `…/cancel/undo` |
| Share your referral code, enter someone's | the phone's key | `GET /api/v1/referrals`, `POST /api/v1/referrals/apply` |
| Enter a membership code | the phone's key | `POST /api/v1/subscription/redeem` (unchanged) |

Upstream accepts plan changes and cancellation only with a fresh account session. The app asks
"Confirm it's you" and emails a one-time code to the account's own address. The native plugin keeps
the resulting session in memory for at most an hour. It is bound to the phone's own stored Cloud key,
and to the account Cloud names for that key (`/api/v1/user`), never to an account the web view names.
It ends at sign-out, a new or renewed key, or an account switch. It is never stored and never shown to the web view.

Alpha Cloud has no in-app credit top-up: with the flag on, the account sheet does not offer Add
funds (subscription allowances only). A top-up surface is a separate change.

## 6. OTA updates

Installed `ai.alphacompute.alphaphone` builds read the channel in `app.config.json` (`updateManifestUrl`,
currently `https://github.com/alphacompute/alpha/releases/download/app-stable-alphacompute/alpha-update-stable.json`).
`node scripts/update-channel-status.ts` checks that channel the way a phone does. As of 2026-11-15 it fails: nothing
has been published there. The only published channel is the legacy package's `app-stable`
(versionCode 75). Version 78 of `ai.alphacompute.alphaphone` was signed on 2026-11-15 (Release
`sign`, run 43700907933) with the current release certificate and delivered only to private QA.

To make OTA work:
1. Qualify the signed v78 (or a later) launcher on a device: its Cloud voice evidence is part of
   the qualification record.
2. Run **Release** with `operation: publish`, `workflow_commit` = the reviewed main commit, and the
   reviewed `alpha-qualified-app-update/v1` JSON. That publishes the APK first, checks the anonymous
   download, then moves the stable pointer on `app-stable-alphacompute`.
3. Run `node scripts/update-channel-status.ts --download` until every gate passes. Then check a real phone's
   Settings → Update. Channel evidence is not device acceptance.

The version must exceed 75, the retained legacy floor; v78 does. OS (A/B image) OTA is a separate,
disabled path; see the README.

## 7. Local Cloud and validation

```bash
ELIZA_DEV_ALLOW_TEST_MOCKS=1 pnpm cloud:local start      # separate terminal: elizaos-cloud serve, staging, PGlite, loopback mail
ELIZA_DEV_ALLOW_TEST_MOCKS=1 pnpm cloud:local check
pnpm --filter @alphacompute/alpha-cloud test             # profile, profile asset, registration, deployment, edge, wrangler, runtime config
```

`cloud:local check` reads the public contract the phone needs from the running local Cloud and
sends an email code to a throwaway address, read back from the loopback inbox. It is a local source
result only: not a deployed Cloud, an APK, an emulator or a device result.

Not yet proven: anything deployed; the profile asset and service binding on Cloudflare; Stripe
test-mode checkout end to end; Cerebras and Cartesia calls (they need the keys); Google sign-in
against a real client; the plan manager on a device.

## 8. Cutover flag (shipped app → Alpha Cloud)

Alpha Cloud is merged dormant. One flag decides whether a build uses it: `ALPHA_CLOUD_CUTOVER`, derived from the deployment rows
(`alphaCloud: true` on the Alpha Cloud rows of `cloud/src/deployment.vibe`; absent in the shipped
Eliza Cloud rows of `cloud/deployment.json`). `pnpm cloud:deployment` writes it into every build
output: `alphaCloudCutover` (renderer, `@alphacompute/alpha-cloud/client-deployment`),
`CloudDeployment.ALPHA_CLOUD_CUTOVER` (Java) and `alphaCloudCutover` (Gradle).

**Off (default; every distributed build).** The app uses the shipped Eliza Cloud and behaves as
before: Plan, Choose a plan, Add funds and the chat plan card open the hosted billing page; no
`alphaphone.dev` host, in-app plan route (`/api/v1/subscriptions/plans|checkout`, `/referrals`) or
Stripe page is admitted by either transport; the native billing authority plugin is not registered
(and refuses if called); the `/alphaphone/billing/return` App Link alias (`AlphaCloudBillingReturn`)
is declared disabled, so it resolves no intent; `scripts/verify-apks.ts` requires exactly that.

**On.** The deployment is `cloud/deployment.json` (Alpha Cloud hosts and its own credential namespace),
the plan manager, native billing authority, Stripe pages, referral routes and the billing App Link
are live.

Enable it for a development, test or validation build (never a distribution):

```bash
ALPHA_CLOUD_CUTOVER=1 pnpm cloud:deployment        # regenerate the build outputs for Alpha Cloud
ALPHA_CLOUD_CUTOVER=1 pnpm android:build -- --allow-unpackaged-runtime   # or dev:ui / build:only
git checkout -- cloud/generated/client-deployment.ts \
  android/app/src/main/java/ai/alphacompute/alphaphone/CloudDeployment.java android/app/cloud-deployment.generated.gradle
```

Keep `ALPHA_CLOUD_CUTOVER=1` set for every command of that build: the build checks
(`cloud-deployment.ts --check`, Vite) compare the outputs with the selected deployment. A flag-on
build is a candidate deployment: it has its own credential namespace (phones sign in again) and
`scripts/audit-production-bundle.ts` refuses it, so it cannot be distributed by accident.
`ALPHA_CLOUD_DEPLOYMENT_FILE` can name another Alpha Cloud rows file instead of `cloud/deployment.json`.

Validate: `test/cloud-candidate-deployment.test.mjs` (flag values and generated outputs),
`test/cloud-plans.test.mjs` and `test/connection-routes.test.mjs` (routes and hosts in both states),
`test/verify-apks.test.mjs` (the App Link alias), and `test/browser/native-cloud-subscription.spec.ts`
("Alpha Cloud cutover flag": off keeps the hosted page; on runs the in-app plans against the
generated Alpha Cloud authorities). Then a flag-on device build against staging: sign-in, plans,
checkout return, plan change with the emailed code, and voice.

The cutover release itself, once staging and production pass `smoke` and a flag-on build passes the
checks above:

1. Change `SHIPPED_CLOUD_DEPLOYMENT` to `cloud/deployment.json`'s rows (with `"alphaCloud": true`), which
   turns the flag on for every build. The App Link host becomes `alphaphone.dev`.
2. Append the new storage namespace to `STORAGE_NAMESPACES` and add the namespace migration. Users
   sign in again; Eliza Cloud accounts, subscriptions and Google grants do not move by themselves.
3. Build, sign and publish through OTA (section 6).

Changing the policy before the Cloud is live would sign every phone out to a Cloud that does not
answer, so this stays a separate, deliberate release that the owner approves.

## 9. Upstream

- The Cloud is the workspace `@elizaos/cloud` package at the pin: `elizaos-cloud` (`migrate`,
  `client apply --file`, `prices check`, `grants`, `serve`) and its Worker (`@elizaos/cloud/worker`).
  Alpha adds no route: its API Worker is upstream's with no deployment extension.
- Native clients are registered from a reviewed file (`elizaos-cloud client apply --file`); the plan
  catalogue (Plus $30, Pro $100) is fixed upstream.
- Upstream's Worker reads `CLOUD_PROFILE` as a variable; Alpha's API Worker supplies it from the
  digest-pinned profile asset, because Alpha's profile is larger than a Worker variable may be.
