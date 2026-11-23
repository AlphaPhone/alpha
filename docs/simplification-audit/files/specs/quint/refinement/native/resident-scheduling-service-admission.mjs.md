# specs/quint/refinement/native/resident-scheduling-service-admission.mjs
- Lines: 78 | Kind: Quint refinement driver for an audit-twin model; patches product `ResidentScheduleRearm.java` text to insert an observation, plus mutation canaries | Verdict: MERGE (model into canonical `ResidentScheduling`; harness into the `ResidentScheduling` campaign) and PORT the observation seam
- Covers: 120-case resident schedule admission table (event × unlock × package × owner × lifecycle), service refusal then broadcast/foreground success, stop ACK, refused rearm after ACK, explicit restart. Model `ResidentSchedulingServiceAdmission` (`manifest.json:825`), headed "Complementary audit scope" (research §2.11). Duplicates: `FinitePolicyTraces` `ResidentScheduling` (`native/index.mjs:96-111`) already executes the admission table against `ResidentScheduleRearm`. Callers/importers: `native/index.mjs:73,95`, `test/quint-resident-scheduling-admission.test.mjs` (also runs the two mutants).

Product text read and patched: `ResidentScheduleRearm.java` seam `'Decision decision=decide(action,userUnlocked,runtimePackaged,ownerEnabled,lifecycleIdle.getAsBoolean());'` (observation inserted; mutant `ignore-lifecycle` replaces `'ownerEnabled,lifecycleIdle.getAsBoolean());'`); `ResidentScheduleReceiver.java` copied, mutant `lose-refusal` replaces `'catch(RuntimeException deferred)'`. Stub anchors in `resident-platform.mjs`: `'    return null;\n  }'`, `'return true;'`, `'public class Intent {'`, the `Log.w` body, `'    ResidentTestPorts.start();'`, `'  public static void start(Context context) {'`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-46 | T10 | Inserts an observer line into product source at an exact statement. | Expose the decision without text edits: have `admitAndStart` return the `Decision` (or keep a package-private `lastDecision` field), then compile the file unmodified. | Medium |
| 2 | 15, 45, 48 | B5/T5 | `mutation` canaries rewrite product text to prove the harness fails; tests of the harness. | Delete the mutation parameter and the canary tests in `test/quint-resident-scheduling-admission.test.mjs`. | Low |
| 3 | 18-39 | T10 (stubs) | Six exact-text rewrites of `resident-platform.mjs` stubs. | Port hooks (see `resident-platform.mjs` report). | Low |
| 4 | 51-53 | — | Compiles `FinitePolicyTraces.java` (another harness) as a source. Confirms the overlap with the canonical campaign. | Merge both into one ResidentScheduling harness. | Low |
| 5 | model | P6/§2.11 | Second model of the same component. | Merge invariants into `ResidentScheduling.qnt`; delete the twin and its manifest entry. | Medium (keep every invariant) |

## Proposed end state
No separate file: the `ResidentScheduling` campaign compiles `ResidentScheduleRearm` and `ResidentScheduleReceiver` unmodified with the resident platform and replays both the table and the service-admission schedules.
