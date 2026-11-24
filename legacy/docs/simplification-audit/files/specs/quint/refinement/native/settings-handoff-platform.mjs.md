# specs/quint/refinement/native/settings-handoff-platform.mjs
- Lines: 151 | Kind: refinement fixture; **slices product and Capacitor text** (T10) | Verdict: PORT
- Covers: ports for `settings-handoff.mjs` (Settings constants, Intent, Activity start outcomes, PackageManager certificate admission, Autofill manager). Callers/importers: `settings-handoff.mjs` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-14,27-35 | T10 | Cuts `AlphaDevicePlugin.java` at `' private static Intent handOff('` → `' /**\n  * Asks Android'` and `' @PluginMethod public void openSettings('` → `' private final java.util.concurrent.ExecutorService diagnosticsWorker'`, wrapped in a synthetic `AlphaDevicePlugin extends Plugin`. Depends on member order and on comment text. Anchors exist today. | Product: extract `SettingsHandoff.java` (package-private: `static Intent handOff(Intent)`, `static void open(Activity, Context, String page, Result)`), have `AlphaDevicePlugin.openSettings` forward to it (fits the U-A1 "thin AlphaDevicePlugin"). Harness compiles `SettingsHandoff.java` whole. `handOff` is also sliced by `update-barrier.mjs:31`; one class serves both. | M |
| 2 | 141-142 | T10 | Cuts Capacitor's `node_modules/.../PluginCall.java` from `'    public String getString(String name)'` to `'    @Nullable\n    public Integer getInt'` and strips `@Nullable`. A Capacitor upgrade can break it. Same trick in `text-scale-platform.mjs:49`. | Use one hand-written `PluginCall` stub (`getString(k)`, `getString(k,def)` with JSON semantics) from `refinement/native/support/`. | L |
| 3 | 89-90 | – | Proton Pass certificate SHA-256 hard-coded as oracle in the PackageManager stub. Acceptable (independent oracle), but it is a third copy of the value. | Keep; name the constant. | L |
| 4 | 19-25 | – | Settings action constants as distinct string symbols: good for observing exact actions. | Keep. | – |

## Proposed end state
Stubs only (no product or Capacitor text reads); `SettingsHandoff.java` and `PasswordProviderSupport.java` compiled
whole with the staged/vendor `SystemSettingsPages.java`. ~110 lines.
