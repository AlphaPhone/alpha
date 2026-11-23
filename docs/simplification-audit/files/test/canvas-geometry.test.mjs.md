# test/canvas-geometry.test.mjs
- Lines: 97 | Kind: unit (imports real `runtime/canvas-geometry.ts`, pure functions) + transplant (lines 82-96 strip `prototype/calendar-days.ts` and `vm`-eval it with a stubbed `currentSurfaceLayout`) | Verdict: MERGE into `journeys/home-shell.spec.ts` (viewport cases) and `journeys/calendar.spec.ts` (wide calendar); delete the rest
- Covers: canvas scale/landscape/wide decisions for phone, small phone, tablet, launcher and desktop preview; keyboard is not a rotation; list-detail split and Calendar day columns by width and text scale; Calendar visible days lead with the previous day. Duplicates: `test/browser/large-text-layout.spec.ts` (agenda at large text), `*-layout.spec.ts` files render at several viewports. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A8 | "Issue #411" tombstone. | Gone with the file. | None |
| 2 | 14-79 | T3 | Pure-function table tests. The owner brief rules out unit tests; the behaviour (no shrink below 44px targets, keyboard does not flip to landscape, split at >=1024px) is observable in Playwright with `setViewportSize`. | `journeys/home-shell.spec.ts`: 412x915, 640x360, 1280x800 canvas scale; focus a field and shrink height -> stays portrait. `journeys/calendar.spec.ts`: 1280 wide -> 5 day columns, 150% text -> agenda. | Medium: the keyboard-swap heuristic (lines 43-60) has several edge cases that a journey will not enumerate. |
| 3 | 82-96 | T2 | Strips imports/exports of `calendar-days.ts` and evals it. | Delete; "event closed returns to the same visible days" is one Calendar journey step. | Low |

## Proposed end state
Deleted. Two or three viewport steps in the home-shell journey and two in the Calendar journey. If the owner wants
the keyboard-swap edge cases kept, keep lines 34-61 as the only remaining pure-algorithm check (T3 exception).
