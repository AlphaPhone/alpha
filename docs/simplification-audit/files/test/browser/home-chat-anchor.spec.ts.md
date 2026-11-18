# test/browser/home-chat-anchor.spec.ts
- Lines: 65 | Kind: Playwright layout/gesture spec (chromium), 4 parametrised + 1 | Verdict: MERGE into `journeys/home-shell.spec.ts` (chat-over-Home section) together with `home-overlay-stability.spec.ts`
- Covers: Home icons stay anchored while the chat sheet opens to half, is dragged and collapses (standalone and launcher shells, 2 sizes); with chat at half, focusing a lower Home control scrolls it above the sheet without making Home inert, including when focus arrives mid-animation. Duplicates: `home-overlay-stability.spec.ts` (same "icon does not move while chat is dragged" claim, launcher shell, finer sampling). Callers/importers: chromium project only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | T7 | 2 shells x 2 sizes = 4 full runs; `?shell=launcher&tools=1` is a dev-only presentation flag (`main.tsx:392`). | Keep 2 cases (standalone 360, launcher 412). | Low |
| 2 | 23-24, 38-39 | B5 | Writes geometry JSON twice (file + attachment) and a screenshot every run. | Attach only on failure. | — |
| 3 | 18-27 | T4 | Drag-anchor claim duplicated with `home-overlay-stability.spec.ts:13-36`. | Keep one drag test that samples every frame (the overlay-stability approach) and also asserts half/collapsed positions (this file). | Low |
| 4 | 51-54 | T6 (mild) | Injects a 10 s transition style and pauses `CSSTransition` objects to land focus mid-animation. Hard to reach otherwise; acceptable as the only way to test that race. | Keep, comment why. | Medium (timing) |

## Proposed end state
Two cases in `journeys/home-shell.spec.ts`: "Home stays put while chat opens, drags and collapses" (merged with overlay-stability, frame-sampled) and "a focused Home control scrolls above the half sheet, also mid-animation". File deleted.
