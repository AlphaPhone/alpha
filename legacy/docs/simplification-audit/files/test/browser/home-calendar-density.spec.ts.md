# test/browser/home-calendar-density.spec.ts
- Lines: 41 | Kind: Playwright layout spec (chromium), 5 parametrised cases | Verdict: MERGE into `journeys/calendar.spec.ts` (Home card layout case)
- Covers: the Home calendar card keeps a 3-line clamped title, a fixed 196 px card, an unclipped time footer and correct accessible name across light/dark, 320/412/960 widths, long/unbroken/all-day/empty titles, and opens Calendar. Duplicates: geometry checks of the same card in `home-daily-overview.spec.ts:57,199` (footer not clipped, no overflow) and `home-chat-anchor`/`responsive-surfaces` for viewport sweeps. Callers/importers: chromium project; imports `helpers/home-calendar.ts` (`installHomeCalendar`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-38 | — | Exact numbers (196 px, 26 px font, 11/21 px gaps) pin the design; legitimate visual contract but brittle. | Keep the clamp/overflow/footer-inside assertions; drop exact font size. | Low |
| 2 | 39 | B5 | Writes `geometry.json` and a screenshot for every case. | Drop; attach only on failure. | — |
| 3 | 24-30 | T7 | Five full app loads for one card. The `empty` case only checks the card is absent (covered by production Home tests). | Keep 3 cases (320 long dark, 320 unbroken, 412 all-day). | Low |
| 4 | 5-22 | D8 | Dense one-line helpers. | Format on merge. | — |

## Proposed end state
One parametrised case in `journeys/calendar.spec.ts` › "Home calendar card keeps its title and time readable" over three inputs, using `installHomeCalendar` from the harness. File deleted.
