# scripts/native-voice-latency-emulator.ts
- Lines: 140 | Kind: manual emulator campaign driver (issue #395 native voice latency, class E evidence) | Verdict: KEEP as a documented manual campaign, SIMPLIFY (owner may choose DELETE)
- Covers: runs `NativeVoiceLatencyInstrumentedTest` on an owned emulator while `scripts/inject-emulator-audio.py` streams WAVs into the virtual microphone (or a paced file feed), pulls the `alpha-native-voice-timing-v3` export and aggregates it with `aggregate-voice-latency.ts`. Duplicates: none functionally; arg parser and `adb` wrapper are two more copies of the ~14 parsers / 16 adb helpers (scripts research §4). Callers/importers: nobody executes it; it is only named as the `campaign` string of `NativeVoiceLatency` in `scripts/android-instrumentation.ts:299`. Its exports `parse` and `repetitions` have no importer (grep of `test/`, `scripts/`, `specs/`: none). It imports `scripts/aggregate-voice-latency.ts` and spawns `scripts/inject-emulator-audio.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43, 67 | A7 | `parse` and `repetitions` are exported but nothing imports them. | Unexport. | None |
| 2 | 43-64 | C3 | Hand-written argv parser. | Use the shared `scripts/lib/args.ts` (`node:util` `parseArgs` with a schema). | Low |
| 3 | 72, 80 | C3 | Local `adb` wrapper; `execFileSync('adb', …)` repeated inline at 80 and 129. | Use the shared adb helper; call it for every adb invocation. | Low |
| 4 | 91 | T8 | Polls instrumentation output every 1 s for up to 10 min. Condition-based wait, acceptable for a manual campaign. | Keep. | — |
| 5 | 115-126 | B5 | Report embeds a fixed `notEvidenceFor` list; it is useful for humans reading the evidence folder and costs nothing. | Keep. | — |
| 6 | 140 | D7 | `process.argv[1] === fileURLToPath(...)` main-guard repeated across scripts; `import.meta.main` is used elsewhere (`native-view-policy.ts`). | Use `import.meta.main` consistently. | None |

## Proposed end state
~110 lines, unexported helpers, shared arg/adb helpers, still referenced from the instrumentation registry as the manual #395 campaign. If the owner decides emulator voice-latency campaigns are no longer wanted (the PRD's latency acceptance is device-only), delete it together with `scripts/inject-emulator-audio.py`, `test/emulator-microphone-preflight.test.py` and the `NativeVoiceLatency` campaign entry; `NativeVoiceLatencyInstrumentedTest` itself stays.
