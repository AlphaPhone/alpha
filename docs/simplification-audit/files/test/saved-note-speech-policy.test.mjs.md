# test/saved-note-speech-policy.test.mjs
- Lines: 41 | Kind: unit JVM of upstream `vendor/eliza/plugins/plugin-native-media/.../RecordingWindow.java` with hand-written Android media/JSON/Capacitor stubs | Verdict: DELETE
- Covers: the saved-note audio window selector checks ownership/deletion/duration, clips 25 s windows, and removes only its temporary file. Duplicates: none in Alpha; the class is upstream. Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-37 | T5 | Tests upstream code (`RecordingWindow`) with nine stub classes; `AlphaNoteAudioPlugin` itself is replaced by a stub. | Delete; upstream follow-up (D14). | Low |
| 2 | 37 | T9 | `ALPHA_RECORDING_WINDOW_SOURCE` env knob with no setter. | Goes with the file. | Low |

## Proposed end state
File deleted; upstream follow-up: "RecordingWindow ownership and clipping" test in plugin-native-media. The renderer side
is the notes journey (see `test/saved-note-transcript.test.mjs`).
