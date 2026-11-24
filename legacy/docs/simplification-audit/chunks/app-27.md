# Chunk app-27: root build config

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| capacitor.config.ts | KEEP | 12 | 11-12 |
| tsconfig.json | SIMPLIFY | 126 | ~30 (generated paths) / ~60 (wildcards) |
| vite.config.ts | SIMPLIFY | 169 | ~95 |

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| alias map (`paths` / `resolve.alias`) | const map | tsconfig.json:23; vite.config.ts:117 | `test/dev-surface-gates.test.mjs:19`, `test/client-feature-preparation.test.mjs:257,261`, `test/fixtures/shared-batch-voice.mjs:11` (reads tsconfig) | generated `.eliza/client-features/aliases.json` + `tsconfig.paths.json` written by `scripts/prepare-client-features.ts` |
| `flagOn` | const | vite.config.ts:17 | `scripts/browser-cloud-dev-bridge.ts:501`, `scripts/gradle-verification.ts:277`, `scripts/qualify-head.ts:368` | `scripts/lib/test-mocks-flag.ts` |
| `appConfig` / `appVersion` | const | vite.config.ts:18-19 | `capacitor.config.ts:2` (`identity`), ~31 script readers of app.config.json | JSON import / proposed `scripts/lib/app-identity.ts` |
| `disabledModuleSource` | const | vite.config.ts:27 | export folds `apps/app/src/browser/device-controls.tsx:51`, `browser/simulated-apps.ts:17-18` | delete; one `@dev` alias |
| `productionContentSecurityPolicy` | helper | vite.config.ts:40 | none (other CSPs are different documents) | stays, unexported |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| `@eliza-system` alias (vite.config.ts:152-157) | `git grep @eliza-system` returns only this line; 0 hits in `.eliza/client-features`; `native.ts:3` uses a relative type-only import | High |
| `@elizaos/contracts/stated-clock-time` (vite.config.ts:121, tsconfig.json:108) | 0 hits in apps/test/specs/scripts; no file in `.eliza/client-features` mentions `stated-clock-time` | High |
| tsconfig `/src/*` path (line 24) | No TS import of `/src/`; the only uses are URL strings in Quint harness templates served by Vite | High |
| mock-admission stubs (vite.config.ts:30-32) | Both dynamic imports sit inside compile-time-false branches (`main.tsx:408`, `connection-ui.tsx:3310`), so Rollup drops them | Medium (confirm no chunk + audit:bundle) |
| `existsSync(emptyFixturesModule)` tolerance (vite.config.ts:69-70) | `fixtures.empty.js` is tracked; the fallback would fail open | High |
| `export` on `productionContentSecurityPolicy` | 0 importers | High |
| `fs.allow` vendor entries (vite.config.ts:166-167) | No served module comes from those directories; the served vendor directories (`plugin-native-passwords`, `packages/core`) are not listed | Medium-low (dev-server check needed) |
| `"ignoreDeprecations": "6.0"` (tsconfig.json:22) | No deprecated option in the file; TS 7.0.2 is pinned | Medium (run tsc) |
| `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` read in `flagOn` | Every launcher sets the unprefixed name; the define overrides the `VITE_` value anyway | Medium (owner) |
| `VITE_ALPHA_DEV_CARTESIA` in `scripts/dev-local.ts:48` | Overridden by the vite.config.ts:110 define | High |
| `android.path`, `allowMixedContent:false` (capacitor.config.ts:10) | Capacitor 8 defaults | High, but trivial value |

