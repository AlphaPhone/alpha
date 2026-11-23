# scripts/aosp-cuttlefish.ts
- Lines: 18 | Kind: script helper (AOSP staging: Cuttlefish option check and native staging) | Verdict: MERGE into `scripts/stage-aosp.ts`
- Covers: validates `--target cuttlefish` options and runs `stage-aosp-native.py` for the x86_64 Cuttlefish product, appending the fs-config line. Duplicates: `aosp-pixel10a.ts` `pixel10aOptions` is the same kind of option check. Callers/importers: `scripts/stage-aosp.ts:1`; `test/aosp-cuttlefish.test.mjs` (unit).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-11 | D4 | 6-line option check with one caller. | Inline into `stage-aosp.ts` option parsing next to the Pixel 10a checks. | None |
| 2 | 13-18 | D4 | 5-line native staging wrapper with one caller. | Inline. | None |
| 3 | — | T3 | `test/aosp-cuttlefish.test.mjs` tests the option checks in isolation. | Delete; cover staging with one `stage-aosp` integration run on a fixture source tree if one exists, else accept (AOSP staging is manual). | Low |

## Proposed end state
File removed; ~10 lines inside `stage-aosp.ts`.
