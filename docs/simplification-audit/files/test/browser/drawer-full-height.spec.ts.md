# test/browser/drawer-full-height.spec.ts
- Lines: 59 | Kind: Playwright, chromium. A layout journey on `device-apps-stub.ts` plus an inline `AlphaConnection` header that holds the assistant-draft read so it can fail it later | Verdict: **MERGE into `journeys/home-shell.spec.ts`**
- Covers: the Apps drawer fills the screen to within 1 px. At 600 and 915 px heights, with native bottom insets 0 and 72, the last app button is fully in view, clears the composer dock by 4 px and is hit-testable. A late "Assistant draft could not be read" notice does not move the input bar. Duplicates: `home-app-library.spec.ts` and `home-native-launcher.spec.ts` drive the drawer; `accessibility-sweep.spec.ts` checks dock clearance generically. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-24 | T7 / C4 | The `AlphaConnection` header and `nativePromise` wrapper are patched over `device-apps-stub`'s bridge by hand. | Use a harness bridge option (`assistantDraftRead: 'held'`) with a `bridge.fail('AlphaConnection.secureRead')` control. | none |
| 2 | 5 | T7 | The two-height loop is reasonable: it covers short and tall screens. | Keep the loop; the merged file can parametrize it. | none |
| 3 | 39 | — | `--native-bottom-inset` is set as a CSS variable directly, which simulates the native inset. This is acceptable boundary injection. | Keep, through a `harness.setInsets()` helper shared with `full-chat-grabber` (`--native-top-inset`). | none |
| 4 | 47 | — | `settled(page)` from `helpers/settled` waits on animations, a condition wait rather than a sleep. | Keep. | none |

## Proposed end state
The "Apps drawer layout" test in `journeys/home-shell.spec.ts`, parametrized over two heights and two insets, on the
harness bridge with a held-then-failed draft read. The assertions are unchanged.
