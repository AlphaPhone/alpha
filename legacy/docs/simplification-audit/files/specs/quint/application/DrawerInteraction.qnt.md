# specs/quint/application/DrawerInteraction.qnt
- Lines: 108 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Alpha Apps drawer: exact menu owner, press ownership, suppression, synthetic App Info boundary. Duplicates: home-shell Playwright journeys. Callers/importers: `specs/quint/refinement/application/drawer-interaction.mjs` (+ `.md`), `test/quint-drawer-interaction.test.mjs`, `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 20-30 | T10 | Bundles upstream `InstalledAppsGridDrawer.tsx` (.eliza projection) with a plugin that injects at marker `    opened = useRef<string | null>(null);` via `replaceOnce`, runs in Chromium. | Observe through the DOM / exposed callbacks; or request an upstream inspect hook (D14). | Upstream text dependence. |
| 2 | manifest sources | P6 | Sources: home-shell.ts plus upstream drawer files and `upstream.lock.json`; mostly upstream code. | Keep; upstream follow-up. | — |
| 3 | manifest | T4 | Aggregate duplicate (extra Chromium launch). | Drop from aggregate. | None. |

## Proposed end state
Model unchanged; harness observes the drawer without source injection; one runner.
