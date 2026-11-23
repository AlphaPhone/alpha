# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaActionJournal.java
- Lines: 105 | Role: process singleton of the shared encrypted `ActionJournal` with Alpha's slot (`action-journal:v1`), storage adapter onto `AlphaCredentialStore`, list-view redaction policy and `checkResult` — the native validator of renderer-supplied action results per operation type. | Verdict: SIMPLIFY
- Importers: main — `AlphaActionJournalPlugin`, `AlphaCalendarPlugin:57-58,77`, `AlphaDeletionsPlugin:29,83`, and other deletion/workflow callers of `AlphaActionJournal.get`; `checkResult` also from `AlphaActionJournalPlugin:39`. androidTest: 9 classes. Text/path pins: `specs/quint/native/manifest.json:2466,2908`, `specs/quint/refinement/native/{ActionRecoveryTraces.java,ClockReviewTraces.java,action-recovery-platform.mjs,clock-review-platform.mjs,clock-review.mjs}`, `test/native-deletion-admission.test.mjs`, `test/photo-library.test.mjs`, `test/shared-deletion-window.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25 | D8 | 1,217-character line: four copy-pasted "strip retained read payload" blocks (`readResult`, `calendarResult.fields`, `notesResult.fields`/`record.fields`, `mapsResult`). | Table-driven: `{"readResult"->"readResultRetained", ...}` loop plus the notes special case; one block per line. | Low; output key names must stay byte-identical (`readResultRetained`, `calendarReadRetained`, `notesReadRetained`, `mapsReadRetained`, `reminderReadRetained`). |
| 2 | 46, 65, 71, 82, 87, 93, 97 | C3 | Seven copies of `result.length()!=(result.has(K)?2:1)OR!entry.getString("operationId").equals(result.optString("operationId"))`. | `private static void envelope(JSONObject entry,JSONObject result,String key)`. | Low |
| 3 | 72, 83, 88, 94 | C3 | Four copies of "succeeded needs `x.kind==type` and `version==1`, otherwise `x` absent". | `private static JSONObject typed(String status,JSONObject result,String key,String type,boolean versioned)`. | Low |
| 4 | 69, 80, 85, 89, 95, 99, 101, 102 | C3 | `result.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>N` eight times. | `utf8Length(JSONObject)` helper + one bound per type in a map. | Low |
| 5 | 41-42, 44, 70, 81, 86, 90 | C6 | Operation-type sets written inline twice each: reminder set (42, 70; again in `AlphaActionJournalPlugin.java:44`), workflow-read set (41, 44). | Named `static final Set<String>` constants (`REMINDER_OPS`, `NOTES_OPS`, `CALENDAR_OPS`, `PHOTO_OPS`, `WORKFLOW_READS`), shared with the plugin. | Low |
| 6 | 54-56 | A1 | "Preserve exact legacy terminal replays": accepts a terminal Clock replay without a `clockReview` receipt — entries written before `clockReview` existed. | Owner question: with no pre-rename journal data, require the receipt for every non-unknown Clock result and delete the `replay` branch. | Medium: confirm the renderer never replays a terminal Clock entry without a receipt. |
| 7 | 13-35 | C4 (P7) | Anonymous `ActionJournal.Storage` adapter onto `AlphaCredentialStore` — one of ~12 identical slot adapters. | `AlphaCredentialStore.asSlots()` (cross-file action). | Low |
| 8 | 36-104 | B3 | Validation is at a real trust boundary (renderer to native), so it stays; only the shape changes. | — | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| anonymous `ActionJournal.Storage` | adapter | 16-19 | `AlphaActionJournalPlugin:25` (WorkflowNoticeDelivery.Storage), `AlphaCloudSignInPlugin:58-63`, `AlphaReminders`, `AlphaTelephony`, `NativeDeletionCoordinator`, `GmailBackground`, `HostedDelivery`, ... (research P7) | `AlphaCredentialStore.asSlots()` |
| op-type sets | const | 41-42, 70, 81, 86, 90 | `AlphaActionJournalPlugin:32,44` | constants here |
| `"[a-f0-9]{64}"` / identity regex | const | 76-77 | ~17 inline copies across main (research P9) | `Ids` util |

## Proposed end state
~85 logical lines: singleton + `asSlots()` storage, a table-driven `listView`, `checkResult` as a dispatch over per-type checks built from three small helpers (`envelope`, `typed`, `utf8Length`) and named op-type sets. Wire output and accepted shapes unchanged except the owner-decided legacy replay branch.

## Verification
`ActionJournalInstrumentedTest`, `ClockAgentReviewInstrumentedTest`, `WorkflowPhoneNativeInstrumentedTest`; Quint `action-recovery` and `clock-review` refinements (they compile this file — update their harness if helpers are renamed); `test/native-deletion-admission.test.mjs`, `test/shared-deletion-window.test.mjs`, `test/photo-library.test.mjs`; Playwright specs listed above use the plugin name only.
