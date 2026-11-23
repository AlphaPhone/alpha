# test/cloud-speech-stream.test.mjs
- Lines: 191 | Kind: mixed: JVM integration (case 1 compiles the patched shared `CloudSpeechWire.java` with fixture `CloudSpeechWireTest.java` via `fixtures/jvm-tools.mjs`), source-text (case 2; parts of case 3), Java source transplants (cases 3-5 slice `SpeechStreamBridgePlugin.java` fields and method bodies into generated test classes with fake `Handler`, `SystemClock`, `System`) | Verdict: KEEP case 1 (move to the Android JVM test lane); DELETE cases 2-5
- Covers: native streaming speech validates bounded PCM, keeps phrases before dispatch and bounds relay renewals (case 1); credentials stay native and PCM feeds playback before provider completion (2); minted token gets its own relay window within startup/lease bounds (3); duplicate STT readiness cannot restart capture (4); pre-ready relay errors keep bounded codes and malformed frames fail (5). Duplicates: `test/browser/cloud-tts-streaming.spec.ts` (renderer side of streaming), Android instrumentation for the speech bridge if present. Callers/importers: `npm test` glob; imports `fixtures/jvm-tools.mjs` (many importers, survives), `fixtures/CloudSpeechWireTest.java`. Sources come from `sharedSpeechSource()`, which applies Alpha's reviewed patch to the vendor plugin in a staging dir (Alpha-owned code, not a vendor edit). Cost: 4 javac+JVM runs plus patch staging.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-17 | - | Real classes + committed fixture test. | Keep; move to the Gradle/JVM unit set of the speech bridge, or keep as a host JVM case in `test/tooling/android-jvm.test.mjs`. | None |
| 2 | 18-28 | T1 | Regexes on `SpeechStreamBridgePlugin.java` (`own\.origin=cloudOrigin\(environment\)`, no `MediaPlayer`/`Log`). | Delete. | Low |
| 3 | 29-111 | T2 | Copies a field, a method range (`  final long startupStartedMs=` .. `  final Runnable expiry=`) and `void check()` into a generated class that redefines `System` and `SystemClock`. | Delete; carry "relay startup has its own bounded window; expired lease, closed, changed authority, protected surface refuse" as a JVM test of an extracted `RelayStartupBudget` class when the plugin is split, or as an instrumentation case. | Medium: only test of the relay startup budget. |
| 4 | 112-151 | T2 | Slices the `"connected"` handler. | Delete; same treatment. | Medium |
| 5 | 152-191 | T2 | Slices `preReadyError` and the pre-ready gate; needs cached `org.json` (`jsonJarSkip`). | Delete; `preReadyError` is a pure static and could move to `CloudSpeechWire` where case 1 already tests it. | Low |

## Proposed end state
One JVM case (wire test) running the committed fixture, plus, after the plugin split, a committed `RelayStartupBudgetTest.java` / `PreReadyErrorTest.java` against extracted classes. No generated Java from text slices. File gone from `test/`.
