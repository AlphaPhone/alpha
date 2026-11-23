# test/browser/large-text-overlap.spec.ts
- Lines: 211 | Kind: Playwright layout/geometry checks, `chromium`, 11 tests (3 scales × 2 Home sources, grid, calendar card, Apps × 2, Files); uses `accessibility-audit.ts` `auditPage` and `accessibility-states.ts` `setTextScale` | Verdict: MERGE into `journeys/accessibility.spec.ts`
- Covers: PRD AP-15 large font: no Home card text or app label is painted over another or split mid-word at up to 200 %, the app grid drops to 3 columns at 200 %, the Home calendar title wraps visibly, Apps drawer tiles do not overlap, Files/share/avatar labels keep whole words. Duplicates: `accessibility-sweep.spec.ts` ("200% text is not clipped and does not overlap", every view), `large-text-layout.spec.ts`, `accessibility-resilience.spec.ts`. Callers/importers: none; imports `helpers/owned-photo`, `helpers/home-calendar`, `accessibility-audit`, `accessibility-states`, `device-apps-stub`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72, 102, 162, 189, 208 | T4 | Every test also runs `auditPage({clipping, overlap})`, the same rule the sweep runs per view. | Drop those calls; the sweep owns them. | Low. |
| 2 | 58-106 | T4 | Scale 1 and 1.5 variants of the Home test add nothing over 2 (the regression was at 200 %). | Keep only 200 % on the populated Home. | Low. |
| 3 | 86-101 | - | App-label tile containment, no mid-word split and pairwise non-overlap: the round-7 emulator regression, not in the sweep's rule set. | Carry. | Low. |
| 4 | 108-119 | - | Grid 4→3 columns at 200 % and back. | Carry. | Low. |
| 5 | 121-150 | T1-ish | Calendar card asserts design pixels (`width 280`, `height 196`); title geometry is the real check. | Carry the title wrap/visibility check, drop the exact pixel constants. | Low. |
| 6 | 152-183 | T4 | Apps drawer overlap at 1 and 2. | Carry the 200 % variant only. | Low. |
| 7 | 185-211 | T4 | Files/calendar/photos `auditPage` at 200 % repeats the sweep, apart from the "one category per row" check. | Carry the one-per-row check; drop the rest. | Low. |
| 8 | 53 | T8 | `waitForTimeout(150)` per card after scroll. | Wait for the card's bounding box to be stable. | Low. |
| 9 | 59 | - | `?mode=mock&start=home` populated fixture: dev surface. | Keep on dev project (fixture Home needed). | - |

## Proposed end state
`journeys/accessibility.spec.ts` gets a "200 % text geometry" test with steps: populated Home app labels and card text inside their boxes and not overlapping, grid 4→3→4, calendar title fully visible, Apps drawer tiles not overlapping, Files one category per row. `textBoxes` and `overlaps` move into `accessibility-audit.ts` (or the harness). File deleted.
