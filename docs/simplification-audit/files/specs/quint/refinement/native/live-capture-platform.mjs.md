# specs/quint/refinement/native/live-capture-platform.mjs
- Lines: 48 | Kind: Quint refinement fixture (layers audio/VAD stubs on `shared-recording-platform.mjs`, deletes two of its stubs, text-patches three of its files) | Verdict: KEEP (SIMPLIFY)
- Covers: ports for `live-capture.mjs`, `piped-capture.mjs`, `capture-frames.mjs`. Callers/importers: those three.

## Text pins (fixture text)
`.replace` on base-platform stubs: `Context.java` `'public class Context {'`, `MediaRecorder.java` `'public static final int MIC=1;'`,
`VoiceLatencyProbe.java` `'public static final float AUDIBLE_LEVEL=0.01f;'` — no assertion that the seam matched.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-44 | T10 (fixture) / silent no-op | Unchecked `.replace` on another fixture's text. | Shared asserting `replaceOnce`, or put the extra members in the base stubs. | Low |
| 2 | 8-9 | — | `unlinkSync` of two base stubs because the real classes are compiled. | Base platform should not generate stubs for classes some campaigns compile for real; pass an exclusion list. | Low |
| 3 | 10-40 | D6 / D8 | One-line Java strings. | Static files. | Low |

## Proposed end state
Part of one voice/capture stub folder; no deletion or patching of another fixture's files.
