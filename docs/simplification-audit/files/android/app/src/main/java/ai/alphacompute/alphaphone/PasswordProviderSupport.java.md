# android/app/src/main/java/ai/alphacompute/alphaphone/PasswordProviderSupport.java
- Lines: 66 | Role: Proton Pass provider metadata (installed/trusted publisher, autofill selection) and Settings/install/open intents for the Device plugin | Verdict: KEEP (small cleanups)
- Importers: `AlphaDevicePlugin:86,104`. Text/path pins: `test/login-surfaces.test.mjs`, `test/aosp-image-capability.test.mjs`, `specs/quint/native/manifest.json`, `specs/quint/application/manifest.json`, `specs/quint/refinement/native/settings-handoff.mjs`, `test/support/feature-parity.mjs`; `scripts/stage-native-apps.ts` pins the same certificate digest.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-25 | C3 | `trusted()` re-decodes the hex certificate on each call (up to 3 per `intent`/`status`). | `private static final byte[] CERTIFICATE_BYTES` decoded once (or `HexFormat` when minSdk ≥ 34). | None. |
| 2 | 17 | C6 | Certificate digest duplicated with `scripts/stage-native-apps.ts` (comment says so). | Keep; optionally generate one from the other. | None. |
| 3 | 37, 45 | B1 | `catch (RuntimeException unavailable) { /* Preserve unknown … */ }` — specified fallback ("unknown" state is user-visible). | Keep (documented). | — |
| 4 | — | — | Indentation (4 spaces) differs from the rest of the package (1 space). | Formatter pass (D8). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `PACKAGE`, `CERTIFICATE` | const | 15-17 | `scripts/stage-native-apps.ts` | here |

## Proposed end state
~62 lines; cached certificate bytes; behaviour and status strings unchanged.

## Verification
`test/login-surfaces.test.mjs`, Settings password-provider row in device acceptance.
