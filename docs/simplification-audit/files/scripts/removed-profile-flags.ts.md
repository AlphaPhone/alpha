# scripts/removed-profile-flags.ts
- Lines: 8 | Kind: tombstone / refusal stub | Verdict: DELETE
- Covers: refuses `--runtime-profile` and `--local-embeddings`, flags removed by an earlier migration. Duplicates: the same refusal text in `scripts/verify-packaged-runtime.py:244-246`, `scripts/runtime-profile.ts:18` ("--verify-cloud is gone"), `scripts/build-archive.ts:19-20`, `scripts/sign-release-apks.ts:292`, `scripts/build-android.ts:307`. Callers/importers: `scripts/android-build-preflight.ts:22`, `build-android.ts:32`, `gradle-verification.ts:3`, `stage-local-agent-runtime.ts:13`, `verify-apks.ts:58`; listed in `scripts/quint-lib.ts:34`; tests `test/one-runtime-profile.test.mjs:9` (imports), `test/android-build-path.test.mjs:146` and `test/upstream-pin-guard.test.mjs:117` (file-name lists).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-8 | A8 | Tombstone for flags removed by a past migration; every caller already rejects unknown options or ignores none. | Delete the file and the 5 imports/calls; delete the Python twin at `verify-packaged-runtime.py:244-246` and the `build-archive.ts:19-20` filter. | Low: before deleting, confirm each of the 5 parsers rejects an unknown flag (`stagingArguments` does at `stage-local-agent-runtime.ts:41`); a parser that silently ignores unknown args would then accept `--runtime-profile=cloud` silently. |
| 2 | 6 | B4 | `typeof arg === 'string'` on a `readonly string[]`. | Gone with the file. | — |
| 3 | — | T1 | `one-runtime-profile.test.mjs` asserts the message and greps scripts for the call. | Delete those cases with the file. | Low |

## Proposed end state
File gone. Option parsers reject unknown flags generically ("Unknown option X"). Remove the path from
`quint-lib.ts` and from the two test file lists.
