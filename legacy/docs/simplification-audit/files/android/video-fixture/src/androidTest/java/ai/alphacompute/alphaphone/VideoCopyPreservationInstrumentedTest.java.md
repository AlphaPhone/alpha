# android/video-fixture/src/androidTest/java/ai/alphacompute/alphaphone/VideoCopyPreservationInstrumentedTest.java
- Lines: 182 (21.7 KB) | Role: physical-device test of upstream `VideoCopyEdits.preserveClosedFailure` forensic escrow (foreground, identity, symlink, oversize, race and sealed-marker cases) | Verdict: DELETE
- Importers: none; imports `VideoCopyInstrumentedTest.Response`. No runner (grep `VideoCopyPreservation`: only this file). The `…videoqa.preservation` package variant in `build.gradle:3` exists for it and is set by nothing.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-182 | A7 / T5 | Never run; exercises upstream `VideoCopyEdits` internals (`preserveClosedFailure`, `COMPLETION.pending`/`COMPLETE.json`/`INCOMPLETE.json` file protocol, error strings like `"Video copy preservation refused: admission/IOException"`). | Delete with the module; any wanted coverage belongs upstream next to `VideoCopyEdits`. | Low |
| 2 | 33-34, 46 | C3 | `hash` (SHA-256 hex) and `readAll` (bounded read) private copies. | Goes with the file. | — |
| 3 | 38-39 | B5 | `android.util.Log.i("AlphaVideoPreservationQA","new-token="+token…)` logging for manual forensic follow-up. | Goes with the file. | — |
| 4 | 64-180 | D8 | Dense multi-statement lines. | Goes with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `hash(byte[])` | helper | 33 | `MediaFixtureActivity.sha`, 10× app Java | deleted |
| `readAll(InputStream)` | helper | 46 | `MediaFixtureActivity.readBounded`, 7× app Java | deleted |
| `Pending` | inner class | 35-45 | `VideoCopyInstrumentedTest.source` | deleted |

## Proposed end state
Deleted.

## Verification
Nothing runs it today; after deletion `npm run verify` and the Android build.
