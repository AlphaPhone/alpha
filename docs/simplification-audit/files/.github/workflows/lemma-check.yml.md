# .github/workflows/lemma-check.yml
- Lines: 55 | Kind: PR/push workflow (LemmaScript Dafny proofs) | Verdict: DELETE (broken and duplicated; Lemma becomes a path-filtered lane of the PR workflow)
- Covers: installs Dafny 4.11.0 and runs `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1`. Duplicates: `browser.yml:58-59,69,74` (`prepare-dafny.sh` puts Dafny on `PATH`, verify runs `lemma:check` with the same env). Callers/importers: triggers PR (paths), push main+develop, dispatch. `git grep lemma-check.yml` → no references (the `lemma-check` hits in `test/lemma-check*.test.mjs` and `specs/lemma/README.md` are temp-dir names / the test file). Not in `affected.ts` (falls to "unknown").
- Health: 0 green in last 40 runs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-46 | P4 (bug) | Exports `DAFNY=$RUNNER_TEMP/dafny/dafny` to `$GITHUB_ENV`, but `scripts/check-lemma.ts:90` runs `spawnSync('dafny', ['--version'])` from `PATH`, so the check reports no backend and exits 2 every run. `scripts/ci/prepare-dafny.sh:13` does it right (`>> $GITHUB_PATH`). | Delete the workflow; do not fix it. | None. |
| 2 | 2-4 | A8 | Header claims verify "records a skip when no Dafny is installed"; `browser.yml:74` sets `LEMMA_REQUIRE_BACKEND=1`, so verify already requires the backend. | Gone with the file. | None. |
| 3 | 40-46 | C7 | Second Dafny installer next to `prepare-dafny.sh`. | Gone; the lane uses `prepare-dafny.sh`. | None. |
| 4 | 6-13 | P1 | Its path filter is the right one for a Lemma lane. | Move it into `affected.ts` as the `lemma` lane: `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, the 23 files listed in `LemmaScript-files.txt` (read the list, do not use `apps/app/src/**`), `package-lock.json`. | Low. |

## Proposed end state
File deleted. The PR workflow has a `lemma` job (`node-setup` composite → `upstream:prepare-client` → `prepare-dafny.sh` → `LEMMA_REQUIRE_BACKEND=1 npm run lemma:check`, ~2 min) selected by the paths in #4.
