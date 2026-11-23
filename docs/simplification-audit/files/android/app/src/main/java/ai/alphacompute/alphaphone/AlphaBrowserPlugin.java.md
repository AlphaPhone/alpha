# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaBrowserPlugin.java
- Lines: 32 | Role: Capacitor `AlphaBrowser` = shared `BrowserTabHostPlugin` with Alpha's config/stores and a speech-cancel hook into `AlphaVoiceCloudPlugin`. | Verdict: SIMPLIFY
- Importers: `MainActivity` registration; androidTest `BrowserContinuityInstrumentedTest`, `BrowserCookiePolicyInstrumentedTest`, `BrowserExternalHandoffInstrumentedTest`, `BrowserSigninsInstrumentedTest`, testMocks `BrowserAutofillInstrumentedTest`. Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/services/manifest.json`, `specs/quint/refinement/native/note-bridge-platform.mjs`, `test/browser-reading-capability.test.mjs`, `test/browser-tab-host-identity.test.mjs` (reads constants by name), `test/browser-web-features.test.mjs`, `test/login-surfaces.test.mjs`, `test/native-plugin-teardown.test.mjs`, `test/support/{feature-parity,login-surfaces}.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-23 | D4 | Re-exports `PERSISTENT_PROFILE`, `PRIVATE_PREFIX`, `LEGACY_PREFIX` from `AlphaBrowserStores` and wraps `ephemeralProfile(name)`. Production callers: none (grep `AlphaBrowserPlugin\.(PERSISTENT_PROFILE|...)` hits only 4 androidTest classes). | Delete lines 18-23; point the 4 androidTest classes at `AlphaBrowserStores.*` / `AlphaBrowserStores.IDENTITY.ephemeral(...)`. | Low; `test/browser-tab-host-identity.test.mjs:33` resolves constants by name — check which file it reads. |
| 2 | 21-22 | A1 | `LEGACY_PREFIX` ("Builds before the sign-in decision gave every tab an ephemeral profile"). | Delete with `AlphaBrowserStores.LEGACY_PREFIX` (owner decision A1). | Low |
| 3 | 28-31 | D3 | Plugin-to-plugin call through `getBridge().getPlugin("AlphaVoiceCloud")` + `instanceof`. Acceptable bridge lookup; becomes a direct service call if browser speech moves out of `AlphaVoiceCloudPlugin` (research P3). | Keep for now. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PERSISTENT_PROFILE`, `PRIVATE_PREFIX`, `LEGACY_PREFIX` | const (alias) | 19-22 | `AlphaBrowserStores:25-29` (originals) | delete aliases |
| `ephemeralProfile` | helper | 23 | `AlphaBrowserStores.IDENTITY.ephemeral` | delete |

## Proposed end state
~22 lines: the annotation, the three overrides (`tabHostConfig`, `openBookmarkStore`, `openSessionStore`) and `cancelReadingSpeech`.

## Verification
Browser instrumentation (`BrowserContinuity`, `BrowserCookiePolicy`, `BrowserExternalHandoff`, `BrowserSignins`), `test/browser-tab-host-identity.test.mjs`, `test/native-plugin-teardown.test.mjs`; Android build (androidTest compile).
