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
model in place of a paid one, and stops them with it. `ALPHA_FAKES=1 pnpm dev`
serves the app over the journeys' fakes instead, and `ALPHA_FAKES=phone` over
the fake phone's plugins.

Agents start with [AGENTS.md](AGENTS.md); the spec format is in
[SPEC.md](SPEC.md) and the repository's map in
[CONTRIBUTING.md](CONTRIBUTING.md).


## Operating Alpha

APK builds, emulator HOME-role tests, an AOSP image boot, real integrations
and device or owner acceptance are separate results; record each on its own,
and never one as proof of another.

### The public site

`pnpm all @repo/site#build` generates the site's spec and the design system's
theme first and writes the page to `dist/` in `apps/site`, the page already
drawn in its HTML and every image named by its content's hash;
`pnpm --filter @repo/site dev` serves it. The conversation is staged in the
page and asks no service anything. The captures in `apps/site/src` are cut
from `legacy/docs/assets/alpha-screens.png` (Home, Calendar) and
`legacy/docs/assets/alpha-screens-more.png` (the chat's backdrop) at 370 by
813 and saved as WebP; a new capture replaces them the same way.

The Alpha site workflow, `.github/workflows/site-deploy.yml`, runs on `main`
when the site, its spec, the design system or `@repo/ui` change, and on
demand. It builds the same way and uploads `dist/` with wrangler to the
Cloudflare Pages project `alphaphone`, whose production label is `vibestack`.
The GitHub environment `alpha-site-production` admits `main` and holds the
`CLOUDFLARE_ACCOUNT_ID` variable and the `CLOUDFLARE_PAGES_API_TOKEN` secret
(Cloudflare Pages Edit on that account).

### Alpha Cloud

Alpha Cloud is `apps/cloud` on AlphaCompute's Cloudflare account, in the
`alphacompute.cc` zone; never the Eliza Labs account. Deploy staging end to
end before production. The production deploy is the owner's step, and no
deploy moves a phone: switching phones to it is the cutover release below.

| | Production | Staging |
|---|---|---|
| API Worker | `api.alphacompute.cc` | `api-staging.alphacompute.cc` |
| Web Worker (App Links, return pages) | `cloud.alphacompute.cc` | `cloud-staging.alphacompute.cc` |
| Worker names | `alphacompute-cloud-api`, `…-edge` | `alphacompute-cloud-api-staging`, `…-edge` |

The hosts are the `cutoverCandidate` rows of
`packages/deployment/deployments.json`, the names `workerName` in
`apps/cloud/resources.json`. Never change either after the first production
deploy: the app's sign-in callback and App Link host come from them.

- **Accounts, per environment:** Cloudflare (Workers Paid, a token with
  Workers Scripts and Routes, KV, R2, Hyperdrive, Zone Read and DNS Edit), an
  empty Postgres database on a direct TLS connection (not a transaction
  pooler), Cerebras, Cartesia, Resend with `alphacompute.cc` verified, Google
  OAuth web clients for sign-in and the Gmail and Calendar connector with the
  redirect URIs `https://<api host>/api/v1/auth/google/callback` and
  `https://<api host>/api/v1/oauth/google/callback` (start Google's Gmail and
  Calendar scope verification early: it takes weeks) and, where
  `google.nativeSignIn` is on, an Android client for
  `ai.alphacompute.alphaphone` with the release certificate's SHA-1 (the App
  Links file names the signer in `apps/cloud/deployment.json`), a Maps key restricted
  to Places (New), Geocoding, Routes and Map Tiles with quotas and billing
  alerts, and Stripe (test mode for staging, live for production; the tool
  refuses a mismatch) with Plus at exactly $30 and Pro at exactly $100 a
  month and a webhook to `https://<api host>/api/stripe/webhook` for
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`,
  `customer.subscription.pending_update_applied`,
  `customer.subscription.pending_update_expired`, `invoice.created`,
  `invoice.paid`, `invoice.payment_failed`, `payment_intent.succeeded`,
  `payment_intent.payment_failed`, `charge.refunded` and
  `charge.dispute.funds_reinstated`.
- **Secrets file:** copy `apps/cloud/alpha-cloud.env.example` outside the
  checkout, `chmod 600` it, fill it in, and run `pnpm cloud secrets --environment staging --env-file <file>` once: it adds the internal keys and
  prints the entitlement public key. Back the file up encrypted; it is the only
  copy of keys whose loss signs everyone out. Rotate a provider key with
  `--apply`, never by editing the generated values.
- **Operator inputs:** one JSON file outside the checkout in the shape of
  `OperatorInputs` in `apps/cloud/src/profile.vibe`; `pnpm cloud profile --inputs <file> --out <file>` checks it. Each environment's
  `databaseIdentity` is a new `openssl rand -hex 32`, never reused: the first
  `migrate` writes it into the empty database and every later command refuses
  another. Terms and Privacy are `{ title, revision, sections: [{ title, paragraphs }] }`.
  Maps is `maps.coverage` and `maps.datasetRevision`, with the key as
  `GOOGLE_MAPS_API_KEY` in the secrets file.
- **Resources:** with `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
  exported (provision and deploy read them), `pnpm cloud provision --environment <e> --env-file <file> --write`, then commit the ids it records
  in `apps/cloud/resources.json`. A conflict is resolved in Cloudflare, never
  by renaming.
