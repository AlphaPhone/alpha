# test/browser/workflow-notices.spec.ts
- Lines: 41 | Kind: Playwright spec, chromium (`?mode=dev&tools=1`), 7 tests; 5 module-in-page | Verdict: MERGE (3 cases) into `journeys/notifications.spec.ts` and `journeys/workflows.spec.ts`
- Covers: notice publication is cancellable before commit, deduplicates exact receipts across reload, refuses changed content and titles; open/dismiss refuse stale, locked and disabled identities; a saved notice opens Workflows through the dev notification controls; a workflow Notify step stores the same text and step identity. Duplicates: replay/conflict in `workflow-notice-history.spec.ts`; locked redaction in `workflow-notice-lifecycle.spec.ts`. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-14, 27-33, 41 | T6 | Cancel-at-commit, dedupe, queued cancel and custom-title compaction import the module and patch `edit`/`navigator.locks`. | Delete. | Low. |
| 2 | 15-23 | T6 | Locked/disabled/stale checks call `registerPlugin('AlphaNotifications')` and flip `devBackground`. | Carry as UI: lock the phone (dev control), notice shows "Workflows" with no text and no Open; disable Alpha notifications in Settings, notice disappears. | Low. |
| 3 | 24-26 | ok | Notice opens Workflows through the notification controls. | Carry into `journeys/notifications.spec.ts`. Seed by running a Notify workflow (case 6) instead of `publishWorkflowNotice`. | None. |
| 4 | 34-39 | ok/T6 | Notify step run from the Workflows UI; reads localStorage and the notice document to compare. | Carry into `journeys/workflows.spec.ts`; assert the visible notice text equals the run output. | Low. |

## Proposed end state
Workflows journey: run a Notify workflow, its notice appears with the run's text. Notifications journey: the notice
opens Workflows; locked phone shows a redacted notice; disabled app hides it. File deleted.
