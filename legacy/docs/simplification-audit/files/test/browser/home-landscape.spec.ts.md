# test/browser/home-landscape.spec.ts
- Lines: 76 | Kind: Playwright journey (chromium, touch/mobile emulation) | Verdict: MERGE into `journeys/home-shell.spec.ts` (orientation case)
- Covers: landscape lays Home and composer side by side with every Home control and drawer control reachable and hit-testable; rotating keeps the active view and composer draft; conversation docks beside Home; a portrait window on a landscape monitor stays portrait. Duplicates: partial with `responsive-surfaces` / accessibility sweeps (viewport reachability). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-14 | C3 | `reachable()` (in-viewport + `elementFromPoint` hit test) is a helper several specs re-implement (`home-compact-scroll`, `home-chat-anchor`, accessibility specs). | Move to harness `expectReachable(locator)`. | Low |
| 2 | 26, 47 | B5 | Screenshot artefacts. | Drop. | — |
| 3 | 66-69 | T6 (mild) | Overrides `Screen.prototype` width/height; necessary because Chromium ignores `screen` outside mobile emulation. | Keep, it is the only way to reach that branch. | — |
| 4 | 50-60 | — | Docked conversation case is short and unique. | Keep as a step of the landscape case. | — |

## Proposed end state
One "landscape and rotation" case in `journeys/home-shell.spec.ts` (Home + composer side by side, rotation keeps view and draft, drawer reachable, chat docks beside Home) plus the narrow-window-on-landscape-monitor case. Uses the shared `expectReachable`. File deleted.
