# test/browser/digest-resident-schedule.production.spec.ts
- Lines: 137 | Kind: Playwright, `production` project, a real user journey (s0/r31) | Verdict: **MERGE into `journeys/digests.production.spec.ts`** (both tests)
- Covers: Loop D against the resident agent. A reviewed snapshot is sent only on Confirm with the exact body keys. A morning schedule whose acknowledgement is lost shows "Not saved / Retry", and the retry resends the identical request, which the agent replays by `mutationId`. Also covered: an evening schedule on the same source, pause as an edit of the exact version, and revoke, which pauses the running schedule and removes the source from the chooser. A stale-version edit is refused and nothing changes. Duplicates: "morning and evening share one source" in `digest-source-renewal.spec.ts:41-51` (dev simulator) is covered here by step 3. Importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 18-26 | C3 | `panel`, `posts`, `schedules` and `confirmReview` duplicate `digest-native-sources.production.spec.ts:19-23`. | Share them in the merged file. | none |
| 2 | 127 | P2 | The test writes `flagOff.digests.loops[0].versionId` in the page to model "another device edited it". This is state at the bridge/agent boundary, which is acceptable. | Keep, through a typed `bridge.agent.digests` accessor. | none |
| 3 | 101 | — | The exact post-path sequence `['sources','loops','loops','loops','loops','sources/revoke']` is a strong check of the no-duplicate-dispatch rule. | Keep. | none |
| 4 | 103 | — | It asserts that the development scheduler copy is absent. This duplicates `expectNoDevelopmentSurface` in spirit, but the strings differ. | Keep, or fold the regex into `expectNoDevelopmentSurface`. | none |

## Proposed end state
This becomes the "snapshot schedules" `describe` in `journeys/digests.production.spec.ts`. With the native-sources
block and the cases carried from `digest-source-renewal` and `digest-summary`, it is the single home for digest
journeys (about 8 tests). No assertion changes are needed.
