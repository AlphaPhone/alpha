# test/browser/photo-album-accessibility.spec.ts
- Lines: 41 | Kind: Playwright, chromium, `?shell=launcher`; keyboard journey through photo info and the album manager | Verdict: MERGE into `journeys/camera-photos.spec.ts` (albums) with the theme colour check in `journeys/accessibility.spec.ts`
- Covers: Photo info lists dimensions; "Add to album" manager takes focus on Close, traps Tab, closes on Escape/Back/Home and restores focus to the photo control; text and launcher Home indicator follow light/dark. Duplicates: `photo-delete-accessibility.spec.ts` (same focus-ownership rule for another dialog), `photo-albums.spec.ts` and `photos-clean-controls.spec.ts` (album flows). Callers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 4 | D11 | `guardCalendarFixture as guardNoMedia` imported from a calendar spec. | Harness `noMedia()` fixture. | None. |
| 2 | 10 | T6 | Seed via `importBrowserPhoto`. | Shared `seedPhoto` helper. | None. |
| 3 | 6 | T7 | Two themes run the whole focus walk; only l.22-23 depend on theme. | Run the walk once; check the two colours per theme in the accessibility journey. | None. |
| 4 | 35, 38 | P2 | Back/Home via dispatched events. | Harness `androidBack()`/`goHome()`. | None. |

## Proposed end state
One focus-ownership case in the Photos journey (open info, Escape, open album manager, Tab trap, New album, Escape restores focus, Back and Home close it) and one theme colour assertion in the accessibility journey. Delete this file.
