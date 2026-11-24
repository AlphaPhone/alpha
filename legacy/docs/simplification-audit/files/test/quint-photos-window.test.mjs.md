# test/quint-photos-window.test.mjs
- Lines: 27 | Kind: Quint wrapper (application index) + one scenario on the compiled Photos window fixture | Verdict: DELETE (fold the scenario into the driver)
- Covers: hidden and replaced Photos reads do not publish (19 traces); an old summary failure keeps the current successful counts. Duplicates: application index runs `checkPhotosWindow`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 12-27 | — | Concrete regression on the compiled `camera-adapter.ts`. | Named sequence in the driver. | Low |
| 3 | — | D8 | Different style (double quotes, `18e4`): machine-generated file. | Gone. | None |

## Proposed end state
Deleted; the scenario runs inside the PhotosWindow campaign.
