# specs/quint/refinement/native/Trace.java
- Lines: 39 | Kind: shared harness support (trace JSON builder: `step`, `macro`, `stutter`, `fields` with `s.` prefix, `action`; `read` = private-field reflection up the class hierarchy) | Verdict: KEEP
- Covers: nothing alone; the serialization contract between every native Java harness and `check-traces.mjs`. Callers/importers: `java.mjs` `javaTraceCampaign` compiles it into every native run; imported by essentially every `specs/quint/refinement/native/*Traces.java` / `*Replay.java` / `*Probe.java` (all files in this chunk except the port classes). git grep `Trace` also matches unrelated product identifiers (`AlphaLocalAgentPlugin.java`, `local-agent.ts`), which are not importers.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-37 | B1 | `catch (NoSuchFieldException missing) { /* ... */ }` inside the superclass walk: specified fall-through, comment present, final `throw` reports the field. | Keep. | none |
| 2 | 1 | — | Package `ai.alphacompute.alphaphone` so harnesses in the product package can read package-private members; harnesses in vendor packages import it. | Keep. | none |
| 3 | — | C3 | Harnesses each re-implement `check(boolean,String)` / `require(...)` (ReviewedCopies, RuntimeUpdatePause, ResidentStartCancel, SettingsHandoff, Sms, SourceRenewal, TextScale, UpdateBarrier) and several add a `Trace.read` twin for static fields (`field(name)` in `ResidentScheduleAdmissionTraces`, `ResidentStartCancelReplay`, `UpdateBarrierHarness`). | Add `Trace.check(boolean,String)` and `Trace.readStatic(Class,String)` (and `writeStatic` if the `*ForTest` hooks go) and use them; saves ~2-6 lines per harness. | low |

## Proposed end state
Same class plus `check` and `readStatic` helpers; harness-local copies removed when each harness is next touched.
