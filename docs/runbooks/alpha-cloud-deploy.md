# Deploying Alpha Cloud at cloud.alphacompute.cc

This runbook is for the person deploying Alpha Cloud. It covers every account, value and command,
in order. Background and design are in [docs/alpha-cloud.md](../alpha-cloud.md). You do not need
to read it first.

**What you are deploying:** Alpha Phone's own backend. It provides sign-in (email code and
Google), AI inference (Cerebras), voice, subscriptions (Stripe), Maps and the Gmail/Calendar
connector, for the Android app `ai.alphacompute.alphaphone`. It runs entirely on Cloudflare
Workers plus two Postgres databases and an Upstash Redis store. Nothing here changes the app that
users have today. Phones keep using the current Cloud until a separate cutover release, which the
owner approves (last section).

**Deploy staging first, end to end, then production.** Every command takes
`--environment staging` or `--environment production`.

## 1. Hostnames

All hostnames are in the `alphacompute.cc` Cloudflare zone, one level deep, so Cloudflare's free
certificate covers them.

| Role | Production | Staging | Created by |
|---|---|---|---|
| Web / App Link host (`cloud/edge` Worker) | `cloud.alphacompute.cc` | `cloud-staging.alphacompute.cc` | Worker custom domain, on `deploy` |
| API (upstream Cloud API Worker) | `api.alphacompute.cc` | `api-staging.alphacompute.cc` | Worker route + proxied DNS, on `provision` |
| Blob storage (same API Worker, R2) | `blob.alphacompute.cc` | `blob-staging.alphacompute.cc` | Worker route + proxied DNS, on `provision` |
| Sign-in (Steward Worker + container) | `login.alphacompute.cc` | `login-staging.alphacompute.cc` | Worker custom domain, on `deploy` |
| Sign-in email sender | `noreply@alphacompute.cc` | same | Resend domain verification |

The phone talks to `api.` directly. `cloud.` is the address Android verifies for the app's links:
it serves `/.well-known/assetlinks.json` and the sign-in and checkout return pages. There is no
website at `cloud.` beyond those paths.

The hostnames are data, in `cloud/policy.json` (`api`, `web`, `services`) and
`cloud/resources.json` (`zone`, `blobHost`, `loginApiUrl`, `mailFrom`). Change them there, and
only before the first deploy: the app's sign-in callback and App Link host are derived from them.

Worker names (from `cloud/resources.json`):

| Environment | API | Sign-in | Web |
|---|---|---|---|
| Production | `alphacompute-cloud-api` | `alphacompute-cloud-api-login` | `alphacompute-cloud-api-edge` |
| Staging | `alphacompute-cloud-api-staging` | `alphacompute-cloud-api-staging-login` | `alphacompute-cloud-api-staging-edge` |

## 2. Before you start

### Accounts (one set per environment unless noted)

| Account | What you need from it |
|---|---|
| **Cloudflare** (shared by both environments) | The account that owns the `alphacompute.cc` zone, on **Workers Paid with Containers** (the sign-in service runs in a Cloudflare container). Note its account ID. Create an API token for that account with Workers Scripts, Workers Routes, Workers KV, R2, Hyperdrive and Containers **Edit**, plus Zone **Read** and DNS **Edit** on `alphacompute.cc`. Do **not** use the Eliza Labs Cloudflare account. |
| **Postgres**, two databases per environment | One for the Cloud (`DATABASE_URL`) and one for sign-in (`STEWARD_DATABASE_URL`). Use Neon, Supabase or Railway, reachable from the internet over TLS (Cloudflare Hyperdrive connects to the Cloud database). Use a **direct** connection string, not a transaction pooler (Supabase: port 5432, not 6543). The Cloud database role must be able to run `SELECT pg_catalog.pg_control_system()` (see step 4). |
| **Upstash Redis** | Create a Redis database, then copy its REST URL and token. |
| **Cerebras** | An API key (inference model `qwen-3.8-27b`). |
| **Resend** | Add and verify the domain `alphacompute.cc` (it gives you DNS records to add in Cloudflare), then create an API key. |
| **Google Cloud** (one AlphaCompute project) | An OAuth client of type *Web application*. Add these **Authorized redirect URIs** for each environment you deploy: `https://login.alphacompute.cc/auth/oauth/google/callback`, `https://api.alphacompute.cc/api/v1/oauth/google/callback`, and the same two with `login-staging.` and `api-staging.`. Configure the OAuth consent screen. Gmail and Calendar scopes need Google's verification before the public can use them; start that early (it can take weeks). Optional: a Maps Platform key restricted to Geocoding, Places and Routes. |
| **Stripe** | Test mode for staging, live mode for production. Create two products with **recurring monthly prices in USD**: "Plus" at **exactly $30.00** and "Pro" at **exactly $100.00**, licensed, no trial. The Cloud checks these amounts and refuses other prices. Create a webhook endpoint at `https://api.alphacompute.cc/api/stripe/webhook` (staging: `api-staging.`) for the events in step 3. |
| **Terms and Privacy text** | Alpha Compute's approved Terms of Service and Privacy Policy, shown on the in-app sign-in screen (format in step 3). |
| **GitHub** (optional, for the CI deploy in section 8) | Admin on `eliza-research/alpha` to create environments and secrets. |

