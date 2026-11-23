# scripts/upstream-core-sources.ts
- Lines: 18 | Kind: data (pinned upstream file digests, JSON in a `export default …;` wrapper) | Verdict: SIMPLIFY → `scripts/upstream-core-sources.json`
- Covers: the 12 upstream core files the combined-agent core-state patch/preload observes, pinned by SHA-256 at the base commit. Duplicates: the same 12 paths, in the same order, are hand-copied in `verify-packaged-runtime.py:25-38` (`MOBILE_CORE_SOURCE_TARGETS`). Callers/importers: `core-state-patch.ts:8` (`CORE_STATE_MANIFEST`, read as text via `build-policy-source.ts parseBuildPolicy`), `verify-packaged-runtime.py:165-172` (same text parse in Python), `source-snapshot.ts`, refinement harnesses `combined-agent-launcher.mjs:12`, `reviewed-workflow-launcher.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1, 18 | D4 | A JSON document disguised as TS; both readers strip `export default ` and `;` by string matching ("without evaluating workspace source"). | Store as `.json`; readers use `JSON.parse`. Delete `build-policy-source.ts` once `upstream-mobile-build.ts` moves too. | Medium: `manifestSha256`/`inputHashes` in the staged receipt hash this file and `build-policy-source.ts`, so a rename forces one re-stage (expected, not a regression). |
| 2 | 4–16 | C7 | Python keeps an "independent" copy of the key list and compares it to this file; both are edited by the same people in the same repo. | Delete the Python list; trust this file's keys. | Low |
| 3 | 3 | — | `baseCommit` must equal `upstream.lock.json`; every upstream bump edits it. | Keep; it is the point of the pin. | — |

## Proposed end state
`scripts/upstream-core-sources.json` with `{schema, baseCommit, files}`; read by `core-state-patch.ts`, the packaged-runtime verifier (ported to TS) and the two refinement harnesses with plain `JSON.parse`.
