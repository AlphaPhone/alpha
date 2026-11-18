# test/prepare-local-agent-requalify.test.mjs
- Lines: 37 | Kind: tooling integration (runs the real `scripts/prepare-local-agent.ts` in temp git repos via `test/fixtures/prepare-local-agent.mjs`). Research table says "A source-text"; that is wrong, there is no source regex. | Verdict: DELETE with the `--requalify-from` mode (scripts review: SIMPLIFY `prepare-local-agent.ts`, drop self-hash stamp and requalify path); otherwise MERGE into `test/tooling/local-agent-prepare.test.mjs`
- Covers: `--requalify-from <sha> --preserve-stamp <file>` re-stamps a verified committed SDK source and refuses stale stamps, dirty or wrong commits, missing source dir, default invocation and symlinked backup parents. Duplicates: `specs/quint/refinement/services/prepared-source-stamp.mjs` replays the same mode through the same fixture. Callers/importers: `npm test` glob only. `git grep requalify-from` finds no package.json script or workflow that uses the mode.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | B5 | Pins `preparerSha256 = sha(scripts/prepare-local-agent.ts)`: the script hashing itself (scripts research 2.9). | Goes with the self-hash stamp. | Low |
| 2 | 17-37 | A7 | Exercises a mode nobody invokes (no npm script, no workflow). | Delete together with the mode and the `PreparedSourceStamp` Quint model's requalify branch; owner question if the mode is a manual recovery tool. | Low |
| 3 | 26-36 | T4 | The six refusals duplicate traces of the `prepared-source-stamp` refinement. | If the mode stays, keep only the refinement. | Low |

## Proposed end state
Deleted along with `--requalify-from`. If the owner keeps the mode, the six refusal cases are already replayed by
`prepared-source-stamp.mjs`; this file is still redundant. `test/fixtures/prepare-local-agent.mjs` survives (the
refinement driver imports it).
