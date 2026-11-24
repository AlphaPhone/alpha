# test/digest-missed-run-now.test.mjs
- Lines: 95 | Kind: test 1 integration of upstream-staged `missedRunNowOffers` (tsx child); test 2 source-text over `hosted-digest-ui.tsx`; test 3 source-text over `AndroidManifest.xml`, `ResidentScheduleReceiver.java`, `AlphaLocalAgentPlugin.java`; test 4 host-JVM run of `ResidentScheduleRearm.java` with `test/fixtures/ResidentScheduleRearmTest.java` | Verdict: MERGE test 1 into `test/integration/digests.test.ts`; DELETE tests 2-4
- Covers: "Run now" is offered only for the newest missed morning digest over a current reviewed phone source with a stable mutation id; the resident is re-armed after boot/update/clock change. Duplicates: the re-arm policy is model-checked by `specs/quint/native/ResidentScheduling.qnt` with conformance in `specs/quint/refinement/native/FinitePolicyTraces.java:82-96` and `specs/quint/native/conformance.mjs:199` (same `decide`/`admitAndStart` calls), so test 4 duplicates the refinement (T4). Callers/importers: `npm test`; `ResidentScheduleRearmTest.java` is imported only here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-59 | T9, T5 | Script-string child process; the offer function is upstream client code re-exported by the app. The rule table (newest only, superseded, revoked/rebound/expired, Google source) is still worth one integration case, because it decides what the owner can tap. | Carry as one table case in `digests.test.ts`. | Low. |
| 2 | 61-70 | T1 | Seven regexes over JSX (review summary text, `onClick`, "never invoked from an effect"). | Delete; `journeys/digests.production.spec.ts` taps "Run now" and sees the review sheet first. | Medium: "no automatic replay" then rests on the journey. |
| 3 | 72-87 | T1 | Manifest receiver actions and Java call shapes by regex; `LOCKED_BOOT_COMPLETED` absence. | Delete; manifest receiver/actions belong in `scripts/verify-apks.ts` (merged manifest of the built APK) if they are a release rule. | Low. |
| 4 | 89-95 | T3, T4 | javac + java on a fixture main: a unit test of a pure decision table already covered by the Quint refinement. ~2 s JVM spawn. | Delete with `test/fixtures/ResidentScheduleRearmTest.java`. | Low. |

## Proposed end state
One "Run now offers" table case in `test/integration/digests.test.ts`; the rest deleted. Fixture
`ResidentScheduleRearmTest.java` deleted (no other importer).
