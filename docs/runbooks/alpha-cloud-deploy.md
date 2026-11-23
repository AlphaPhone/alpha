# Deploying Alpha Cloud at alphaphone.dev

This runbook is for the person deploying Alpha Cloud. It covers every account, value and command,
in order. Background and design are in [docs/alpha-cloud.md](../alpha-cloud.md). You do not need
to read it first.

**What you are deploying:** Alpha Phone's own backend. It provides sign-in (email code and
Google), AI inference (Cerebras), voice (Cartesia), subscriptions (Stripe), Maps and the
Gmail/Calendar connector, for the Android app `ai.alphacompute.alphaphone`. It is the upstream
`@elizaos/cloud` package run with Alpha's profile, as two Cloudflare Workers over one Postgres
database per environment. Nothing here changes the app that users have today. Phones keep using
the current Cloud until a separate cutover release, which the owner approves (section 10).

**Deploy staging first, end to end, then production.** Every command takes
`--environment staging` or `--environment production`.

## 1. Hostnames

The web, API and blob hostnames are on the apex or one level below it in the
`alphaphone.dev` Cloudflare zone. Cloudflare's Universal SSL covers them.

| Role | Production | Staging | Created by |
|---|---|---|---|
| Web / App Link host (`cloud/src/edge.vibe` Worker) | `alphaphone.dev` | `staging.alphaphone.dev` | Worker custom domain, on `deploy` |
| API (`cloud/src/worker.vibe`, upstream's Cloud Worker) | `api.alphaphone.dev` | `api-staging.alphaphone.dev` | Worker custom domain, on `deploy`; DNS checked by `provision` |
| Blob storage (R2, same account) | `blob.alphaphone.dev` | `blob-staging.alphaphone.dev` | Proxied DNS, on `provision` |
| Sign-in email sender | `noreply@alphacompute.cc` | same | Resend domain verification |

The phone talks to the API host directly. Android verifies the web host for the app's links:
it serves `/.well-known/assetlinks.json` and the sign-in and checkout return pages, which the web
Worker asks the API Worker for through a Cloudflare service binding. The web Worker also serves `/health`.

The hostnames are data: `api` and `web` in `cloud/deployment.json` (`alphaCloudHosts`), the
sender in `cloud/src/profile.vibe`, and `zone`, `blobHost`, `loginApiUrl` and `mailFrom` in
`cloud/resources.json`. Change them there, and only before the first deploy: the app's sign-in
callback and App Link host are derived from them.

Worker names (from `cloud/resources.json`):

| Environment | API | Web |
|---|---|---|
| Production | `alphacompute-cloud-api` | `alphacompute-cloud-api-edge` |
| Staging | `alphacompute-cloud-api-staging` | `alphacompute-cloud-api-staging-edge` |

## 2. Before you start

### Accounts (one set per environment unless noted)

| Account | What you need from it |
|---|---|
| **Cloudflare** (shared by both environments) | The account that owns the `alphaphone.dev` zone, on **Workers Paid**. Note its account ID. Create an API token for that account with Workers Scripts, Workers Routes, Workers KV, R2 and Hyperdrive **Edit**, plus Zone **Read** and DNS **Edit** on `alphaphone.dev`. Do **not** use the Eliza Labs Cloudflare account. |
| **Postgres**, one database per environment | `DATABASE_URL`. Use Neon, Supabase or Railway, reachable from the internet over TLS (Cloudflare Hyperdrive connects to it). Use a **direct** connection string, not a transaction pooler (Supabase: port 5432, not 6543). The database must be empty before its first `migrate`. |
| **Cerebras** | An API key (inference model `qwen-3.8-27b`). |
| **Cartesia** | An API key (speech to text and text to speech). |
| **Resend** | Add and verify the domain `alphacompute.cc` (it gives you DNS records to add in Cloudflare), then create an API key. |
| **Google Cloud** (one AlphaCompute project) | An OAuth client of type *Web application* for sign-in, and one for the Gmail/Calendar connector (it may be the same client). **Authorized redirect URIs** for each environment you deploy: `https://api.alphaphone.dev/api/v1/auth/google/callback` (sign-in) and `https://api.alphaphone.dev/api/v1/oauth/google/callback` (connector), and the same two on `api-staging.`. Configure the OAuth consent screen. Gmail and Calendar scopes need Google's verification before the public can use them; start that early (it can take weeks). A Maps Platform key restricted to Geocoding, Places and Routes. |
| **Stripe** | Test mode for staging, live mode for production. Create two products with **recurring monthly prices in USD**: "Plus" at **exactly $30.00** and "Pro" at **exactly $100.00**, licensed, no trial. The Cloud checks these amounts and refuses other prices. Create a webhook endpoint at `https://api.alphaphone.dev/api/stripe/webhook` (staging: `api-staging.`) for the events in section 3. |
| **Terms and Privacy text** | Alpha Compute's approved Terms of Service and Privacy Policy, shown on the in-app sign-in screen (format in section 4). |
| **GitHub** (optional, for the CI deploy in section 8) | Admin on `eliza-research/alpha` to create environments and secrets. |

### Deploy machine

- Linux or macOS with at least 16 GB RAM and 5 GB free disk.
- git, Node.js 26 and pnpm 10.24.0 (`npm install --global pnpm@10.24.0`).

### Get the code

```bash
git clone --recurse-submodules --branch develop https://github.com/eliza-research/alpha.git alpha
cd alpha
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=@alphacompute/alpha-cloud   # the cloud package, its Workers and upstream's return pages
```

Rebuild after pulling a change to `upstream.lock.json` or `cloud/`. `render`, `check` and
`deploy` read the built Workers (`cloud/dist/src`) and pages (`cloud/dist/pages`) and refuse
without them.

## 3. Fill in the secrets file

```bash
mkdir -p ~/.config/alpha-cloud
cp cloud/alpha-cloud.env.example ~/.config/alpha-cloud/staging.env
chmod 600 ~/.config/alpha-cloud/staging.env
```

Fill in the values:

| Name | Value |
|---|---|
| `DATABASE_URL` | The environment's Postgres connection string (direct, TLS). |
| `CEREBRAS_API_KEY` | Cerebras key. |
| `CARTESIA_API_KEY` | Cartesia key. |
| `RESEND_API_KEY` | Resend key, after `alphacompute.cc` is verified. |
| `GOOGLE_CLIENT_SECRET` | The sign-in Web OAuth client's secret. |
| `GOOGLE_CONNECT_CLIENT_SECRET` | The connector OAuth client's secret (the same value when it is the same client). |
| `GOOGLE_MAPS_API_KEY` | The Maps Platform key. |
| `STRIPE_SECRET_KEY` | `sk_test_…` for staging, `sk_live_…` for production (the tool refuses a mismatch). |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint. Its events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.pending_update_applied`, `customer.subscription.pending_update_expired`, `invoice.created`, `invoice.paid`, `invoice.payment_failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.funds_reinstated`. |
| Optional | `STRIPE_PUBLISHABLE_KEY` (the app's hosted checkout does not need it). |

Then run:

```bash
pnpm cloud:worker secrets --environment staging --env-file ~/.config/alpha-cloud/staging.env
```

It adds the internal secrets (`CLOUD_DIGEST_KEY`, `CLOUD_SEALING_KEY`, the entitlement signing key
`CLOUD_ENTITLEMENT_KEY`, `EMAIL_CODE_SECRET`, `GOOGLE_CONNECT_TOKEN_KEY`) to the file once, prints
the entitlement **public** key for section 4, and lists anything still missing. Rerunning never
rotates them. **The file is now the only copy of keys that cannot be regenerated without signing
every user out.** Back it up somewhere encrypted (a password manager or secret store). Never
commit it.

## 4. Write the operator inputs

The operator inputs are the reviewed public values of both environments, in one JSON file outside
the checkout (for example `~/.config/alpha-cloud/inputs.json`). `cloud/src/profile.vibe`
(`OperatorInputs`) is its exact shape, and every command refuses a file that differs from it.
`cloud/test/fixtures/operator.json` is a filled-in example with fictitious values. For each of
`production` and `staging`:

| Field | Value |
|---|---|
| `databaseIdentity` | A new random identity for this environment's database: `openssl rand -hex 32`. The first `migrate` writes it into the empty database, and every later command refuses a database that carries another one, so a wrong connection string cannot reach the wrong database. Never reuse a value across environments. |
| `documents.terms`, `documents.privacy` | `{"title": "…", "revision": "2026-11-22", "sections": [{"title": "…", "paragraphs": ["…"]}]}`. Every section needs a title and at least one plain-text paragraph. |
| `entitlement` | `keyId` (for example `alpha-staging-1`) and `publicKeys`: the key `secrets` printed, with that `kid`. |
| `google` | `clientId` (sign-in client), `serverClientId` (connector client), `nativeSignIn: false` (the app uses browser sign-in). |
| `billing` | `publishableKey` and the `priceId`/`productId` of `plus_monthly` and `pro_monthly`. |
| `speech` | Cartesia's default voice and model, the allowed voice and model ids, prices (`microsPerCharacter`, `microsPerSecond`) and language codes. |
| `maps` | `coverage` and `datasetRevision`. |
| `worker` | The plan the Worker sells (`plus_monthly`), the embedding model names, the model prices in micros per 1,000 tokens, `maxCompletionTokens` and `speechDailySessionLimit`. |

Check it:

```bash
I=~/.config/alpha-cloud/inputs.json
pnpm cloud:worker profile --inputs $I --out /tmp/alpha-cloud-profile.json   # refuses inputs upstream's profile rules reject
```

## 5. Create the Cloudflare resources

```bash
export CLOUDFLARE_ACCOUNT_ID=<account id>
export CLOUDFLARE_API_TOKEN=<token from section 2>
pnpm cloud:worker provision --environment staging --env-file ~/.config/alpha-cloud/staging.env --write
```

This verifies the zone, then creates (or finds by name, if a previous run stopped partway) the KV
namespace, the Hyperdrive configuration for `DATABASE_URL`, the R2 bucket, and proxied DNS records
for `api-staging.` and `blob-staging.`. It confirms each one by reading it back. `--write` records
the account and resource IDs in `cloud/resources.json`. **Commit that file** (IDs only, no
secrets) and open a PR, or send it to the owner. If it reports a conflict (a resource with that
name owned or configured differently), stop and resolve it in the Cloudflare dashboard. Do not
rename resources to get past it.

## 6. Check, migrate, register, deploy

Run these in order. Each one stops with a clear message if something is wrong.

```bash
E=staging; F=~/.config/alpha-cloud/staging.env; I=~/.config/alpha-cloud/inputs.json

pnpm cloud:worker check     --environment $E --inputs $I               # render and bundle both Workers (wrangler deploy --dry-run, no network)
pnpm cloud:worker preflight --environment $E --env-file $F             # read-only: resources still match, Hyperdrive points at DATABASE_URL
pnpm cloud:worker migrate   --environment $E --inputs $I --env-file $F # elizaos-cloud migrate: schema and, on an empty database, its identity
pnpm cloud:worker seed      --environment $E --inputs $I --env-file $F # elizaos-cloud client apply --file: registers ai.alphacompute.alphaphone
pnpm cloud:worker prices    --environment $E --inputs $I --env-file $F # elizaos-cloud prices check: the Plus and Pro catalogue in Stripe
pnpm cloud:worker deploy    --environment $E --inputs $I --env-file $F # API Worker with its secrets and profile asset, then the web Worker
pnpm cloud:worker smoke     --environment $E                           # public readiness checks
```

Notes:
- `seed` writes the reviewed registration file (`alpha-cloud registration`: callback, billing and
  connector returns on the web host, the Android package and its release signers) and applies it with
  upstream's `elizaos-cloud client apply --file`. Rerunning it applies the same file again.
- `deploy` renders the Workers into a private directory: the API Worker's static assets are
  upstream's return pages plus the environment's profile (`alpha-cloud/profile.json`), and its
  `CLOUD_PROFILE_SHA256` variable pins that profile, which is too large for a Worker variable. The
  API Worker answers `503` until the asset it was deployed with is readable. The web Worker
  reaches the API Worker only through its `API` service binding, so the API Worker is deployed
  first. Use `--component api|edge` to redeploy one Worker.
- The API and web hostnames get their certificates on first deploy. `smoke` can fail for a
  few minutes until they are active; rerun it.

## 7. Verify

`smoke` must report every gate as `PASS`. It checks:
- the API health
- the Terms and Privacy documents
- the entitlement keys
- the app's registration and callback binding (S256)
- the plan catalogue
- the sign-in methods
- the App Links file for the release certificate
- the hosted callback page

Then check by hand:

```bash
curl -s https://api-staging.alphaphone.dev/api/health
curl -s https://api-staging.alphaphone.dev/api/v1/subscriptions/plans    # Plus $30 and Pro $100
curl -s https://staging.alphaphone.dev/.well-known/assetlinks.json # contains ai.alphacompute.alphaphone
curl -s https://api-staging.alphaphone.dev/api/v1/auth/methods           # email and google offered
```

- **Stripe:** Dashboard → Webhooks → your endpoint → *Send test webhook*. It must return 200.
- **Email:** Resend shows the domain as verified, and the sign-in code email arrives during the app
  test below.
- **App test, done by the Alpha team:** a test build with the cutover flag on, against staging
  (`ALPHA_CLOUD_CUTOVER=1`, docs/alpha-cloud.md section 8). It covers sign-in, a chat reply, voice,
  Account → Plan → Subscribe with a Stripe test card, and returning to the app.

Production: repeat sections 3 to 7 with `--environment production`, a separate
`production.env`, live Stripe keys and the production database.

## 8. Later deploys through GitHub Actions (optional)

The **Cloud deploy** workflow (`.github/workflows/cloud-deploy.yml`) runs the same steps from the
repository: build, check, secrets (it never generates them in CI), preflight, migrate, seed,
prices, deploy and smoke.
- It runs only from `main`.
- In `eliza-research/alpha` → Settings → Environments, create `alpha-cloud-staging` and
  `alpha-cloud-production`. Give each three secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `ALPHA_CLOUD_ENV`: the **entire completed** env file from section 3, including the generated
    values
  - `ALPHA_CLOUD_INPUTS`: the operator inputs JSON from section 4
- Run it from Actions → Cloud deploy → *Run workflow*: choose the environment, `check` or
  `deploy`, and the component.

## 9. Updates, rollback and day-to-day

- **New upstream pin** (after an `upstream.lock.json` change): rebuild, then `check`, `preflight`,
  `migrate`, `deploy`, `prices`, `smoke`.
- **Changed operator inputs** (documents, keys, prices): `deploy` again; the API Worker reads the
  new profile asset with its new digest.
- **Roll back a Worker:** `pnpm --filter @alphacompute/alpha-cloud exec wrangler rollback --name <worker name>`
  (names in section 1), or Cloudflare dashboard → Workers → the Worker → Deployments. Database
  migrations only go forward. Do not roll the API back across a migration without the owner.
- **Rotate a provider key:** change it in the env file, then
  `pnpm cloud:worker secrets --environment E --env-file F --apply`. Do not edit or delete the
  generated internal values. Changing the entitlement signing key signs everyone out.
- **Logs:** `pnpm --filter @alphacompute/alpha-cloud exec wrangler tail <worker name>`, or the dashboard.

## 10. Don'ts

- Don't deploy to any Cloudflare account other than AlphaCompute's. Never use the Eliza Labs one.
- Don't commit or paste env files, operator inputs with unreleased documents, tokens or database
  URLs anywhere: issues, chat or PRs.
- Don't put test Stripe keys in production or live keys in staging.
- Don't change the hostnames in `cloud/deployment.json` or `cloud/resources.json` after the first
  production deploy.
- Don't turn on the app cutover. Switching the shipped app to Alpha Cloud
  (`SHIPPED_CLOUD_DEPLOYMENT` and `STORAGE_NAMESPACES`, docs/alpha-cloud.md section 8) is a
  separate release the owner approves. It signs users in again. Your deploy makes the Cloud ready;
  it does not move any phone onto it.

## 11. Hand back

When staging (and later production) passes section 7, send the owner:
1. The `smoke` output.
2. The updated `cloud/resources.json`, as a PR.
3. Confirmation that the env files and operator inputs are backed up, and where (not their contents).
4. Anything that failed or needed a workaround.

## Troubleshooting

| Message | Meaning |
|---|---|
| `wrangler is not installed: run pnpm install` | Run `pnpm install --frozen-lockfile` at the repository root. |
| `… cloud/dist/pages (build the cloud package first)` | Run `pnpm exec turbo run build --filter=@alphacompute/alpha-cloud`. |
| `The secrets file must live outside the checkout` / `must be private (chmod 600)` | Move the env file out of the repository; `chmod 600` it. |
| `… is missing` from `secrets` or `deploy` | Fill that name in the env file and rerun `secrets`. |
| `STRIPE_SECRET_KEY must be a live key in production` (or test in staging) | Wrong Stripe mode for this environment. |
| `OperatorInputsInvalid` | The inputs file is not the `OperatorInputs` shape; compare it with `cloud/test/fixtures/operator.json`. |
| `… is not provisioned; run provision first` | `cloud/resources.json` still has placeholder IDs for this environment. |
| `Zone alphaphone.dev is not in this Cloudflare account` | Wrong account ID or token. |
| `migrate` or `seed` refuses the database identity | The connection string names another database than the one `databaseIdentity` was written into; recheck `DATABASE_URL`. |
| `smoke`: every gate answers `503` | The API Worker cannot read its profile asset; redeploy the API with `deploy --component api`. |
| `smoke`: `asset links` or `callback page` fail right after the first deploy | The custom-domain certificate is still being issued; wait a few minutes and rerun. |
| `smoke`: `app registration` fails | `seed` did not run against this environment's database; rerun `seed`. |
