# Alpha developer guide

Alpha Phone is a pnpm monorepo on Node 26 (`.nvmrc`) built on VibeStack specifications (`spec/`),
VibeLang, React, Effect, and pinned `@elizaos/*` packages (`eliza.lock.json`, prepared at `.eliza`).
There is no Bun anywhere in the workspace (`pnpm no-bun`).

## Setup

1. Install Node 26 (matching `.nvmrc`) and pnpm (`packageManager` in `package.json`).
2. Install workspace dependencies and prepare the pinned upstream Eliza checkout:

```sh
pnpm install
pnpm eliza
```

`eliza.lock.json` pins the reviewed upstream `elizaOS/eliza` `develop` commit. Never edit `.eliza`
directly; land shared changes upstream and update `eliza.lock.json` to the reviewed commit.

### Core verification commands

```sh
pnpm check                           # Quint models and Dafny proofs for spec/**
pnpm test                            # Unit and conformance tests
pnpm test:browser                    # Playwright/Vitest browser tests
pnpm lint                            # ESLint (--max-warnings 0) and Stylelint
pnpm no-bun                          # Enforce zero Bun usage across tracked files
pnpm --filter @repo/app licences --check   # Verify third-party notices freshness
pnpm verify                          # Full CI gate (no-bun, build, typecheck, test, browser, check, lint, analyze, selftest)
```

### Browser test runs

Run `pnpm test:browser` locally before finalising a PR. Production flag-off bundle checks run via:

```sh
pnpm --filter @repo/app android web
pnpm --filter @repo/app android audit dist
```

Mocks, fixtures, and developer surfaces require `ELIZA_DEV_ALLOW_TEST_MOCKS=1` (`__ALPHA_TEST_MOCKS__`).
Production web and APK builds always clear that flag and must pass `apps/app/scripts/android.ts audit`.

## Development

```sh
pnpm dev                             # Start workspace dev servers and VibeStack Studio
pnpm studio                          # Open VibeStack Studio alone
pnpm gen                             # Regenerate spec-derived modules under gen/
pnpm typecheck                       # VibeLang / TypeScript typecheck across the workspace
```

### Standalone Cloud (development)

`apps/cloud` packages Alpha Cloud from pinned `@elizaos/cloud` and `@elizaos/cloud-worker` with
Alpha's deployment profile in `packages/deployment`.

```sh
pnpm cloud                           # Build @repo/cloud and run the local Cloud server
```

See [alpha-cloud.md](alpha-cloud.md) and [runbooks/alpha-cloud-deploy.md](runbooks/alpha-cloud-deploy.md)
for staging and production deployment procedures.

## Android builds

There is one Android product and flavor: `launcher` (`ai.alphacompute.alphaphone`), with the
Node.js resident runtime (`libeliza_node.so`) and on-device speech (`libelizainference.so`,
`libparadeevoicejni.so`, and verified ASR/TTS models from `.eliza/packages/os/android/local-inference`)
always packaged.

### Required local toolchain

- **JDK 21** (`JAVA_HOME`)
- **Android SDK** (`ANDROID_HOME` / `ANDROID_SDK_ROOT`): `platforms;android-36`, `build-tools;36.0.0`, `platform-tools`
- **Pinned NDK & CMake**: `ndk;28.2.13676358`, `cmake;3.22.1`
- **Pinned Eliza checkout**: `pnpm eliza`

Check every local prerequisite before building:

```sh
pnpm --filter @repo/app android inputs
```

### Building and verifying APKs

```sh
pnpm --filter @repo/app android build              # Debug + instrumentation APKs
pnpm --filter @repo/app android build --release    # Debug, instrumentation, and release APKs + mapping + SBOM
pnpm --filter @repo/app android verify             # Verify APKs and write apps/app/artifacts/apk-manifest.json
```

Omitting `--release` builds debug and instrumentation APKs only; release validation and CI always
include `--release`. Instrumentation APKs are test artifacts, not a second distribution.

### Native JVM unit tests (Robolectric Android 35)

To preload the verified Robolectric Android 35 framework jar (avoiding Maven Central rate limits on CI):

```sh
bash scripts/ci/prepare-robolectric-android.sh "${HOME}/.m2/repository"
(cd apps/app/android && ./gradlew --no-daemon :app:testLauncherDebugUnitTest)
```

### Carrier activation details

Carrier setup reads actual device IMEIs independently of SIM activation when Android permits access,
shows per-field denial or unavailable states, and clears values on leaving or backgrounding.
Identifier reads require an explicit foreground, unlocked action and never enter routine snapshots
or agent context.

## Device and image tooling

Alpha's AOSP image staging, OTA compatibility checks, key management, and release ledger commands
are exposed through `@repo/app`:

```sh
pnpm --filter @repo/app aosp stage --target cuttlefish|pixel10a ...
pnpm --filter @repo/app aosp ota check|apply|status|fallback|stock-archive|verify-stock|retain-known-good ...
pnpm --filter @repo/app aosp verify --target pixel10a|cuttlefish --serial SERIAL --user 0 --expected FILE
pnpm --filter @repo/app aosp os --ledger FILE stage|pass|enable|check|start|interrupt|resume|finish|retain-known-good|fallback|drill
pnpm --filter @repo/app release channel|candidate|mirror|plan|sign|publish|custody ...
```

Host JVM checks for AOSP Fresh Presets (including the `OverlayManager` `RuntimeException` fallback):

```sh
python3 apps/app/aosp/branding/provision/test_fresh_presets.py
```

### Evidence boundaries

Keep verification layers strictly distinct; never claim one proves another:

1. **Workspace verification (`pnpm verify`):** spec proofs, unit tests, browser tests, lint, static analysis.
2. **APK build and verification (`android build --release` + `android verify`):** packaging, bundle audit, runtime inventory, dex classes, signer.
3. **Emulator HOME-role and instrumentation run:** x86_64 Android 35 SDK emulator checks.
4. **Full AOSP image boot:** Cuttlefish or Pixel 10a (`stallion`) Android 17 image staging and boot.
5. **Real integrations and physical device/owner acceptance:** live services, carrier, hardware audio, and owner sign-off.

See [pixel-cutover-baseline.md](pixel-cutover-baseline.md) for Pixel hardware baseline capture.

## Third-party licences and SBOM

```sh
pnpm --filter @repo/app licences                   # Regenerate apps/app/public/licenses/{THIRD_PARTY_NOTICES.txt,third-party-notices.json}
pnpm --filter @repo/app licences --check           # Fail if committed notices are stale
pnpm --filter @repo/app licences --sbom apps/app/artifacts/sbom/alpha.cdx.json
```

See `apps/app/licenses/README.md` for licence inventory inputs and policy.

## Generated files

- `gen/` and `apps/app/gen/` are generated from `spec/` by `pnpm gen`.
- `apps/app/dist/` is the production web bundle audited by `apps/app/scripts/android.ts audit`.
- `apps/app/artifacts/` holds built APKs, R8 mappings, `apk-manifest.json`, and CycloneDX SBOMs.
