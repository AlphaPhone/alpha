# android/app/src/main/java/ai/alphacompute/alphaphone/HostedDeliveryCancelled.java
- Lines: 3 | Role: Exception marking expected local invalidation of hosted delivery. | Verdict: MERGE into android/app/src/main/java/ai/alphacompute/alphaphone/HostedDelivery.java
- Importers: `HostedDelivery`; androidTest `HostedBackgroundWorkerInstrumentedTest`. Text/path pins: `specs/quint/refinement/native/{HostedInboxTraces.java,hosted-inbox.mjs}`; `test/fixtures/ResidentDeliveryTest.java`, `test/resident-result-transport.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | D4 | Two-line exception class in its own file. | Nested `static final class Cancelled extends SecurityException` in `HostedDelivery`; update the Quint harness and test fixture class references. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| - | - | - | - | - |

## Proposed end state
File removed (3 lines move). Estimated lines after: 0.

## Verification
Same as HostedDelivery.
