# test/developer-archive.test.mjs
- Lines: 80 | Kind: tooling (real `assembleDeveloperArchive`/`parseDeveloperArchiveArgs` from `scripts/developer-archive.ts` on synthetic APK folders; one CLI spawn with a temp git repo) | Verdict: KEEP (if the script stays) + SIMPLIFY; MERGE into `test/tooling/apk-verify-audit.test.ts`
- Covers: a developer APK archive contains exactly the four admitted APKs whose bytes match the verified `apk-manifest.json`, is labelled test-mocks correctly, refuses mismatches, and writes only to a new folder under `test-results/`. Duplicates: `test/fixtures/isolated-native-campaign.mjs` writes `archive-source.json` records of the same kind for the campaign consumer test. Callers/importers: `npm test` glob only; the script itself has no npm/CI caller (manual tool documented at `scripts/android-workflow-native.ts:20`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-68 | - | Behaviour tests of the archive admission rules (hash binding, test-mocks label agreement, no partial archive). Real, useful coverage of a tool that feeds device campaigns. | Keep cases 1-4. | - |
| 2 | 69-73 | T3 | Argument-parser table: a unit test of a 10-line parser. | Fold one bad-argument assertion into case 6 (CLI); drop the rest. | Low. |
| 3 | 74-80 | - | CLI case creates a git repo and spawns Node: the only end-to-end proof. | Keep; it subsumes the argument table. | - |
| 4 | 10 | C3 | Local `sha` helper (also in the script and ~40 scripts). | Import from `scripts/lib` hash helper once it exists. | None. |
| 5 | whole | owner | The script has no npm or CI caller. If the owner deletes it (`files/scripts/developer-archive.ts.md` is "KEEP (owner question)"), delete this test with it. | Decide with the script. | - |

## Proposed end state
Five cases in the APK tooling suite (`test/tooling/apk-verify-audit.test.ts`, alongside `verify-apks` and
`build-archive` tests), sharing one synthetic-`artifacts/` builder fixture with `isolated-native-campaign.mjs`.
