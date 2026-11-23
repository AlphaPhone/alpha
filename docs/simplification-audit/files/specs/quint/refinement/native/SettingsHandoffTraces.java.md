# specs/quint/refinement/native/SettingsHandoffTraces.java
- Lines: 130 | Kind: Quint refinement harness (members **text-extracted** from product `AlphaDevicePlugin.java` (`handOff`, `openSettings` ... ) + whole `PasswordProviderSupport.java` + staged upstream `SystemSettingsPages.java`, closed Activity stub) | Verdict: KEEP harness; driver PORT (stop slicing `AlphaDevicePlugin`)
- Covers: Settings deep links: every allow-listed page opens, missing pages fall back to the generic page, invalid/numeric/unknown page names are refused, absent or finishing/destroyed host answers "unavailable", password-provider setup reports only `destination`, untrusted/unsupported/absent/refused provider states. Duplicates: Playwright settings specs see only the renderer side; `test/app-update.test.mjs` / `update-barrier.mjs` also slice `handOff`. Callers/importers: `settings-handoff.mjs` (`checkNativeSettingsHandoff`) <- `index.mjs`, `test/quint-native-settings-handoff.test.mjs`.
- Model live: `specs/quint/native/NativeSettingsHandoff.qnt`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | driver `settings-handoff-platform.mjs:10-34` | T10 | `exact()` slices `AlphaDevicePlugin.java` from `' private static Intent handOff('` to the **Javadoc** `' /**\n  * Asks Android'`, and from `' @PluginMethod public void openSettings('` to `' private final java.util.concurrent.ExecutorService diagnosticsWorker'`; it also slices Capacitor `PluginCall.getString` text. Reordering members or editing that comment breaks it. | PORT: move `handOff`, `openSettings`, `openPasswordProvider` and their helpers out of `AlphaDevicePlugin` into a `SettingsHandoff.java` helper (part of the D1 split of `AlphaDevicePlugin`); the plugin method delegates. Compile the helper whole. | medium |
| 2 | 222-229 | — | Classifies by exact error strings (`"Unsupported settings page"`, `"This Android settings page is unavailable"`, password-provider message). These are user-visible copy; the model encodes them. | Keep. | none |
| 3 | 270-273 | B1 | `catch (NullPointerException absent)` treats an NPE as the "absent host" outcome, with a check that the host really is absent. Encodes current behaviour (plugin throws synchronously without an Activity). | Keep; owner question: should `openSettings` reject cleanly instead of throwing NPE? (behaviour change, D16). | low |
| 4 | driver `:24-33` | T1 / B3 | Driver deep-equals the `eliza-system` module entry of `android/consumer-host.json` and verifies the native patch receipt before running. Configuration check, not behaviour. | Drop the consumer-host assert; the receipt check belongs to `prepare-patched-native`. | low |
| 5 | test | B5 | `traces === 9`, `observedFields.length === 7`. | Assert `passed`. | low |

## Proposed end state
Same nine scenarios against a whole `SettingsHandoff.java` (+ `PasswordProviderSupport.java`, staged `SystemSettingsPages.java`), no member slicing, no config asserts.
Path filter: `AlphaDevicePlugin.java` / `SettingsHandoff.java`, `PasswordProviderSupport.java`, `upstream.lock.json`, `android/upstream-native-sources.json`, `patches/eliza/**`, `NativeSettingsHandoff.qnt`, `settings-handoff*.mjs`.
