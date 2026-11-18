# test/browser/home-attention.production.spec.ts
- Lines: 20 | Kind: Playwright spec (production project, flag-off build) | Verdict: MERGE into `journeys/production-gating.spec.ts` (one "fresh offline Home" case together with `home-daily-overview.production.spec.ts`)
- Covers: on a flag-off build with an offline selection, Home shows no date line, no Inbox/Workflows/Calendar/Brief cards and no fabricated avatars; Settings → Account still opens sign-in; Workflows opens from the grid. Duplicates: `home-daily-overview.production.spec.ts` (same selector loop over the four cards, same avatar regex, same Workflows click) — near-verbatim twin. Callers/importers: production project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-20 | T4 | Test 2 is the same check as `home-daily-overview.production.spec.ts:15-29` (card selectors, `/^(MC|JP|\+2)$/` avatars, Workflows click). | Keep one copy. | Low |
| 2 | 6-12 | — | Test 1 adds one thing not elsewhere: Settings → Account opens the `Alpha` sign-in dialog on the flag-off build. | Carry that step into the merged production case. | Low |
| 3 | 7-19 | D8 | Statement-soup lines (many statements per line). | Formatter pass when merged. | — |
| 4 | 10 | B5 | Unconditional screenshot artefact. | Drop. | — |

## Proposed end state
One production test, "fresh offline Home on the release build": no network beyond origin (`fenceNetwork`), no page errors, no empty or fixture cards/avatars/copy, Workflows opens without the retired digests dialog, Settings → Account reaches sign-in. Lives in `journeys/production-gating.spec.ts` (or a `production` describe in `journeys/home-shell.spec.ts`; pick one convention repo-wide).
