# test/browser/telephony-fixture.ts
- Lines: 142 | Kind: Playwright helper (fake Capacitor bridge for AOSP telephony: calls, voicemail, SMS threads, contacts, phone info) | Verdict: MERGE into `test/browser/harness/bridge.ts` as the `telephony` handler set
- Covers: nothing itself; gives `aosp-telephony-views.spec.ts` a stubbed `AlphaTelephony` + `AlphaContacts` bridge with synthetic people, call log, voicemail (WAV generated in-page) and threads, plus switches for denied access, SMS-role handoff, voicemail states, empty and single-unread data. Duplicates: generic stub answers (`surfaceInfo`, `buildInfo`, `platformCapabilities`, `secureRead`) repeat those in `flag-off-android.ts`, `resident-stub.ts`, `device-apps-stub.ts`. Callers/importers: `test/browser/aosp-telephony-views.spec.ts` only (rg over `test`, `scripts`). Survives as long as that spec does.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 94-98 | T7 / C6 | Declares 20 plugins × 70 method names as identical promise headers, so every plugin "has" every method. Hides typos and makes unknown calls succeed with a catch-all object (line 137). | Derive headers from the typed per-plugin handler map; unknown method throws. | Low |
| 2 | 133-137 | C3 | `openSettings`, `surfaceInfo`, `buildInfo`, `platformCapabilities`, `secureRead` defaults duplicated from the other bridge fakes. | Shared base handlers in the harness. | None |
| 3 | 18 | T7 | Seeds `alpha.connection.selection.v1` inline (339× repo-wide). | Harness option. | None |
| 4 | 86-93 | — | In-page WAV builder is the only place synthesising PCM for voicemail; worth keeping. | Move to `harness/media.ts`. | None |
| 5 | 1-3 | — | Header comment correctly states the evidence boundary (no radio, SIM or provider). Keep it. | — | None |

## Proposed end state
`harness/bridge.ts` gains `telephony(options)` (typed handlers for `AlphaTelephony` and `AlphaContacts`, the synthetic data set and the WAV helper), composed with the shared base handlers. `setupTelephony` becomes a fixture option of the shared `test.extend`. Delete this file when `aosp-telephony-views.spec.ts` moves to the harness. Note for the owner: Phone/Messages/Contacts are "deferred" in `browser/apps.ts` and `view-navigation`; if the AOSP telephony views are not in the MVP image, the spec and this helper go together.