### Deploy machine

- Linux or macOS with at least 16 GB RAM and 5 GB free disk.
- **Docker running.** `deploy` builds the sign-in container image locally.
- git, Node.js 26, and **Bun 1.4.2 exactly** (the tool refuses any other Bun):
  `curl -fsSL https://bun.sh/install | bash -s bun-v1.4.2`, or `mise install bun@1.4.2`.
- Set `NODE_OPTIONS=--max-old-space-size=8192` for every command. The upstream build needs it.

### Get the code

```bash
git clone --recurse-submodules --branch develop https://github.com/eliza-research/alpha.git alpha
cd alpha
bun install --frozen-lockfile
export NODE_OPTIONS=--max-old-space-size=8192
bun run cloud:worker -- prepare     # exports the pinned upstream to ~/.cache/alphaphone-cloud and builds it (10–20 min, once per pin)
```

`prepare` never modifies `vendor/eliza`. Every later command reads the tree it built. Rerun
`prepare` after pulling a change to `upstream.lock.json`.

## 3. Fill in the secrets file

```bash
mkdir -p ~/.config/alpha-cloud
cp cloud/alpha-cloud.env.example ~/.config/alpha-cloud/staging.env
chmod 600 ~/.config/alpha-cloud/staging.env
```

Fill in the values:

| Name | Value |
|---|---|
| `DATABASE_URL` | Cloud Postgres connection string (direct, TLS). |
| `STEWARD_DATABASE_URL` | Sign-in Postgres connection string. **Must be a different database** from `DATABASE_URL`. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash REST URL (https) and token. |
| `CEREBRAS_API_KEY` | Cerebras key. |
| `RESEND_API_KEY` | Resend key, after `alphacompute.cc` is verified. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Web OAuth client. |
| `STRIPE_SECRET_KEY` | `sk_test_…` for staging, `sk_live_…` for production (the tool refuses a mismatch). |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint. Its events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.pending_update_applied`, `customer.subscription.pending_update_expired`, `invoice.created`, `invoice.paid`, `invoice.payment_failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.funds_reinstated`. |
| `STRIPE_PLUS_PRODUCT_ID`, `STRIPE_PLUS_MONTHLY_PRICE_ID` | `prod_…` and `price_…` of Plus ($30/month). |
| `STRIPE_PRO_PRODUCT_ID`, `STRIPE_PRO_MONTHLY_PRICE_ID` | `prod_…` and `price_…` of Pro ($100/month). |
| `CLOUD_PUBLIC_SERVICE_TERMS_JSON`, `CLOUD_PUBLIC_SERVICE_PRIVACY_JSON` | Each is **one line** of JSON, at most 5120 bytes: `{"title":"Terms of Service","revision":"2026-11-22","sections":[{"title":"…","paragraphs":["…","…"]}]}`. Every section needs a title and at least one plain-text paragraph. |
| Optional | `CARTESIA_API_KEY` and `CARTESIA_STT_USD_PER_CREDIT` (better voice; without them voice uses Cloudflare Workers AI), `OPENROUTER_API_KEY` (other models), `GOOGLE_MAPS_API_KEY` (Maps), `STRIPE_PUBLISHABLE_KEY`, `STEWARD_GOOGLE_NATIVE_CLIENT_IDS` (native Google sign-in only; the app uses browser sign-in). |

Leave `DATABASE_IDENTITY_EXPECTED_*` empty for now. Then run:

```bash
bun run cloud:worker -- secrets --environment staging --env-file ~/.config/alpha-cloud/staging.env
```

It adds about 15 internal secrets (Steward keys, JWT secret, entitlement signing key,
`CRON_SECRET` and others) to the file, then lists every value as `set`, `unset (optional)` or
`MISSING`. The internal values are generated once and never rotated by rerunning. **The file is
now the only copy of keys that cannot be regenerated without signing every user out.** Back it up
somewhere encrypted (a password manager or secret store). Never commit it.

## 4. Verify the database identity

The Cloud refuses to migrate or write to a database unless it matches a recorded identity, so a
wrong connection string cannot hit the wrong database.

```bash
bun run cloud:worker -- database-identity --environment staging --env-file ~/.config/alpha-cloud/staging.env
```

It prints two redacted digests (cluster and authority). Confirm the connection string points at
the staging Cloud database you created (host, database name, role). Then copy the digests into
`DATABASE_IDENTITY_EXPECTED_CLUSTER_SHA256` and `DATABASE_IDENTITY_EXPECTED_AUTHORITY_SHA256`, and
rerun `secrets` until nothing is `MISSING`.

If it fails with a permission error on `pg_control_system()`, use the database owner or admin
role in `DATABASE_URL`, or ask the provider to allow that function for the role.

## 5. Create the Cloudflare resources

```bash
export CLOUDFLARE_ACCOUNT_ID=<account id>
export CLOUDFLARE_API_TOKEN=<token from section 2>
bun run cloud:worker -- provision --environment staging --env-file ~/.config/alpha-cloud/staging.env --write
```

This verifies the zone, then creates (or finds by name, if a previous run stopped partway):
- a KV namespace
- the Hyperdrive configuration for `DATABASE_URL`
- the R2 bucket
- proxied DNS records for `api-staging.` and `blob-staging.`

It confirms each one by reading it back. `--write` records the account and resource IDs in
`cloud/resources.json`. **Commit that file** (IDs only, no secrets) and open a PR, or send it to
the owner. If it reports a conflict (a resource with that name owned or configured differently),
stop and resolve it in the Cloudflare dashboard. Do not rename resources to get past it.

## 6. Check, migrate, register, deploy

Run these in order. Each one stops with a clear message if something is wrong.

```bash
E=staging; F=~/.config/alpha-cloud/staging.env

