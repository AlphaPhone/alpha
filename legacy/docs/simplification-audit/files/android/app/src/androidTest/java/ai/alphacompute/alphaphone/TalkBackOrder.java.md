# android/app/src/androidTest/java/ai/alphacompute/alphaphone/TalkBackOrder.java
- Lines: 201 | Role: shared TalkBack linear-order judge for the accessibility instrumentation classes: labels, clipping, reading order (with header/camera bar groups) and a single final "Assistant controls" group; prints geometry and a screenshot on failure. | Verdict: SIMPLIFY
- Importers: 4 — `AccessibilityInstrumentedTest:53,111`, `AccessibilityViewsInstrumentedTest:131,144`, `AccessibilityLifecycleInstrumentedTest:125,155,198-204`, `AccessibilityHomeRoleInstrumentedTest:71`. Uses `AccessibilityBounds.clip` (javac host-tested by `test/accessibility-visible-bounds.test.mjs` via `test/fixtures/AccessibilityBoundsTest.java`). Text/path pins: **`test/accessibility-coverage.test.mjs:163-169` reads this file and regex-matches `r.top < p.top - Math.max(p.height(), r.height()) / 2 && r.left < p.right`, `ASSISTANT_GROUP = "Assistant controls";` and the READING_GROUPS selector string inside `GROUPS` (T1/T10)**.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 112-114, 31-32, 168 | T1 / T10 | The browser/Android rule parity is enforced by regexes over this source (`accessibility-coverage.test.mjs:163-169`); any formatter run breaks it. | Put the shared constants (assistant group name, READING_GROUPS selector) in one JSON asset read by both `test/browser/accessibility-audit.ts` and this class; delete the regex pins. The geometric rule stays duplicated by design (Java vs TS) — document it. | Low; coordinated 3-file change. |
| 2 | 43-48 | B4 / A7 | `Result.actionable`, `groups`, `seenAssistant` are "counts [that] let callers add their own checks", but no caller reads them (grep: callers use only `.problems`). | Return `List<String>` problems; make counts locals. | None. |
| 3 | 55-61, 99-103 | — | `collect` and `assistantGroups` are package-visible; only used here. | Make private. | None. |
| 4 | 120 | B1 | `catch (Exception unreadable) { System.out.println(...) }` in `groups()` — a failed read silently disables bar grouping, which can turn a real order problem into a pass or vice versa. | Let it throw (the JS is ours and must parse). | Low. |
| 5 | 191-200 | B5 | `diagnose` writes a screenshot to `/sdcard/Download/alpha-accessibility-fixture-<uuid>.png` and prints the path; the comment says the host pulls it — grep finds no script that pulls `alpha-accessibility-fixture-` (0 hits outside this file). | Either have the runner pull/delete it or stop writing it (leaves files on the emulator). | None. |
| 6 | 192-193 | D8 | Two ~1,000-char JS diagnostics, one hard-coded to a "Notifications" Settings row (a one-off investigation). | Delete the Settings-specific geometry dump; keep a generic one. | None. |
| 7 | 129-140 | T8 | Up to 25×200 ms re-reads until a clickable node appears. | Keep (documented WebView publish delay). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `ASSISTANT_GROUP` | const | 32 | `test/browser/accessibility-audit.ts` `ASSISTANT_GROUP` | shared JSON asset |
| `GROUPS` (READING_GROUPS selector) | const | 112-114 | `accessibility-audit.ts` `READING_GROUPS` | shared JSON asset |
| `Assistant` enum, `Result` | type | 34-48 | none | keep (Result shrinks to a list) |
| `visibleBounds` | helper | 84-92 | `AccessibilityBounds.clip` (shared) | keep |
| `js` | helper | 52 | ~38 `js(` copies | `WebViewTestDriver` |

## Proposed end state
~160 lines: same judging rule, constants from a shared asset, no unread counts, no swallowed group read, failure diagnostics trimmed
to a generic geometry dump; regex pins in `accessibility-coverage.test.mjs` replaced by a shared-constant import.

## Verification
`--test-mocks --classes Accessibility,AccessibilityViews,AccessibilityLifecycle` and `--home-role --classes AccessibilityHomeRole`;
`node --test test/accessibility-coverage.test.mjs test/accessibility-visible-bounds.test.mjs`; the browser sweep spec using `auditReadingOrder`.
