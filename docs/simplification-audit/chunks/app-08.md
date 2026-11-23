# Chunk app-08 — maps/, native.ts, passwords/, platform-plugins.ts, product/, prototype/README.md

30 files, 1,368 lines (most maps files are short; nine are one-line `export *` shims). Per-file reports are in
`docs/simplification-audit/files/apps/app/src/{maps,passwords,product,prototype}/` and
`files/apps/app/src/native.ts.md`, `files/apps/app/src/platform-plugins.ts.md`.

## Files
| file | verdict | lines now | est. lines after |
|---|---|---|---|
| apps/app/src/maps/agent-context.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/agent-navigation.ts | SIMPLIFY | 36 | 28 |
| apps/app/src/maps/background-navigation.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/basemap.ts | MERGE into maps/map-plane.ts | 8 | 0 |
| apps/app/src/maps/cloud-maps.ts | SIMPLIFY | 58 | 48 |
| apps/app/src/maps/cloud-provider.ts | SIMPLIFY | 29 | 24 |
| apps/app/src/maps/cloud-session.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/contracts.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/device-navigation.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/guidance.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/map-plane.ts | SIMPLIFY (+basemap) | 60 | 55 |
| apps/app/src/maps/native-location.ts | SIMPLIFY | 13 | 11 |
| apps/app/src/maps/navigation-voice.ts | SIMPLIFY | 69 | 60 |
| apps/app/src/maps/regional-provider.ts | SIMPLIFY + MOVE to dev/ | 35 | 22 |
| apps/app/src/maps/resident-relay.ts | SIMPLIFY | 25 | 22 |
| apps/app/src/maps/route-distance.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/runtime.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/saved-places.ts | KEEP | 18 | 17 |
| apps/app/src/maps/screen.ts | DELETE (shim) | 1 | 0 |
| apps/app/src/maps/share.ts | SIMPLIFY | 8 | 10 (formatted) |
| apps/app/src/maps/state.ts | KEEP | 37 | 38 |
| apps/app/src/native.ts | SIMPLIFY (later MOVE to native/plugins.ts) | 27 | 18 |
| apps/app/src/passwords/dev-vault.ts | MOVE to apps/app/src/dev/ + SIMPLIFY | 63 | 55 |
| apps/app/src/passwords/password-manager.ts | SIMPLIFY | 330 | 295 |
| apps/app/src/platform-plugins.ts | KEEP (extend) | 8 | 15 |
| apps/app/src/product/alpha-product-registration.ts | KEEP (data; owner-gated trims) | 349 | 349 (≈190 if photo-art palette and Wallet go) |
| apps/app/src/product/alpha-product.ts | KEEP | 73 | 68 |
| apps/app/src/product/native-cloud-runtime.ts | SIMPLIFY | 10 | 8 |
| apps/app/src/product/owner-route-table.ts | KEEP (+type) | 57 | 65 |
| apps/app/src/prototype/README.md | SIMPLIFY (stale refs) | 46 | 40 |

Total ≈1,368 → ≈1,250 without owner decisions (≈−120); ≈1,090 if the photo palette and Wallet go.

