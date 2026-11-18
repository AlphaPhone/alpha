# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AppNavigation.java
- Lines: 67 | Role: shared renderer-navigation helper for instrumentation: live-mode exit, view requests through Home/Back, startup-access decline, P-43 sign-in assumption, composer selectors. | Verdict: KEEP (extend slightly)
- Importers: very wide — `liveMode` 89 files, `request` 81, `selected` 76, `declineStartupAccess` 32, `composer` 20, `assumeNoRequiredSignIn` 18, `type` 14, `SIGN_IN_PAGE_READY` 5, `CLOSE_CONNECTION` 3, `closeConnection` 2.
- Text/path pins: none on this file's text. It hard-codes renderer contracts: storage key `alpha:startup-permission-walkthrough:v1` (`apps/app/src/startup-permission-progress.ts:11`), `window.__alphaTestNavigation`, `.alpha-connection-scrim`, `dialog.alpha-startup-permissions`, `aria-label="Close connection settings"`, `textarea[data-alpha-composer]`, `button[aria-label="Type"]`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-61 | C3/C6 | `assumeNoRequiredSignIn` contains the P-43 predicate (`readCredentialSlot("cloud:production") != null`) which AccessibilityInstrumentedTest:73-76 and AccessibilityLifecycle:215-217 re-derive. `"cloud:production"` appears in 16 androidTest files. | Add `static boolean requiredSignIn()` here; `assumeNoRequiredSignIn` uses it; delete the two copies. One `CLOUD_SLOT` constant. | None. |
| 2 | — | C3 | `open(view)` = `js(request(view)); until(selected(view))` is re-written in AccessibilityInstrumentedTest:50, AccessibilityLifecycle:52, BrowserContinuity:25 (`app`), BrowserDialogLifecycle:19 (`app`, plus settled wait), and inline in ~80 files. | Add `static void open(String view)` that waits for selected + `__alphaTestNavigation.status==='complete'`; add `SETTLED` constant. | Low. |
| 3 | 44 | B1 | JS `try{...}catch{return false}` around `JSON.parse(localStorage...)` — acceptable fixture tolerance (treat unreadable as not completed). | Keep. | — |
| 4 | 12-22 | — | `liveMode()` handles a mock-mode banner that exists only in test-mocks builds; production path is one `awaitReady(true)`. | Keep (shared). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CLOSE_CONNECTION` | const | 10 | `connection-ui.tsx` aria-label | keep |
| `SIGN_IN_PAGE_READY` | const (JS) | 63 | none | keep |
| (new) `requiredSignIn()` | helper | — | AccessibilityInstrumentedTest:73, AccessibilityLifecycle:215 | here |
| (new) `open(view)`, `SETTLED` | helper/const | — | 5+ local `open`/`app` helpers; `TEST_NAVIGATION_SETTLED` in AccessibilityHomeRole:37 | here |

## Proposed end state
~75 lines: same API plus `requiredSignIn()`, `open(view)`, `SETTLED`; removes ~40 duplicated lines across callers.

## Verification
Any instrumentation run (it is used by most classes): default flag-off run `npm run test:android:instrumentation -- --owned-emulator` and the `--test-mocks` pair.
