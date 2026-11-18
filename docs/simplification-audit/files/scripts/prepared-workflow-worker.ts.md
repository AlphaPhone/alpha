# scripts/prepared-workflow-worker.ts
- Lines: 48 | Kind: build library | Verdict: KEEP; MERGE `build-workflow-worker.ts` (22-line CLI, sole caller) into it
- Covers: builds (or reuses after verification) the workflow worker artifact from the prepared upstream source via upstream's producer, bound to the source stamp and `bun.lock` hashes. Duplicates: none. Callers/importers: `build-workflow-worker.ts:6,15` (`npm run agent:build-workflow-worker`, part of `android:build:local`); Quint `services/prepared-workflow-worker.mjs` (imports and runs it); tests `prepared-workflow-worker.test.mjs`, `quint-prepared-workflow-worker.test.mjs`, `android-build-path.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23 | C3 | Symlink-free path walk (fourth copy in this chunk). | Shared `assertNoSymlinkPath`. | none |
| 2 | 31-32 | B5 | Re-hashes source stamp and lock after the build to detect concurrent change. | Delete; the artifact is verified against `expected` on the next line. | low |
| 3 | 29 | B2 | `typeof buildWorkflowArtifact !== 'function'` after a dynamic import of pinned upstream. | Keep the existence check of the producer file (line 26), drop the typeof. | none |
| 4 | — | T4 | `quint-prepared-workflow-worker.test.mjs` runs the Quint harness that `quint:check` already runs. | Delete (duplicate execution). | none |

## Proposed end state
One ~55-line file with the CLI `main()` from `build-workflow-worker.ts`; the Quint model stays as the behavioural check (it imports and runs the module).
