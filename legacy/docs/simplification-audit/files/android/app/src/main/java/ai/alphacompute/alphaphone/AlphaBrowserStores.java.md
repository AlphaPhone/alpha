# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaBrowserStores.java
- Lines: 60 | Role: Alpha's installed identifiers for the shared browser tab host (profile names, prefixes, preference files, Keystore aliases) and factories for the encrypted bookmark/session stores. | Verdict: SIMPLIFY (small)
- Importers: `AlphaBrowserPlugin`; androidTest `BoundedActivityScenario`, `BrowserContinuity`, `BrowserSignins`, `BrowserStorageFormat`, `BrowserWebFeatures`. Text/path pins: `test/browser-construction.test.mjs:28` (copies the builder text incl. `.legacyEphemeralPrefix("alpha_public_")`), `test/browser-site-permissions.test.mjs:21` (regex `new BrowserSessionStore\(context\.getSharedPreferences\(SESSION_PREFERENCES,...\),sealer\(SESSION_KEY_ALIAS,2000000\)\)`), `test/browser-tab-host-identity.test.mjs:33-47`, `test/browser-web-features.test.mjs`, `test/login-surfaces.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28-29, 35 | A1 | `LEGACY_PREFIX="alpha_public_"` "Builds before P-04 gave every tab an ephemeral profile; leftovers are purged at start", fed to `.legacyEphemeralPrefix(LEGACY_PREFIX)`. Under the renamed package no such profiles exist. | Owner decision A1: delete the constant and the builder call (upstream option stays optional). Edit `test/browser-construction.test.mjs` and `test/browser-tab-host-identity.test.mjs` assertions. | Low |
| 2 | 14-20 | A8 | Class comment "identifiers ... that earlier builds wrote, so website sign-ins ... stay readable" frames current names as legacy. These ARE the current written names. | Reword: "Alpha's persisted browser identifiers; never rename." | None |
| 3 | 23, 37 | C6 | `HOST_SCHEMES=Set.of("alphaphone")` and `.hostScheme("alphaphone")`; also `AlphaConnectionPlugin.DELEGATION_SCHEME` and `AndroidManifest.xml:134`. | One `AppLinks.SCHEME` constant (or reuse `DELEGATION_SCHEME`). | Low |
| 4 | 53-59 | C4 (P7) | `sealer()` anonymous adapter turning `KeystoreTextFrame` into `BrowserSealedText` (two forwarding methods). | Upstream: let `KeystoreTextFrame` implement `BrowserSealedText` (or a lambda pair); then `sealer` is `new KeystoreTextFrame(alias,max)`. | Low; regex pin in `test/browser-site-permissions.test.mjs:21` names `sealer(`. |
| 5 | 44-45 | — | Preference and Keystore alias names are persisted formats. | Keep byte-for-byte. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `HOST_SCHEMES` | const | 23 | `AlphaConnectionPlugin.DELEGATION_SCHEME` (:30), manifest `alphaphone` scheme | shared `AppLinks` constant |
| `LEGACY_PREFIX` | const | 29 | `AlphaBrowserPlugin.LEGACY_PREFIX` alias | delete (A1) |
| `sealer` | adapter | 53-59 | slot/codec adapters across main (P7) | upstream |

## Proposed end state
~54 lines: current identifiers, `IDENTITY` without the legacy prefix, the two store factories. Values of all persisted names unchanged.

## Verification
`BrowserStorageFormatInstrumentedTest`, `BrowserContinuityInstrumentedTest`, `BrowserSigninsInstrumentedTest`; `test/browser-construction.test.mjs`, `test/browser-tab-host-identity.test.mjs`, `test/browser-site-permissions.test.mjs`.
