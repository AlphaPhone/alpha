# apps/app/src/prototype/phone-info-page.ts
- Lines: 89 | Role: pure presenters (SIM/carrier/network rows, default-app rows) and an epoch-guarded loader for Settings → General → Phone on the AOSP image | Verdict: KEEP (optional MOVE to `apps/app/src/runtime/phone-info.ts`)
- Importers: `settings-adapter.ts:17,719-720,1242-1245`. Test: `test/phone-info-page.test.mjs`.
  Text/path pins: `test/support/feature-parity.mjs:406`. No Quint pin.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37, 51, 56 | C6 | The voicemail state union `'ready' | 'unconfigured' | 'unsupported' | null` is written out 3 times here and again in `phone-adapter.ts:67`. | One `VoicemailState` type exported from the telephony contract or `telephony-presenters.ts`. | None. |
| 2 | 48-53 | C2 | `PhoneInfoClient` re-types four telephony-profile methods (`status`, `phoneInfo`, `voicemailStatus`, `requestAccess`) by hand; the client passed in is `settings-adapter.ts:720 telephonyProfile()`. | Derive it with `Pick<ReturnType<typeof telephonyProfile>, …>` (or the contract's profile type) so the shapes cannot drift. | None (types only). |
| 3 | 72, 75 | B1 | `.then(value => value.state, () => null)` — documented optional voicemail; `catch { … state={phase:'failed'} }` — specified. | Keep. | — |
| 4 | 61-89 | C4 | Epoch/open staleness fence (`token !== epoch || !open`) — one of ~30 hand-written fences (research C4). Clear and small here. | Keep; adopt the shared fence only if one is introduced. | — |
| 5 | 14-15, 48, 54 | A7 | `PhoneInfoRow`, `PhoneInfoSection`, `PhoneInfoClient`, `PhoneInfoState` exported but not imported anywhere else (grep). | Unexport (types only; no runtime change). | None. |
| 6 | whole | D11 | Pure presenter + loader; nothing prototype-specific. | Optional move to `runtime/phone-info.ts` beside `telephony-presenters.ts`. | Feature-parity path pin. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `NETWORK` | const | 16 | none | stays |
| `SIGNAL` | const | 17 | none | stays |
| `app` | helper | 18 | none | stays |
| voicemail state union | type (inline ×3) | 37, 51, 56 | `phone-adapter.ts:67` | one `VoicemailState` export |
| `PhoneInfoClient` | type | 48-53 | `AlphaTelephonyPlugin` (`runtime/aosp-telephony.ts`) | `Pick<>` of it |

## Proposed end state
Same file (~85 lines) with one shared voicemail-state type, `PhoneInfoClient` derived from the plugin type, internal types unexported. Est. 85 lines.

## Verification
`node --test test/phone-info-page.test.mjs`, Settings Phone page on the image (device acceptance separate), feature-parity test if moved.
