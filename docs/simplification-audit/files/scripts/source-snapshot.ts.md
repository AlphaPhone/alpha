# scripts/source-snapshot.ts
- Lines: 56 | Kind: build-evidence script | Verdict: SIMPLIFY
- Covers: prints sha256 of every file under ~90 hand-listed build-input roots, used by `build-archive.ts` to prove inputs did not change during an archive build. Duplicates: the hand-maintained path list overlaps `scripts/quint-lib.ts` `runtimeScriptPaths` and `verify-packaged-runtime.py`; walker twins `regular-files.ts:5`, `quint-lib.ts:98`. Callers: `scripts/build-archive.ts:41` (CI: `resident-android.yml:333,336`); listed in `quint-lib.ts:35`; tests `test/source-snapshot.test.mjs` (runs it on fixture roots), `test/mobile-uuid-build.test.mjs:53` (T1: asserts names appear in its text), `test/verify-apks.test.mjs:224` (stubs it).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-50 | B5 / D10 | Every new build script must be added by hand (30 `scripts/*.ts` entries); a forgotten one silently weakens the check, and a source-text test polices the list. | Hash tracked inputs from `git ls-files -s -- <dirs>` (blob ids are already content hashes) plus `git status --porcelain` for dirty files, and hash only the few untracked generated roots explicitly (`assets/agent`, `jniLibs`, `build/generated/local-agent`, `.eliza/*/build-record.json`, `.eliza/client-features/.source.json`). Whole `scripts/` directory instead of a file list. | Medium: digest changes meaning; `build-archive` only compares before/after, so no persisted format breaks. |
| 2 | 52 | C3 | Recursive walker. | Shared `scripts/lib` walker if one remains needed for generated roots. | — |
| 3 | 54-55 | C3 | sha256 inline. | Shared helper. | — |
| 4 | — | T1 | `mobile-uuid-build.test.mjs:53` asserts the list contains names. | Delete that assertion. | — |

## Proposed end state
~25 lines: git-derived tracked-input digest + explicit generated roots. No per-script list to maintain.
`test/source-snapshot.test.mjs` keeps one fixture case (tracked change and generated change both alter the digest).
