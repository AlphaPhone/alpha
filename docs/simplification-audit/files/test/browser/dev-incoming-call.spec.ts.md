# test/browser/dev-incoming-call.spec.ts
- Lines: 27 (5 tests) | Kind: Playwright `chromium`, dev build with `tools=1`; UI on the Phone simulator, assertions on `alpha.dev.app.phone` | Verdict: **MERGE** into `journeys/telephony.spec.ts` (1 case)
- Covers: a simulated incoming call can be accepted and ended as one history entry; decline saves a missed call and voicemail atomically, voicemail read/delete/Undo survive reload; failed decline and screening saves retry once; "Let Alpha answer" screening keeps its transcript. Duplicates: `dev-phone-messages.spec.ts` (local call controls and hangup persist one call; failed hangup retry); `aosp-phone.spec.ts` for the image-only route; Android instrumentation for real telephony (AP-08). Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-9 | — | Accept/end and decline → voicemail → read → delete → Undo are UI journeys. | Carry both as one case; assert the Recents and Voicemail lists, not `localStorage`. | none |
| 2 | 8 | P3 | Wraps `Storage.prototype.setItem` to count writes ("atomically"). | Drop the write count. | Low |
| 3 | 10-12, 16-27 | P3, T4 | Failed decline and failed voicemail Undo via a throwing `setItem`; overlaps `dev-phone-messages` failed hangup. | Delete. | Low |
| 4 | 13-15 | P7 | Screening plays a canned transcript ("Hey, it's Maya…") from the simulator. | Delete. | Low |

## Proposed end state
One "incoming call" case in the telephony journey (AOSP views on the dev simulator): ring, accept, end, one Recents entry; ring, decline, voicemail listed, open it, delete, Undo, reload. Delete the file. Whether these simulator views stay is Q-DEV-1.
