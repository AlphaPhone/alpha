# test/browser/inbox-draft-navigation.ts
- Lines: 6 | Kind: Playwright support helper | Verdict: MERGE into `test/browser/harness/nav.ts` (as `openLocalDraft(page, name?)`)
- Covers: opens Inbox's "Other mail folders" menu, chooses Drafts and returns the first matching local-draft row. Duplicates: the same two clicks inline in `inbox-folders-drafts.spec.ts:53` and `inbox-folders-compatibility.production.spec.ts`. Callers/importers: `inbox-read-cancel-draft.spec.ts`, `inbox-unsaved-recovery.spec.ts`, `file-email.spec.ts`, `journey-f-reviewed-send.spec.ts`, `journey-f-email-notifications.spec.ts` (grep of test/, scripts/, .github/). Survives while any of those survive; all five are inbox-area specs that fold into `journeys/inbox.spec.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6 | C5 / T7 | One of four navigation helper files (`app-navigation.ts`, `workflow-navigation.ts`, `scan-review-navigation.ts`). | Fold into one `harness/nav.ts`. | — |

## Proposed end state
Function moves to `harness/nav.ts`; file deleted when importers are updated.
