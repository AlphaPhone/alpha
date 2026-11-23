# specs/quint/services/AndroidBrowserModuleStage.qnt
- Lines: 85 | Kind: Quint model, live (registered in `specs/quint/services/manifest.json`, 8 tests, 4 invariants, no symbols); models build tooling | Verdict: KEEP (owner question on build-tool models)
- Covers: one pinned-source staging key per manifest generation for the separately compiled native browser module. It checks four things: the published Gradle host only references a staged module, success binds the current reviewed cache, an owned incomplete host keeps its profile, and receipt acceptance requires the exact current cache. Modelled code: `scripts/android-host.ts`, `scripts/prepare-patched-native.ts`, `scripts/upstream-native-source.ts`, `android/consumer-host.json`, `android/upstream-native-sources.json`, plus 3 `vendor/eliza` files (consumer-host generator, settings.gradle, browser-surface build.gradle). All exist. Duplicates: none in Quint. The APK build exercises the same staging end to end. Callers: harness `specs/quint/refinement/services/android-browser-module-stage.mjs` (81 lines, which drives the real staging through `test/fixtures/android-browser-module-stage.mjs`), wrapper `test/quint-android-browser-module-stage.test.mjs`, aggregate `refinement/services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.3 / P1 | 3 of the 8 `sources` are `vendor/eliza` paths, and `android/consumer-host.json` is a hot Android input, so upstream pin bumps and Android packaging edits select this model for an Apalache run. | Keep the sources. They are the honest inputs. Gate the Apalache depth in CI as research §2.3 proposes. | low |
| 2 | 52-56 | — | The `step` relation is a plain `any` over the 7 actions with small finite domains. It is clear and needs no change. | — | none |
| 3 | whole | §2.11 | This is a model of a build script. The research suggests dropping such models ("their e2e test is the build"). The owner's rule keeps models of live code, and these scripts are live (`android:build`, `agent:stage-android`). | KEEP under D11. Ask the owner whether build-tool models count as "live product code". | owner |

## Proposed end state
Unchanged model. Harness stays import-based. If the owner retires build-tool models, delete this model, its harness, fixture `test/fixtures/android-browser-module-stage.mjs` (after checking it has no other importer) and its wrapper together, and lower the `services` floor in `test/quint-checker.test.mjs:32`.
