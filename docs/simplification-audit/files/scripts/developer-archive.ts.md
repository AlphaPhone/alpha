# scripts/developer-archive.ts
- Lines: 92 | Kind: script (manual developer tool: assemble an APK archive folder for archive-based device campaigns) | Verdict: KEEP (owner question) + SIMPLIFY
- Covers: copies admitted debug + instrumentation APKs of both distributions from a `verify-apks` build into a new `test-results/<folder>` with an `apk-manifest.json` and `archive-source.json` marked "developer archive". Callers: none in npm/CI; documented in `scripts/android-workflow-native.ts:20,118` and used by `test/fixtures/isolated-native-campaign.mjs`; test `developer-archive.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | owner | Lives only for manual archive-based campaigns (`ALPHA_BUILD_ARCHIVE`), which research lists as an owner decision (`android-workflow-native.ts` is not run by CI). | Keep iff those campaigns stay; delete with them. | Low |
| 2 | 25 | C3 | Local `sha`. | Shared hash helper. | Low |
| 3 | 27-43 | C3 | Hand-written arg parser. | `node:util parseArgs`. | Low |
| 4 | 66 | B5 | Re-hashes each APK right after `copyFileSync` to detect change during copy. | Keep only if the archive is evidence; otherwise drop (exit code suffices). | Low |
| 5 | 87 | C3 | Local `git()` closure. | Shared helper. | Low |

## Proposed end state
~70 lines with shared helpers, or removed together with archive-based campaigns.
