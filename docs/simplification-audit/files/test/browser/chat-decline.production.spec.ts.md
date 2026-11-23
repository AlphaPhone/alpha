# test/browser/chat-decline.production.spec.ts
- Lines: 171 | Kind: Playwright, `production` project, real UI journey over a hand-written bridge plus `helpers/resident-agent-plugin.ts` | Verdict: **MERGE** into `journeys/chat.spec.ts` (proposal review section)
- Covers: a pending agent proposal recovered into the conversation is declined from its card ("Declined. No phone action was performed."), the server records `reject`, nothing is claimed, journaled or executed; Activity ("Your agent") resolves a reconciliation-required entry as not applied with a confirmed resolution. Duplicates: the decline button also appears in `calendar-proposal-review.production.spec.ts`, `journey-a-conversation.spec.ts`, `journey-c-alarms.spec.ts`; the Activity reconciliation ("I verified it did not happen") is only here. Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-107 | P6, C5 | A 95-line inline bridge (`ElizaSystem`, `Agent`, `AlphaConnection`, `AlphaActionJournal`, …) re-implements what `flag-off-android.ts` + `resident-stub.ts` already provide; only the proposal store is specific. | Add a `proposals` plugin to the harness (decision / reconciliation / claim / receipt routes with digest check) and boot through `flagOffAndroid` + `residentStub`. | Low. |
| 2 | 112-122 | B4 | `connected()` handles a development "Start local agent" button, but this file runs only in the production project. `options.review` is accepted and never read. | Drop the dev branch and the unused option. | none |
| 3 | 1-2, 171 | D8 | Two import lines from the same module; `beforeEach` registered at the bottom of the file. | Fold into the harness `app({accessSetup:'complete'})`. | none |
| 4 | 140-146 | none | Server-state readback and "no journal effects" are the right boundary assertions. | Keep. | none |

## Proposed end state
Two tests in `journeys/chat.spec.ts` "proposal review": decline from the chat card, and reconcile-as-not-applied from
Activity, both on the shared resident harness with a `proposals` plugin. Delete this file.
