# C-app-27: root build config (capacitor.config.ts, tsconfig.json, vite.config.ts)

Already done by stage A3 before this unit (found in the working tree): `@eliza-system` alias removed, `export` dropped
from `productionContentSecurityPolicy`, `existsSync(emptyFixturesModule)` fail-open tolerance and its comment removed.

## Done
- `vite.config.ts`: `app.config.json` read through a JSON import (`with { type: 'json' }`, same form as
  `capacitor.config.ts`), dropping `readFileSync`, the `{ version?: unknown }` cast and the `'0.0.0'` fallback for a
  tracked string field (B3/C3, U-B1 identity part; report finding 7).
- `vite.config.ts`: dead alias `@elizaos/contracts/stated-clock-time` removed (A7; finding 3). No importer in apps,
  test, specs, scripts or the generated `.eliza/client-features` tree.
- `tsconfig.json`: the same dead `@elizaos/contracts/stated-clock-time` path removed (A7; finding 3).
- `tsconfig.json`: `"ignoreDeprecations": "6.0"` removed (A8; finding 5). tsc 7.0.2 reports no deprecation without it.

## Deleted tests and formal artefacts
- None.

## Pins left broken
- None known. `specs/quint/refinement/application/account-sheet.mjs:68` esbuild-bundles vite.config.ts to list its
  inputs; `app.config.json` is now part of that graph and is already in its input list. Hash-based Quint inputs
  (services manifest, refinement harnesses listing vite.config.ts/tsconfig.json) change content hashes only and are
  refreshed by the normal `quint:check` run (not run here).

## Skipped
- Mock-admission stubs (finding 9): tried; with the two stubs removed, `npm run build` emitted
  `web-dist/assets/mock-admission-*.js`, so Rolldown does not drop those dynamic imports. Stubs restored unchanged.
- `/src/*` tsconfig path (finding 2): A3 found `typecheck:scripts` needs it; kept.
- Alias single source (finding 1, Q-BUILD-3 Open), `flagOn` single env name (finding 6, Q-BUILD-1 Open),
  cloud-deployment check location (finding 5, Q-BUILD-2 Open), Cartesia define (finding 13, Q-BUILD-5 Open),
  SystemBars mechanism (capacitor finding 3, Q-UI-8 Open).
- `@dev` alias replacing `disabledModuleSource` (finding 8, U-B2): cross-file move, stage F.
- `server.fs.allow` vendor entries (finding 4): needs a dev-server check of Passwords/Calendar; not verifiable here.
- capacitor.config.ts `android.path`/`allowMixedContent:false` (finding 1): explicit mixed-content refusal is a
  security setting (A3 B138); kept. capacitor.config.ts unchanged.
- Import grouping/formatting (findings 14-15): reformatting is stage F (Prettier).

## Verification
Node v26.13.0, in the worktree:
- `npx tsc --noEmit -p tsconfig.json`: no errors in owned files; 5 errors in other owners' files
  (`prototype/workflow-authoring.ts`, `runtime/device-record-presentation.ts`), none a deprecation diagnostic.
- `npm run --ignore-scripts typecheck:scripts`: one error in `scripts/test-agent-context-browser.ts` (other owner,
  `VerifiedSessionTransport.close`); no deprecation diagnostic.
- `npm run --ignore-scripts build`: built; `build-flags.json` is `{"testMocks":false}`; CSP meta present; `0.1.0`
  app version in the bundle; no `mock-admission` chunk after restoring the stubs.
- `npm run audit:bundle`: FAIL 1 denylist hit, "Simulate Clock request" in the index chunk, coming from
  `apps/app/src/prototype/clock-adapter.ts` (another owner's mid-edit file), not from this unit's changes.
- `node --test`: `dev-ui-remote-host` 3/3, `dev-local-launcher` 2/2, `cloud-voice-profile` 9/9 (uses
  `test/fixtures/shared-batch-voice.mjs`, which parses tsconfig paths), `dev-surface-gates` 8/8, `product-identity` 8/8.
- Not run: Playwright, `quint:check`, Android build (no Android files touched).
