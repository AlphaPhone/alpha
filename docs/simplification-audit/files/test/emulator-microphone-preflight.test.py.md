# test/emulator-microphone-preflight.test.py
- Lines: 184 | Kind: unit (Python `unittest` of `scripts/inject-emulator-audio.py` with `unittest.mock.patch` over discovery, pid, gRPC channel and stub; compiles the SDK emulator proto with `grpc_tools.protoc` in `setUpClass`) | Verdict: DELETE
- Covers: the emulator audio helper's `--check-microphone` reads state only, refuses when the host microphone is enabled, never builds a client without a bearer token, never prints the token, and frames injected audio. Duplicates: none. Callers/importers: `test/python-suites.test.mjs:29` (skipped unless `grpcio` + `grpcio-tools` are installed, and unless an SDK emulator proto exists). The helper is used only by the manual native voice latency campaign (`scripts/native-voice-latency-emulator.ts:97`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 82-96 | T3 | Six `patch.object` mocks around one CLI: every collaborator faked. | Delete. | Low. |
| 2 | whole | T9 | Double skip gate (Python deps in the Node wrapper, SDK proto in `setUpClass`): in CI it is almost always skipped, so it protects nothing in practice. | Delete. | None. |
| 3 | whole | - | Tool is for a manual, not-release-gating campaign; its real proof is the campaign run on an emulator. | - | - |

## Proposed end state
Deleted, and its row removed from `test/python-suites.test.mjs`. The "never inject when the host microphone is on" rule
stays in the helper itself (it already refuses at run time).
