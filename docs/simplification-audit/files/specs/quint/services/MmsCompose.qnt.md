# specs/quint/services/MmsCompose.qnt
- Lines: 234 | Kind: Quint model, live (services manifest, 15 `symbols` pins, 6 witnesses; `sharedSources` upstream contracts `native-telephony*.ts`, `mms-send.ts`) | Verdict: KEEP; harness PORT
- Covers: reviewed MMS in the Messages composer: the picture chooser keeps the visit alive while it covers the page, at most five pictures, operation IDs minted only when the draft holds none, the native journal answers a repeated ID without a second dispatch, closed answers release the ID, a retired visit loses authority but keeps the private draft (10 runs, 15 invariants). Duplicates: native side `MmsDispatch` (native family) models the Java journal, not the composer. Callers/importers: manifest; `refinement/services/mms-compose-replay.mjs` (uses `identity-comms-traces.mjs` and `test/fixtures/observed-sms-adapter.mjs`), registered in `forward-replays.mjs`; `test/quint-mms-compose.test.mjs`; aggregate via `services/index.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | `test/fixtures/observed-sms-adapter.mjs:20-24` | T10 / D7 | The fixture loads `apps/app/src/prototype/sms-adapter.ts` with an esbuild `onLoad` that inserts `globalThis.__smsDraftProbe=()=>({operationId,mmsOperationId,sentId,mmsSentId,active,body})` before the literal anchor `' const sync=()=>{'` to read closure state. | PORT: move the composer draft/operation state out of the `installSmsAdapter` closure into an exported controller (e.g. `runtime/mms-compose.ts` with `snapshot()`), used by the adapter and imported by the harness; delete the anchor. | Medium (adapter refactor; natural with the D2 adapter rewrite) |
| 2 | manifest `symbols` | T10 | 15 names (`installSmsAdapter`, `picking`, `attach`, …) pinned by regex. | Delete. | None |
| 3 | 32-42 | — | `synced` is a `def` that reads `s` (current state) while building the next, which is deliberate (previous lifecycle). Fine. | None. | — |
| 4 | runners | T4 | Wrapper + aggregate. | One runner. | None |

## Proposed end state
Model unchanged; harness imports an exported MMS compose controller and drives it with the AOSP telephony port; no source anchor, no symbol pins; path filter `sms-adapter.ts`, `image-sms.ts`, `aosp-telephony.ts`, upstream telephony contracts.
