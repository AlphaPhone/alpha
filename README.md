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

```sh pnpm install pnpm eliza    # once per pinned commit: clone, install and build eliza (a few minutes) pnpm dev      # Studio, and the app over eliza's agent and cloud, started for this run pnpm check    # models, proofs, types, tests, traces and each page explored pnpm verify   # everything CI runs ```

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
and device or owner acceptance are separate results; record each on its own.

### The public site

`pnpm --filter @repo/site build` writes the page to `dist/` in `apps/site`;
`pnpm --filter @repo/site dev` serves it. Its deploy workflow runs on `main`
and on demand, builds the site and uploads `dist/` with wrangler to the
Cloudflare Pages project `alphaphone`, whose production label is `vibestack`.
The GitHub environment `alpha-site-production` admits `main` and holds the
`CLOUDFLARE_ACCOUNT_ID` variable and the `CLOUDFLARE_PAGES_API_TOKEN` secret
(Cloudflare Pages Edit on that account).

### Alpha Cloud

Alpha Cloud is `apps/cloud` on AlphaCompute's Cloudflare account, in the
`alphacompute.cc` zone; never the Eliza Labs account. Deploy staging end to
end before production. The production deploy is the owner's step, and no
deploy moves a phone: switching phones to it is a separate release.

- **Accounts, per environment:** Cloudflare (Workers Paid, a token with
  Workers Scripts and Routes, KV, R2, Hyperdrive, Zone Read and DNS Edit), an
  empty Postgres database on a direct TLS connection, Cerebras, Cartesia,
  Resend with `alphacompute.cc` verified, Google OAuth clients for sign-in and
  the Gmail and Calendar connector, a Maps key restricted to Places (New),
  Geocoding, Routes and Map Tiles with quotas and billing alerts, and Stripe
  (test keys for staging, live for production) with Plus at $30 and Pro at
  $100 a month.
- **Secrets file:** copy `apps/cloud/alpha-cloud.env.example` outside the
  checkout, `chmod 600` it, fill it in, and run `pnpm cloud secrets --environment staging --env-file <file>` once: it adds the internal keys and
  prints the entitlement public key. Back the file up encrypted; it is the only
  copy of keys whose loss signs everyone out. Rotate a provider key with
  `--apply`, never by editing the generated values.
- **Operator inputs:** one JSON file outside the checkout in the shape of
  `OperatorInputs` in `apps/cloud/src/profile.vibe`; `pnpm cloud profile --inputs <file> --out <file>` checks it.
- **Resources:** `pnpm cloud provision --environment <e> --env-file <file> --write`, then commit the ids it records in `apps/cloud/resources.json`. A
  conflict is resolved in Cloudflare, never by renaming.
- **Each deploy, in order:** `pnpm cloud check`, `preflight`, `migrate`,
  `register`, `prices`, `deploy` (`--component api|edge` for one Worker; the
  API first) and `smoke`, whose every gate must pass. A fresh hostname can fail
  `smoke` for a few minutes while its certificate is issued. The Cloud deploy
  workflow, `.github/workflows/cloud-deploy.yml`, runs the same steps from
  `main`.
- **Rollback:** `wrangler rollback --name <worker>` in `apps/cloud`, or the
  Worker's Deployments in the dashboard. Migrations only go forward; never roll
  the API back across one without the owner. `wrangler tail <worker>` reads
  the logs.

### The phone: flashing, checks and rollback

One build of the AOSP tree runs at a time, and each image gets a new
`BUILD_NUMBER`, or the package manager keeps stale metadata. Flashing a phone
is the owner's decision, for an image and a phone named by serial.

- **Before:** with `adb -s <serial>`, record the image fingerprint and slot,
  the launcher's versionCode, installed path and digest, the HOME, DIALER and
  SMS role holders, the image capability and grants, and whether an update in
  `/data` shadows the system APK. Keep the image and launcher that are on the
  phone, with their build records: they are the rollback.
- **Flash:** `fastboot -s <serial> update <image.zip>`, never with `-w`. It
  writes the current slot.
- **After boot:** the new fingerprint, a higher versionCode, the launcher under
  `/product/priv-app` with no update in `/data`, its signer, privileged
  permissions and roles, the crash buffer and any SELinux denials of Alpha's.
  Then the on-device checks with the owner. Run only silent, read-only checks
  yourself: spoken, open-mic, real-call and approved-send checks are the
  owner's, and a call or SMS card is declined unless its target is verified.
- **Repairs:** `adb shell cmd role add-role-holder android.app.role.SMS ai.alphacompute.alphaphone` (and `android.app.role.DIALER`) restores a lost
  role; `adb shell pm uninstall-system-updates ai.alphacompute.alphaphone`
  removes a debuggable update over the system app and keeps its data. A phone
  that cannot reach the network may hold a dead reverse-tether VPN: `adb shell dumpsys connectivity` shows it; stop it, then `adb shell pm verify-app-links --re-verify ai.alphacompute.alphaphone`.
- **Rollback:** reflash the kept image the same way, without wiping. It
  restores the system partitions, not Alpha's data.

### Releases

The app is `ai.alphacompute.alphaphone`, always. Merging source publishes no
update: an admitted, signed launcher APK is published to the
`app-stable-alphacompute` channel by a protected release job bound to the
reviewed commit on `main`, and its anonymous readback is checked before the
update is distributed. Before handing a phone over, check **Settings →
General**: where **Allow automatic updates** shows, let the owner allow Alpha
as an install source.
