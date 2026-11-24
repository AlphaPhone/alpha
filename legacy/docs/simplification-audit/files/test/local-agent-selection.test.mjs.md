# test/local-agent-selection.test.mjs
- Lines: 52 | Kind: tooling (real `sourceDirectory`/`workerArtifactDirectory` from `scripts/local-agent-source.ts` over temp dirs, symlinks, `upstream.lock.json`) | Verdict: KEEP; MERGE into `test/tooling/android-build-inputs.test.ts`
- Covers: the prepared local-agent source and workflow-worker output directories follow the admitted upstream commit (never a branch name), explicit overrides must be absolute/contained/non-symlinked, and a worker output inside a prepared or historical source tree is refused. Duplicates: none found. Callers/importers: `npm test` glob. `scripts/local-agent-source.ts` is used by `agent:prepare` / `agent:build-workflow-worker` / `agent:stage-android` (Android build inputs per AGENTS.md).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-52 | — | Real filesystem behaviour of a build-input selector; cheap, no spawn. | Keep (merge with the other build-input tooling tests). | Low |
| 2 | 9, 26, 41 | C3 | Three copies of `mkdtemp` + `try/finally rmSync`. | Use `t.after` cleanup in the merged file. | Low |
| 3 | 11-12 | B4 | `fs.mkdirSync(path.dirname(manifest))` creates the temp root that already exists. | Drop. | Low |

## Proposed end state
Three cases in `test/tooling/android-build-inputs.test.ts` ("local agent source selection"), one temp-root fixture
with `t.after` cleanup.
