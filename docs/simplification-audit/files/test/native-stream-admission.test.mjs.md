# test/native-stream-admission.test.mjs
- Lines: 47 | Kind: transplant on the JVM (slices `requestStream(` up to `/** A single ephemeral voice-only feed` from `AlphaLocalAgentPlugin.java` into a generated class with stub Capacitor types) | Verdict: DELETE now; REWRITE with the extracted request class (see native-resident-request-deadline)
- Covers: chat stream admission refuses reserved `voice-`/`view-` feed ids, keeps two chat slots independent of feed subscriptions and refuses duplicates. Duplicates: `test/quint-native-stream-bridge.test.mjs` (model traces of the native stream bridge), `test/local-agent-native-stream.test.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-14, 27 | T2 | Marker slice of the plugin; Java in a template string. | Delete. | Low-medium: reserved-id refusal is otherwise only in the Quint bridge model. |

## Proposed end state
After the plugin split, the android-jvm suite calls the real stream admission with three cases: reserved prefix refused,
third chat stream refused while two feeds are open, duplicate id refused.
