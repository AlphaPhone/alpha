# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ScopedVoicePlaybackInstrumentedTest.java
- Lines: 179 | Role: through the WebView bridge, stores a `remote:<loopback>` paired credential, calls `AlphaVoiceCloud.synthesizePaired` twice against a loopback TTS fixture, then checks stale `stopPlayback`/`play` cannot disturb the newer prepared/active `MediaPlayer`. | Verdict: DELETE with paired speech (owner decision, P15) — otherwise SIMPLIFY
- Importers: none. Registry `ScopedVoicePlayback: { requiresTestMocksBuild: true }` (`scripts/android-instrumentation.ts:228`). Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 117-134 | A3 | The only route to playback here is the paired agent: `slot = "remote:" + origin`, `AlphaVoiceCloud.synthesizePaired({sessionId,origin,ownerId,…})`. PRD: "No hosted-agent pairing" (`docs/prd.md:11,17`); research P15 lists `synthesizePaired` for deletion. | If the owner deletes paired speech, delete this file with `AlphaVoiceCloudPlugin` paired methods and the registry entry. If the stale-stop/late-play guard is product-relevant for local Paradee playback, rewrite the test to prepare audio through the local TTS route instead (needs the packaged voice bundle). | Medium: this is the only test of the `playbackId`/`requestId` stale-operation guard in `AlphaVoiceCloudPlugin`. |
| 2 | 21-34 | C3 | `call()` = generic "evaluate a promise, poll a window key" helper; ~30 androidTest files hand-roll the same (`Promise.resolve(`/`.then(v=>window.__x=…)`). | `WebViewTestDriver.awaitPromise(expression)`. | None. |
| 3 | 48-105 | C3 | Loopback HTTP fixture parses headers by `tail==0x0d0a0d0a`, `content-length:` and bearer exactly like `ResidentWorkflowCrashInstrumentedTest.HeldModel:158-168`. | Shared `LoopbackHttp` helper (accept N requests, route+bearer check, canned response). | None. |
| 4 | 36-46 | — | `wav()` builds a silent 3 s PCM WAV. | Keep (fixture data). | None. |
| 5 | 111-115 | C3 | Bridge-ready poll then re-evaluate (`Boolean(window.Capacitor?.Plugins?.AlphaVoiceCloud)`) — poller copy. | `WebViewTestDriver.until`. | None. |
| 6 | 107-108 | D8 | Mixed indentation (1 and 2 spaces) inside one method. | Formatter. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call(String)` | helper | 21-34 | ~30 androidTest promise helpers (e.g. `SelectedDocumentInstrumentedTest.plugin:267`) | `WebViewTestDriver.awaitPromise` |
| `Fixture` (loopback TTS server) | class | 48-105 | `ResidentWorkflowCrash.HeldModel`, other loopback fixtures | `LoopbackHttp` |
| `wav()` | helper | 36-46 | local speech tests synthesize WAVs too | keep |

## Proposed end state
Deleted together with paired speech (preferred under the PRD). If kept: ~110 lines using shared promise and loopback helpers, with
the paired credential replaced by whatever route the product keeps.

## Verification
`node scripts/android-instrumentation.ts --test-mocks --classes ScopedVoicePlayback`. If deleted, remove the `ScopedVoicePlayback` registry entry in the same
change (`test/android-instrumentation-runner.test.mjs:185-213` does not flag a registry entry whose class is gone, so it would go stale silently).
