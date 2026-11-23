# android/app/src/main/java/ai/alphacompute/alphaphone/KeyboardDictationCloud.java
- Lines: 105 | Role: keyboard-IME speech-to-text over the selected Cloud (Eliza Cloud STT) or Direct (Cartesia) route, re-checking credential authority before and after every step | Verdict: SIMPLIFY
- Importers: 1 (`AlphaKeyboardDictationService`). Text/path pins: `test/keyboard-dictation.test.mjs` (javac-compiles this file against stubs and drives `new KeyboardDictationCloud(null)`), `specs/quint/native/KeyboardDictationCloud.qnt`, `specs/quint/native/manifest.json`, `specs/quint/refinement/native/KeyboardDictationCloudTraces.java`, `keyboard-dictation-cloud.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72-102 | C3 / C5 | Whole Cloud STT upload duplicates `AlphaVoiceCloudPlugin.java:~200-240` (same multipart `name="provider"\r\n\r\ncartesia` prefix, `/api/v1/voice/stt`, `X-Eliza-STT-Provider` check, bearer token shape check). | Extract one `CloudStt.upload(host, token, wav, guard, cancelled)` (or upstream helper next to `CartesiaSpeech`) used by both; this file keeps only the authority checks. | Medium: both callers are Quint-traced; keep header names and multipart bytes identical. |
| 2 | 81-82, 92-99 | C3 (P9) | Hand-rolled HttpURLConnection setup (`setInstanceFollowRedirects(false); setUseCaches(false); setConnectTimeout(20000)…`) and bounded-read loop (`bytes.size() + count > 256 * 1024`). Twins in 7 files. | Use the shared `Http.open(...)` / `BoundedIo.read(in, limit, cancelled)` helpers proposed for the package. | Low. |
| 3 | 33, 51 | C6 (P6) | Literal `"local-agent-provider:v1"` twice although `LocalAgentProviderAdmission.PROVIDER_SLOT` exists; `"cloud:production"` literal at 48. | Use `LocalAgentProviderAdmission.PROVIDER_SLOT` and a shared `Slots.CLOUD_PRODUCTION` constant. | None (same string). |
| 4 | 30-35, 44-55 | C5 | `selection()` and `credential()` repeat the same prologue `withCredentialAuthority(authority, () -> { if (cancelled \|\| …PasswordSurfaces.visible()) throw …`. | One private `<T> T underAuthority(Callable<T>)` that does the cancellation/password-surface check. | Low. |
| 5 | 75 | C3 | Bearer-token shape check `token.isEmpty() \|\| token.length() > 16384 \|\| token.contains("\r") \|\| token.contains("\n")` — 9 copies in main (`PairedAgentCredential:12`, `NativeNotificationSession:54`, `ResidentResultSession:17,46`, `AlphaVoiceCloudPlugin:202`, `AlphaLocalAgentPlugin:1145,1292`, `CalendarSyncSnapshot:86`). | `Ids.bearer(token, max)` helper. | None. |
| 6 | 32, 46 | D8 | Fully qualified `ai.eliza.plugins.passwords.PasswordSurfaces` inline twice. | Import it. | None. |
| 7 | 26, 38 | C5 | `KeyboardDictationPolicy.usesDirect(selected.optString("provider"), selected.optBoolean("unbound"))` evaluated in constructor and again in `directKey()`. | Keep the re-check (it is the provider-change fence) but read through one `providerKind(JSONObject)` helper. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| multipart STT upload body | helper (inline) | 76-102 | `AlphaVoiceCloudPlugin.java` ~206-240 | `CloudStt` helper (product) or upstream `ai.eliza.voice` |
| token shape guard | helper (inline) | 75 | 8 other sites (finding 5) | `Ids.bearer` |
| bounded response read | helper (inline) | 92-99 | 7 copies (P9) | `BoundedIo.read` |

## Proposed end state
Constructor + `check()` + `cancel()` + `transcribe()` that chooses Direct (`CartesiaSpeech.transcribe`) or the shared Cloud STT
helper; one `underAuthority` wrapper for the two credential reads; slot names from constants. Delete the local HTTP/multipart/
bounded-read code. Estimated ~70 lines.

## Verification
`node --test test/keyboard-dictation.test.mjs` (javac + fake store), Quint `KeyboardDictationCloud` refinement
(`specs/quint/refinement/native/keyboard-dictation-cloud.mjs`); device check of IME dictation on both providers.