## Local types and helpers
| name | kind | file:line | twins | proposed home |
|---|---|---|---|---|
| `CloudAccount` | type | maps/agent-navigation.ts:7 | `BoundClient` maps/cloud-maps.ts:12; upstream `MapsSession` plugin-maps/client/cloud-session.ts:4 | exported `CloudBinding` in runtime/connection-ui.tsx |
| `BoundClient` | type | maps/cloud-maps.ts:12 | as above | same |
| session+credential compare | helper (inline) | maps/agent-navigation.ts:24, maps/cloud-maps.ts:16,51 | browser/voice.ts, prototype/inbox-cloud-adapter.ts, runtime/google-accounts.ts, maps/navigation-voice.ts:54 | `sameCloudBinding()` beside `getCloudClient` |
| eight-field owner fence | helper (inline) | maps/navigation-voice.ts:50-55 | runtime/native-reading-voice.ts:18-25, paired-voice.ts:22-35, view-navigation.ts:84-89 (research n–z P11) | shared owner-fence helper on connectionController |
| AbortError name test | helper (inline) | maps/navigation-voice.ts:39 | 18 files in apps/app/src | `isAbortError` in runtime/abort-signal.ts |
| `Request` | type | maps/resident-relay.ts:7 | runtime/view-navigation.ts:12, runtime/device-view-profile.ts:7 | `OwnerRequest` in runtime/alpha-client.ts |
| plain-object guard | helper (inline) | maps/resident-relay.ts:15 | remote-protocol.ts:65, view-navigation.ts:22, native-calendar-sync.ts:14, owner-reminder-notification-protocol.ts:24 (~35 repo-wide) | `asRecord()` in apps/app/src/lib/ |
| `ElizaLocation` handle | const | maps/native-location.ts:5 | startup-permissions.tsx:22, browser/workflow-trigger-runtime.ts:53 (`<any>`) | export from maps/native-location.ts or native/plugins.ts |
| `System` (ElizaSystem) | const | native.ts:5-8 | prototype/agent-adapter.ts:84, prototype/settings-adapter.ts:124, runtime/error-boundary.tsx:50, browser/device-controls.tsx:47 | native.ts → native/plugins.ts |
| `DeviceApps` | const | native.ts:11-13 | runtime/error-boundary.tsx:49,56 | same |
| `isAndroid` | const | native.ts:14 | notes-trash.ts:16, note-audio-deletions.ts:16, reminder-journal-store.ts:10, notes-folders.ts:9, workflow-intents.ts:19,36, startup-permissions.tsx:64 | native.ts |
| `launcherListens` | const | native.ts:20-23 | PluginHeaders casts native-connection.ts:14,18,25,217, main.tsx:369 | delete (constant true) or `pluginHasMethod` |
| `pluginHasMethod` (proposed) | helper | platform-plugins.ts | native.ts:21, native-connection.ts x4, main.tsx:369 | platform-plugins.ts |
| `AlphaBrowser` handle | const | passwords/password-manager.ts:80 | prototype/browser-adapter.ts:23 (`<any>`), browser/register.ts:40 | native/plugins.ts |
| `Bag` | type | passwords/password-manager.ts:23 | ~60 files | shared view-row type (types.md) |
| `nav`/`button`/`input` row builders | helper | passwords/password-manager.ts:167-170 | prototype/settings-adapter.ts:763,775; prototype/native-adapter.ts:335; model.js:5060 `stRow('kInput')` | `prototype/settings-rows.ts` |
| `Helpers` | interface | passwords/password-manager.ts:164 | helper bag built in settings-adapter.ts | settings-rows module |
| `Record_` | type | passwords/dev-vault.ts:11 | none | rename `DevRecord` |
| dev `<dialog>` surface | helper | passwords/dev-vault.ts:25-34 | ~21 imperative dialog builders (research browser P4) | shared dialog helper |
| `productCharacter` | const (inline) | product/native-cloud-runtime.ts:10 | `AGENT_CHARACTER` scripts/agent-identity.ts:13 | one export in product/ |
| identity non-empty check | helper | product/native-cloud-runtime.ts:8 | scripts/agent-identity.ts:13 | delete both |
| owner-route group type | type (inline cast) | runtime/owner-route-policy.ts:5 (consumer of owner-route-table.ts) | none | `OwnerRouteTable` in product/owner-route-table.ts |
| `storage.retained` keys | const strings | product/alpha-product-registration.ts:332-338 | literals in 15+ files (`alpha.connection.selection.v1` ×11) | read from the registration |
| `defaultGoogleProvider` | const | maps/cloud-provider.ts:5 | none | stays (or upstream export) |
| `globalBasemap` | const | maps/basemap.ts:4 | none | maps/map-plane.ts |
| `regionalDataset`/`RegionalDataset` | const/interface | maps/regional-provider.ts:11-18 | scripts/maps/dataset_manifest.py:48, serve-region.py:8 | delete |
| `shareMap` panel wiring | helper | maps/share.ts:5-8 | prototype/notes-share-adapter.ts:13, prototype/share-panel-adapter.ts:23,32 | `shareTextSnapshot` in runtime/text-share.ts |

