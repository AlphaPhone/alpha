# scripts/embedding-build-remap.ts
- Lines: 18 | Kind: script (build helper: `CCC_OVERRIDE_OPTIONS` file-prefix remap for reproducible native embedding builds) | Verdict: MERGE into `scripts/prepare-embedding-host.ts`
- Covers: makes compiler-embedded paths stable across machines for the embedding JNI build. Callers: `scripts/prepare-embedding-host.ts:9,72` (only). Tests: `embedding-host-preparation`, `strict-build-inputs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | A7 | `_productRoot` parameter unused. | Remove. | Low |
| 2 | 3-6,10 | B3 | Validates four absolute paths the caller just computed itself (research `scripts.md:158`). Only the "no whitespace" rule matters (the option string is space-separated). | Keep a single whitespace assertion; drop the rest. | Low |
| 3 | whole | D4 | One caller, 18 lines. | Inline as a local function in `prepare-embedding-host.ts`. | Low |

## Proposed end state
A 6-line local function in `prepare-embedding-host.ts`; file removed.
