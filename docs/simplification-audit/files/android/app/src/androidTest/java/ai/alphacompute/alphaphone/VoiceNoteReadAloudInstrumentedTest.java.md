# android/app/src/androidTest/java/ai/alphacompute/alphaphone/VoiceNoteReadAloudInstrumentedTest.java
- Lines: 53 | Role: Opt-in (`localSpeech=1`, networking off) check that the bridge's `synthesizeLocal` + `play` reach `playbackEnded`, and that `stopPlayback` yields `playbackStopped`, on the device engine. | Verdict: SIMPLIFY
- Importers: none. Registry `scripts/android-instrumentation.ts:260` `VoiceNoteReadAloud: { args: { localSpeech: "1" } }`. Text/path pins: none outside androidTest (grep 0).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24 | C3 | Private one-line `until(expression,timeout)` poll. | Use shared `WebViewTestDriver.until`. | Low. |
| 2 | 26-31 | C3 | Promise-to-window-global bridge pattern (`window.__readAloud=...`) is the same mechanism as `call()` in 12 files (`git grep 'Promise.resolve().then(()=>"'`: 12). Here it also collects listener events, so it is a legitimate variant. | Keep; once a shared `WebViewTestDriver.call(expr)` exists, use it for the `stopPlayback` leg only if it shortens the code. | Low. |
| 3 | 36, 51 | B5 | Writes `note-read-aloud.json` evidence with `"physicalSpeakerVerified",false`; grep for `note-read-aloud.json` outside this file: 0 hits (no reader). | Delete the evidence file write and the `JSONObject evidence` (lines 36, 42, 50, 51); the assertions are the result. | Low: confirm with owner that no manual campaign collects this file. |
| 4 | 14-21 | A8 | Comment carries tracker id "daily-11". | Drop the id; keep the description. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until` | helper | 24 | see `VideoInstrumentedTest.java.md` (88 copies) | `WebViewTestDriver.until` |
| `speak` | helper | 26-31 | none | keep local |

## Proposed end state
One test, `speak` script builder, shared `until`; no evidence file. About 40 lines.

## Verification
`node scripts/android-instrumentation.ts --classes VoiceNoteReadAloud` with staged voice outputs, networking disabled (opt-in only; not in CI). Renderer read-aloud covered separately by Playwright notes specs.
