# C-app-08: maps/, native.ts, passwords/, platform-plugins.ts, product/, prototype/README.md

Stage A had already removed `regionalDataset`/`RegionalDataset` (regional-provider.ts), password import/export
(password-manager.ts), the Wallet tokens/`inventory` view/`dailyApps` key (alpha-product-registration.ts),
`alphaPaletteColor` (alpha-product.ts), the identity re-validation (native-cloud-runtime.ts) and the stale
fixtures-test sentence and wallet mention (prototype/README.md). No file in the list had been deleted.

## Done

- `apps/app/src/native.ts`: `System` is `registerPlugin<ElizaSystemPlugin>` from `native/eliza-system.ts` (drops the
  direct `vendor/eliza` type import and the `as unknown as {openAppInfo}` double cast; `openAppInfo` takes
  `AppInfoTarget` and calls `System.openAppInfo`); `export const System` at its declaration; `DeviceApps` is now
  `export { deviceApps as DeviceApps } from './native/device-apps'` (one typed registration instead of a second
  inline type). Export names unchanged. (C2, B2, D8; B2-migration-map ElizaSystem and DeviceApps rows)
- `apps/app/src/maps/resident-relay.ts`: hand-written plain-object guard replaced by `asRecord(value)` from
  `lib/parse` (validation at the agent wire boundary kept). (C3; B1-migration-map `asRecord` row)
- `apps/app/src/maps/cloud-maps.ts`: nested `if (changed) { if (configured) retire }` collapsed to one condition;
  both comments kept. Pinned names (`previous`, `retireCloudMaps`, `sameAccount`, `mapsSession`, `accountClient`)
  unchanged. (D9)
- `apps/app/src/maps/map-plane.ts`: five copies of `new Error('Map theme colors are unavailable.')` replaced by one
  local `unavailable()` factory inside `resolveMapColors` (kept inside the function so the
  map-theme-colors transplant slice still contains it); commit hash `(plugin-maps 5176c4523c)` dropped from the
  class comment. (C6, A8)
- `apps/app/src/maps/native-location.ts`: one `available` predicate for both `isPluginAvailable('ElizaLocation')`
  uses; one-line reason on the catch that maps a failed permission read to "not granted". (C6, B1 note)
- `apps/app/src/maps/regional-provider.ts`: issue number `(#412)` dropped from the comment. (A8)
- `apps/app/src/passwords/password-manager.ts`: `AlphaBrowser` typed as `Pick<BrowserTabHostPlugin,'loginFillStatus'>`
  (type-only import from the `.eliza` projection; B2-migration-map row); `else` after `return` in `refresh()`
  removed (D9); unused `disabled` parameter of `button()` removed (always `false` at every call), so
  `dis: !!busy` and `primary ? … : …` (behaviour identical).
- `apps/app/src/passwords/dev-vault.ts`: `Record_` renamed `DevPasswordRecord` (types.md). (C1)
- `apps/app/src/product/alpha-product.ts`: history-narrating sentence in the `viewPaths` doc rewritten as current
  behaviour. (A8)
- `apps/app/src/prototype/README.md`: removed the sentence about a repository `design` directory (none exists). (A8)

## Deleted tests and formal artefacts

None.

## Pins left broken

None known. Checked: `test/map-theme-colors.test.mjs` (slice markers and line-51 substring intact),
`specs/quint/refinement/application/vault-coordinator.mjs` (import-stripping eval of password-manager.ts; all
observed names intact), `test/dev-surface-gates.test.mjs` regional transplant (only a comment changed),
quint services/native manifests' symbol pins (no pinned name changed).

## Skipped

- Nine one-line `export *` shims (agent-context, background-navigation, cloud-session, contracts,
  device-navigation, guidance, route-distance, runtime, screen), `basemap.ts` merge into map-plane.ts, the
  `export *` lines in agent-navigation.ts / cloud-provider.ts and the re-export in share.ts: need importer
  rewrites in files owned by others, the `@eliza/*` alias, esbuild stub-key updates
  (cloud-maps-session.test.mjs, maps-connection.mjs) and many quint/feature-parity path pins. Stage F (D13/D4).
