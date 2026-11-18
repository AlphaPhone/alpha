# test/browser/context-selection.spec.ts
- Lines: 262 | Kind: Playwright UI journeys, chromium (dev server, dev shade and device controls), with backdoor seeding and prototype patches | Verdict: **MERGE** into `journeys/chat.spec.ts` (context section) — 12 of 13 cases
- Covers (MVP-13): asking Alpha about a notification, an email or a photo uses exactly the reviewed item and revision: only Alpha Phone's own notifications offer a question, withheld and non-question kinds (hosted result, digest, workflow, other) do not, secrets are refused, the review closes with the shade, a dismissed item never sends its neighbour; an attached email sends only the selected message on explicit Send, keeps the typed question and its saved draft, is refused if the message, the agent or two minutes changed; a photo question is bound to the open item and revision, a changed photo is a new revision, a trashed photo adds nothing. Duplicates: partial overlap with `selected-content-question`, `gmail-notice-question`, `reminder-notice-question`, `recording-question`, `dev-content-question`. Callers/importers: none. 13 tests.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13, 35, 44, 52, 225-244 | P2 | `selectedObject()` reads `alphaClient.getState().context.selectedObject`, an internal store. | Assert what the agent receives: the bridge records the request metadata (`clientDevice.context.selectedObject`) on Send. | Medium: some cases assert selection without sending; add a Send step. |
| 2 | 19-25 | P2 | Notifications are seeded through `registerPlugin('DailyApps'/'AlphaNotifications')` and `reminderDocument.edit` in-page, then shown through the dev "Device controls" panel. | Seed via `bridge.notifications([...])` and open the shade by the visible gesture/control. | Medium: the shade on the production harness must exist (it does in `flag-off-android`). |
| 3 | 54-69, 81-102 | P3 | Replaces `BrowserNotifications.prototype.list` to inject Android-shaped rows (`kind`, withheld text). | That is exactly a bridge handler: `AlphaNotifications.list` returns those rows. | Low. |
| 4 | 109-138 | P3 / P2 | Mail setup overrides `connectionController.getCloudClient/getSnapshot`, `secureConnectionStore.read/compareExchange` and `alphaClient.send`. | `harness/cloud.ts` Gmail fixture + resident agent plugin recording sends. | Medium (largest port in the file). |
| 5 | 198 | P2 | "agent changed" is simulated by mutating the captured snapshot's `session`. | Through the agent plugin: restart with a new agent id. | Medium: may need a harness hook for "agent replaced". |
| 6 | 220, 230, 236, 250-258 | P2 / P3 | Photos created and read through `importBrowserPhoto`/`browserPhotoLibrary`; `library.read` patched to hold the load. | Seed photos via the bridge photo plugin; hold via a handler promise. | Medium. |
| 7 | 213-217 | T6 | "Settings pages publish only their section slug" asserts internal state only. | Delete, or fold into a Send that records the metadata. | none |
| 8 | 174 | T8 | `waitForTimeout(500)` before re-asserting the draft did not change. | `page.clock.runFor` or drop (the next poll covers it). | none |
| 9 | 169 | — | `page.mouse.click(206,300)` at fixed coordinates to lower the bar. | Click a named outside region. | Low. |
| 10 | 4-9 | T8 / P13 | Per-file timeout and reduced-motion config. | Harness defaults. | none |

## Proposed end state
A "context" describe block in `journeys/chat.spec.ts` with ~12 cases on the resident harness: notification (own-only, secrets refused, closes with shade, withheld, non-question kinds, dismissed neighbour), mail (exact message on Send, question retained, changed message/agent/timeout refused), photo (bound to revision, revision changes, trashed refused). Assertions are on visible UI and recorded agent requests only.
