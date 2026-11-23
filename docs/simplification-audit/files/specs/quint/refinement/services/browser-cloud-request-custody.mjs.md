# specs/quint/refinement/services/browser-cloud-request-custody.mjs
- Lines: 46 | Kind: Quint refinement harness (runs `browser-cloud-request-custody-probe.mjs` under `tsx` in a child process, projects its observations, `checkTraces`) | Verdict: KEEP (SIMPLIFY)
- Covers: model `BrowserCloudRequestCustody` (dev Cloud bridge request-ID ownership; see the probe report). Duplicates: none formal. Importers: `index.mjs`, `test/quint-browser-cloud-request-custody.test.mjs` (wrapper, MERGE per its report).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22-28 | B5 | Runs an esbuild bundle of the bridge only to list its input graph, then hashes it plus `package.json`, `package-lock.json`, `tsconfig.json`. | Drop the esbuild metafile pass and the lockfile hashing; sources = bridge, probe, harness. | Low |
| 2 | 30-33 | — | Child with minimal env (`PATH: '/usr/bin:/bin'`) and 10 s timeout. A `node` from a version manager outside `/usr/bin` still works because `process.execPath` is absolute; fine. | None. | — |
| 3 | 26 | — | `scripts/cloud-deployment-policy.ts`, `scripts/native-view-policy.ts` hashed but only reachable through the bridge graph. | Drop with finding 1. | None |

## Proposed end state
~30 lines: spawn probe, map observations, `checkTraces`. No bundling, no lockfile hashing.
