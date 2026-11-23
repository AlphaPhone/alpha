# scripts/test-native-cloud-runtime-config.ts
- Lines: 12 | Kind: integration wrapper (verifies prepared source + native Google host artifact, then runs `native-cloud-runtime-config-check.ts` under Bun) | Verdict: MERGE `scripts/native-cloud-runtime-config-check.ts` (46 lines, sole caller is this file) into one `test/resident/native-cloud-runtime-config.test.ts`
- Covers: the native Cloud routing configuration of the staged Google host artifact. Duplicates: none. Callers/importers: `.github/workflows/resident-android.yml:312` (`native-cloud-routing` phase).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | 12-line launcher for a 46-line check in another file. | One file. | None |
| 2 | 11 | C6 | Hard-coded `Bun1.4.2` version gate (message also lacks a space). | Read the Bun version from the single pinned source (`.bun-version`/package `engines`) or drop it (the phase already uses the CI-installed Bun). | Low |
| 3 | 8 | C3 | Inline upstream-lock reader. | Shared reader. | None |

## Proposed end state
One ~50-line file run by the same CI phase.
