# scripts/verify-pixel10a-source.ts
- Lines: 15 | Kind: manual CLI (checks an AOSP source tree + factory image against the Pixel 10a source contract, optional evidence file) | Verdict: MERGE into `scripts/aosp-check.ts pixel10a-source` (or DELETE if the owner confirms only `stage-aosp.ts` is used)
- Covers: `pixel10a-source-contract.ts verifyPixel10aSource` with applied SystemUI/build patch names. Duplicates: `stage-aosp.ts:2` already calls `verifyPixel10aSource` as part of staging. Callers: none (git grep).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6–10 | C3, D8 | 230-character hand-rolled parser line for five flags (two repeatable). | `node:util parseArgs({options:{'applied-systemui-patch':{type:'string',multiple:true},…}})`. | None |
| 2 | 12–15 | B5 | Writes an `observedAt` evidence file with `wx`; nothing reads it. | Print only; drop `--out` unless the owner files these reports. | None |
| 3 | whole | A7 | No caller; staging already runs the same check. | Merge as a pre-flight subcommand. | None |

## Proposed end state
`aosp-check.ts pixel10a-source --aosp-source P --factory-image F [--applied-systemui-patch …] [--applied-build-patch …]` printing the result JSON.
