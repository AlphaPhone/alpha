# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedAsrLiveInstrumentedTest.java
- Lines: 67 | Role: opt-in live paired agent at `http://10.0.2.2:47846`: connect through the "Local development agent" UI, record (injected), transcribe, edit, Listen and Stop in Notes | Verdict: DELETE with P15; otherwise MERGE with PairedVoiceLive
- Importers: none. Text/path pins: manual campaign `scripts/android-paired-speech-live.ts:23` (`gate: 'pairedAsrLive', testClass: 'PairedAsrLiveInstrumentedTest'`), listed in `CAMPAIGN_RUNNERS` (`scripts/android-instrumentation.ts:313`). No CI workflow or package.json script runs that campaign (grep: 0 hits in `.github/`, `package.json`). Reads `files/paired-asr-live.json` pushed by that script.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A3 / P15 | Live paired-agent journey; PRD forbids pairing. | Delete with the paired stack; also delete `scripts/android-paired-speech-live.ts` and its `CAMPAIGN_RUNNERS` entry. | Owner decision. |
| 2 | 21-26, 34-66 vs PairedVoiceLive 21-26, 34-65 | C5 / T4 | The two Live classes are line-for-line the same except the gate name, port, asset (AAC asset vs inline WAV), the extra `Use selected agent voice` click and `Transcribe with your agent` vs `Review recording`. | If kept: one parameterised class with two @Test methods; one campaign mode. | Low. |
| 3 | 49-50 | B4 | `until(...includes('water the plants tomorrow morning'),150000)` followed by `until(querySelector('textarea[aria-label="Review transcript"]'),10000)` — the second is implied by the first. | Delete l.50. | None. |
| 4 | 39 vs PairedVoiceLive 39 | — | Clears the selection with `location.replace(...)` here but `scenario.recreate()` in the twin. | Pick one (recreate). | Low. |
| 5 | 40-41 | C3 | "Local development agent" connect routine (summary click + sensitive input fill + Connect) appears in 10 androidTest files (PairedMaps, PairedReminder, PairedVoiceLive, AllViewAgentContext, CombinedAgent(+Restart), DeviceAction, RemoteAgent, BrowserReadingLive). | `AgentConnection.connectLocal(origin, code)` helper (or delete with the never-run classes). | Low. |
| 6 | 23-26, 47 | C3 | `activity()`, `voice()`, `store()`, `field()` + reflection recording injection — same as PairedVoiceLive:23-26,47 and PairedMaps/PairedReminder:23-26. | Shared `ResumedPlugins` helper / delete. | — |
| 7 | 33 | C3 | Manual asset copy loop (also PairedAsr:41). | `Files.copy`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until(expr,timeout)` | helper | 21 | PairedVoiceLive:21 (identical) | `WebViewTestDriver.until` |
| `click` | helper | 22 | PairedVoiceLive:22, PairedMaps:22, PairedReminder:22 (identical) | `WebViewTestDriver.click` |
| `activity`/`voice`/`store`/`field` | helper | 23-26 | PairedVoiceLive:23-26, PairedMaps:23-26, PairedReminder:23-26 | `ResumedPlugins` or delete |

## Proposed end state
Deleted with P15. Otherwise merged with PairedVoiceLive into one ~60-line class using shared helpers.

## Verification
`node scripts/android-paired-speech-live.ts asr` (manual; needs a live paired host).
