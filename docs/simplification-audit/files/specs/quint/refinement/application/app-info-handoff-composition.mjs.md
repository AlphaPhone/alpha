# specs/quint/refinement/application/app-info-handoff-composition.mjs
- Lines: 138 | Kind: Quint refinement harness, composition (Chromium-mounted drawer bundle + real Java `AlphaSystemPlugin.openAppInfo` compiled with javac) | Verdict: KEEP, PORT dependencies (drawer text rewrite, Java seam rewrite)
- Covers: Home drawer long-press menu → App info for personal/work profile apps, native reply delivery to the exact selection, stale replies after drawer close/profile change, inventory refresh on removed packages, against `AppInfoHandoffComposition.qnt` (130 lines, live). Duplicates: `specs/quint/refinement/native/app-info-handoff.mjs` (native-only half), `drawer-interaction.mjs` (renderer-only half); Playwright drawer specs cover the menu but not the native reply. Callers/importers: `index.mjs`, `test/quint-app-info-handoff-composition.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9, 66-69 | T10 (inherited) | Uses `compileDrawerInteraction` from `drawer-interaction.mjs`, which rewrites `InstalledAppsGridDrawer.tsx` at literal lines (`'    opened = useRef<string | null>(null);'`, `'clearTimeout(press.current.timer)'`, research §2.6). | Port in `drawer-interaction.mjs` (expose the timer/observer seams via props or use fake timers in the page); this file follows automatically. | Med |
| 2 | 7, 70 | T10 (inherited) | `withAppInfoSource` (`refinement/native/app-info-handoff.mjs:13-14`) replaces an exact Java seam text before javac. | Port there (call the public plugin method with a fake `PluginCall`, as other Java harnesses do). | Med |
| 3 | 64-65 | B5 | Asserts `.eliza/client-features/.source.json` `baseCommit` equals `upstream.lock.json` — duplicated in ~10 harnesses; `prepare-client-features` already enforces it. | Delete; rely on `checkClientFeatures()` once per run in the runner. | None |
| 4 | 44-54 | T7 | Hand-written Capacitor global (`PluginHeaders`, `nativePromise`). | Acceptable for a composition harness; share with other drawer harnesses if a second copy exists. | Low |
| 5 | 135-136 | (keep) | Returns explicit remaining obligation (installed Settings task placement). | Keep as data, or move to the model comment. | – |
| 6 | – | Runtime | Chromium launch + one JVM run per `dispatchNative` step (10 scenarios, ~10 JVM starts). | Batch Java replies in one JVM invocation if runtime matters. | Low |

## Proposed end state
Unchanged scenario logic (~125 lines). It becomes text-free once `drawer-interaction.mjs` and `native/app-info-handoff.mjs`
are ported; drop the receipt/baseCommit assertion. Runs in the formal lane when drawer, `AlphaSystemPlugin.java`
or the model change.
