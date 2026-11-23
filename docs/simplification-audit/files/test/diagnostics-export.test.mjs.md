# test/diagnostics-export.test.mjs
- Lines: 351 | Kind: mixed: integration of real modules (`runtime/diagnostics-export.ts`, `crash-log.ts`, `voice-timing.ts`, `scripts/aggregate-voice-latency.ts`, `scripts/native-voice-latency.ts`) for most cases; 5 transplants (lines 145-165 `cloud-voice.ts`, 286-298 `connection-ui.tsx`, 299-306, 307-319, 320-329 `settings-adapter.ts`); source regexes (lines 220-223, 254-259) | Verdict: KEEP (trimmed, MOVE to `test/integration/diagnostics-export.test.mjs`); DELETE the transplant and source-text cases
- Covers: Settings > About "Export diagnostics" carries only allowlisted shapes: versions, pin, runtime hashes, permission/role booleans, crash classes, bounded voice/native/Cloud timing, never note text, keys, tokens, ids, mail, URLs or paths; the exported timing sections are readable by the latency aggregators. Duplicates: `test/browser/settings-device-facts.spec.ts:131` defers payload privacy to this file. Callers/importers: `npm test`. Research row 707 called the whole file a transplant (C+A); 15 of 22 cases import the real module.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-143, 166-190, 262-285, 330-351 | - | Redaction is a privacy boundary and a risky pure algorithm (T3 exception): synthetic secrets injected into every field, asserted absent from the output. Real imports, no stubs. Unique coverage. | Keep. | - |
| 2 | 191-228, 230-252 | - | Export -> aggregator round trip (`collectRecords`, `aggregateNativeVoice`) proves the two tools agree on the format. Integration. | Keep. | - |
| 3 | 220-223 | T1 | Regex-extracts `voiceTimingRoutes` array literal from `voice-timing.ts` source. | Export the routes constant and import it (or drop: line 222 already compares marks via the real export). | Low. |
| 4 | 254-259 | T1 | Five regexes over `settings-adapter.ts`, `native-voice-turn.ts` and a **vendor** file (`native-live-voice.ts`) pin call shapes. | Delete; "Export diagnostics includes native timing" is a Settings journey assertion on the shared file. | Low. |
| 5 | 145-165 | T2 | Slices `readNativeCloudStreamTiming` from `cloud-voice.ts` and runs in `vm` with fake plugin. | Delete or import the exported function directly (it is `export async function`). | Low. |
| 6 | 286-329 | T2 | Four transplants of `connection-ui.tsx`/`settings-adapter.ts` methods (abort on clear, epoch fence, single status observation). | Delete; cover "Clear problems while a refresh is in flight shows no stale entry" in `journeys/settings.spec.ts`. | Medium: epoch/abort fences only covered here. |
| 7 | 192-193 | B2 | Installs a fake `globalThis.localStorage` for `voice-timing.ts`. | Acceptable at the module boundary; move to a shared fixture. | None. |
| 8 | 230 | A8 | Test name carries an issue number (`#395`). | Drop. | None. |

## Proposed end state
`test/integration/diagnostics-export.test.mjs` with ~15 real-module cases (redaction tables, timing sanitisers, aggregator
round trips, crash-class bounds). Five transplants and the source regexes deleted; the in-flight refresh/clear fence moves
to `journeys/settings.spec.ts` as one user-visible case.
