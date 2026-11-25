# Alpha

A complete mobile agentic operating system, built by
[Alpha Compute](https://alphacompute.ai).

Alpha is a personal AI agent that lives on the phone itself. Tap **Ask
Alpha**, type or talk, and the agent works across mail, calendar, maps,
notes, photos and files, and asks before it does anything that matters. The
agent, its memory and its database run on the device; a cloud account
supplies model inference, speech and Gmail.

## This branch

`vibestack` rebuilds Alpha on the [Vibestack](vibestack/README.md)
toolchain: requirements as stories and rules with their Quint in
[`spec/`](spec/index.md), a generated and proved core, the shell in VibeLang
on Effect, and the interface in React on one design system.

| Path | Holds |
|---|---|
| `spec/` | The one spec tree: the product, and a directory per app or package |
| `apps/app` | The phone's interface: Home, the built-in apps and Ask Alpha |
| `apps/site` | Alpha's public page at alphaphone.dev, with the phone demo of [`spec/site/`](spec/site/index.md) |
| `packages/design-system` | Alpha's design tokens, built into Tailwind's theme |
| `packages/ui` | Alpha's shared React components, with generated stories |
| `vibestack/` | The toolchain, with [its guide](vibestack/README.md) |
| `legacy/` | The implementation being replaced, kept as the guide to what each area does and removed area by area as it is rebuilt |

The on-device agent, the Android device package and the hosted services
are the open-source [elizaOS](https://github.com/elizaOS/eliza) packages on
its `develop` branch, eliza's Vibestack line, at a pinned commit.

## Setup and checks

Needs Node 26, pnpm 10.24.0, Dafny 4.11 and `openssl` on the `PATH`.

```sh
pnpm install
pnpm eliza    # once per pinned commit: clone, install and build eliza (a few minutes)
pnpm dev      # Studio, and the app over eliza's agent and cloud, started for this run
pnpm check    # models, proofs, types, tests, traces and each page explored
pnpm verify   # everything CI runs
```

`pnpm eliza` builds the commit `eliza.lock.json` pins outside the repository, in
`~/.cache/alpha/eliza-vibestack/<commit>` (or the directory `ALPHA_ELIZA_DIR`
names), and links it as `.eliza`; every worktree shares that build, and
typecheck, test, build and dev say so where it is missing. `pnpm dev` starts
eliza's cloud command and its agent as processes of that run, with a scripted
model in place of a paid one, and stops them with it; `ALPHA_PHONE=1 pnpm dev`
reaches them through the fake phone's plugins, as an Alpha image does. `ALPHA_FAKES=1 pnpm dev`
serves the app over the journeys' fakes instead, and `ALPHA_FAKES=phone` over
the fake phone's plugins.

Agents start with [AGENTS.md](AGENTS.md); the spec format is in
[SPEC.md](SPEC.md) and the repository's map in
[CONTRIBUTING.md](CONTRIBUTING.md).


## Operating Alpha

APK builds, emulator HOME-role tests, an AOSP image boot, real integrations
and device or owner acceptance are separate results; record each on its own,
and never one as proof of another. Where this tree does not yet hold a tool,
the procedure points at Alpha `develop` at
[`bd70db55b2b`](https://github.com/eliza-research/alpha/tree/bd70db55b2b3cab4c6f0ec2f4faa28edfa83979a),
the commit `legacy/` holds, so the pointer outlives `legacy/`.

### The public site

`pnpm all @repo/site#build` generates the site's spec and the design system's
theme first and writes the page to `dist/` in `apps/site`, the page already
drawn in its HTML and every image named by its content's hash, plus
`alpha-home.webp` (the social card) and `alpha-mark.svg` at the root, the
URLs the earlier page published; `pnpm --filter @repo/site dev` serves it.
The conversation is staged in the page and asks no service anything. The page
reads without its script; the script (React and the demo's Effect runtime,
about 110 KB compressed) only runs the demo. The captures in `apps/site/src`
are cut from `alpha-screens.png` (Home, Calendar) and
`alpha-screens-more.png` (the chat's backdrop) in
[Alpha `develop`'s docs assets](https://github.com/eliza-research/alpha/tree/bd70db55b2b3cab4c6f0ec2f4faa28edfa83979a/docs/assets)
at 370 by 813 and saved as WebP; a new capture replaces them the same way.

The Alpha site workflow, `.github/workflows/site-deploy.yml`, runs on `main`
when the site, its spec, the design system, `@repo/ui`, the toolchain or the
lockfile change, and on demand. It builds the same way and uploads `dist/`
with wrangler to the Cloudflare Pages project `alphaphone` under its
production branch `vibestack` (a Pages label, not a GitHub branch), and
refuses if the project's production branch is anything else; change both
together. The GitHub environment `alpha-site-production` admits `main` and
holds the `CLOUDFLARE_ACCOUNT_ID` variable and the
`CLOUDFLARE_PAGES_API_TOKEN` secret (Cloudflare Pages Edit on that account).

### Alpha Cloud

Alpha Cloud is `apps/cloud` on AlphaCompute's Cloudflare account, in the
`alphacompute.cc` zone; never the Eliza Labs account. Deploy staging end to
end before production. The production deploy is the owner's step, and no
deploy moves a phone: until the cutover release below, phones use Eliza
Cloud.

| | Production | Staging |
|---|---|---|
| API Worker | `api.alphacompute.cc` | `api-staging.alphacompute.cc` |
| Web Worker (App Links, return pages) | `cloud.alphacompute.cc` | `cloud-staging.alphacompute.cc` |
| Worker names | `alphacompute-cloud-api`, `…-edge` | `alphacompute-cloud-api-staging`, `…-edge` |

The hosts are the `cutoverCandidate` rows of
`packages/deployment/deployments.json`, the names `workerName` in
`apps/cloud/resources.json`. Never change either after the first production
deploy: the app's sign-in callback and App Link host come from them.

- **Deploy machine:** Linux or macOS with 16 GB of memory and 5 GB free
  disk, git, Node 26 and pnpm 10.24.0. In a checkout, `pnpm install`, then
  `pnpm eliza` (the pinned eliza, as the workflow does); `pnpm cloud` builds
  `@repo/cloud` before each command. Rebuild after an `eliza.lock.json` or
  `apps/cloud` change.
- **Accounts, per environment:** Cloudflare (Workers Paid, a token with
  Workers Scripts and Workers Routes Edit, Hyperdrive Edit, and Zone Read and
  DNS Edit on `alphacompute.cc`), an empty Postgres database on a direct TLS
  connection (not a transaction pooler), Cerebras, Cartesia, Resend with
  `alphacompute.cc` verified, Google OAuth web clients for sign-in and the
  Gmail and Calendar connector with the redirect URIs
  `https://<api host>/api/v1/auth/google/callback` and
  `https://<api host>/api/v1/oauth/google/callback` (start Google's Gmail and
  Calendar scope verification early: it takes weeks) and, where
  `google.nativeSignIn` is on, an Android client for
  `ai.alphacompute.alphaphone` with the release certificate's SHA-1 (the App
  Links file names the signer in `apps/app/aosp/signing/release-signer.json`), a Google Maps
  Platform server key (below), and Stripe (test mode for staging, live for
  production; the tool refuses a mismatch) with Plus at exactly $30 and Pro
  at exactly $100 a month and a webhook to
  `https://<api host>/api/stripe/webhook` for `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `customer.subscription.pending_update_applied`,
  `customer.subscription.pending_update_expired`, `invoice.created`,
  `invoice.paid`, `invoice.payment_failed`, `payment_intent.succeeded`,
  `payment_intent.payment_failed`, `charge.refunded` and
  `charge.dispute.funds_reinstated`.
- **Secrets file:** copy `apps/cloud/alpha-cloud.env.example` outside the
  checkout, `chmod 600` it, fill it in, and run
  `pnpm cloud secrets --environment staging --env-file <file>` once: it adds
  the internal keys and prints the entitlement public key. Back the file up
  encrypted; it is the only copy of keys whose loss signs everyone out.
  Rotate a provider key with `--apply`, never by editing the generated values.
- **Operator inputs:** one JSON file outside the checkout in the shape of
  Alpha's cloud profile (`apps/cloud/src/alpha.vibe`), with fictitious values
  filled in at `apps/cloud/profile/candidate.example.json`;
  `pnpm cloud profile --inputs <file> --out <file>` checks it. Per
  environment:
  - `databaseIdentity`: a new `openssl rand -hex 32`, never reused; the first
    `migrate` writes it into the empty database and every later command
    refuses another.
  - `documents`: Terms and Privacy, each
    `{ title, revision, sections: [{ title, paragraphs }] }`.
  - `entitlement`: a `keyId` and `publicKeys`, the key `secrets` printed with
    that `kid`.
  - `google`: `clientId` (sign-in), `serverClientId` (connector) and
    `nativeSignIn`.
  - `billing`: Stripe's `publishableKey` and the `priceId` and `productId` of
    `plus_monthly` and `pro_monthly`.
  - `speech`: Cartesia's default voice and model, the allowed voice and model
    ids, `microsPerCharacter`, `microsPerSecond` and `languageCodes`.
  - `maps`: `coverage` and `datasetRevision`, with the key as
    `GOOGLE_MAPS_API_KEY` in the secrets file.
  - `worker`: the `plan` it sells, the embedding model and its upstream model,
    the chat and embedding prices in micros per 1,000 tokens,
    `maxCompletionTokens` and `speechDailySessionLimit`.
- **Resources:** with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
  exported (provision and deploy read them),
  `pnpm cloud provision --environment <e> --env-file <file> --write` checks
  the zone and creates or finds the Hyperdrive configuration (query caching
  off), then commit the ids it records in `apps/cloud/resources.json`. It
  refuses an API or web host that already has an A, AAAA or CNAME record or
  is another Worker's custom domain: each host must be free, and Cloudflare
  creates its DNS record and certificate as the Worker's custom domain on the
  first deploy. A conflict is resolved in Cloudflare, never by renaming.
- **Each deploy, in order:** `pnpm cloud check`, `preflight`, `migrate`,
  `register`, `prices`, `deploy` (`--component api|edge` for one Worker; the
  API first) and `smoke`, whose every gate must pass. Then by hand: `/api/health`,
  `/api/v1/subscriptions/plans` (Plus and Pro) and `/api/v1/auth/methods` on
  the API host and `/.well-known/assetlinks.json` (naming
  `ai.alphacompute.alphaphone`) on the web host answer; Stripe's test webhook
  returns 200; Resend shows the domain verified and the sign-in code email
  arrives during the app test; and the Alpha team signs in, chats, talks and
  subscribes with a test card on a staging build.
- **From GitHub:** the Cloud deploy workflow, `.github/workflows/cloud-deploy.yml`,
  runs the same steps from `main`, dispatched with the environment, `check`
  or `deploy`, and the component; its header names the GitHub environments
  and their secrets.
- **Later:** a new eliza pin is a rebuild, then `check`, `preflight`,
  `migrate`, `deploy`, `prices` and `smoke`; changed operator inputs are
  another `deploy`.
- **Trouble:**

  | What it says | What to do |
  |---|---|
  | `OperatorInputsInvalid` | the inputs are not the `OperatorInputs` shape: compare them with the fixture |
  | `… is missing` from `secrets` or `deploy` | fill that name in the secrets file and run `secrets` again |
  | `must lie outside the checkout and be readable by its owner alone` | move the secrets file out of the repository and `chmod 600` it |
  | `STRIPE_SECRET_KEY must be a live key in production` (or a test key in staging) | the Stripe mode does not fit the environment |
  | `… Hyperdrive is missing: run provision first`, or a render refused for an unprovisioned id | `apps/cloud/resources.json` has no resources for this environment yet: `provision --write` |
  | `zone alphacompute.cc is not owned by the selected Cloudflare account alone` | the account id or token is of another account |
  | `migrate` or `register` refuses the database identity | `DATABASE_URL` names another database than the one `databaseIdentity` was written into |
  | `wrangler … could not start` | run `pnpm install` at the root |
  | `… is missing: build @repo/cloud first` | run the command through `pnpm cloud`, which builds it |
  | every `smoke` gate answers 503 | the API Worker cannot read its profile: `deploy --component api` |
  | `smoke` fails on a fresh host | its certificate is still being issued: wait a few minutes and rerun |
  | `smoke` fails the app registration | `register` did not run against that database |

- **Rollback:** `wrangler rollback --name <worker>` in `apps/cloud`, or the
  Worker's Deployments in the dashboard. Migrations only go forward; never roll
  the API back across one without the owner. `wrangler tail <worker>` reads
  the logs.
- **Never** paste an env file, operator inputs, a token or a database URL into
  an issue, chat or pull request. Hand the owner the `smoke` output, the
  `apps/cloud/resources.json` change, where (not what) the backups are, and
  anything that needed a workaround.
- **Cutover:** once both environments pass and a candidate build passes
  against staging, one reviewed release moves both rows of
  `packages/deployment/deployments.json` to their `cutoverCandidate` (moving one
  alone is refused), with the phone's stored sign-in moved to a new namespace
  so no Eliza Cloud credential reaches Alpha Cloud. Every phone signs in
  again; Eliza Cloud accounts, subscriptions and Google grants do not move.

### Maps through the Cloud

Maps is Google Maps Platform through the Cloud the phone signs in to: Eliza
Cloud until the cutover, Alpha Cloud after it. Both are eliza's cloud, so the
routes and checks below are the same; the Eliza Cloud Worker settings that
select Google and its allowance are kept by that deployment's operator, as in
[develop's Maps runbook](https://github.com/eliza-research/alpha/blob/bd70db55b2b3cab4c6f0ec2f4faa28edfa83979a/docs/runbooks/667-maps-provider-coverage.md).

- **Key:** one Google Cloud project with billing, Places API (New),
  Geocoding, Routes and Map Tiles enabled, and a separate server key for
  staging and production, restricted to those four APIs, with quotas and
  billing alerts. A Worker has no fixed egress address, so the key cannot be
  IP-restricted, and Android or referrer restrictions do not cover server
  calls. The key lives only in the Cloud's secrets.
- **Allowance:** a signed-in account with an active or trialing Plus or Pro
  plan. Eliza Cloud admits 1,000 Maps requests a day on Plus and 5,000 on Pro
  (reset at 00:00 UTC), with burst and sustained buckets of 10 and 60
  (default), 20 and 120 (Plus) and 50 and 300 (Pro). Alpha Cloud instead
  charges each request's provider cost to the plan's monthly allowance and
  admits 60 requests a minute on Plus and 120 on Pro (eliza's billing
  plans). Every admitted search, details, geocode, reverse geocode, route or
  tile counts (a first screen asks 12 to 20 tiles); capabilities and the viewport copyright do not; a provider
  error, a cancellation or a lost answer after admission still counts.
- **Live checks** with a signed-in plan account against staging, recording
  only status, error code, provider and deployed version (never credentials,
  account ids, search text or coordinates). This tree has no command that
  runs the app against a deployed Cloud; use an HTTP client holding a staging
  session, and remember a browser result is not a Pixel result. Send a fresh
  `Idempotency-Key` with every request but capabilities and viewport, tiles
  included, and never resend one after a timeout or a lost answer:

  | Request | Expected |
  |---|---|
  | `GET /api/v1/maps/capabilities` | 200: Google as provider and data source, the map on, a tile URL template under `/api/v1/maps/tiles/` |
  | `POST /api/v1/maps/places/search` `{"query":"Ferry Building, San Francisco","limit":3}` | 200 with real places, provider and attribution |
  | `POST /api/v1/maps/places/details` with an id from that search | 200 with that place |
  | `POST /api/v1/maps/routes`, a walk from 37.7749,-122.4194 to 37.7955,-122.3937 | 200 with geometry, distance, duration, steps and attribution, or a typed `no_route` |
  | `GET /api/v1/maps/tiles/12/655/1583`, `Accept: image/png` | 200, image bytes, `Cache-Control: no-store` |
  | the same tile, `Accept: application/json`, a new key | 200, base64 image data and its type, `Cache-Control: no-store` |
  | `POST /api/v1/maps/tiles/viewport` `{"zoom":12,"north":37.84,"south":37.70,"east":-122.35,"west":-122.52}` | 200 with the viewport's whole copyright |

- **Refusals:**

  | Answer | Check |
  |---|---|
  | 401 `authentication_required` | the session; a signed-out probe says nothing about Maps |
  | 403 `subscription_required` (Eliza Cloud), 402 `insufficient_credits` (Alpha Cloud) | the account's organization and its active or trialing Plus or Pro plan |
  | 503 `maps_not_configured` (Eliza Cloud), 404 `capability_unavailable` (Alpha Cloud) | the provider selection, the key, the enabled APIs and tiles |
  | 503 `maps_allowance_unconfigured` or `maps_admission_unknown` (Eliza Cloud) | the allowance settings and gate binding on the Worker that admits; never replay the admitted id |
  | 429 `rate_limited`, `allowance_exhausted` | wait for `Retry-After` or the reset; see what tile browsing used |
  | 409 `idempotency_conflict` (Alpha Cloud) | a key was reused for another request |
  | 502 `provider_invalid_response`, 503 `provider_unavailable` | Google billing, API permissions and quotas, and the Worker's egress |

### Agent context and model allowance

The resident's text model is Cerebras `qwen-3.8-27b`, through the Cloud with
one key shared by every phone; the Cloud adds no text and counts no tokens.
Cerebras gives the account 150K uncached tokens (refilling 2,500 a second)
and 750K in all; a request holds its whole input (estimated about 1.24 times
high) plus its output cap, or 16,384 when it sends none, and is refused (HTTP
429, `Retry-After: 59`, uncharged) when the allowance left is smaller. The
cache reuses a request's leading text in units of 1,024 tokens (tool
definitions, then the system prompt, then the messages) for 10 to 20 minutes;
one changed byte in a tool definition makes the rest a miss. The window is
131,072 tokens and a call writes at most 40,960, reasoning included.

The audit and its probe are develop's `scripts/agent-context-audit.ts` and
`scripts/agent-cache-probe.ts` (Bun), not yet ported here, so the procedure
is [develop's runbook](https://github.com/eliza-research/alpha/blob/bd70db55b2b3cab4c6f0ec2f4faa28edfa83979a/docs/runbooks/agent-context-audit.md):
copy the agent's database off a phone you own, audit the copy outside the
repository and delete it after (it holds the owner's conversations); run the
probe again, alone on the key, when the provider or model changes. On this
tree's runtime the model calls are in the on-device store's `device_records`
(collection `logs`), which a port of the audit must read. That runbook also
records what eliza's pin already settles: since elizaOS/eliza#40250 every
request with tools carries `RESTORE_CONTEXT` in one form, so it no longer
changes the cached prefix, and #40249 bounds the re-send on the direct
route. A change to what the agent sends shows:

- the audit on a phone running it: input per turn, the allowance left and
  the provider's cached share;
- the phone-action eval on the same resident before and after, in Android
  mode, with no family's pass rate lower;
- on a long conversation, a request that depends on something older than the
  inline history still resolved, by recall or a history read;
- the same tool definition digest for the same tool name across a
  conversation's turns in one view.

### Building the image

`pnpm --filter @repo/app aosp` stages, signs, records, verifies and enrolls
Alpha's image from a launcher APK on eliza's image tools; it never flashes a
phone or publishes an update. It does not run yet: `apps/app/scripts/aosp.ts`
still reads a capabilities file that is not in the tree. Until that is fixed,
and until this tree builds the launcher, images and APKs come from Alpha
`develop`.

- **The launcher APK:** develop's `android:build:inputs` lists what is
  missing, `android:build:local -- --release` builds the debug, release and
  instrumentation APKs into `artifacts/`, and `android:verify` checks them
  (JDK 21, Python 3, Android SDK platform and build-tools 36, `JAVA_HOME`
  and `ANDROID_HOME`). A distributable release comes from the Release
  workflow's signed candidate (below), never a local build.
  `android:build:fast -- --install` is a developer rebuild only: over an
  image's system app it refuses, because a debuggable update drops Phone and
  Messages roles; `--allow-system-update` overrides that deliberately.
- **Staging:** `stage --target pixel10a|cuttlefish --apk <apk> --aosp-source <dir> --output <new dir>`
  (Pixel 10a with `--factory-image`) checks that the AOSP checkout carries
  eliza's `soong-app-native` patch and every patch named with `--patch`, and
  is a production stage, which needs a reviewed `--descriptor` and a
  distributable release APK. `--development` leaves Phone, Contacts and SMS
  off; `--development --owner-telephony` turns them on for an owner's own
  image and admits only a release (non-debuggable, mocks off) launcher. A
  Pixel build host that applied the `soong-memory` patch names it with
  `--patch soong-memory`. A Sense listener image is Pixel 10a only, staged
  with `--listener-apk`, `--listener-descriptor` and its
  `--listener-qualification`, and `--patch` `chip`, `ops`,
  `protected-power` and `sense-policy`; without the qualification it is
  refused ([`spec/app/image/`](spec/app/image/index.md)), where develop
  staged an unqualified record with `--development`. The stager takes the
  qualification's SHA-256 from the file it is given; develop instead had it
  enrolled as `listenerQualificationSha256` in its Pixel 10a product record.
- One AOSP build runs at a time, each image with a new `BUILD_NUMBER`, or
  the package manager keeps stale metadata.

### The phone: flashing, checks and rollback

Flashing a phone is the owner's decision, for an image and a phone named by
serial. Name the phone in every command (`adb -s <serial>`,
`fastboot -s <serial>`, `ALPHA_SERIAL` for tools that read it), never the
only one attached. Record outcomes without credentials, account identifiers
or conversation text.

- **Rules of a device run:** never approve a card, sheet or Android dialog;
  read a call or SMS card's target and decline it, and stop if it is not the
  one asked for. Use only the test number 415-555-0100. Spoken, open-mic,
  real-call and approved-send checks are the owner's. A check that writes
  something of the owner's (an event, a note, a reminder) runs only with the
  owner's yes for that run, and what it made is removed after. One DevTools
  client per page; agree with any other session before attaching.
- **Before:** record the image fingerprint and slot,
  the launcher's versionCode, installed path and digest, the HOME, DIALER and
  SMS role holders, the image capability and grants, and whether an update in
  `/data` shadows the system APK. Keep the image and launcher that are on the
  phone, and the AOSP staging inputs that built them: they are the rollback,
  and their digests must match the build record of the image on the phone.
  Settle any open question about the data the phone keeps before changing it.
  `adb shell dumpsys connectivity | grep "VPN CONNECTED"` prints nothing.
- **Flash:** `fastboot -s <serial> update <image.zip>`, never with `-w`. It
  writes the current slot.
- **After boot**, and again after any reboot the owner allows: the new
  fingerprint, a higher versionCode, the launcher under
  `/product/priv-app` with no update in `/data`, its signer, privileged
  permissions and roles, `adb shell pm get-app-links --user cur ai.alphacompute.alphaphone`
  showing the sign-in host verified, an external browser on the image that
  can sign in to Google (the AOSP WebView Shell cannot), the crash buffer and
  any SELinux denials of Alpha's. OS A/B updates stay off
  (`os_update_enabled` false) until their signed image, channel, trust,
  SELinux, engine and recovery gates pass. Then compare with the baseline:
  the signed-in screen, account and plan kept; Home, the app library,
  conversations, workflows and reminders; Notes, Files, Calendar and Inbox
  content present, without copying private data; Browser and Camera; and on
  an image with telephony Phone, Contacts and Messages, with the target of
  each approval card checked.
- **Maps on the Pixel**, on the reviewed release APK, signed in with a plan:
  Google imagery, search, place details and a route; location granted only
  when asked; navigation started and stopped on a safe walking route. The
  Google Maps badge is the only credit control and opens the viewport's whole
  copyright and the request disclosure at every text size, 150% and 200%
  included, and with TalkBack; it stays reachable above sheets and
  navigation after a pan, zoom, rotation and reopening. A failure shows an
  honest unavailable state, and a Google result never appears over the
  OpenFreeMap fallback. Google-derived places and routes cannot be saved,
  shared or spoken by navigation speech, and viewing them writes nothing to
  saved places; a pin the owner drops or a place saved by hand keeps Save,
  rename and Share. Saved rows from Google, or from a provider that cannot be
  verified, stay readable and removable, without rename, sharing or
  directions, and out of route-origin choices, also after a provider outage
  or change.
- **Evidence:** the APK digest, the Cloud API and admission versions, the
  device's Android build, the connectivity, each journey checked and its
  result; a rollout is complete only once the operator's live checks and the
  owner's Pixel results are recorded.
- **Repairs:** `adb shell cmd role add-role-holder android.app.role.SMS ai.alphacompute.alphaphone`
  (and `android.app.role.DIALER`) restores a lost role;
  `adb shell pm uninstall-system-updates ai.alphacompute.alphaphone` removes
  a debuggable update over the system app and keeps its data. A phone that
  cannot reach the network may hold a dead reverse-tether VPN:
  `adb shell dumpsys connectivity` shows it; stop it, then
  `adb shell pm verify-app-links --re-verify ai.alphacompute.alphaphone`.
- **Rollback:** reflash the kept image the same way, without wiping. It
  restores the system partitions, not Alpha's data, and does not show that the old runtime
  reads state the new one wrote.
- **Carrier & SIM setup** (Settings → General) reads, on request, each slot's
  IMEI, each active SIM's ICCID and network, and the hardware and baseband;
  the EID is a separate read. Android decides what it may read, and shown
  identifiers say nothing of carrier compatibility, activation or working
  calls and data.

### Releases

The app is `ai.alphacompute.alphaphone`, always. Merging source publishes no
update. [`spec/release/`](spec/release/index.md) is how a release reaches
phones: an unsigned candidate numbered by its run, above the retired
channel's version 75 and every version published; mirrored privately,
signed under a reviewed plan, qualified for voice, and published on
`app-stable-alphacompute`, the APK first and its anonymous download verified
before the manifest moves. This tree does not run that job yet
(`.github/workflows/release.yml` releases the Vibestack tool), so Alpha's
launcher is still released from Alpha `develop`, by the procedure in its
[developer guide](https://github.com/eliza-research/alpha/blob/bd70db55b2b3cab4c6f0ec2f4faa28edfa83979a/docs/development.md#device-and-image-tooling):
fetch the candidate artifact of a main run, mirror it to the private bucket
with a generation-match of 0 and read it back, sign under a reviewed plan,
record the content-free Cartesia voice qualification of the exact signed
APK (consent, session, acoustic input, blue bar, transcript, audible reply,
mute, unmute, stop released), publish, and read the APK and manifest back
anonymously. A phone reads
`https://github.com/eliza-research/alpha/releases/download/app-stable-alphacompute/alpha-update-stable.json`;
fetching it without credentials is the manual check (develop's
`update-channel-status.ts` is not ported). Channel evidence is not device
acceptance: an update is accepted when a phone on Android 14 or later takes
it hands-free, sideloaded and with the launcher in the image (whose first
capture also names the image's release record and its vbmeta digest), offline
until its baseline is recorded, then online, unlocked and idle on Home for
one full 15-minute check interval plus the download, with the wireless
drill's before and after captures and their matrix kept. Before handing a
phone over, check **Settings → General**: where **Allow automatic updates**
shows, let the owner allow Alpha as an install source.
