# test/browser/shaw-ui-fixtures.spec.ts
- Lines: 76 | Kind: Playwright screenshot fixtures (`chromium`) labelled "Owner-review UI fixtures". Each test ends in a badge-stamped `UI-FIXTURE-*.png`. The connection controller, the secure store and the Cloud/workflow/automation clients are monkeypatched in the page (T6), and `fixtures.js` is routed to `fixtures.empty.js`. 8 tests (4 × portrait/landscape) | Verdict: **DELETE**; carry the confirmed-empty Home case into `journeys/home-shell.spec.ts` if no Home spec covers it
- Covers: a confirmed-empty Home (Cloud connected with no mail, no automations and no events) hides attention cards and keeps every app entry, with no writes. An unconnected Home has app entries and no cards. Permitted Photos uses concise labels and inset thumbnails without requesting access. Empty Files stays quiet. Duplicates: `root-view-states.spec.ts` (unconnected/empty Files, Photos empty), the Home attention/daily-overview specs (research lists `home-attention`, `home-daily-overview`), and the Photos grid inset in `responsive-surfaces*`. Callers/importers: none (grep over scripts, workflows and test).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-20 | B5 | The point of the file is a screenshot "receipt" with an injected badge. No job or test reads it. | Delete. | none |
| 2 | 27-37 | T6 | It overwrites `connectionController.getCloudClient/getSnapshot/getWorkflowClient/getAutomationsClient` and `secureConnectionStore.read`, which replaces the product's own wiring. | If the empty-Home rule is kept, drive it with `harness/plugins/cloud.ts` and `agent.ts` returning empty mail, automations and calendar. | Low |
| 3 | 47-52, 72-75 | T4 | Unconnected Home and empty Files are covered by `root-view-states`. | Delete. | none |
| 4 | 53-71 | T4 | Photos labels and inset overlap the Photos specs and `responsive-surfaces`. The "no `requestLibraryAccess`" assertion is the only distinct one. | Move that one assertion to the Photos permission step in `journeys/camera-photos.spec.ts`. | none |
| 5 | 1 | – | The file name carries a person's name, and the header calls it owner review. | n/a (deleted). | none |

## Proposed end state
The file is deleted. If `home-attention`/`home-daily-overview` do not already assert it, one "connected but empty Home
shows no attention cards" step goes into the Home/shell journey on the shared plugins. The Photos no-access-request
check joins the Photos journey.