- **Each deploy, in order:** `pnpm cloud check`, `preflight`, `migrate`,
  `register`, `prices`, `deploy` (`--component api|edge` for one Worker; the
  API first) and `smoke`, whose every gate must pass. Then by hand: `/api/health`,
  `/api/v1/subscriptions/plans` (Plus and Pro) and `/api/v1/auth/methods` on
  the API host and `/.well-known/assetlinks.json` (naming
  `ai.alphacompute.alphaphone`) on the web host answer; Stripe's test webhook
  returns 200; Resend shows the domain verified; and the Alpha team signs in,
  chats, talks and subscribes with a test card on a staging build.
- **From GitHub:** the Cloud deploy workflow, `.github/workflows/cloud-deploy.yml`,
  runs the same steps from `main`, dispatched with the environment, `check`
  or `deploy`, and the component; its header names the GitHub environments
  and their secrets.
- **Later:** a new eliza pin is a rebuild, then `check`, `preflight`,
  `migrate`, `deploy`, `prices` and `smoke`; changed operator inputs are
  another `deploy`.
- **Trouble:** every `smoke` gate answering 503 means the API Worker cannot
  read its profile: `deploy --component api`. A fresh hostname fails `smoke`
  for a few minutes while its certificate is issued. A failed app
  registration means `register` did not run against that database.
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

### Building the image

`pnpm --filter @repo/app aosp` stages, signs, records, verifies and enrolls
Alpha's image from a launcher APK on eliza's image tools; it never flashes a
phone or publishes an update. `stage --target pixel10a|cuttlefish --apk <apk> --aosp-source <dir> --output <new dir>` (Pixel 10a with `--factory-image`)
is a production stage, which needs a reviewed `--descriptor` and a
distributable release APK; `--development` leaves Phone, Contacts and SMS
off, and `--development --owner-telephony` turns them on for an owner's own
image and admits only a release (non-debuggable) launcher. A Pixel 10a Sense
listener is staged with `--listener-apk`, `--listener-descriptor` and its
`--listener-qualification`. One AOSP build runs at a time, each image with a
new `BUILD_NUMBER`, or the package manager keeps stale metadata.

### The phone: flashing, checks and rollback

Flashing a phone is the owner's decision, for an image and a phone named by
serial. Name the phone in every command (`adb -s <serial>`, `fastboot -s <serial>`, `ALPHA_SERIAL` for tools that read it), never the only one
attached. Record outcomes without credentials, account identifiers or
conversation text.

- **Before:** record the image fingerprint and slot,
  the launcher's versionCode, installed path and digest, the HOME, DIALER and
  SMS role holders, the image capability and grants, and whether an update in
  `/data` shadows the system APK. Keep the image and launcher that are on the
  phone, and the AOSP staging inputs that built them: they are the rollback,
  and their digests must match the build record of the image on the phone.
  Settle any open question about the data the phone keeps before changing it.
- **Flash:** `fastboot -s <serial> update <image.zip>`, never with `-w`. It
  writes the current slot.
- **After boot**, and again after any reboot the owner allows: the new
  fingerprint, a higher versionCode, the launcher under
  `/product/priv-app` with no update in `/data`, its signer, privileged
  permissions and roles, the crash buffer and any SELinux denials of Alpha's.
  Then compare with the baseline: the signed-in screen, account and plan kept;
  Home, the app library, conversations, workflows and reminders; Notes, Files,
  Calendar and Inbox content present, without copying private data; Maps
  (Google imagery, search, a place and a route, signed in with a plan, its
  badge opening the full credit), Browser and Camera; and on an image with
  telephony Phone, Contacts and Messages, with the target of each approval
  card checked. Run only silent, read-only checks
  yourself: spoken, open-mic, real-call and approved-send checks are the
  owner's, and a call or SMS card is declined unless its target is verified.
- **Repairs:** `adb shell cmd role add-role-holder android.app.role.SMS ai.alphacompute.alphaphone` (and `android.app.role.DIALER`) restores a lost
  role; `adb shell pm uninstall-system-updates ai.alphacompute.alphaphone`
  removes a debuggable update over the system app and keeps its data. A phone
  that cannot reach the network may hold a dead reverse-tether VPN: `adb shell dumpsys connectivity` shows it; stop it, then `adb shell pm verify-app-links --re-verify ai.alphacompute.alphaphone`.
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
launcher is still released from Alpha `develop`. Channel evidence is not
device acceptance: an update is accepted when a phone takes it hands-free,
sideloaded and with the launcher in the image, offline until its baseline is
recorded, then online, unlocked and idle on Home for one full 15-minute check
interval plus the download. Before handing a phone over, check **Settings →
General**: where **Allow automatic updates** shows, let the owner allow Alpha
as an install source.
