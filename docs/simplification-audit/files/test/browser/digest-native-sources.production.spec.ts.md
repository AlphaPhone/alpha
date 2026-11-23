# test/browser/digest-native-sources.production.spec.ts
- Lines: 187 | Kind: Playwright, `production` project (flag-off bundle on `flag-off-android.ts`). A real user journey: role locators, clicks and fills, no `/src` imports (s0/r35) | Verdict: **MERGE into `journeys/digests.production.spec.ts`** (all 3 tests)
- Covers: Loop D phone sources on Android. Reviewed consent stays within its bounds (at most 16 calendars, 1–168 h); reviewing alone records nothing; Confirm records the consent and then the bound source; a morning schedule arms the renewal notice; a Renew tap rebinds the schedule to the new source revision; revocation pauses and clears; an older agent offers only morning; the on-demand brief is reviewed, Cancel sends nothing and Confirm dispatches once. Duplicates: `digest-source-renewal.spec.ts` covers the snapshot-source renewal on the dev simulator (the same "Renewal: morning … moves to this source" review copy). Importers: none. Helpers: `flag-off-android` (`flagOffAndroid`, `harness`, `button`, `fenceNetwork`, `expectNoDevelopmentSurface`, `residentHome`), `helpers/retained-digests`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 19-23 | C3 | The `panel`, `posts`, `schedules` and review-section locators are repeated verbatim in `digest-resident-schedule.production.spec.ts:18-26`. | Define them once at the top of the merged journey file, or in `harness/digests.ts`. | none |
| 2 | 41, 138, 161 | T8 | `test.setTimeout(180_000)` and `120_000`. | Keep while the journey is long, but measure: the merged file should use one `test.describe.configure({timeout})`. | Low |
| 3 | 100 | P2 | The Renew tap is simulated by writing `flagOff.digests.pendingRenewal` and emitting `AlphaHostedResults.renewSource`. This is bridge-level injection, which is acceptable. | Keep, through a typed `bridge.emit` helper. | none |
| 4 | 2-14 | — | The evidence-boundary header is accurate and useful. | Keep one copy at the top of the merged file. | none |
| 5 | 101-103 | — | The comment explains why the status text is not asserted (it is overwritten by a refresh). | Keep. | none |

## Proposed end state
This becomes the "phone sources" `describe` block in `journeys/digests.production.spec.ts`, next to the
resident-schedule tests. Shared locators and an `openDigests` helper sit at the top. The bridge comes from
`harness/bridge.ts` with the `digests`/`schedules` plugin options of today's `flagOffAndroid`. The assertions stay
as they are: they check visible review copy and the exact bodies recorded at the bridge, which is the right boundary.
