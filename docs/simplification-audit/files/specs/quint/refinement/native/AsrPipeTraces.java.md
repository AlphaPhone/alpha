# specs/quint/refinement/native/AsrPipeTraces.java
- Lines: 192 | Kind: Quint refinement driver (host-JVM; real upstream `ai.eliza.voice.LiveSegmentPipe` with patch inputs, controlled provider transport and worker thread) | Verdict: KEEP; SIMPLIFY the campaign runner
- Covers: live ASR segment pipe: warm/batch/close request ordering, FIFO queue, per-batch and queued-size limits, cutoff handling, owner retirement, cancel, provider error/malformed/invalid replies, executor rejection. Duplicates: `AsrPipeFailureProbe.java` (orphan subset). Callers: `native/asr-pipe.mjs:11-13`; README.md:102; test `test/quint-native-asr-pipe*.test.mjs` via the native family.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 185-191 | C5 | "campaign" mode spawns one JVM per scenario and concatenates JSON; identical loop in `CaptureFrameTraces.java:95-101`. | Move a `Trace.campaign(Class, args)` helper into `Trace.java`, or let `java.mjs` `javaTraceCampaign` run one scenario per argument set (it already supports that). | Low |
| 2 | 3 | scope | Models upstream code (`vendor/eliza/plugins/plugin-local-inference/.../LiveSegmentPipe`), which ships in this APK with local patches. | Keep here while the patch is local; list as upstream follow-up (D14). | — |
| 3 | 59-67, 132-134 | T8 | Busy-wait polling with `Thread.sleep(1)` and 10 s deadlines; condition-based, acceptable. | Keep. | Low |
| 4 | 11-14 | D8 | Dense statement soup in statics. | Format when touched. | None |

## Proposed end state
Same scenarios; shared per-scenario JVM runner; formatted. `AsrPipeFailureProbe.java` deleted.
