# test/browser/compact-viewport.spec.ts
- Lines: 95 | Kind: Playwright UI, chromium (dev server) | Verdict: **MERGE** into `journeys/accessibility.spec.ts` (layout steps) — tests 1, 2, 4; **DELETE** test 3
- Covers: (1) the Notes editor's title, body and Back stay inside the viewport and hit-testable at four sizes (320×568 … 1440×500) and the draft survives; (2) chat Minimize/Expand and the draft stay in view at 412×300 and the draft survives closing; (3) the retained digests dialog follows light/dark theme; (4) the sign-in dialog follows a live Dark theme change, scrolls its Email field into a 300 px viewport and returns focus on Escape. Duplicates: (2) overlaps `chat-continuity` draft retention and `home-compact-scroll`; (4) overlaps `accessibility-sign-in.production.spec.ts`. Callers/importers: none. 8 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 10 | A1 | Notes is opened through `openLegacyNotes` ("Previous notes"), which D1 deletes. | Open canonical Notes through `nav.openApp('Notes')`. | Medium: test fails as soon as the legacy source goes. |
| 2 | 51-65 | P2 / T6 | Test 3 opens the digests panel by dispatching `alpha:hosted-digests` (`helpers/retained-digests.ts`); its own comment says "component coverage, not a settings journey". | Delete; theme colours of dialogs are covered by the accessibility sweep. | Low. |
| 3 | 68-74 | C3 | `__alpha-browser-cloud` sign-in-status stub duplicated with `cloud-notes-voice-fixture.ts:8-14`. | Harness option. | none |
| 4 | 86 | A3 | Asserts no "Remote agent" text, a guard for the retired pairing route (C4). | Drop with C4. | none |
| 5 | 26, 44, 64, 94 | B5 | Screenshots written to `outputPath` that nothing compares. | Drop or attach on failure only. | none |
| 6 | 6 | T4 | Four viewports per Notes case; the sweep already varies viewport. | Keep 320×568 and 915×412 (portrait-min, landscape) as journey parameters. | Low. |

## Proposed end state
Three steps in `journeys/accessibility.spec.ts`: compact Notes editor (2 viewports, canonical Notes), keyboard-height chat with draft retention, sign-in dialog under live theme change at compact height with focus return. No digest-event backdoor, no legacy Notes helper.
