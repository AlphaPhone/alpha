# android/app/src/main/java/ai/alphacompute/alphaphone/HostedNoticePoster.java
- Lines: 60 | Role: Posts/cancels the redacted Android notifications for hosted results and source-renewal reminders. | Verdict: SIMPLIFY
- Importers: `HostedDelivery`, `HostedDeliveryWorker`, `AlphaHostedResultsPlugin`, `SourceRenewalHost`; androidTest HostedResultNotice/HostedBackgroundWorker/HostedProcessRestart/WorkflowApprovalNotice. Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{SourceRenewalTraces.java,hosted-inbox,hosted-result-notices,source-renewal}.mjs` (stub class); `test/resident-result-transport.test.mjs:27` (stub class); `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35-36 | D7 | `result(tap,redacted)` and `result(tap,redacted,ask)` overloads "Visible for builder tests"; only `HostedResultNoticeInstrumentedTest:81` uses the 2-arg form. | Delete both overloads; test calls the 4-arg form. | none |
| 2 | 20, 27, 47, 59 | C3 | The open-result Intent (`MainActivity`, action, data URI, CLEAR_TOP\|SINGLE_TOP) is built in `cancel` and `post`; renewal Intent in `renewal` and `cancelRenewal`. | Private `openIntent(action, prefix, key)` helper. | none |
| 3 | 29, 49 | C3 | Redacted public version built twice. | Private `redacted()` helper. | none |
| 4 | 28-30, 41, 50 | C3 | "Ask Alpha" action with `setAuthenticationRequired` built twice. | Private `askAction(PendingIntent)`. | none |
| 5 | 24 | D4 | `post(String)` delegates to `post(key,false)`; interface `Poster` also has a default `post(key,silent)` calling `post(key)`. | Make `post(key,silent)` the only interface method. | low |
| 6 | 22, 18 | C5 | Channel creation in constructor (every instantiation recreates the channel); `AlphaHostedResultsPlugin.channel()` instantiates the poster only for this side effect. | Expose `static void ensureChannel(Context)`. | none |
| 7 | 44 | C6 | `renewalTag` duplicates `HostedDeliveryWorker.renewalWork`. | One helper. | none |
| 8 | 10-12 | D8 | Wildcard imports `android.app.*`, `com.getcapacitor.*`, `com.getcapacitor.annotation.*`, `java.util.concurrent.*` - the last three are unused. | Remove unused imports. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| ASK_RENEW_ACTION/RENEW_ACTION/RENEW_PREFIX | const | 42-43 | AlphaHostedResultsPlugin.ACTION/PREFIX/ASK_ACTION | stay |
| renewalTag | helper | 44 | HostedDeliveryWorker.renewalWork:12 | one helper |

## Proposed end state
Channel, post, cancel, renewal post/cancel with three small private helpers; ~45 lines. Estimated lines after: 45.

## Verification
androidTest `HostedResultNoticeInstrumentedTest` (builder test).
