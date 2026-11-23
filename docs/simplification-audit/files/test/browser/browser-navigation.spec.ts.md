# test/browser/browser-navigation.spec.ts
- Lines: 115 | Kind: Playwright spec, chromium, 9 tests (2 loops); 6 tests call the web `AlphaBrowser` plugin directly, 3 drive the UI | Verdict: MERGE into `journeys/browser.spec.ts` (UI tests), DELETE the plugin-level tests
- Covers: the web Browser stand-in's stop/commit fencing, sandboxed-frame navigation invalidating share authority, concurrent bookmark writes across tabs, file-input isolation in a framed page, and Web Share gating; plus rendered address/Back/Forward/Reload/Stop and "no Share in menu". Duplicates: `browser-copy-link.spec.ts` (Stop), native Browser instrumentation tests. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-7, 8-41, 56-72, 100-115 | P7/T6 | `setup()` creates and presents a tab through `registerPlugin('AlphaBrowser')`; the iframe implementation is the web stand-in for Android's native WebView. Fences and share authority tested here are the stand-in's. | Delete these 5 tests. | Medium: the stale-commit fence is product-shaped logic, but the APK path is native. |
| 2 | 34-41 | P3/owner | Two-tab bookmark merge via plugin calls. | Delete unless multi-window matters. | Low. |
| 3 | 43-55 | keep | Rendered address, Back/Forward, Reload counts a request, Stop and recovery. | Carry. | None. |
| 4 | 74-98 | keep | Menu offers no Share regardless of `navigator.share`; no request or popup. | Carry as one step (single variant). | None. |
| 5 | 2 | T7 | `beforeEach` boots the app for every test. | Harness. | None. |

## Proposed end state
Two UI steps join `journeys/browser.spec.ts`; the plugin-level tests are deleted. If the owner wants the stale-commit fence covered, it belongs in Android instrumentation for `AlphaBrowserPlugin`.
