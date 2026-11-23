# test/browser/home-native-launcher.spec.ts
- Lines: 324 | Kind: Playwright journey (chromium) on an inline Capacitor native-plugin stub | Verdict: MERGE into `journeys/home-shell.spec.ts` (launcher, assistant and app-update sections); permissions case into `journeys/startup-permissions.spec.ts`
- Covers: a new Android WebView waits for `AlphaDevice` update activation before showing Home; a mounted WebView freezes input and waits for draft readback before allowing an update, refuses when readback differs, and restores the editor without replaying reconnect; Android Back order (chat above drawer); drawer listing with icons, unsafe icon/duplicate filtering, launch by package and failed launch; empty list; search while loading; denied notifications in the startup walkthrough after account restoration; the assistant Activity surface; the `alpha.assistant` extra alone keeps Home. Duplicates: drawer listing/launch overlaps `home-app-library.spec.ts`; assistant cases duplicated by `home-assistant-surface.spec.ts`; startup-permission case overlaps `startup-permissions-walkthrough.spec.ts`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-67 | C5 / T7 | Second hand-written Capacitor stub, different shape from `home-app-library.spec.ts:11-72`; adds `AlphaDevice` update and `AlphaConnection` secure slots. | Merge into the shared `harness/native-bridge.ts` fixture. | Low |
| 2 | 101-109, 141-148 | T6 | Replaces `connectionController.captureAppUpdateReconnect` in-page to count reconnects. | Keep the assertion but observe reconnect through the bridge (`Agent` / session calls in `nativeCalls`) instead of patching the controller. | Medium |
| 3 | 94-181 | — | Update-vs-draft safety (freeze, readback, refuse on mismatch, no reconnect replay): unique product safety rule with no other browser coverage. | Keep all four as one describe. | — |
| 4 | 281-301 | T4 / T6 | Startup walkthrough after "account restoration" achieved by overwriting `getSnapshot` and calling `close()`; asserts the walkthrough's persisted record `{version:4,...}`. Overlaps `startup-permissions-walkthrough.spec.ts`. | Move to `journeys/startup-permissions.spec.ts` if that spec lacks the "denied prompt not repeated after reload" step; otherwise delete. | Low |
| 5 | 311 | T8 | `waitForTimeout(500)` to show the permissions dialog never appears. | Assert after a settled signal (Close visible + one frame). | Low |
| 6 | 183-204 | — | Back-order across chat and drawer, unique. | Keep. | — |

## Proposed end state
Cases distributed on the shared native-bridge fixture: launcher (listing/icons/filtering/launch/failure, empty, search-while-loading, Back order) and assistant (Activity surface, launch extra) in `journeys/home-shell.spec.ts`; the four app-update cases as an "app update keeps the draft" describe in `journeys/home-shell.spec.ts` (startup path) or `journeys/settings.spec.ts`; the permissions case folded into `journeys/startup-permissions.spec.ts`. File deleted.
