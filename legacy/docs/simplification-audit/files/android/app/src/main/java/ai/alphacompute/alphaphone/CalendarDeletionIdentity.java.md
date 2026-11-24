# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarDeletionIdentity.java
- Lines: 30 | Role: Parses/encodes the product wire identity for calendar deletion scope (`delete2:<id>:event|series|occurrence:<t>` and plain numeric ids). | Verdict: KEEP (owner check on numeric form)
- Importers: `CalendarScopedDeletionReview.read`, `NativeDeletionCoordinator` (`targets(...)` for non-v3 targets). Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{deletion-platform,scoped-calendar-review}.mjs`; `test/calendar-deletion-identity.test.mjs` (javac; asserts `parse("42").legacy`); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3, 8, 12, 29 | A1? | Numeric `legacy` identity. Research listed it as legacy, but `NativeDeletionCoordinator` still routes version-1 targets to upstream `CalendarPlugin.deleteReviewedExact` and parses their numeric `eventId` here; the numeric form is the current single-event (v1) target, not data from old builds. | Do not delete. Rename `legacy` -> `plain` (or `v1`) and the Javadoc wording. Delete only if the owner confirms v1 deletion targets are no longer produced by the shared Calendar review. | low (rename) / high (delete) |
| 2 | 29 | C3 | `encoded()` builds `delete2:...`; `CalendarScopedDeletionReview.target` (37) builds the same string independently. | Have `CalendarScopedDeletionReview.target` call a `CalendarDeletionIdentity.of(eventId,scope,time).encoded()`. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Scope | enum | 5 | string scope in CalendarEventGuard.ScopedDeletion (upstream) | stay |

## Proposed end state
Same parser; `legacy` renamed; one encoder used by both callers; ~30 lines. Estimated lines after: 30.

## Verification
`test/calendar-deletion-identity.test.mjs`, androidTest `ScopedCalendarDeletionInstrumentedTest`.
