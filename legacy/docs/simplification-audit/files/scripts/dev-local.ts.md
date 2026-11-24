# scripts/dev-local.ts
- Lines: 49 | Kind: script (developer launcher, `npm run dev` / `npm run dev:local`) | Verdict: KEEP + SIMPLIFY
- Covers: starts the local agent (`start-local-remote.ts`) and the Vite dev server with test mocks enabled, on loopback ports, refusing a profile already in use. Callers: `package.json` `dev` and `dev:local` (identical commands); README:24,43; Quint `application/manifest.json`; `quint-lib.ts`; tests `dev-local-launcher` (transplant), `client-feature-preparation`, `private-cloud-restore`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-12 | B5 / A8 | Comment says "npm run dev has no predev hook", but `package.json:53` has `"predev": "npm run upstream:prepare-client"`, so `npm run dev` prepares client features twice. `dev:local` has no pre-hook. | Delete the `predev` hook (the script prepares itself) and the false comment, or delete the call; one place only. | Low |
| 2 | pkg 10,33 | P5 | `dev` and `dev:local` are the same command. | Keep `dev`; delete `dev:local` (grep: README only uses `dev`). | Low |
| 3 | 36-41 | A3 / D5 | Comment lists "development Cloud and pairing" among `ALPHA_DEV_CONNECTION_TOOLS` features; pairing is deleted (D5). | Update the comment after the D5 deletion lands. | Low |
| 4 | 20,10-19 | C3 | Port probe and source preparation duplicated with `dev-cloud.ts`. | Shared launcher helper. | Low |
| 5 | 27-29,44 | D9 | `--port` parsed twice (`vitePort` and `portArgs`). | Parse once; derive both. | Low |

## Proposed end state
~35 lines: shared launcher helpers, one port parse, one client-feature preparation, one npm alias.
