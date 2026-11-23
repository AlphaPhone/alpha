# test/font-license.test.mjs
- Lines: 319 | Kind: tooling (release licence gate: `generate-licenses`, `font-license-blockers`, `licence-policy`, `release-blockers`, `audit-production-bundle`) with T1 parts | Verdict: MERGE into `test/release-tooling/licences.test.mjs` (with `licenses.test.mjs`), dropping the source-text tests
- Covers: the proprietary Denton font is listed and flagged, resolved only for the recorded bytes, an unrecorded or swapped font is reported, the single constant decides whether that blocks distribution, the bundle audit prints flags not blockers, and font records are validated. Duplicates: `licenses.test.mjs` and `runtime-licenses.test.mjs` also call `collectNotices`. Callers/importers: none (node test). Runtime: spawns `audit-production-bundle.ts` twice and runs `collectNotices` about 15 times over a symlinked scratch root.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-55 | T1 | Asserts the committed `font-licenses.json` equals a literal and lacks eight field names. It checks data against itself. | Delete. The generator's validation (lines 216-276) already refuses a bad record. | none |
| 2 | 57-77 | T1 | Regex-matches the committed notices' wording (`All rights reserved`, exact sentences). | Keep only flags/licence identifiers (`FONT_HELD_FLAG`, `COMMERCIAL_FONT`, exactly one proprietary font); drop wording pins. | low |
| 3 | 79-153 | — | Real behaviour of the gate over temp payloads, including both values of the constant. This is release-gating tooling. | Keep. | none |
| 4 | 155-170 | — | Runs the real bundle audit. | Keep (one run is enough: drop the swapped-font second spawn, already covered by the in-process check at 132-144). | none |
| 5 | 172-200 | T1, T2 | Regex over `scripts/verify-apks.ts` and `new Function` over a sliced `releaseReady ... row.distributable` expression. | Delete. Export the distributable computation from `verify-apks.ts` (or `release-distributable.ts`, already imported) and test it directly; three of these cases already belong there. | low |
| 6 | 216-276 | — | Generator record validation with a scratch root. | Keep. | none |
| 7 | 278-319 | T1 | Walks `apps/app/src` for "denton", pins five file names, the exact `@font-face` rule, stack shapes, and inspects `node_modules/@fontsource/fraunces` for a future patch. | Delete. The packaged-bytes check (finding 3) is what protects the release; the `@fontsource` probe is a reminder for planned work, not a test. | low |
| 8 | 1-8 | A8 | History-style header (owner statement dates). | Shorten to what the gate does; the decision lives in `licenses/font-licenses.json`. | none |

## Proposed end state
About 150 lines inside the release-tooling licences suite: font findings over temp payloads, the constant's two
settings, one bundle-audit run, and record validation. No reads of `verify-apks.ts`, app sources or committed wording.
