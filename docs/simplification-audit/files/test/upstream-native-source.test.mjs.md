# test/upstream-native-source.test.mjs
- Lines: 32 | Kind: tooling with real git repositories (`scripts/upstream-native-source.ts`) | Verdict: KEEP, MERGE into `test/tooling/upstream-pin.test.mjs`
- Covers: the `git cat-file --batch` parser keeps binary bytes and rejects reordered/malformed/truncated frames; reading the pinned upstream module matches `git show` for binary and executable files and refuses drift, mode changes, dirty trees and symlinks. Duplicates: none. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-16 | — | Parser cases are a pure function but gate every native build input; keep. | Keep. | none |
| 2 | 17-32 | C3 | Builds its own throwaway git repo with a local `git()` helper; `upstream-pin-guard.test.mjs` has another. | One git-fixture helper in the merged file. | none |
| 3 | 20-31 | D8 | Dense one-line statements. | Reformat when merging. | none |

## Proposed end state
Part of `test/tooling/upstream-pin.test.mjs` with `upstream-pin-guard`, `upstream-reachability` and the rewritten owner-gate
check, sharing one temp git repository builder.
