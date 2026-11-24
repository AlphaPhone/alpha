# .github/workflows/changes.yml
- Lines: 51 | Kind: reusable workflow (path → lane selector) | Verdict: KEEP, SIMPLIFY (one JSON output; called once per event)
- Covers: runs `scripts/ci/affected.ts` on the PR/push diff and exposes ten lane outputs. Duplicates: none in logic, but it is invoked three times per event (from `browser.yml:25`, `android.yml:17`, `resident-prepare.yml:12`), each with a full-history checkout. Callers/importers: those three workflows; `affected.ts` is tested by `test/ci-affected.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-24, 31-41 | D8/P5 | Every output is declared twice (workflow_call outputs and job outputs), 10 × 2 lines; adding a lane edits three places plus every caller. | Emit one output `plan` (the JSON object `affected.ts` already builds) and let callers use `fromJSON(needs.changes.outputs.plan).browser`. Cuts ~30 lines. | Low. |
| 2 | whole | P3 | Three workflows call it for the same event, so the same diff is computed three times (three checkouts with `fetch-depth: 0`). | Once `browser.yml`, `android.yml` and `resident-prepare.yml` merge into one PR workflow (see their reports), this becomes a job of that workflow; keep it reusable only if two workflows remain. | Low. |
| 3 | 43-46 | — | Full-history checkout without submodules is correct for a merge-base diff. | Keep; `fetch-depth: 0` could become a shallow fetch of base+head, but the gain is seconds. | None. |

## Proposed end state
- A single `changes` job (inline in the PR workflow or this reusable file) that checks out without submodules, runs `affected.ts`, and outputs one `plan` JSON.
- Lane booleans follow the path → lane matrix in `research/ci-and-formal.md` §7 (`static`, `host`, `quint`, `lemma`, `browser`, `production`, `android`, `prepare`), all computed in `affected.ts`.
