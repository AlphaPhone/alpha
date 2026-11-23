# apps/app/src/prototype/sms-adapter.ts
- Lines: 268 (12 lines > 300 chars, longest 1,990) | Role: Messages view on the verified Alpha image — native SMS/MMS session, reviewed send/handoff, composer draft + suggested reply, Home "open thread" hand-off, and the selected-thread hooks the agent reads. | Verdict: SIMPLIFY
- Importers: `apps/app/src/main.tsx:21,132,185` (`installSmsAdapter`, `setSmsReplySuggester`), `apps/app/src/prototype/agent-adapter.ts:27` (`openSmsThread`, `openSmsThreadSelection`, `placeAskedSmsDraft`). Text/path pins: `specs/quint/services/manifest.json` (20 refs; symbol pins `installSmsAdapter`, `operationId`, `draftRevision`, `lifecycle`, `reconcile`, `SMS_NOT_SENT`, `smsReview`, `picking`, `attach`, `sendMms`, `reconcileMms`, …), `specs/quint/native/manifest.json` (1), `specs/quint/refinement/services/{sms-send-replay,mms-compose-replay}.mjs`, `test/fixtures/observed-sms-adapter.mjs` (bundles the file), `test/image-sms.test.mjs` (13 `assert.match` + 4 esbuild builds), `test/sms-incomplete-rows.test.mjs`, `test/browser/aosp-telephony-views.spec.ts`, `test/support/feature-parity.mjs:423`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 263 | A7 | `nativeReceipts` and `nativeSim` render values: 0 bindings in `template.html` and 0 readers in apps/test/specs (`git grep -w nativeReceipts`, `nativeSim`). | Delete both values. | None |
| 2 | 245, 257-260, 263 | D7 | `nativeRows`, `nativeInThread`, `nativeSims`, `nativeSend`, `nativeSendMms`, `nativeAttachments`, `nativeClear` are not bound by `template.html` (bound: `nativeBack/Body/Busy/Handoff/LoadMore/More/Notice/OnBody/OnRecipients/Read/Recipients/Refresh/SendAccess/SimAccess/Status/Attach/MmsAvailable/Managed/Prototype`); only `test/image-sms.test.mjs`, `test/sms-incomplete-rows.test.mjs` and the Quint replays drive them. `nativeRows` builds per-row formatted strings on every render; `simLabel` (L245) exists only for it. The designed view uses `submit`, `pictures`, `threads`. | Point tests/replays at the designed values (`submit`, `pictures`, `threads[i].open`, `bubbles`), then delete the unbound `native*` values and `simLabel`. | Medium: replays + 2 host tests change in the same commit. |
| 3 | 198 | A6 | `views.messages.reply=()=>null` — `agent-adapter.ts:1939` replaces `p.reply` globally, so view replies are never consulted (research P7). | Delete `reply` assignment (keep `suggestions` only if model calls it). | Low |
| 4 | 126, 145, 181, 189, 206, 241, 242, 263 (×3) | C3 | The invalidate-review sequence `draftRevision++;operationId='';resetMms(false);notice='';receipt=null;changed()` appears 9× (variants drop `receipt=null` or use `paint`). | One `invalidateReview(repaint=changed)` local; the SIM-pick (2×) and picture-remove (2×) closures become shared functions. | Low; Quint pins name `draftRevision`/`operationId` which stay. |
| 5 | 71, 267 | C3 | Visit reset `names.clear();people.length=0;selectedThread=null;namesLoaded=false;` duplicated in `sync` and unmount. | `forgetVisit()` local. | None |
| 6 | 128-129 | C3 | Contact-name loading loop (`searchContacts('',100)` → `numberKey` → `names.set`/`people.push`) is copy-pasted in `phone-adapter.ts:103` and `telephony-attention.ts:33-36`. | `contactNames(cards)` returning `{names, people}` in `telephony-presenters.ts`. | Low |
| 7 | 12 | C1 | `export type OpenThread={participant…;messages:{direction:'in'|'out';…}[];truncated:boolean}` — same shape re-declared in `runtime/connection-ui.tsx:2283` (`draftSmsReply` param) and `runtime/telephony-executor.ts:45` (`openThread()` return). | Export one `OpenThread` from `runtime/telephony-executor.ts` (runtime owns the contract); import it here and in `connection-ui.tsx`. | None |
| 8 | 35, 44, 50, 246 | C1 | `type Bag=Record<string,any>`; `Component:any`, `views:Bag`, `api:Bag|null`, `viewApi:Bag`. | Shared `ShellHost`/`ViewApi` types. | None |
| 9 | 47-58 | D3 / P6 | ~30 module-level mutable variables plus `owner` capture; a remount shares them. | Group into one `SmsVisit` object created per install; keep names Quint pins reference or update pins. | Medium (manifest pins) |
| 10 | 248-254 | P17 | `views.messages.render` queues microtasks that mutate view state (`viewApi.set?.({prefill:null})`, `chooseThread`). | Handle `prefill`/`openThread` in `sync()`/`componentDidUpdate` when the view becomes active. | Medium |
| 11 | 19-20, 202, 223, 248, 252-253 | B2 | `globalThis.localStorage?.`, `api?.send?.(…)`, `api?.chat?.()`, `api?.open?.(…)`, `viewApi.set?.(…)` — the view api always has these; `localStorage` always exists in WebView (the try/catch for quota/blocked storage is a specified fallback and stays). | Call directly. | Low |
| 12 | 66, 266-267 | B2 / D7 | `mount?.call`, `update?.apply`, `unmount?.call` — `model.js:5196,5273,5300` always define them; the optional call exists for the bundled test fixture's bare `Shell`. | Call directly; give the fixture shell the three methods. | Low |
| 13 | 106, 221 | B3 | `(row as any).threadId`, `full=row as any` after `isIncompleteSmsRow` narrowing. | Use the upstream `SmsMessage`/`SmsThread` types (narrowed by the guard). | None |
| 14 | 1 | D13 | `'../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts'`. | `@elizaos/...` alias. | None |
| 15 | 41-43 | — | `smsProblemLabel` copy table — fine; keep (user-visible copy). | Keep. | — |
| 16 | 263 | D8 | One 1,990-character line returns 30 values. | Split into named groups after #2. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `OpenThread` | type | 12 | `runtime/connection-ui.tsx:2283`, `runtime/telephony-executor.ts:45` | `runtime/telephony-executor.ts` |
| `SmsReplySuggester` | type | 13 | `main.tsx:185` lambda (structural) | keep, import `OpenThread` |
| `AskedDraft` | type | 27 | — (exported, 0 importers) | drop `export` |
| `SUGGEST_KEY` `'alpha.messages.suggest-replies.v1'` | const | 18 | — | keep (persisted key) |
| `Bag` | type | 35 | ~50 files | `prototype/shell-types.ts` |
| `MMS_PICTURES` | const | 36 | `runtime/aosp-telephony.ts` MMS limits | keep or move beside `MMS_MAX_ATTACHMENTS` |
| `SMS_NOT_SENT` | const | 39 | — (Quint-pinned) | keep |
| contact-name loop in `loadNames` | helper | 128-129 | `phone-adapter.ts:103`, `telephony-attention.ts:33-36` | `telephony-presenters.ts` `contactNames()` |
| `normalizeRecipients`/`sameRecipients` | helper | 77-81 | upstream `normalizePhoneNumber`; `numberKey` in presenters (two normalisers) | keep, document which compares what |

## Proposed end state
Same module, one install function: state grouped in a per-install object, `invalidateReview()`/`forgetVisit()` helpers replace 11 repeated sequences, prefill/openThread handled on activation instead of render microtasks, `reply=()=>null` gone, render returns only template-bound values (designed view + the bound `native*` keys). `OpenThread` imported from runtime. Estimated 268 → ~240 lines at current density (render line roughly halves).

## Verification
`test/image-sms.test.mjs`, `test/sms-incomplete-rows.test.mjs`, Quint `sms-send-replay`/`mms-compose-replay` (services manifest), `test/browser/aosp-telephony-views.spec.ts`; `npm run verify`; emulator/AOSP-image SMS acceptance is separate evidence (AGENTS.md) — none of these prove device sending.
