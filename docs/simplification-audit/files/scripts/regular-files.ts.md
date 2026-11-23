# scripts/regular-files.ts
- Lines: 12 | Kind: helper | Verdict: MERGE into `scripts/lib/fs.ts`
- Covers: recursive generator of regular files, not following symlinks; absent root yields nothing. Duplicates: `quint-lib.ts:98 filesWithin`, `prepare-client-features.ts:25 inventory`, `prepare-patched-native.ts:19 inventory`, `paradee-runtime.ts:82 walk`, `source-snapshot.ts:52`, `android-gzip-assets.ts:26,51`, `generate-licenses.ts:155,419`. Callers/importers: `audit-production-bundle.ts:12`, `font-license-blockers.ts:27`; listed in `quint-lib.ts runtimeScriptPaths`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-12 | C3 | One of ~11 directory walkers. | One `walkFiles(root, {skip, onSymlink: 'skip'|'throw'})` in `scripts/lib/fs.ts`; delete this file. | low |

## Proposed end state
Deleted; callers import the shared walker.
