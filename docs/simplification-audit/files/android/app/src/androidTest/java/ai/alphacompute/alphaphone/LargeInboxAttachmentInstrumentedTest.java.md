# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LargeInboxAttachmentInstrumentedTest.java
- Lines: 43 | Role: pushes a ~6.7 MB record (5 MiB PDF attachment) through the bridge into `inbox-drafts:v1:` and `inbox-operation:v1:` slots with CAS, recreation and readback; an ordinary slot refuses 300 kB. | Verdict: SIMPLIFY (merge target for InboxOperationJournalInstrumentedTest)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:244` (arg `largeInboxAttachmentNative`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-17 | C3 | `js`, `ready`, `call`, `sha` copied from/into `InboxOperationJournalInstrumentedTest.java:14-17`. | Shared helpers. | Low |
| 2 | whole | T4 | Overlaps `InboxOperationJournalInstrumentedTest` (see that report). | Become `InboxSecureSlotsInstrumentedTest` with both methods; one registry entry with both gate args folded into one (`inboxSecureSlots: "1"`). | Low |
| 3 | 38-39 | D8 | Cleanup try/catch packed on one line. | Shared `Cleanup` helper. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `sha`, `call`, `ready`, `js` | helper | 14-17 | `InboxOperationJournalInstrumentedTest.java:14-17` | `WebViewTestDriver` / `TestDigests` |
| `prepare(marker)` | helper | 18 | none | keep |

## Proposed end state
Renamed `InboxSecureSlotsInstrumentedTest.java`: two methods (ordinary CAS lifecycle incl. invalid slot and CAS removal; maximum payload). About 50 lines in total for both former files (was 76).

## Verification
Instrumentation run of the merged class with its gate arg on both variants; runner registry test.
