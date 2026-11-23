# test/record-release.test.mjs
- Lines: 99 | Kind: tooling (real `scripts/record-release.ts` on a temp checkout) | Verdict: KEEP, MERGE into `test/tooling/release-signing.test.ts`
- Covers: Recording a distributed release as `lastRelease` only with `--write`, refusing non-distributable/mismatched/stale manifests, usage errors and an unset signer. Duplicates: `test/publish-update-manifest.test.mjs:19` and `test/pilot-units.test.mjs` repeat the `DISTRIBUTABLE` row fixture. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-17 | C6 | `DISTRIBUTABLE` manifest row duplicated in three release tests. | One shared fixture in the release tooling file. | Low |
| 2 | 41-99 | keep | Real script, temp fs, release-gating rules (versionCode advance). | Carry all three tests. | Low |

## Proposed end state
- Part of `test/tooling/release-signing.test.ts` with release-signing and publish-update-manifest.
