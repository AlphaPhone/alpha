# scripts/inject-emulator-audio.py
- Lines: 132 | Kind: emulator test tool (prepares a spoken WAV; checks the emulator host microphone; streams PCM into the emulator microphone over its authenticated gRPC API) | Verdict: KEEP
- Covers: the microphone input for the native voice latency campaign on an emulator, without host audio and without touching app files. Duplicates: none (no other gRPC emulator client in the repo). Callers/importers: `scripts/native-voice-latency-emulator.ts` (itself reached from `scripts/android-instrumentation.ts`, a manual campaign); named in `android/app/src/androidTest/java/ai/alphacompute/alphaphone/NativeVoiceLatencyInstrumentedTest.java`; tested by `test/emulator-microphone-preflight.test.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | file | C7 | Python beside TypeScript. Here Python is used for `grpcio-tools`, which compiles the SDK's `emulator_controller.proto` at run time; a Node port would need `@grpc/grpc-js` and `@grpc/proto-loader` as new dev dependencies. | Keep in Python; it is the one reason this file is not TypeScript. | L |
| 2 | 8, 28-32 | A8 | "issue #395" reference in the docstring and a "legacy home path" discovery root. The legacy path is the emulator's own older location (`~/.android/avd/running`), not this product's data, so it is a real compatibility root. | Drop "#395"; keep the root. | L |
| 3 | 63-66 | — | Argument validation raises `ValueError` after `argparse`; `parser.error` would print usage consistently. | Use `parser.error` for range errors. | L |
| 4 | 128-132 | B1 | Catch-all to a JSON error line; deliberate so gRPC errors never print the bearer token. The comment says so. | Keep. | L |
| 5 | — | — | Emulator-only evidence: the output itself says "verify app transcript and saved note separately" (AGENTS.md: an emulator run is not device acceptance). | Keep. | L |

## Proposed end state
Unchanged apart from the issue reference and `parser.error`. It stays with the voice latency campaign; if the owner retires that manual
campaign (research/scripts.md lists the Android campaign runners as an owner decision), delete this file, its Python test and the
`NativeVoiceLatencyInstrumentedTest` reference together.