## Cross-file actions
1. **One alias source.** `scripts/prepare-client-features.ts` emits `aliases.json` + `tsconfig.paths.json` into `.eliza/client-features`. Edit `tsconfig.json` (extends), `vite.config.ts` (reads the JSON), `test/dev-surface-gates.test.mjs:19`, `test/client-feature-preparation.test.mjs:257,261`, `test/fixtures/shared-batch-voice.mjs:11`. Optionally add an `@eliza/*` wildcard and rewrite the 364 `../../../../.eliza` imports in 197 app files plus 18 test/spec files (research P13). That also needs a Node resolve hook in `test/support/strip-types.mjs`.
2. **Dev-module boundary.** Replace `disabledModuleSource` and the importer allowlist with one `@dev` alias. This touches `vite.config.ts`, `apps/app/src/main.tsx:36-38,99,121,174`, `runtime/connection-ui.tsx:3314`, `passwords/password-manager.ts:5-6,47`, `browser/device-controls.tsx:51`, `browser/simulated-apps.ts:17-20`, plus the comments that name `disabledModuleSource`. The backstop is `scripts/audit-production-bundle.ts`.
3. **Cloud-deployment check runs twice.** `vite.config.ts:16` and `package.json` `verify` (`node scripts/cloud-deployment.ts --check`). Move it into an `apply:'build'` hook, or drop one of the two.
4. **Single test-mocks env name.** `vite.config.ts:17`, `scripts/browser-cloud-dev-bridge.ts:501`, `scripts/gradle-verification.ts:277`, `scripts/qualify-head.ts:368`, `scripts/dev-cloud.ts:23`, `scripts/dev-ui-remote-host.ts:12`, the `.github/workflows/{android,android-emulator,browser}.yml` env blocks, `test/dev-ui-remote-host.test.mjs:27`, `test/verify-apks.test.mjs:259`.
5. **Cartesia preview flag.** `vite.config.ts:110`, `scripts/dev-local.ts:48`, `apps/app/src/runtime/development-cartesia-flag.ts:3`, `test/private-preview-cartesia-route.test.mjs:17-30`.
6. **app.config.json reader.** Replace `vite.config.ts:18-19` with a JSON import, matching `capacitor.config.ts:2` and the proposed `scripts/lib/app-identity.ts` (see `files/app.config.json.md`).

## Text/path pins
- `test/one-runtime-profile.test.mjs:48`: regex over the vite.config.ts text (T1).
- `specs/quint/refinement/application/account-sheet.mjs:68`: esbuild-bundles vite.config.ts to hash its import graph. New imports (JSON, `scripts/lib/*`) join that input set automatically.
- vite.config.ts is listed as a hashed input or `configFile` in `specs/quint/legacy/*/check-*-refinement.mjs` (9), `specs/quint/refinement/{application/account-sheet,application/cloud-connection-notices,application/shell-coordinator,composition/controllers,composition/index,native/copy-receipt}.mjs`, `test/fixtures/calendar-mounted-editor.mjs:13,247`, `scripts/quint-lib.ts:34`, `scripts/source-snapshot.ts:5`, `scripts/dev-ui-remote-host.ts:13`, and 6 `test/browser/*` files.
- capacitor.config.ts: `scripts/quint-lib.ts:34`, `scripts/source-snapshot.ts:5`; `test/owner-merge-review.test.mjs` uses only the filename in synthetic diffs.
- tsconfig.json: `test/fixtures/shared-batch-voice.mjs:11` parses `compilerOptions.paths` keys (`@elizaos/core/speech`, `@elizaos/voice/turn`, `@elizaos/ui/voice/batch-conversation`); `tsconfig.scripts.json` extends it; hashed input in `specs/quint/services/manifest.json:2375` and 5 `specs/quint/refinement/services/*.mjs`.
- Comments naming `disabledModuleSource`: `apps/app/src/main.tsx:36`, `apps/app/src/passwords/password-manager.ts:5`.
- Build outputs that consumers check: `build-flags.json` (`scripts/apk.ts:221-225`, `scripts/audit-production-bundle.ts:113-134`, `android/app/product.gradle:154`, `scripts/android-cloud-voice-timing.ts:173`); the CSP meta (`test/browser/production-surface.spec.ts:45`).

## New patterns
- **NEW: fail-open build tolerance.** A build-time safety swap that silently falls back to the unsafe input when its safe counterpart is missing (`vite.config.ts:69-70`: if `fixtures.empty.js` is missing, real fixtures ship). Treatment: fail the build, or drop the check when the file is tracked. Closest catalogue ID is B4.
- **NEW: config-load side effects.** Validation run at config-import time, so every dev server and test harness pays for it (`vite.config.ts:16`). Treatment: an `apply:'build'` hook.

## Owner questions
1. Should Vite accept only `ELIZA_DEV_ALLOW_TEST_MOCKS`, dropping `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` as an input name (it stays as the define output)?
2. Is development Cartesia meant to work in private local preview without test mocks? The vite.config.ts:110 define makes it impossible today, while `development-cartesia-flag.ts:3` and `test/private-preview-cartesia-route.test.mjs` assume it can.
3. Should the cloud-deployment check stay in config load, move to a build-only hook, or live only in `verify`?
4. Are generated alias files under `.eliza/client-features` (aliases.json + tsconfig.paths.json) acceptable as the single alias source, or is a hand-maintained wildcard map preferred?
5. Two system-bar mechanisms coexist: Capacitor `SystemBars.setStyle` (agent-adapter.ts:1535, configured in capacitor.config.ts:8) and `AlphaDevice.setSystemBarAppearance` (system-bar-appearance.ts). Which one is canonical?
