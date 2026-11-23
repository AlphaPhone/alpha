# test/browser/home-launcher.spec.ts
- Lines: 111 | Kind: Playwright spec (chromium) on the browser device implementation | Verdict: MERGE test 1 into `journeys/home-shell.spec.ts`; DELETE tests 2-4
- Covers: (1) Apps drawer over Home with no product views, count or reorder controls, Home `aria-hidden`, closes on HOME/Back/Close; (2) failed installed-app read + retry (patches `BrowserDevice.prototype.list`); (3) upgraded install migrates favorites saved under `alpha:workflows`; (4) product palette reaches `document.documentElement` and body-appended dialogs. Duplicates: (1)/(2) are covered with the native stub in `home-app-library.spec.ts:371-393` (failed list, retry, HOME) and `home-native-launcher.spec.ts:250-260` (empty list); (3) is a legacy-data migration. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-62 | T4 / T6 | Failure injected by patching `BrowserDevice.prototype.list` via `/src/browser/device.ts`; the stubbed-native version in `home-app-library` drives the same UI through the bridge. | Delete. | Low |
| 2 | 64-87 | A1 / T5 | Tests migration of favorites saved under older view ids (`alpha:workflows` → `alpha:automations`). DECISIONS D1: no install base, legacy readers deleted. The migration lives in the upstream launcher join (`.eliza/client-features/...`), not in this repo, so this is also a test of upstream (T5). | Delete; the migration should be removed upstream (follow-up, D14). | Low |
| 3 | 92-111 | T6 / T1-like | Creates a `.note-source-dialog` element by hand and reads computed styles: checks a CSS variable's presence, not a user-visible journey. `note-source-dialog` belongs to the notes source-review dialogs. | Delete; if the palette-on-body bug matters, assert a real body-appended dialog's primary button colour inside the Notes or Calendar review journey. | Low |
| 4 | 7-42 | — | Unique on the browser lane: drawer has no product tiles, no count, Home is `aria-hidden` behind it. | Carry into the launcher section (run on the native stub; the empty-inventory variant shows "No apps"). | — |

## Proposed end state
File deleted. `journeys/home-shell.spec.ts` launcher section asserts, with the native stub and an empty inventory: drawer heading, "No apps", no product views/count/reorder controls, Home `aria-hidden`, search with no match, closes on HOME, Back and Close.