## Delete candidates
| item | evidence | confidence |
|---|---|---|
| 9 one-line shims: maps/agent-context, background-navigation, cloud-session, contracts, device-navigation, guidance, route-distance, runtime, screen | Body is only `export * from '.eliza/.../plugin-maps/src/client/*'`; importers listed per report (app: ≤5 each; runtime.ts also ~9 browser specs in-page) | High (mechanical; many path pins) |
| `export *` lines in maps/agent-navigation.ts:2, maps/cloud-provider.ts:3, re-export in maps/share.ts:4 | pass-through of upstream names | High |
| `regionalDataset` + `RegionalDataset` (maps/regional-provider.ts:8-18) | `git grep regionalDataset` → only this file and test/dev-surface-gates.test.mjs:110,120 | High |
| Password import/export (passwords/password-manager.ts:8,54-60,133-136,245-263) + spec cases in test/browser/password-manager.spec.ts + MainActivity.java:360 registration | test-mocks only; PRD excludes import/export; ResetPolicyInstrumentedTest asserts plugin absent in product | Medium (owner) |
| `launcherListens` (native.ts:17-23) | evaluates to true on Android (all plugins declare addListener) and in the browser (no PluginHeaders); only reader main.tsx:192 | Medium |
| `openAppInfo` double cast (native.ts:25-26) | method belongs in the registered type | High (refactor, not deletion) |
| Identity re-validation (product/native-cloud-runtime.ts:8, scripts/agent-identity.ts:13) | literal, `satisfies`-typed registration | High |
| Channel validation in `resolveMapColors` (maps/map-plane.ts:33-36) + fake-serialisation cases in test/map-theme-colors.test.mjs:68-69 | browser serialisation is already valid; tests feed a stub | Medium |
| `alphaPaletteColor` (product/alpha-product.ts:64-67) | single caller model.js:3995 (Wallet chip) | Owner (with Wallet) |
| 146 `--alpha-photo-*` + 5 `--alpha-scan-photo-*` palette tokens (alpha-product-registration.ts:122-274) | only model.js synthetic photo art reads them | Owner |
| `--alpha-wallet-*` tokens, `inventory` view entries | Wallet only | Owner |
| `dailyApps: "alphaphone:daily:v1"` retained key | legacy notes source | Owner (with A1 notes chain) |
| README stale lines (prototype/README.md:24-26, 33) | test/fixtures-parity.test.mjs and fixtures-swap.test.mjs deleted in 8b88486c9; no `design/` dir | High |
| `passwordManagerHoldsEntries` export | read only by tests | Low (keep while fence tests stay) |

Corrected from the research report: `legacyIds` in alpha-product-registration.ts:325 is **not** an A1 legacy reader — upstream `product-registration.ts:320-345` requires every `rendererKeys` value to be a `legacyIds` key. Keep.

