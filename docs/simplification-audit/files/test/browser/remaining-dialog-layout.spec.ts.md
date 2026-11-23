# test/browser/remaining-dialog-layout.spec.ts
- Lines: 28 | Kind: Playwright, chromium (`?mode=dev`); 28 generated tests (14 dialogs × 2 themes); every dialog is opened by importing a module and calling it in-page (T6), text scale set through `BrowserDevice.prototype.setTextScale` | Verdict: **MERGE** the product dialogs into `journeys/accessibility.spec.ts`; **DELETE** the development-simulator cases
- Covers: at 360×430 and 150 % text, each dialog has 44 px targets inside the viewport, no horizontal overflow, the theme background, a keyboard-scrollable content region and stacked slider labels. Dialogs: reading review, workflow receipt, incoming email simulation, development location, sound/display/privacy settings (browser stand-ins for Android Settings), simulator recovery, development notification, notification access, reminder channel, development password provider ×3. Duplicates: the accessibility sweep (`accessibility-sweep*.spec.ts`) checks target size and overflow over its state catalogue; reading layout is also in `reading-review` test 6. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 12-17 | D6 / T7 | 11 of 14 "dialogs" are development simulators or browser stand-ins for Android OS screens (location, incoming email, notification composer, password provider, simulator recovery, OS settings pages). They never ship on a phone. | Delete those cases; at most one dev-surface layout check in `journeys/dev-surface.spec.ts`. | none |
| 2 | 11 | A3 / D2 | The workflow-receipt case passes a `wallet` state; `workflow-receipts.ts` reads `state(api,'wallet')`. Wallet is deleted (D2). | Delete the case with Wallet; flag `workflow-receipts.ts` for the Wallet deletion. | Low |
| 3 | 9-17 | T6 | Opens dialogs and sets text scale through module calls. | In the journey, reach the reading review via the Browser menu and set text scale through the shared `harness/text-scale.ts`. | Low |
| 4 | 5 | T7 | 28 tests each boot the dev page. | Fold the product dialogs into the accessibility sweep's state list (one page per state). | none |

## Proposed end state
The reading review (and any other product dialog the sweep lacks) is added to the state catalogue in `journeys/accessibility.spec.ts`
at 150 % text in both themes. Development simulator dialogs get no layout test beyond one dev-surface smoke. File deleted.
