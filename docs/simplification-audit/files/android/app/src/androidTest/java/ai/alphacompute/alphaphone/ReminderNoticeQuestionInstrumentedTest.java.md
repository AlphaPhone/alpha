# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderNoticeQuestionInstrumentedTest.java
- Lines: 102 | Role: MVP-13 "Ask Alpha" action on Alpha's reminder notice: without an agent nothing is reviewed; with an agent the exact notice is reviewed, codes are refused, and a cancelled reminder adds nothing. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:194` (`ReminderNoticeQuestion: { requiresTestMocksBuild: true, note: ... }`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47, 50 | C3 | Indexes `posted.getNotification().actions[2]` and re-checks its title, while `ReminderNotificationActions.intent(posted, ASK)` (same package) already finds the action by title and pins the exact three-action set. | Use `ReminderNotificationActions.intent(posted,ReminderNotificationActions.ASK).send()`. | none |
| 2 | 77-101 | A7 / T9 | `questionReviewsTheExactNoticeAndRefusesACancelledOne` needs `-e noticeQuestion 1` plus a selected agent; grep `noticeQuestion` in scripts/test/.github: only the registry note. The "#676 campaign" has no script. | Owner decision: wire a campaign (agent fixture) or delete the method (~25 lines). | medium |
| 3 | 30-36, 55 | C3 | `context/manager/notification/eval/until/clean` duplicated across Reminder tests; `editExcerpt` = value-setter idiom. | `ReminderTestSupport`, `WebViewTestDriver.setValue`. | none |
| 4 | 42-43 | C3 | "schedule 1.5 s ahead, sleep until due, deliver" duplicated in `ReminderHeadsUp :51-52`, `ReminderTapLifecycle :17-20`, `ReminderTapProcessDeath :49-53`, `ReminderUpgrade :55-58`. | `ReminderTestSupport.postDue(c,id,title,body)`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `REVIEW` / `EXCERPT` | const | 28-29 | none | keep |
| `post(id,title,body)` | helper | 38-49 | 4 inline copies (finding 4) | `ReminderTestSupport.postDue` |
| `ask(posted)` | helper | 50 | `ReminderNotificationActions.intent` | delete (use the shared helper) |
| `ready()` | helper | 51-54 | none | keep |

## Proposed end state
Flag-off/no-agent method stays; the agent method stays only if a runner provides `noticeQuestion=1`. Action lookup via
`ReminderNotificationActions`, shared post/clean helpers. ~95 lines (~70 without the agent method).

## Verification
`--test-mocks --classes ReminderNoticeQuestion` (requires a test-mocks app build).