## Cross-file actions
1. **`@eliza/*` alias + shim removal** — add one wildcard alias (vite.config.ts `resolve.alias`, tsconfig.json `paths`, test/dev-surface-gates.test.mjs:19 alias copy) for `.eliza/client-features/*`; rewrite importers of the 9 maps shims: prototype/agent-adapter.ts, prototype/maps-adapter.ts, prototype/maps-chat-adapter.ts, runtime/device-actions.ts, runtime/phone-context.ts, runtime/action-message-presentation.ts, runtime/cloud-protocol.ts, browser/location-simulation.ts, browser/location.ts, browser/workflow-location.ts, browser/workflow-trigger-runtime.ts, maps/cloud-maps.ts, maps/regional-provider.ts, maps/resident-relay.ts, maps/saved-places.ts, maps/state.ts, maps/cloud-provider.ts; scripts/test-cloud-maps.ts, test-maps-device-navigation.ts, test-maps-reroute-freshness.ts; test/maps-navigation.test.mjs, test/maps-route-distance.test.mjs, test/cloud-maps-session.test.mjs (stub keys `./cloud-session`, `./runtime`), ~10 test/browser specs importing `/src/maps/runtime.ts` or `/src/maps/agent-context.ts`; quint harnesses specs/quint/refinement/native/navigation-progress.mjs, services/maps-screen-source.mjs, services/maps.mjs, services/maps-connection.mjs, legacy/maps/check-maps-refinement.mjs; manifests specs/quint/{application,native,services,legacy}/manifest.json `sources`; test/support/feature-parity.mjs:313-333 module inventory.
2. **basemap → map-plane** — maps/basemap.ts, maps/map-plane.ts, prototype/maps-adapter.ts:13, test/support/feature-parity.mjs:316.
3. **Cloud binding type + compare helper** — runtime/connection-ui.tsx (export `CloudBinding`, `sameCloudBinding`), maps/agent-navigation.ts, maps/cloud-maps.ts, browser/voice.ts, prototype/inbox-cloud-adapter.ts, runtime/google-accounts.ts; keep quint-pinned local names (`sameAccount`, `previous`, `seen`, `pending`).
4. **Typed native plugin handles** — native.ts (+ `openAppInfo`, Alpha-only ElizaSystem methods, `openHomeChooser`), platform-plugins.ts (`pluginHasMethod`), maps/native-location.ts (export ElizaLocation handle), startup-permissions.tsx:22, browser/workflow-trigger-runtime.ts:53, prototype/agent-adapter.ts:84, prototype/settings-adapter.ts:124, runtime/error-boundary.tsx:49-56, browser/device-controls.tsx:47, runtime/native-connection.ts:14-217, main.tsx:192,369, passwords/password-manager.ts:80, prototype/browser-adapter.ts:23, runtime/workflow-presentation.ts:46.
5. **`launcherListens` removal** — native.ts, main.tsx:64,192 (pass `follow: true` or drop), prototype/home-shell.ts:44,120 if the option is dropped.
6. **Password transfer removal (owner)** — passwords/password-manager.ts, test/browser/password-manager.spec.ts, android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java:360, android ResetPolicyInstrumentedTest.java:33 (assertion becomes trivially true; keep or drop).
7. **plugin-native-passwords projection** — scripts/prepare-client-features.ts, vite.config.ts (alias; `server.fs.allow`), tsconfig.json, passwords/password-manager.ts:7-10, passwords/dev-vault.ts:1-2, native.ts:3 (plugin-native-system type), upstream.lock.json unaffected.
8. **dev-vault and regional provider into `dev/`** — passwords/dev-vault.ts, maps/regional-provider.ts, vite.config.ts:27-34,78-84 (stub keys and owner list), maps/map-plane.ts:5, prototype/maps-adapter.ts:14, scripts/audit-production-bundle.ts:46 (comment), test/dev-surface-gates.test.mjs:100-120, test/password-dev-editor.test.mjs:4, specs/quint/application/manifest.json:390, specs/quint/refinement/application/contracts.mjs:94, test/support/feature-parity.mjs:326,335.
9. **One product character** — product/native-cloud-runtime.ts, scripts/agent-identity.ts, test/product-character-host.test.mjs:18-20 (rewrite the vm eval to an import), test/cloud-deployment.test.mjs:174.
10. **Storage keys from the registration** — product/alpha-product-registration.ts `storage.retained` plus the 15+ consumers listed in its report (main.tsx, connection-ui.tsx, hosted-digest-ui.tsx, hosted-live-source-ui.tsx, prototype/workflow-authoring.ts, data-adapter.ts, settings-adapter.ts, six browser/* files, startup-permission-flow.ts, startup-permission-progress.ts, browser-notes-document.ts, notes-secure-store.ts).
11. **Settings row factory** — passwords/password-manager.ts:164-171, prototype/settings-adapter.ts:763-792, prototype/native-adapter.ts:335.
12. **Shared share-panel wiring** — maps/share.ts, prototype/notes-share-adapter.ts, prototype/share-panel-adapter.ts, runtime/text-share.ts or runtime/share-panel.ts; test/cloud-maps-session.test.mjs share stubs.
13. **OwnerRouteTable type** — product/owner-route-table.ts, runtime/owner-route-policy.ts:5-8 (drop cast and load-time validation), test/owner-route-parity.test.mjs (hold the `{id}` rule).
14. **Photo-art palette to fixtures (owner)** — product/alpha-product-registration.ts:122-274, prototype/model.js (PH_TONES etc.), prototype/fixtures.js / fixtures.empty.js, test/theme-palette.test.mjs.

## Text/path pins
- `test/support/feature-parity.mjs:313-337` — exact module inventory includes every maps/*.ts, native.ts, passwords/*.ts, platform-plugins.ts (product/ and README are not listed). Any delete/move/rename must edit it.
- Quint manifests: specs/quint/services/manifest.json (maps sources :348-409, 4383-4441, 4505-4539, 5050-5079, 5141-5163 incl. symbol pins `retireCloudMaps`, `previous`, `mapsSession`, `accountClient`, `sameAccount`, `keepCloudMapsCoverage`, `pending`, `seen`, `NavigationVoice`, `latest`, `owed`, `resume`, `owe`, `hiddenDuringSpeech`, `activeOffer`, `connected`, `withMapsNavigationRelay`, `residentMapsNavigationPort`, `MapsController`; product :2353-2355); specs/quint/native/manifest.json (:15, 624-633, 3683-3705 incl. `SharedLocation`, `ElizaLocation`); specs/quint/application/manifest.json (:17, 389-390, 2095-2096, 2303-2304, 2836-2839, 9500-9541 incl. `MapPlane`, `cloudMapsBasemap`); specs/quint/legacy/manifest.json:374-375.
- Quint harnesses compiling/reading these paths: refinement/native/navigation-progress.mjs:31-32, native/maps-location.mjs:28, native/credential-coordinator(-platform).mjs, services/maps-screen-source.mjs:24-26, services/maps.mjs:28-32, services/maps-connection.mjs:31-49 (stub resolution by specifier), services/maps-guidance-voice.mjs:33, services/resident-maps-relay-offer.mjs:28-29, application/map-plane-ownership.mjs:37 (reads cloud-provider.ts text, strips `export *`), application/maps-event-return.mjs:217, application/contracts.mjs:94-107, application/vault-coordinator.mjs:25-50, application/launcher-favorites.mjs:11-34, application/drawer-interaction-fixture.tsx:3, application/cloud-connection-notices.mjs:205, legacy/maps/check-maps-refinement.mjs:27-28, legacy/files-browser and legacy/notes-view (platform-plugins URL).
- Source-text tests (T1/T2): test/map-theme-colors.test.mjs:72-74 (map-plane.ts line 51 substring); test/navigation-voice.test.mjs:8-10, test/browser/native-speech.production.spec.ts:66-68, test/navigation-voice-pause.test.mjs:22 (navigation-voice.ts imports must stay single-line; injected names fixed); test/dev-surface-gates.test.mjs:100-120 (regional-provider.ts text); test/settings-truth.test.mjs:217-219 (password-manager.ts `leavePasswordEntry`/`clearSecrets` exact text); test/support/login-surfaces.mjs:146-147 (password-manager.ts line 305 pattern); test/login-surfaces.test.mjs:336 (no console in password-manager.ts); test/product-character-host.test.mjs:18-20 (native-cloud-runtime.ts evaluated with fixed scope; bio text in scripts/agent-identity.ts); test/one-runtime-profile.test.mjs:71-73 (native-cloud-runtime.ts text + scripts/native-google-product-host.ts re-export line); test/subscription-entitlement.test.mjs:154-156 (cloud-maps.ts importer of `readServiceLimit`); test/cloud-maps-session.test.mjs (stub keys = import specifiers of cloud-maps.ts and share.ts); test/font-license.test.mjs:290 (alpha-product-registration.ts references fonts).
- Build/config: vite.config.ts:33-34,80 (dev-vault stub keyed on `'./dev-vault'` and importer `passwords/password-manager.ts`); android/consumer-host.json:122 and test/android-host.test.mjs:107 (owner-route-table.ts path); scripts/apk.ts:1, scripts/android-host.ts:20 (serializer, byte-exact asset); scripts/native-google-product-host.ts:9 (native-cloud-runtime.ts); scripts/feature-manifest.ts:29 and scripts/agent-identity.ts:3 (registration path); scripts/audit-production-bundle.ts:46 (regional gateway comment); licenses/README.md:115 (points at prototype/README.md licensing section).

## New patterns
- **NEW-a: tiny single-consumer constant module** — maps/basemap.ts (5 lines, one importer). Treatment: fold into the nearest owner module. Close to D4 but not a re-export.
- **NEW-b: upstream-candidate helper with no product input** — maps/agent-navigation.ts `keepCloudMapsCoverage` takes everything through options; it belongs upstream beside `bindAgentNavigation`. Treatment: move upstream, advance the lock.
- **NEW-c: identifier names pinned by formal manifests** — quint `symbols` entries pin local variable names (`pending`, `seen`, `previous`, `latest`, `owed`, `activeOffer`, `hiddenDuringSpeech`). Renames that a formatter or refactor would do freely break `npm run verify`. This is T10 applied to locals; implementers must grep the manifests before renaming.
- **NEW-d: import specifier pins via esbuild stub maps** — test/cloud-maps-session.test.mjs and specs/quint/refinement/services/maps-connection.mjs stub modules by the exact import specifier string, so switching `./runtime` to an alias silently un-stubs it. Same family as T2.

## Owner questions
1. Delete password import/export (passwords/password-manager.ts transfer group, spec cases, MainActivity `PasswordTransferPlugin` registration)? The PRD excludes import/export; it is reachable only in test-mocks builds.
2. Are the synthetic placeholder photographs (model.js `PH_TONES` and friends) reachable in production builds? If not, may the 151 `--alpha-photo-*`/`--alpha-scan-photo-*` tokens move out of the product registration into fixtures?
3. Wallet (AP-13 deferred): remove the `inventory` view, its palette tokens and `alphaPaletteColor`?
4. Should `keepCloudMapsCoverage` move upstream into plugin-maps (requires an upstream PR and lock advance)?
5. Should upstream plugin-maps export the Cloud Google provider id (`'eliza-cloud-google'`, maps/cloud-provider.ts:5)?
6. The map route accent `'#1616d8'` (maps/map-plane.ts:51) is not in the product palette while all other map colours are — palette token or deliberate?
7. Is `launcherListens` still needed (it is always true on shipped Android and in the browser)?
8. Should plugin-native-passwords be projected into `.eliza/client-features` so the app stops importing `vendor/eliza` directly (passwords/*.ts, native.ts:3)?
9. `storage.retained.dailyApps` (`alphaphone:daily:v1`) goes with the legacy notes chain — same decision as research n–z §7 Q1.
