# specs/quint/native/NativeSettingsHandoff.qnt
- Lines: 129 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles text slices of `AlphaDevicePlugin` and of Capacitor `PluginCall` plus upstream `SystemSettingsPages` | Verdict: KEEP (harness: PORT)
- Covers: System Settings handoff: allowlisted pages and their broader fallbacks, one accepted start, exact opened reply, task flags only for the launcher variant, own-package data for permission pages, password-provider picker vs Settings fallback (7 runs, 4 invariants). Duplicates: none. Callers/importers: manifest (sources `AlphaDevicePlugin`, `PasswordProviderSupport`, `consumer-host.json`, upstream `SystemSettingsPages`); `specs/quint/refinement/native/settings-handoff.mjs` (+`settings-handoff-platform.mjs`); `test/quint-native-settings-handoff.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `settings-handoff-platform.mjs:11-34,141` | T10 | Slices `AlphaDevicePlugin.java` from ` private static Intent handOff(` and from ` @PluginMethod public void openSettings(` to ` private final java.util.concurrent.ExecutorService diagnosticsWorker`, and `node_modules/@capacitor/.../PluginCall.java` between `getString`/`getInt`. All anchors still exist today, but the AlphaDevicePlugin split (D1) will break them. | PORT: move `openSettings` + `handOff` into a `SystemSettingsHandoff` class compiled whole; stub `PluginCall` directly instead of slicing node_modules. | Medium |
| 2 | 124-128 | owner question (D16) | `absentHostAnswersOnlyExplicitSystemAsBuiltTest` and `queuedDispatchUsesPlatformAfterRetirementAsBuiltTest` pin as-built behaviour (a destroyed Activity still dispatches the queued Settings intent; a missing host answers `threw` for pages). These look like defects recorded as tests. | List in the PR owner questions; keep as-is until answered. | — |
| 3 | 59-60 | — | Hard-codes `package:proton.android.pass` as the provider picker data; matches `PasswordProviderSupport`. Fine, noted for renames. | None. | — |
| 4 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |

## Proposed end state
Model unchanged. Harness compiles an extracted `SystemSettingsHandoff` class and a hand-written `PluginCall` stub; no text slicing of Alpha or node_modules sources. One runner, path-filtered.
