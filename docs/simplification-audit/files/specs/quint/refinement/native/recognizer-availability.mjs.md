# specs/quint/refinement/native/recognizer-availability.mjs
- Lines: 18 | Kind: Quint refinement driver (host JVM; staged upstream `RecognizerAvailability.java` whole) | Verdict: KEEP
- Covers: Per-language recognizer availability cache: installed/absent/unanswered, late recovery, newer answers winning, temporary/permanent/global demotion and expiry, independent languages. Model `NativeRecognizerAvailability`. Duplicates: none. Callers/importers: `native/index.mjs:33,191`, `test/quint-recognizer-availability.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | §2.9 | Upstream-only source. | Path-filter to upstream/patch changes. | None |
| 2 | 9 | B5 | Hashes harness files. | Trim. | None |

## Proposed end state
Unchanged; ~16 lines.
