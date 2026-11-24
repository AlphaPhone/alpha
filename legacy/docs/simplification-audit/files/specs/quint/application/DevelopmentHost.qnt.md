# specs/quint/application/DevelopmentHost.qnt
- Lines: 75 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP
- Covers: Browser Cloud dev bridge / resident host private-store transactions, request fencing, resident retirement, children stopping together. Duplicates: DevBridgeSignIn (same bridge). Callers/importers: `specs/quint/refinement/application/boundaries.mjs` (`developmentHost`, via `test/quint-application-refinement.test.mjs` (via `refinement/application/index.mjs`)); `test/quint-refinement-harness.test.mjs` uses it as the fixture model for check-traces tooling tests; README; services launcher .md notes.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 118 | — | boundaries.mjs bundles the real scripts with esbuild (import). | None. | — |
| 2 | manifest sources | A3/D5 | Sources include `start-local-remote.ts`, `dev-cloud.ts`, `start-local-voice-agent.ts`; D5 may delete remote/personal-Cloud launchers. | Re-check after stage A4; quint-lib throws on a missing source. | Breaks every Quint command if a listed script is deleted. |
| 3 | test/quint-refinement-harness | T5 | A tooling test of check-traces drives this model; it keeps the model referenced even if the bridge goes. | Tooling test should use its own fixture model. | — |

## Proposed end state
Unchanged while the dev bridge and resident host stay (D6/D20).
