# scripts/release-distributable.ts
- Lines: 27 | Kind: helper (pure predicate) | Verdict: MERGE into `scripts/verify-apks.ts`
- Covers: whether verify-apks may record a release APK as distributable (flag-off, signed by the committed signer with no blockers, packaged runtime with notices, packaged voice with ASR, no licence blockers). Duplicates: overlaps `release-blockers.ts` (same facts judged as named blockers). Callers/importers: `verify-apks.ts:40,337` (sole product caller); tests `release-signing.test.mjs` (unit cases, plus a T1 regex over `verify-apks.ts` source at line 111-115), `font-license.test.mjs:182-188` (T2: `new Function` transplant of verify-apks logic calling this predicate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | D7 | File exists "so the predicate can be run by tests". | Inline into `verify-apks.ts`. | none |
| 2 | — | T1/T2/T3 | Its tests are a unit test, a source regex and a transplant. | Delete them; distributable/not-distributable is asserted by the verify-apks integration run on a fixture build (or in CI on the real APKs). | low |
| 3 | 21-27 | C5 | Judges the same facts as `releaseBlockers`; `distributable` could be `releaseBlockers(row).length === 0`. | Owner/upstream question: one judgement. | medium |

## Proposed end state
Deleted; a local function in `verify-apks.ts` (or `distributable = blockers.length === 0`).
