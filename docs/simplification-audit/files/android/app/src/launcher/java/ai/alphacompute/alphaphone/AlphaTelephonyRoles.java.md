# android/app/src/launcher/java/ai/alphacompute/alphaphone/AlphaTelephonyRoles.java
- Lines: 33 | Role: launcher-flavor switch that enables the disabled dialer/SMS role components (and MMS file provider) only while `AlphaImageCapability.verified` holds, and resets them to manifest default otherwise. Standalone twin `src/standalone/.../AlphaTelephonyRoles.java` is an empty `sync`. | Verdict: SIMPLIFY (small)
- Importers: 1 — `MainActivity.java:365` `AlphaTelephonyRoles.sync(this);`. Text/path pins: `test/aosp-image-capability.test.mjs:249-256` (regexes the SMS array text `AlphaSmsDeliverReceiver\.class, AlphaMmsWapPushReceiver\.class, ...`, reads the file, checks the standalone empty `sync`), `specs/quint/refinement/native/main-activity-platform.mjs` (stub class).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17, 22-23 | D9 | Two package-visible arrays `DIALER`, `SMS` read nowhere else (grep: 0 hits outside this file), then concatenated via `new java.util.ArrayList<>(java.util.Arrays.asList(DIALER)); components.addAll(...)`. | One `private static final Class<?>[] COMPONENTS={...}` and loop over it directly. | Low; `test/aosp-image-capability.test.mjs:249` regexes the array text — update the regex in the same change. |
| 2 | 22-29 | D8 | Fully qualified `java.util.*` and `android.util.Log` inline. | Imports. | None |
| 3 | 28-30 | B1 | `catch (RuntimeException refused) { Log.w(...) }` — logged, documented fallback (component state unchanged). | Keep. | — |
| 4 | 19 | P13 (android) | Gate is `AlphaImageCapability.verified` while `AlphaContactsPlugin`/`AlphaDeviceAppsPlugin` use the weaker `AlphaImageCapabilities.aospImage`. | Covered by the cross-file "one image admission" action; no local change. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DIALER`, `SMS` | const | 16-17 | component list also in `scripts/apk.ts:297`, `test/aosp-image-capability.test.mjs:238`, `test/verify-apks.test.mjs:357` | merge into one private array here |

## Proposed end state
~24 lines: one private component array, imports, the same enable/default loop with the logged catch. Standalone twin unchanged.

## Verification
`test/aosp-image-capability.test.mjs`, `specs/quint` main-activity refinement (stub only), Android build of both flavors; emulator HOME-role test does not prove image enablement (AOSP image boot needed).