bun run cloud:worker -- check     --environment $E               # render and bundle every Worker (dry run, no network)
bun run cloud:worker -- preflight --environment $E --env-file $F # read-only: resources still match, Hyperdrive points at DATABASE_URL
bun run cloud:worker -- migrate   --environment $E --env-file $F # Cloud database schema; must print "migrations complete"
bun run cloud:worker -- seed      --environment $E --env-file $F # registers the app ai.alphacompute.alphaphone (callback, package, release signer)
bun run cloud:worker -- deploy    --environment $E --env-file $F # deploys API, sign-in and web Workers, each with its secrets
bun run cloud:worker -- tenant    --environment $E --env-file $F # creates the sign-in tenant (safe to rerun)
bun run cloud:worker -- pricing   --environment $E --env-file $F # fills the AI price table; inference refuses requests without it
bun run cloud:worker -- smoke     --environment $E               # public readiness checks
```

Notes:
- `migrate` on a new database applies everything in one run. If it says it **paused at a release
  barrier**, do not continue. Send the output to the owner.
- `deploy` builds the sign-in container with Docker. The first build takes several minutes. Use
  `--component api|login|edge` to redeploy one Worker.
- The login and web hostnames get their certificates on first deploy. `smoke` can fail for a few
  minutes until they are active; rerun it.

## 7. Verify

`smoke` must report every gate as `PASS`. It checks:
- the API environment and health
- the Terms and Privacy documents
- the entitlement keys
- the app's registration and callback binding
- the plan catalogue
- the sign-in providers
- the App Links file for the release certificate
- the hosted callback page

Then check by hand:

```bash
curl -s https://api-staging.alphacompute.cc/api/health
curl -s https://api-staging.alphacompute.cc/api/v1/subscriptions/plans    # Plus $30 and Pro $100
curl -s https://cloud-staging.alphacompute.cc/.well-known/assetlinks.json # contains ai.alphacompute.alphaphone
curl -s "https://login-staging.alphacompute.cc/auth/providers?tenantId=alphacompute-staging"  # email and google offered
```

- **Stripe:** Dashboard → Webhooks → your endpoint → *Send test webhook*. It must return 200.
- **Email:** Resend shows the domain as verified, and the sign-in code email arrives during the app
  test below.
- **App test, done by the Alpha team:** a test build with the cutover flag on, against staging
  (`ALPHA_CLOUD_CUTOVER=1`, docs/alpha-cloud.md section 8). It covers sign-in, a chat reply, voice,
  Account → Plan → Subscribe with a Stripe test card, and returning to the app.

Production: repeat sections 3 to 7 with `--environment production`, a separate
`production.env`, live Stripe keys and production databases.

## 8. Later deploys through GitHub Actions (optional)

The **Cloud deploy** workflow (`.github/workflows/cloud-deploy.yml`) runs the same steps from the
repository: check, secrets (it never generates them in CI), preflight, migrate, seed, deploy,
tenant, pricing and smoke.
- It runs only from `main`. The Cloud code is on `develop` until develop is next promoted to main;
  until then, deploy from your machine as above.
- In `eliza-research/alpha` → Settings → Environments, create `alpha-cloud-staging` and
  `alpha-cloud-production`. Give each two secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `ALPHA_CLOUD_ENV`: the **entire completed** env file from step 3, including the generated
    values
- Run it from Actions → Cloud deploy → *Run workflow*: choose the environment, `check` or
  `deploy`, and the component.

## 9. Updates, rollback and day-to-day

- **New upstream pin** (after an `upstream.lock.json` change): `prepare`, then `check`, `preflight`,
  `migrate`, `deploy`, `pricing`, `smoke`.
- **Roll back a Worker:** `npx wrangler rollback --name <worker name>` (names in section 1), or
  Cloudflare dashboard → Workers → the Worker → Deployments. Database migrations only go forward.
  Do not roll the API back across a migration without the owner.
- **Rotate a provider key:** change it in the env file, then
  `bun run cloud:worker -- secrets --environment E --env-file F --apply`. Do not edit or delete the
  generated internal values. Changing `STEWARD_JWT_SECRET` or the entitlement signing key signs
  everyone out.
- **Logs:** `npx wrangler tail <worker name>`, or the dashboard.

## 10. Don'ts

- Don't deploy to any Cloudflare account other than AlphaCompute's. Never use the Eliza Labs one.
- Don't commit or paste env files, tokens or database URLs anywhere: issues, chat or PRs.
- Don't put test Stripe keys in production or live keys in staging.
- Don't change `cloud/policy.json` hostnames after the first production deploy.
- Don't turn on the app cutover. Switching the shipped app to Alpha Cloud
  (`SHIPPED_CLOUD_DEPLOYMENT` and `STORAGE_NAMESPACES`, docs/alpha-cloud.md section 8) is a
  separate release the owner approves. It signs users in again. Your deploy makes the Cloud ready;
  it does not move any phone onto it.

## 11. Hand back

When staging (and later production) passes section 7, send the owner:
1. The `smoke` output.
2. The updated `cloud/resources.json`, as a PR.
3. Confirmation that the env files are backed up, and where (not their contents).
4. Anything that failed or needed a workaround.

## Troubleshooting

| Message | Meaning |
|---|---|
| `Bun 1.4.2 (the pin's packageManager) is required` | Install exactly Bun 1.4.2, or set `BUN=/path/to/bun-1.4.2`. |
| `No prepared upstream tree … run prepare` | Run `bun run cloud:worker -- prepare` (again after a pin change). |
| Out of memory, or `Ineffective mark-compacts` during `prepare` | `export NODE_OPTIONS=--max-old-space-size=8192`. |
| `The secrets file must live outside the checkout` / `must be private (chmod 600)` | Move the env file out of the repository; `chmod 600` it. |
| `… is missing` from `secrets` or `deploy` | Fill that name in the env file and rerun `secrets`. |
| `STRIPE_SECRET_KEY must be a live key in production` (or test in staging) | Wrong Stripe mode for this environment. |
| `STEWARD_DATABASE_URL must be a separate database` | Use two databases. |
| `Zone alphacompute.cc is not in this Cloudflare account` | Wrong account ID or token. |
| `migrate` fails on the identity check | The connection string or role changed since step 4; recheck and rerun `database-identity`. |
| `… paused at a release barrier` | Stop and send the output to the owner. |
| `smoke`: `asset links` or `hosted callback` fail right after the first deploy | The custom-domain certificate is still being issued; wait a few minutes and rerun. |
| `smoke`: `app registration` fails | `seed` did not run against this environment's database; rerun `seed`. |
| Inference requests fail with a pricing error | Run `pricing`. |
