# android/app/src/main/java/ai/alphacompute/alphaphone/CloudVoiceLimit.java
- Lines: 100 | Role: Pure parser of Cloud speech 429/503 retry facts (Retry-After, limit code, reset) and the cache-warming replay wait. | Verdict: KEEP (absorb parsing from AlphaVoiceCloudPlugin)
- Importers: `AlphaVoiceCloudPlugin`; renderer twin `apps/app/src/runtime/cloud-voice-limit.ts` (renderer side of the same facts). Text/path pins: `specs/quint/refinement/native/note-bridge.mjs`; `test/cloud-voice-limit.test.mjs`, `test/fixtures/CloudVoiceLimitTest.java`, `test/native-cloud-control-jvm.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 49-60 | D10 | The JSON body parsing that produces `read(...)`'s arguments lives in `AlphaVoiceCloudPlugin.limitOf/jsonText/limitData` (176-187). | Add `static CloudVoiceLimit fromResponse(String retryAfter, String body, long now)` and `JSObject toData()` here; plugin calls them. | low |
| 2 | 82-93 | B1 | `catch(RuntimeException invalid){return null;}` for date parse. | Specified (invalid hint ignored); narrow to `DateTimeParseException`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| CloudVoiceLimit | class | 15 | apps/app/src/runtime/cloud-voice-limit.ts (renderer model of same fields) | stay |

## Proposed end state
~115 lines after absorbing the 20-line body parser. Estimated lines after: 115.

## Verification
`test/cloud-voice-limit.test.mjs`.
