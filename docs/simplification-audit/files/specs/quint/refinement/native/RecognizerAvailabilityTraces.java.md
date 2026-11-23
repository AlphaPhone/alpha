# specs/quint/refinement/native/RecognizerAvailabilityTraces.java
- Lines: 89 | Kind: Quint refinement harness (upstream `RecognizerAvailability` cache with held concurrent probes) | Verdict: KEEP (upstream-only model lane)
- Covers: live model `specs/quint/native/NativeRecognizerAvailability.qnt`: per-language recognizer availability cache: installed/absent/unanswered expiry, out-of-order probe answers and ticket authority, late recovery, timed/extended/permanent/global demotion, independent languages. 14 scenarios. Duplicates: `OnDeviceRecognizerTraces` exercises the cache only through the session. Runs in `test/quint-recognizer-availability.test.mjs` and the aggregate (`index.mjs:191`).
- Callers/importers: `recognizer-availability.mjs` (`checkRecognizerAvailability`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | P6 / §2.9 | Upstream-only (`vendor/eliza/plugins/plugin-local-inference/.../RecognizerAvailability.java`, unpatched). | Upstream-change lane; upstream follow-up. | None |
| 2 | 30-39 | T10 (reflection) | Private `entries`, entry `until`/`known`/`ticket`, `tickets`, `demotedAll`. | Keep. | Low |
| 3 | campaign | T4 | Per-model test plus aggregate. | One runner. | None |

## Proposed end state
Unchanged; once, in the upstream-change lane.
