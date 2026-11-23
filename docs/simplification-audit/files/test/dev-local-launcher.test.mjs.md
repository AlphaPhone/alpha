# test/dev-local-launcher.test.mjs
- Lines: 63 | Kind: tooling with transplant: copies `scripts/dev-local.ts`, `dev-speech-settings.ts`, `speech-env.ts` into a temp tree, writes stub `prepare-client-features.ts`, `local-agent-source.ts`, `start-local-remote.ts` and a fake `node_modules/vite`, spawns `node scripts/dev-local.ts` (20 s timeout), then evaluates `apps/app/src/build-flags.ts` by text with `import.meta.env` rewritten to `env` | Verdict: DELETE
- Covers: `npm run dev` sets `VITE_ALPHA_PRIVATE_LOCAL_PREVIEW=1`, `VITE_LOCAL_AGENT=1`, `ELIZA_DEV_ALLOW_TEST_MOCKS=1` for Vite only; the flags resolve to dev surfaces in a dev server and to no private preview in a build; `ALPHA_DEV_CONNECTION_TOOLS=1` restores the dev connection sheet. Duplicates: production gating of the same flags is enforced by `scripts/audit-production-bundle.ts` on real build output and by the production Playwright project; `test/dev-surface-gates.test.mjs` loads `build-flags`-dependent modules through Vite SSR. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-21 | T2 / T3 | Recreates a fake repository with stubbed scripts and a fake Vite binary that busy-waits for a file. | Delete. | Low |
| 2 | 39-44 | T2 / D7 | `build-flags.ts` evaluated by text with `import.meta.env` replaced; this is why D7 lists `import.meta.env === undefined` shims. | Delete. | Low |
| 3 | 33, 20 | T8 | 15–20 s timeouts and a 20 ms polling loop; spawns a child per case. Notable runtime (~1–3 s each, worst case 20 s). | Gone with the file. | Low |
| 4 | 51-53 | — | "A build from the same environment never admits the private preview" is a release rule. | Already enforced on output by `audit-production-bundle.ts` (`build-flags.json` `testMocks:false`); confirm the audit refuses `privateLocalPreview` strings. | Low |

## Proposed end state
File deleted. The developer launcher is exercised every time someone runs `npm run dev`; the release side is the bundle audit.
