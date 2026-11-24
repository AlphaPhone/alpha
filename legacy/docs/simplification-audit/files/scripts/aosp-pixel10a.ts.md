# scripts/aosp-pixel10a.ts
- Lines: 110 | Kind: script helper (Pixel 10a product binding: composition, release descriptor checks, vendor API, product staging) | Verdict: KEEP, SIMPLIFY
- Covers: Alpha's Pixel 10a constants (`PIXEL10A_RELEASE`), option validation, production-descriptor problems, vendor API contract and `writePixel10aProduct` (runs `stage-aosp-native.py` twice around upstream composition). Duplicates: option check style shared with `aosp-cuttlefish.ts`. Callers/importers: `scripts/stage-aosp.ts:3`, `scripts/sign-aosp-release.ts:27`, `scripts/aosp-release-record.ts:18`; tests `aosp-pixel10a.test.mjs` (also source-text `stage.indexOf(...)` at :130), `aosp-release-signing.test.mjs`, `owner-sign-aosp-release-edges.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | A7 | `placeholderFields` re-export has no importer outside `scripts/aosp-*` (git grep). | Delete the re-export. | None |
| 2 | 68-71, 100 | D14 | `as unknown as` casts because upstream's types do not declare the options Alpha passes. | Upstream follow-up: type the shared functions; then drop the casts. | None |
| 3 | 13, 17, 61, 79 | — | Mixed `root = process.cwd()` defaults while other AOSP helpers resolve from `import.meta`. | One `ROOT` constant. | Low |
| 4 | 64-67 | B1 | Parse errors converted to problem strings. | Keep (specified: report every problem before staging). | — |
| 5 | — | T1 | `test/aosp-pixel10a.test.mjs:130` slices `stage-aosp.ts` source. | Delete that case. | None |

## Proposed end state
~100 lines, no dead re-export, one root. Coverage: `aosp-pixel10a.test.mjs` cases that stage into a fixture tree are integration-shaped; keep those, delete the source-text case.
