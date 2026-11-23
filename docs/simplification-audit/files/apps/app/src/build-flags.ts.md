# apps/app/src/build-flags.ts
- Lines: 11 | Role: build-time flags `testMocksEnabled`, `devSurfacesEnabled`, `privateLocalPreviewEnabled`, `updateChannelCheckEnabled` | Verdict: SIMPLIFY (and make it the single home of every flag — D5)
- Importers: 51 app files (every dev gate). Text/path pins: `test/settings-truth.test.mjs:20` regex `/export const updateChannelCheckEnabled = false as boolean;/` (T1); `test/dev-local-launcher.test.mjs:39` transplants the file replacing `import.meta.env` (T2); `test/one-runtime-profile.test.mjs:49` doesNotMatch on its text; browser specs import `/src/build-flags.ts` (`browser-cloud-dev.spec.ts:124`, `helpers/native-cloud-signin.ts:21`, `native-cloud-subscription.spec.ts:26,48`, `specs/quint/refinement/application/cloud-connection-notices.mjs:204`); `chat-dictation-api.spec.ts:14-15` and `voice-stop-speaking.spec.ts:6` route-stub the module with a hand-written export list; `specs/quint/application/manifest.json:479,502,506` (symbols `devSurfacesEnabled`, `testMocksEnabled`); `specs/quint/refinement/application/recovery-ui.mjs:33`, `surfaces.mjs:37` (source paths); android/scripts reference the env var name (`android/app/product.gradle`, `scripts/build-android.ts`, `scripts/audit-production-bundle.ts`), not this file. `vite.config.ts:95-98` emits the matching `build-flags.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-11 | A4 / A7 | `export const updateChannelCheckEnabled = false as boolean;` — 0 consumers in apps/android/scripts (git grep); kept alive only by the T1 assertion and two spec stubs; `as boolean` defeats narrowing | delete lines 7-11; delete `settings-truth.test.mjs:20-21` assertions; drop the name from the two route-stub bodies | none |
| 2 | 5 | D7 / research P18 | `import.meta.env !== undefined && …` Node-loader shim on one flag only (lines 2-3 have none) | remove the `!== undefined` guard once `dev-local-launcher.test.mjs:39` transplant is deleted/replaced | low |
| 3 | file | D5 / C6 | Flag zoo lives outside this file: `browser/dev-profile.ts:4` re-derives `devSurfacesEnabled`; `VITE_ELIZA_DEV_ALLOW_TEST_MOCKS` is read directly in `runtime/alpha-client.ts:185`, `cloud-protocol.ts:36,48`, `development-cloud-voice.ts:5,8`, `local-agent-storage.ts:9`, `local-agent.ts:71`, `native-connection.ts:156`, `remote-protocol.ts:81` | move `developmentBridgeAllowed`, `developmentCloudVoiceEnabled`, `browserDevProfile`/`developerTools` inputs here and import them | medium: each site uses `import.meta.env === undefined ||` (Node tests) — fix the test loader first |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `devSurfacesEnabled` | const | 3 | `browser/dev-profile.ts:4` | here only |
| `developmentBridgeAllowed` (external) | const | — | `local-agent.ts:71`, `local-agent-storage.ts:9` (verbatim) | here |

## Proposed end state
5-15 lines: `testMocksEnabled`, `devSurfacesEnabled`, `privateLocalPreviewEnabled` plus the flags moved in from runtime; no update-channel switch, no Node shim.

## Verification
`test/settings-truth.test.mjs`, `test/dev-local-launcher.test.mjs`, `test/one-runtime-profile.test.mjs`, production build + `npm run audit:bundle`, a `ELIZA_DEV_ALLOW_TEST_MOCKS=1` build, Quint application `surfaces.mjs`/`recovery-ui.mjs`.
