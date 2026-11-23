# android/app/src/main/java/ai/alphacompute/alphaphone/SourceRenewalHost.java
- Lines: 7 (line 6 is 1,048 characters) | Role: lazy singleton wiring `SourceRenewalNotices` to the credential store, `NativeDigestHost` describe and `HostedNoticePoster` | Verdict: MERGE into `SourceRenewalNotices.java`
- Importers: `AlphaHostedResultsPlugin` (6), `HostedDeliveryWorker` (1). Text/path pins: `specs/quint/native/manifest.json`, `specs/quint/refinement/native/{SourceRenewalTraces.java,hosted-result-notices.mjs,source-renewal.mjs}`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D8 (P4) | A singleton, three anonymous classes and a lambda on one 1,048-char line. | Format into ~25 lines. | None. |
| 2 | 6 | C4 (P7) | Anonymous `Store` adapter over `AlphaCredentialStore` (12th copy). | `store.asSlots()` bound to `SourceRenewalNotices.SLOT`. | Low. |
| 3 | 4-7 | MERGE (research §5) | A host class whose only job is constructing one instance. | Move `get(Context)` into `SourceRenewalNotices` as `static synchronized SourceRenewalNotices get(Context)`; delete this file; update 7 call sites and the Quint manifest. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `instance` singleton | helper | 5-6 | 7 lazy singletons | `SourceRenewalNotices.get` |
| `Store`/`Poster` adapters | anonymous class | 6 | P7 adapters | `SourceRenewalNotices` |

## Proposed end state
File removed; ~20 formatted lines added to `SourceRenewalNotices`.

## Verification
Quint `source-renewal.mjs` refinement, hosted results renewal notice instrumentation.
