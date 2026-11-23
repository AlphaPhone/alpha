# test/browser/digest-source-renewal.spec.ts
- Lines: 61 | Kind: Playwright, chromium, dev simulator. Drives the panel through the UI (r47), but reads results through in-page `readDevelopmentDigests` and triggers `/hosted/tick` through `developmentDigestRequest` (T6/P2, s6). Uses `page.clock` | Verdict: **MERGE into `journeys/digests.production.spec.ts`** (2 cases), rest deleted
- Covers: the snapshot-source renewal window. The default and maximum expiry is 168 h; inside the last 24 h a notice offers renewal; at expiry the schedule shows "Source expired — paused"; Renew pre-fills the label and moves the schedule to the new source in one confirmed step. Also: morning and evening on one source, and a default 7-day snapshot whose `expiresAt − observedAt` is exactly 168 h. Duplicates: the Renew → rebind review copy is in `digest-native-sources.production.spec.ts:108-121`; morning and evening on one source is in `digest-resident-schedule.production.spec.ts:77-82`. Callers: the chromium project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-27 | T6 | The "one unavailable record, then nothing" assertions check the dev simulator's scheduler (`results` shape), which is agent behaviour that the simulator imitates. | Delete. The agent owns this upstream. | Low |
| 2 | 3, 28, 36 | P2 | `digests(page)` reads the simulator document directly to find loop and source ids. | In the merged journey, read ids from the bridge's agent store (`harness(f=>f.digests…)`) as the production specs do. | none |
| 3 | 41-51 | T4 | "morning and evening schedules can share one reviewed source" duplicates the resident-schedule journey step 3. | Delete. | none |
| 4 | 5-23, 29-35 | coverage | Cases worth carrying: (a) the expiry field defaults to and is capped at 168; (b) inside the final 24 h the "Source renewal" region shows "… expires", and after expiry the schedule reads "Source expired — paused"; (c) Renew pre-fills label and expiry and confirms the move in one step. (c) is already in native-sources for phone sources; carry it for snapshot sources only if the code path differs. | Carry (a) and (b) to `journeys/digests.production.spec.ts`. The flag-off agent stub already computes `sourceState` from `expiresAt` (`flag-off-android.ts:136,142`), so `page.clock` plus Refresh exercises the same UI. | Low |
| 5 | 52-61 | coverage | `expiresAt − observedAt === 168 h` from one clock reading guards a real drift bug against the agent's 7-day bound. | Carry, as an assertion on the recorded `sources` POST body (the resident-schedule test already checks 48 h the same way). | none |
| 6 | 6, 43, 54 | C3 | The same 3-line "Settings → diagnostics → Connect development profile → dispatch `alpha:hosted-digests`" setup is repeated 3 times, and the `alpha:hosted-digests` window event is a backdoor. | Deleted with the file. | none |

## Proposed end state
Delete the file after carrying three assertions into `journeys/digests.production.spec.ts`: the default/maximum
expiry of 168 h, the exact 168 h window in the POST body, and the renewal notice followed by the expired-paused state
under `page.clock`. Nothing here needs the dev simulator.
