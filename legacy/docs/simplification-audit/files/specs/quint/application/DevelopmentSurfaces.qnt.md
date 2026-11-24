# specs/quint/application/DevelopmentSurfaces.qnt
- Lines: 50 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Compile-time admission of development surfaces: production ignores crafted queries, ?tools=1 alone shows nothing, synthetic and live events never mix. Duplicates: `scripts/audit-production-bundle.ts` enforces production absence on build output; Playwright production-gating specs. Callers/importers: `specs/quint/refinement/application/surfaces.mjs` (`developmentSurfaces`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)), README; 3 symbol pins (devSurfacesEnabled, testMocksEnabled, BrowserDeviceControls).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | surfaces.mjs 12 | T2/T10 | Slices `model.js` from `  goHome(chat) {` to `  /* ---- Android` and strips types. | Import the gating module once D5 consolidates flags into `build-flags.ts` and a `dev/` boundary. | Model must be revised when the four gating mechanisms become one (D5 flag zoo). |
| 2 | manifest symbols | T10 | 3 pins. | Delete. | None. |

## Proposed end state
Model kept and revised to the single gating mechanism; harness imports build-flags and the dev boundary.
