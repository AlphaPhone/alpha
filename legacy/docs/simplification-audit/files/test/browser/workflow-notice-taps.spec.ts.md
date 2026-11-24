# test/browser/workflow-notice-taps.spec.ts
- Lines: 216 | Kind: Playwright spec, chromium, 18 tests (scenario loop); real renderer over a hand-written resident-agent bridge | Verdict: MERGE into `journeys/notifications.spec.ts` (workflow notice taps section)
- Covers: a native workflow-notification tap (`pendingWorkflowTap`) opens the verified run result for the current owner once and consumes it; lookup failures show "Couldn’t check" only after a user retry; Ask-about opens a reviewed question (cancel discards, sensitive text refused, changed notice refused, owner change closes); other owner, wrong version and unconfirmed taps are refused; navigation, owner, reconnect and builder races during a held read open nothing; owner-change withdrawals carry the full owner fence. Duplicates: Ask-about review refusals also in `web-summary-note.spec.ts`, `gmail-notice-question.spec.ts`, `reminder-notice-question.spec.ts`; tap handling in `reminder-notice-taps.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-88 | T7/C5 | 78-line Capacitor bridge (7 plugins) written inline; `reminder-notice-taps` has its own. | One `harness/native.ts` resident-agent bridge (with `installResidentAgentPlugin`) shared by both tap specs. | Medium. |
| 2 | 7 | T4/T7 | 18 scenarios, each a full boot and agent start. | Keep: `two` (consume order), `ask` + `ask-cancel` + `ask-sensitive` (one step), `other-owner`, `owner-change`, `lookup-unavailable`, `navigation-race`. Drop `ask-changed`, `ask-owner`, `wrong-version`, `unconfirmed`, `queue-changed`, `owner-race`, `reconnect`, `builder-race`, `new-tap-during-read`, `lookup-unavailable-navigation` (variants of the same fence). | Low. |
| 3 | 95, 142, 177, 187 | T6 | Reads/calls `connectionController` (`getSnapshot`, `getWorkflowClient().scope`, `offline()`) in the page. | Go offline through Settings; derive the tap scope from the bridge's `configureBackground` input. | Low. |
| 4 | 19, 189 | T6 | MutationObservers on `document.body.innerText` to catch transient toasts. | Use `expect(page.getByText(...)).toBeVisible()` with the toast's role; drop observers. | Low. |
| 5 | 208-213 | ok | Owner-fence transition list is a real native contract. | Keep for the surviving scenarios. | None. |
| 6 | 9, 214 | ok | Collects `pageerror`. | Make it a harness default. | None. |

## Proposed end state
About 8 steps in `journeys/notifications.spec.ts` on a shared `harness/native.ts` resident bridge: two taps open in
order; Ask cancel/sensitive/use; other owner refused; owner change shows "Other agent"; lookup failure then retry;
Home during a held read opens nothing; withdrawal fences recorded. File deleted.
