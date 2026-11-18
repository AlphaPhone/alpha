# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMapsTransportPlugin.java
- Lines: 109 | Role: Capacitor `AlphaMapsTransport` bridge with two unrelated halves: (a) a test-mocks-only HTTP proxy to the emulator regional-maps gateway (`request`/`cancel`, lines 21-67), (b) the background-navigation session API over `AlphaNavigationService` used in every build (68-108). | Verdict: SPLIT (dev transport out of the product plugin)
- Importers: `MainActivity.java:333`. Renderer: `apps/app/src/maps/regional-provider.ts:33` (transport; only meaningful when `testMocksEnabled`, gateway `http://10.0.2.2:47850`), `apps/app/src/prototype/maps-adapter.ts:80` (navigation methods). Text/path pins: `test/native-plugin-teardown.test.mjs`, `test/plugin-worker-guard.test.mjs:28` (`workers`,`closers`,`deadlines`), `test/support/feature-parity.mjs`, `specs/quint/native/manifest.json`, `specs/quint/services/manifest.json`, `specs/quint/refinement/native/navigation-service.mjs:19` (javac-compiles this file) and `NavigationServiceTraces.java:17,26` (instantiates it), androidTest `MapsBackgroundNavigationInstrumentedTest:101`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-14, 21-67 | D6, D5 | 47 lines plus three executors (`workers` 3 threads, `deadlines`, `closers`) exist only for `ELIZA_DEV_ALLOW_TEST_MOCKS` builds: `DEVELOPMENT_ORIGIN=BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS?"http://10.0.2.2:47850":""` and `request` refuses otherwise. Product builds compile and instantiate all three pools for nothing. | Move `request`/`cancel`, `Pending`, the three executors and `earlyCancelled` to the `testMocks` source set (`consumer-host.json` `testMocks.debug.java`) as a separate `AlphaMapsDevTransportPlugin` registered under test mocks (as `PasswordTransferPlugin` is in `MainActivity.java:358-361`), or keep the Capacitor name by registering the dev subclass instead. Product `AlphaMapsTransportPlugin` keeps only navigation (~45 lines). | Medium: `regional-provider.ts` registers transport and navigation under one name; the dev plugin must keep the name `AlphaMapsTransport` in test-mocks builds (subclass) or the renderer must use two names. `plugin-worker-guard.test.mjs:28` changes. |
| 2 | 38 | B4 | `if(!BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS||DEVELOPMENT_ORIGIN.isEmpty()||destroyed)` — the second operand is implied by the first (same constant). | Drop `DEVELOPMENT_ORIGIN.isEmpty()`. | none |
| 3 | 41, 67 | C3 | Request id regex `[a-zA-Z0-9_-]{1,80}` written twice. | `private static final String REQUEST_ID`. | none |
| 4 | 52-53 | C3, P9 | Hand-rolled `HttpURLConnection` setup (no cache, no redirects, timeouts) — one of 7 copies (research P9). | Falls away with finding 1 in product code. | none |
| 5 | 58-59 | C3, P9 | Bounded stream read loop (2 MiB) — bounded-read twin of `AlphaNoteRecorder.readJournal`, `AlphaLocalAgentPlugin.configureNativeViews`. | Shared `BoundedIo.read(in, limit, cancelled)` if kept. | none |
| 6 | 62 | B1 | `catch(Exception unavailable){job.reject(job.cancelled?"Regional request cancelled":"Regional service unavailable");}` — dev-only. | Leave (dev code). | — |
| 7 | 72, 74 | P8 | `activity instanceof MainActivity&&!isFinishing()&&!isDestroyed()` for navigation-open consumption. | Fine; uses MainActivity state, keep. | — |
| 8 | 69 | C3 | `text(call,name)` truncates to 200; `AlphaNavigationService.bounded` also truncates to 200 and strips control chars. | Delete `text()`; pass raw strings — `AlphaNavigationService.start/update` already bound them (`Session` ctor and `update` call `bounded`). | none (same final value) |
| 9 | 3-11 | D8 | Wildcard imports `java.net.*`, `java.io.*`, `java.util.concurrent.*` mostly for the dev half. | Goes with finding 1. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Pending` | class | 28-34 | none (dev-only) | dev plugin in `testMocks` |
| `DEVELOPMENT_ORIGIN` | const | 36 | renderer `regional-provider.ts:27` `nativeGateway: testMocksEnabled ? 'http://10.0.2.2:47850' : ''` | dev plugin |
| `text(call,name)` | helper | 69 | `AlphaNavigationService.bounded` | delete |
| `navigationStops` | listener | 68 | none | stays |

## Proposed end state
Product file ~45 lines: navigation methods (`consumeNavigationOpen`, `clearNavigationOpen`, `navigationAvailability`, `start/update/stopNavigation`), `navigationStops`, `destroyed`, `handleOnDestroy`. Dev transport (~60 lines) in the test-mocks source set. Net product reduction ~60 lines; three executors gone from release builds.

## Verification
Quint `navigation-service.mjs` (compiles this file; adjust the compiled list), `MapsBackgroundNavigationInstrumentedTest`, Maps Playwright journeys under test mocks (regional gateway), `scripts/audit-production-bundle.ts` / APK audit (no `10.0.2.2` in release), both distribution variants built.
