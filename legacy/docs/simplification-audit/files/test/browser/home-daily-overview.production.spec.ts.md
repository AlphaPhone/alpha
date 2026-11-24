# test/browser/home-daily-overview.production.spec.ts
- Lines: 31 | Kind: Playwright spec (production project) | Verdict: MERGE into `journeys/production-gating.spec.ts` (single "fresh offline Home" case; see `home-attention.production.spec.ts`)
- Covers: fresh flag-off Home has no empty cards, fixture copy, avatars or outside requests, and Workflows opens without the retired digests dialog. Duplicates: `home-attention.production.spec.ts:14-20` (same assertions minus the network fence). Callers/importers: production; imports `flag-off-android` (`fenceNetwork`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21 | T8 | `waitForTimeout(1500)` before asserting no outside requests. | Wait for `networkidle` or a known settled signal; keep a short bound. | Low |
| 2 | 15-20 | T4 | Same card/avatar assertions as the attention production twin. | Merge. | Low |
| 3 | 24 | B5 | Screenshot artefact. | Drop. | — |

## Proposed end state
This file becomes the merged production Home case (it already has the network fence); add the Settings → Account step from `home-attention.production.spec.ts`; delete the other file.
