# apps/app/src/runtime/native-voice-turn.ts
- Lines: 30 | Role: forwards voice-turn stage marks to the native latency collector and reads its timing export for diagnostics. | Verdict: SIMPLIFY (small; candidate MERGE with native-live-voice.ts)
- Importers: `prototype/voice-adapter.ts:38` (`installNativeVoiceTurnMarks`), `prototype/settings-adapter.ts:34` (`readNativeVoiceTiming`).
- Text/path pins: `test/diagnostics-export.test.mjs`, `test/live-voice.test.mjs` (read source text), `feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | C3 | `available` identical to `native-live-voice.ts:16`. | Shared from `native/plugins.ts`. | None |
| 2 | 12 | C2 | `registerPlugin<NativeVoiceTimingPort>('AlphaVoiceCloud')` re-registered on every call (`plugin()` is a function). | One typed singleton. | None |
| 3 | 14-21 | B4 | `installed` flag for an install called once from `voice-adapter`. | Keep only if voice-adapter can install twice; otherwise drop. | Low |
| 4 | 7 | A8 | "Issue #395:" in the doc comment. | Drop the issue tag. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `available` | helper | 13 | `native-live-voice.ts:16` | `native/plugins.ts` |
| `plugin` | helper | 12 | 16 `AlphaVoiceCloud` registrations | `native/plugins.ts` |

## Proposed end state
~12 lines, or merged with `native-live-voice.ts` into one `voice/native-live.ts` that binds the upstream `native-live-voice.ts` module once.

## Verification
`test/diagnostics-export.test.mjs`, `test/live-voice.test.mjs` (text readers), settings diagnostics export.
