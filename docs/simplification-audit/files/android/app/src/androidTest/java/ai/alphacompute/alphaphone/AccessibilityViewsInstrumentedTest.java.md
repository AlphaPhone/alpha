# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AccessibilityViewsInstrumentedTest.java
- Lines: 156 | Role: every retained view and the Apps drawer at 200%/300% effective text: ATF, TalkBack order, focus. | Verdict: SIMPLIFY (and MOVE its shared statics to a new `AccessibilityFixture.java`)
- Importers: AccessibilityHomeRole (VIEWS, fontScale, restoreFontScale, FOCUS_PROBLEM), AccessibilityLifecycle (VIEWS, shell, fontScale, restoreFontScale).
- Text/path pins: `test/accessibility-coverage.test.mjs:173` regex `static final String\[\] VIEWS = \{([^}]*)\};` against this path, and :178 requires `AccessibilityViewsInstrumentedTest\.VIEWS` in Lifecycle/HomeRole; `scripts/android-instrumentation.ts:172` (`requiresTestMocksBuild`, `grant:["CAMERA"]`); runner test `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text pin; `scripts/owner/emulator-campaign-check.ts:42,46,59`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 39-51, 94-96 | D3 | A test class doubles as the shared accessibility fixture (`static final String[] VIEWS`, `shell`, `fontScale`, `restoreFontScale`, `FOCUS_PROBLEM`). | Move them to `AccessibilityFixture.java`; update `test/accessibility-coverage.test.mjs:173,178` (or delete those T1 regexes and instead compare VIEWS through a real import — not possible from node; simplest: point the regex at the new file). | Medium: text pin. |
| 2 | 39 | C6 | `VIEWS` mirrors `mvp-features.ts ENABLED_MVP_VIEWS` by hand; kept in sync only by the T1 regex test. AllViewAgentContext:120 holds a third hand list. | Keep one Java list (in fixture); delete AllViewAgentContext (see its report). | Low. |
| 3 | 47-51 vs 53-66 | C4 | Two font-scale setters: `fontScale(value)` (fire-and-forget shell) and `setSystemFontScale(value)` (waits for setting + Configuration). Lifecycle and HomeRole use the non-waiting one and then poll the page scale instead. | One `AccessibilityFixture.fontScale(value)` that waits for the configuration (the waiting version); callers drop their own page-scale polling where it exists only to wait for the setting. | Low. |
| 4 | 111-112 | C3 | `previous = savedSystemScale.isEmpty() || "null".equals(...) ? "1.0" : ...` duplicates `restoreFontScale` normalisation (:51) and AccessibilityInstrumentedTest:115,183. | Use `restoreFontScale(saved)`. | None. |
| 5 | 67, 89-92 | C3 | `js` and `until` copies. | `WebViewTestDriver.until`. | Low. |
| 6 | 98-99 | B4 | `assumeViews` wrapper redundant (see HomeRole #3). | Delete; keep pin text elsewhere or update pin. | Low. |
| 7 | 118-152 | D8 | `try (...) { try { ... } finally { appTextScale(previousAppPercent, null); } }` with the inner block un-indented. | Single try-with-resources + finally; formatter pass. | None. |
| 8 | 139 | T8 | `SystemClock.sleep(600)` before ATF on each view. | Wait for `window.__alphaTestNavigation?.status==='complete'` (already the pattern used in HomeRole). | Low-medium. |
| 9 | 125 | C6 | Local `measuredScale` string = the text-scale expression copied in 4 files. | `AccessibilityFixture.TEXT_SCALE`. | None. |
| 10 | 133 | — | `window.dispatchEvent(new Event('launcher-home'))` closes the drawer by a synthetic window event (T6-style backdoor), not a user action. | Close with the drawer's own control or Back (`WebViewTestDriver.pressBack()`). | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `VIEWS` | const | 39 | AllViewAgentContext:120 (hand list), `test/browser/accessibility-lifecycle.spec.ts` `VIEWS` (TS twin, pinned equal by accessibility-coverage test) | `AccessibilityFixture.VIEWS` |
| `automation()`/`shell()` | helper | 40-45 | AccessibilityInstrumentedTest:44-47 + 8 more `shell(` copies | `AccessibilityFixture.shell` |
| `fontScale`/`restoreFontScale`/`setSystemFontScale` | helper | 47-66 | AccessibilityInstrumentedTest inline font_scale shells | `AccessibilityFixture.fontScale` (waiting) |
| `appTextScale` | helper | 68-88 | none | keep local |
| `until` | helper | 89-92 | AccessibilityHomeRole:30, AccessibilityLifecycle:48 | `WebViewTestDriver.until` |
| `FOCUS_PROBLEM` | const (JS) | 94-96 | Lifecycle:123 inline "focus in hidden content" probe (subset) | `AccessibilityFixture.FOCUS_PROBLEM`; Lifecycle uses it too |
| `assumeViews` | helper | 99 | HomeRole:41, Lifecycle:96 | delete |

## Proposed end state
~120 lines: two @Test methods over `auditViews(appPercent, effective)`; VIEWS/shell/fontScale/FOCUS_PROBLEM/TEXT_SCALE live in new `AccessibilityFixture.java` (~60 lines that also absorbs Lifecycle's pressHome/oneMainActivity/awaitForeground). No fixed sleeps, no synthetic `launcher-home` event.

## Verification
`--test-mocks --classes AccessibilityViews` both variants (CAMERA grant). Host: `node --test test/accessibility-coverage.test.mjs` after re-pointing its VIEWS regex.
