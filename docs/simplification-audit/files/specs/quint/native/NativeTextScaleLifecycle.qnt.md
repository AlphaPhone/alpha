# specs/quint/native/NativeTextScaleLifecycle.qnt
- Lines: 163 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles a text slice of `AlphaDevicePlugin` and of Capacitor `PluginCall` with `MainActivity` platform helpers | Verdict: KEEP (harness: PORT)
- Covers: Installed text-scale preference: per-Activity WebView zoom from system font class × preference, queued bridge writes, destroyed owner cannot publish to successor, unconfirmed writes and restart semantics (5 runs, 3 invariants). Duplicates: Playwright settings journeys cover the renderer slider only. Callers/importers: manifest (sources `AlphaDevicePlugin`, `MainActivity`, `AndroidManifest.xml`); `specs/quint/refinement/native/text-scale-lifecycle.mjs` (+`text-scale-platform.mjs`, `main-activity-platform.mjs` 587 lines); `test/quint-native-text-scale-lifecycle.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `text-scale-platform.mjs:11-50` | T10 | Slices `AlphaDevicePlugin.java` between ` static int textScalePercent(` and ` @PluginMethod public void snapshot(`, slices `PluginCall.java` from node_modules, and patches anchors with unique-match asserts; `main-activity-platform.mjs:562-578` reads `MainActivity.java` text. | PORT: move text-scale logic into a `TextScale` class (part of the AlphaDevicePlugin split) compiled whole; stub `PluginCall` directly. | Medium |
| 2 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |
| 3 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |

## Proposed end state
Model unchanged; harness compiles an extracted `TextScale` class and a stub `PluginCall`; one runner; path-filtered.
