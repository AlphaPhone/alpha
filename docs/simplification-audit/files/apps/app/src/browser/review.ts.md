# apps/app/src/browser/review.ts
- Lines: 45 | Role: BrowserReviews: promise-based confirm dialog with cancellation ownership | Verdict: SIMPLIFY
- Importers: 9 (calendar.ts, deletions.ts, prototype/{agent-adapter,browser-adapter,browser-external-handoff,calendar-confirmation,camera-adapter,scan-document,settings-adapter}). Text/path pins: specs/quint/application/manifest.json; refinement browser-reviews.mjs; scan-source-conformance.mjs; test/calendar-empty-bootstrap-repro.test.mjs (reads source); test/browser/browser-external-handoff.spec.ts, operation-review-accessibility.spec.ts, review-visual-viewport.spec.ts; test/support/feature-parity.mjs (exact inventory).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 35 | C3 (P5) | Foreground predicate inlined twice (`document.hidden\|\|...devBackground==='true'\|\|browserScreenLocked()`). | foregroundBlocked(). | None. |
| 2 | 16 | C3 (P4) | Theme copy + upper-case dark detection. | Dialog kit applyShellTheme. | None. |
| 3 | 9 | B1 | `try{...}catch{return false;}` around a caller-supplied `current()` — treat throwing as stale; specified. | Keep with comment. | - |
| 4 | 19 | B4 | `body.style.whiteSpace='pre-wrap'` duplicates review.css:6. | Delete. | None. |
| 5 | 26-41 | C4 | Listener add/remove lists. | Dialog kit onRetire. | Medium (Quint browser-reviews models lifecycle). |

## Local types and helpers
| Name | Kind (type/interface/helper/const) | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| - | - | - | none | - |

## Proposed end state
Same class using foreground.ts + dialog kit. Estimated lines after: 35 (current 45).

## Verification
operation-review-accessibility.spec.ts, review-visual-viewport.spec.ts, browser-external-handoff.spec.ts, browser-reviews Quint harness.
