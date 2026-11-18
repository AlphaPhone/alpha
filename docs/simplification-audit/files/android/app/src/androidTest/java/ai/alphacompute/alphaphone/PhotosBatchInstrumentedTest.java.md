# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosBatchInstrumentedTest.java
- Lines: 68 | Role: Photos multi-select favorite/trash with a stale row, undo, `changeMany` receipts, duplicate rejection, trash durable across recreation and restore from Recently deleted | Verdict: SIMPLIFY
- Importers: none; static-imports `PhotosTestFixture.*` (`fixture`, `bytes`, `touch`). Text/path pins: `scripts/android-instrumentation.ts:252` (gate `photosBatch` → runner test requires `"1".equals(InstrumentationRegistry.getArguments().getString("photosBatch")` on l.39); `scripts/owner/emulator-campaign-check.ts:47,57`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 6, 10, 11, 18 | A7 | Unused imports: `android.app.Instrumentation`, `android.graphics.Bitmap`, `android.view.*`, `AccessibilityNodeInfo`, `AtomicReference` (each appears only on its import line). | Delete. | None. |
| 2 | 24-26, 31-34 | C3 | `js`/`until`/`click`/`nativeCall` twins (nativeCall = 8th bridge-await copy). | Shared helpers. | None. |
| 3 | 46, 59, 60 | C3 | `AppNavigation.liveMode();js(AppNavigation.request("Photos"));until(AppNavigation.selected("Photos"));AppNavigation.declineStartupAccess();` ×3. | Private `openPhotos()` or `AppNavigation.open("Photos")`. | None. |
| 4 | 65 | C6 | `"alpha-owned-media-versions"` preference literal (also PhotosFixtureRecovery:31, PhotosTrash:65,82); production name in `AlphaPhotosPlugin.java:12` comment. | Constant from production. | None. |
| 5 | 47-61 | D8 | 300-900-character lines. | Formatter. | None. |
| 6 | 40 | B4 | Hard `assertTrue(SDK_INT>=30)`. | Delete if minSdk ≥ 30. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `include` | helper | 28 | PhotosFixtureRecovery:21 (MATCH_ONLY variant), PhotosTrash | `PhotosTestFixture.includeTrashed()` |
| `flag`/`state` | helper | 29-30 | PhotosTrash (similar) | `PhotosTestFixture` |
| `nativeCall`/`item` | helper | 31-35 | 8 bridge copies | `WebViewTestDriver.nativeCall` |
| `choose`/`undo` | helper | 36-37 | PhotosMultiShare (selection via `touch`) | keep |

## Proposed end state
Same journey, unused imports gone, shared bridge/navigation helpers. ~55 lines.

## Verification
`npm run test:android:instrumentation -- --classes PhotosBatch`.
