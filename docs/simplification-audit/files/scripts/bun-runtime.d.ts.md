# scripts/bun-runtime.d.ts
- Lines: 40 | Kind: ambient type declarations (subset of the Bun 1.4.2 API) | Verdict: KEEP
- Covers: lets `tsc -p tsconfig.scripts.json` (`include: scripts/**/*.ts`) typecheck the Bun-run producers without adding `@types/bun` (not in package.json). Callers/importers: no import by name (ambient); used by `Bun.*` references in `build-mobile-agent.ts`, `build-native-google-host.ts`, `core-state-preload.ts`, `native-cloud-runtime-config-check.ts`. Research table says "nobody", which is correct for name references and expected for a `.d.ts`.
- Findings: none beyond keeping it in sync with the pinned Bun version. If `@types/bun` matching 1.4.2 is added as a dev dependency, delete this file.

## Proposed end state
Unchanged; optional swap for the official `@types/bun` pinned to the same version.
