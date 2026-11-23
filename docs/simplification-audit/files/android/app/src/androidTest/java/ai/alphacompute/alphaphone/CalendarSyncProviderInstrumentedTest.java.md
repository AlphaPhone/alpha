# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarSyncProviderInstrumentedTest.java
- Lines: 75 | Role: compare-and-swap rich-event updates through `CalendarSyncSnapshot`/`CalendarSyncMutation` on the real provider | Verdict: DELETE if the client-side linked-sync stack is removed (owner); else KEEP with shared fixture
- Importers: none. Registry `CalendarSyncProvider` (secondary user, `scripts/android-instrumentation.ts:279`). Text/path pins: registry entry only.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 46, 55, 62 | A2 (owner) | Exercises main `CalendarSyncSnapshot`/`CalendarSyncMutation`, reached only via `CalendarSyncBridge` (`AlphaCalendarPlugin.java:41-42`). Research `app-runtime-a-m.md` P11 finds the renderer side of this local-first Google Calendar sync stack unreachable (live path is `agent-calendar.ts` `changeSync()`), and asks the Android owner to confirm removing `CalendarSyncBridge` and the plugin sync methods. | If confirmed: delete this class, its registry entry, and the six `CalendarSync*` main files together. | Medium (owner: PRD AP-09 "local-first sync") |
| 2 | 35-36, 45, 48-51 | C3 | Owned calendar with sync-adapter URI and guarded cleanup (15 files). | `CalendarProviderFixture` (with the generation marker as an option). | Low |
| 3 | 20-21 | A8 | "This source is not evidence that it has been installed/run." — process note, not behaviour. | Delete the sentence. | Low |
| 4 | 38-42, 55-56 | D8 | 300-char lines of `row.put(...)` and chained assertions. | Formatter. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Fixture` | class | 29-52 | CalendarFlow.CalendarFixture and 13 calendar blocks | `CalendarProviderFixture` |

## Proposed end state
Deleted with the sync stack (−75 lines), or ~65 lines on the shared fixture if the owner keeps native sync.

## Verification
`node scripts/android-instrumentation.ts --classes CalendarSyncProvider` (secondary user); after deletion `node --test test/android-instrumentation-runner.test.mjs`.