- `CloudAccount` / `BoundClient` → `CloudBinding`, and `sameCloudBinding()`: owner (connection-ui.tsx) does not export
  them yet; no new shared helper created here.
- `Request` in resident-relay.ts → `OwnerRequest`: runtime/alpha-client.ts does not export it yet.
- `Bag` in password-manager.ts → `LooseRecord`/`SettingsRow`: neither exists yet; settings-row factory (cross-file
  action 11) touches settings-adapter.ts/native-adapter.ts.
- regional-provider.ts `registerPlugin<RegionalOptions['transport']>('AlphaMapsTransport')` → `alphaMapsTransport`
  (B2 map): test/dev-surface-gates.test.mjs transplants this file and injects `registerPlugin`; the switch would
  break a gate test file that covers many other production gates. Left for the harness port.
- regional-provider.ts D5 ternary collapse / move to `dev/`: move is stage F; the ternaries are what the gate
  transplant evaluates.
- map-plane.ts channel-validation deletion: not impossible state (a theme token in `oklch()`/`color()` serialises
  as non-rgb in real browsers; the existing test covers `color(display-p3 …)`), so the check is kept.
  Constructor/padding extraction: reformat plus line-51 text pin; stage F.
- map-plane.ts `accent:'#1616d8'`, cloud-provider.ts `'eliza-cloud-google'`, `keepCloudMapsCoverage` upstream:
  Open (Q-UP-1).
- native.ts `launcherListens` and `pluginHasMethod` in platform-plugins.ts: Open (Q-UI-25); a new helper with only
  other owners' callers was not added.
- `plugin-native-passwords` projection (vendor imports in passwords/*.ts): Open (Q-BUILD-6).
- Photo-art palette tokens in alpha-product-registration.ts: Open (Q-DEV-6). `storage.retained` consumers
  (cross-file action 10): files owned by others.
- native-cloud-runtime.ts one product character with scripts/agent-identity.ts: needs product-character-host
  test rewrite (vm eval with fixed scope) and a scripts/ edit; stage E/F.
- owner-route-table.ts `OwnerRouteTable` type: only useful with the owner-route-policy.ts cast removal (other owner).
- navigation-voice.ts listener helpers, `isAbortError`, owner-fence extraction: the B1 map leaves the duck-typed
  `AbortError` test local; navigation-voice tests eval the text with a fixed injected name set; owner fence helper
  does not exist yet.
- share.ts statement split / `Object.freeze` / shared share-panel wiring: reformat or cross-file (action 12).
- state.ts, saved-places.ts: report verdict KEEP (only formatting).
- dev-vault.ts timer not cleared on Hide: harmless, not a simplification; left.
- `passwordManagerHoldsEntries`: kept while its fence tests stay (report).

## Verification

- `npx tsc --noEmit -p .`: no errors at all (empty output).
- `node --test test/password-manager.test.mjs test/password-manager-fences.test.mjs test/password-manager-hidden.test.mjs test/password-dev-editor.test.mjs test/map-theme-colors.test.mjs test/cloud-maps-session.test.mjs test/maps-navigation.test.mjs test/google-maps-content.test.mjs test/product-identity.test.mjs test/home-agent-navigation.test.mjs`: 95 pass, 0 fail.
- `node --test --test-name-pattern=regional test/dev-surface-gates.test.mjs`: 1 pass, 0 fail.
- `node --import tsx scripts/test-maps-device-navigation.ts` and `scripts/test-cloud-maps.ts`: exit 0.
- `node specs/quint/refinement/application/vault-coordinator.mjs`: `{"passed":true,"traces":9,"checkpoints":54}`.
- Not run: `npm run build`/`audit:bundle` (parallel stage), Quint model checks (services maps-connection,
  resident-maps-relay-offer, native maps-location), Playwright specs. No Android files touched.
