# specs/quint/services/PhoneSession.qnt
- Lines: 116 | Kind: Quint model (services family, live; 9 tests, 5 witnesses, 12 symbol pins) | Verdict: KEEP; harness fine (imports module with stubs)
- Covers: image Phone view: foreground-only recent-calls read with an epoch fence, and the dial handoff latch owned by the showing that started it (stale handoffs neither block nor release a later dial). Sources exist (`prototype/phone-adapter.ts`, `runtime/aosp-telephony.ts`, `runtime/aosp-image.ts`). The modelled branch is the system-dialer handoff that `phone-adapter.ts:132` takes when `placeCall` answers `role-required`/`permission-required`: live. Duplicates: `native/PhoneCalls.qnt` covers direct Telecom placement (not this branch). Callers/importers: manifest; harness `refinement/services/phone-session-replay.mjs` (esbuild-loads the real `phone-adapter.ts` via `sourceModule` with four module stubs and imports `createAospTelephony`; observed replay of model traces), run by `forward-replays.mjs` in the aggregate and by `test/quint-phone-session.test.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest symbols | T10 | 12 symbol pins include closure locals (`epoch`, `session`, `reading`, `phoneRows`). They break on any rename inside `installPhoneAdapter` and on the D2 adapter rewrite. | Pin the file only. | Low |
| 2 | harness | D2 | The harness drives `installPhoneAdapter` (monkey-patch adapter). When adapters become modules (Stage F), the harness must import the new entry. | Track with the `model.js` split. | Medium |
| 3 | harness comment | A8 | Harness calls this "the legacy dialer-handoff branch"; it is the live fallback, not legacy. | Reword in the harness report. | None |

## Proposed end state
Model unchanged; harness runs once; file pin instead of local-name pins.
