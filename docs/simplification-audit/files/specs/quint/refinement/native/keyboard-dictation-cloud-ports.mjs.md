# specs/quint/refinement/native/keyboard-dictation-cloud-ports.mjs
- Lines: 64 | Kind: Quint refinement fixture (synthetic credential/authority/PCM/provider ports as Java strings) | Verdict: KEEP (move to files)
- Covers: ports for `keyboard-dictation-cloud.mjs` (`KeyboardDictationCloud`, live). Stubs product `AlphaLocalAgentPlugin` (authority epoch), `AlphaCredentialStore`, `LocalAgentProviderAdmission`, `BuildConfig`, and upstream `NativeProviderSlot`, `PasswordSurfaces`, `RecordingPcm`, `CartesiaSpeech`. Callers/importers: `keyboard-dictation-cloud.mjs:7` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 44-63 | — (side effects) | The `CartesiaSpeech` stub opens `https://api.cartesia.ai/synthetic`; safe only because `KeyboardDictationCloudTraces.java:61` installs a `URLStreamHandlerFactory` that intercepts every URL. Good guard (AGENTS.md: no real side effects). | Keep; add a one-line comment pointing at the interceptor. | Low |
| 2 | 32-33 | — | `PasswordSurfaces` is the upstream password-*field visibility* check used by `KeyboardDictationCloud.java:32,46`, not the password import/export feature (D3); it stays. | None. | None |
| 3 | whole | D6 | Java in JS strings. | `stubs/keyboard-dictation-cloud/*.java`. | Low |

## Proposed end state
Same ports as committed `.java` files.
