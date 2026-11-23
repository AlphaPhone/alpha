# specs/quint/application/AppInfoHandoffComposition.qnt
- Lines: 130 | Kind: Quint model (application family, live: registered in `specs/quint/application/manifest.json`) | Verdict: KEEP model; PORT the drawer half of the harness
- Covers: Drawer "App info" for personal and work-profile apps: the bridge targets exactly the selected package and profile, refused lookups dispatch nothing, a failed reply keeps its notice on the original app and refreshes the inventory. Models: `apps/app/src/prototype/home-shell.ts`, `native.ts`, `platform-plugins.ts`, `AlphaSystemPlugin.java`, upstream `InstalledAppsGridDrawer.tsx`, `launcher.ts`, `SystemLauncherApps.java` (exist). Duplicates: `native/AppInfoHandoff` model + `refinement/native/app-info-handoff.mjs` (`test/quint-native-app-info-handoff.test.mjs`) covers the Java half; this composition re-runs it. Callers/importers: manifest (4 tests); `scripts/check-quint.ts` default gate (typecheck + every manifest `tests` run + simulation) via `npm run quint:check`; changed-model symbolic verify via `scripts/ci/check-changed-models.ts` when a manifest source changes; harness `refinement/application/app-info-handoff-composition.mjs` (Chromium + JVM via `native/java.mjs`, `withAppInfoSource`, `compileDrawerInteraction`) via `test/quint-app-info-handoff-composition.test.mjs` and `refinement/application/index.mjs` aggregate (run by `test/quint-application-refinement.test.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 7-9 | T10 | `compileDrawerInteraction` (`drawer-interaction.mjs:14-22`) rewrites the upstream `InstalledAppsGridDrawer.tsx` source text with `replace(old, next)` before bundling. | PORT: drive the upstream drawer through its props/ports; if the upstream component lacks a seam, record an upstream follow-up (D14) rather than patching text. | Medium: upstream text changes break it on every pin advance. |
| 2 | — | cost | Starts Chromium and a JVM; run twice (wrapper + aggregate). | One runner. | Low |
| 3 | 67-80 | — | Fixture constants (user 27/270, flags 512, 268435456) mirror Android values; correct as refinement observables. | Keep. | — |

## Proposed end state
Model unchanged. Harness composes the real drawer (no source rewrite) with the native Java replay; runs once.
