# android/app/src/main/res/values/eliza_passwords.xml
- Lines: 18 | Role: Alpha's overrides of the shared `plugin-native-passwords` library resources (vault directory, key alias, AAD, unlock window, biometric, browser-host mode, token scheme, Autofill label). | Verdict: SIMPLIFY (drop overrides equal to the library default)
- Importers: upstream `vendor/eliza/plugins/plugin-native-passwords/android/src/main/java/ai/eliza/plugins/passwords/PasswordsConfig.java:24-34` reads every name; `AndroidManifest.xml:111` (`@string/eliza_passwords_service_label`). Library defaults: `vendor/eliza/plugins/plugin-native-passwords/android/src/main/res/values/eliza_passwords.xml`. Text/path pins: none in test/scripts/specs.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | B4 / NEW (re-declared library default) | `<integer name="eliza_passwords_unlock_seconds">60</integer>` and `<bool name="eliza_passwords_allow_biometric">true</bool>` equal the library defaults (upstream file lines 10, 12). | Delete both lines, unless the owner wants Alpha to pin them against a future upstream default change (then add a comment saying so). | Low |
| 2 | 5-7 | — | Directory/alias/AAD differ from upstream (`passwords`, `alpha.passwords.vault.v1`) and are the installed-data contract; keep byte-for-byte. | — | — |
| 3 | 10-14 | — | Comment explains why `host_is_browser` is true (BrowserLoginFields field origins). Accurate. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin | Proposed home |
|---|---|---|---|---|
| 8 `eliza_passwords_*` resources | const | 5-17 | upstream defaults of the same names (intentional overrides) | here |

## Proposed end state
16 lines: the six overrides that differ from the library plus the two comments.

## Verification
APK build; `PasswordBrowserFillInstrumentedTest` / password vault instrumentation (unlock window and biometric behaviour unchanged because values equal defaults).
