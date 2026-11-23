# android/app/src/main/java/ai/alphacompute/alphaphone/HostedDeliveryWorker.java
- Lines: 22 | Role: WorkManager worker for hosted result polling and for source-renewal notice posting. | Verdict: SIMPLIFY
- Importers: `HostedDelivery`, `AlphaHostedResultsPlugin`; proguard keep. Text/path pins: `android/app/proguard-rules.pro`; `specs/quint/refinement/native/hosted-inbox.mjs`; `test/fixtures/ResidentDeliveryTest.java`, `test/resident-result-transport.test.mjs`, `test/browser/home-brief-result.production.spec.ts`; androidTest HostedBackgroundWorker/HostedProcessRestart; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 16 | C3/D8 | Periodic + catch-up scheduling on one line; twin of `GmailDeliveryWorker.schedule/cancel`. | Shared `Workers` helper. | low |
| 2 | 12, 14-15, 18-19 | D1 | Same worker class runs two unrelated jobs (result polling and source-renewal notice), selected by an input key. | Split renewal into `SourceRenewalWorker` - but enqueued work records store the class name; only do it with a cut-over that cancels old `alpha-source-renewal-*` work. Otherwise leave. | medium |
| 3 | 12 | C6 | `renewalWork(sourceId)` = `"alpha-source-renewal-"+sourceId` is the same string as `HostedNoticePoster.renewalTag` (44). | One constant/helper. | none |
| 4 | 19 | B1 | `catch(Exception ignored){/* A denied channel or stale source posts nothing. */}` | Specified; keep. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| schedule/cancel | helpers | 11,16 | GmailDeliveryWorker:10-11 | Workers util |
| renewalWork | helper | 12 | HostedNoticePoster.renewalTag:44 | one helper |

## Proposed end state
~18 lines. Estimated lines after: 18.

## Verification
androidTest HostedBackgroundWorker; production journey `home-brief-result.production.spec.ts`.
