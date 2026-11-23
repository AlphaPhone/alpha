# android/app/src/androidTest/java/ai/alphacompute/alphaphone/AccessibilityBounds.java
- Lines: 14 | Role: pure rectangle intersection (`clip(bounds, frames)`) used by TalkBackOrder to drop off-screen nodes. | Verdict: MERGE into `android/app/src/androidTest/java/ai/alphacompute/alphaphone/TalkBackOrder.java`
- Importers: 1 production-of-test caller (`TalkBackOrder.java:90`). Text/path pins: `test/accessibility-visible-bounds.test.mjs:8,13` javac-compiles this file by path with `test/fixtures/AccessibilityBoundsTest.java:6` (host unit test, T3/D7).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-14 | D7 | A separate class exists only so a host javac test can compile it alone (`test/accessibility-visible-bounds.test.mjs` compiles `AccessibilityBounds.java` + `AccessibilityBoundsTest.java`). Only real caller is `TalkBackOrder.clip(...)` at `TalkBackOrder.java:90`. | Delete the host test + fixture (T3: 8-line pure intersection, exercised for real by every TalkBackOrder read in the Accessibility* instrumentation classes); move `clip` as a `private static` into TalkBackOrder; delete this file. | Low. |
| 2 | 10 vs 12 | B4 | Loop already returns empty on the first degenerate intersection (`if(left>=right||top>=bottom)return new int[]{0,0,0,0};`); the final ternary re-checks the same condition, needed only when `frames` is empty and the input itself is degenerate. | Keep only the final check (drop the in-loop early return) or keep both; when inlining, write it once: compute, then one degenerate check. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `AccessibilityBounds.clip` | helper | 5-13 | none (JS twin of the same rule in `test/browser/accessibility-audit.ts` is a different language) | private static in `TalkBackOrder.java` |

## Proposed end state
File deleted. `TalkBackOrder.java` gains a ~7-line private `clip`. `test/accessibility-visible-bounds.test.mjs` and `test/fixtures/AccessibilityBoundsTest.java` deleted. Net: -14 here, +7 in TalkBackOrder, -~25 in test/.

## Verification
Accessibility, AccessibilityViews, AccessibilityLifecycle, AccessibilityHomeRole instrumentation classes (all call `TalkBackOrder.read/check`). `node --test test/accessibility-visible-bounds.test.mjs` disappears with the change; `test/android-instrumentation-runner.test.mjs` unaffected (no @Test here).
