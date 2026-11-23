# apps/app/src/runtime/gmail-account-selection.ts
- Lines: 14 | Role: per-Cloud-owner hint of the last chosen Gmail account id in `localStorage` (`alpha.gmail.account-choice.v1:<owner tuple>`). | Verdict: SIMPLIFY
- Importers: 1 product (`prototype/inbox-cloud-adapter.ts`, 10 call sites, never passes `port`). Text/path pins: `scripts/inbox-adapter-fixture.ts`, `scripts/test-gmail-read-ahead.ts`, `scripts/test-inbox-cloud-flow.ts`, `scripts/test-inbox-attention-flow.ts`, `specs/quint/services/manifest.json`, `test/browser/file-email.spec.ts`, `test/browser/home-inbox.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-5 | B2 | `storage=()=>{try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}}` plus a local `Storage` type; `localStorage` always exists in WebView/dev browser. The `port` parameter exists for Node scripts only (product never passes it). | Use `localStorage` directly; drop the `port` parameter once the Node script tests are retired (T3/T9). | Low |
| 2 | 9, 13 | B1 | `try{…}catch{return null;}` around `JSON.parse` of our own key and around `setItem`. | Keep the read catch (storage boundary, corrupt value → no hint); keep the write catch (documented optional hint). | — |
| 3 | 9, 13 | C3 | Id validity `id.length>0&&id.length<=256&&!/\s/.test(id)` written twice. | `const validId=(id:unknown):id is string=>…`. | None |
| 4 | 6 | C3 | Owner key `JSON.stringify([environment,userId,organizationId||''])`; `google-calendar-selection.ts:13` builds the same tuple (being deleted) and `google-connection-ui.tsx:219` a 5-field variant. | Shared `cloudOwnerKey(owner)` helper. The persisted key string must stay byte-identical. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Owner` | type | 3 | `GoogleCalendarAccountKey` (`google-calendar-selection.ts:5`), `googleCalendarAccountKey()` return (`google-connection-ui.tsx:37`), cloud account fields in `cloud-protocol.ts` | one `CloudOwner` type in `cloud-protocol.ts` |
| `Storage` | type | 4 | `GoogleCalendarSelectionStorage` (`google-calendar-selection.ts:7`) | delete (use DOM `Storage`) |
| `key` | helper | 6 | owner tuple builders (above) | shared `cloudOwnerKey` |

## Proposed end state
Two functions over `localStorage`, one `validId`, shared owner type/key. ~10 lines; persisted key unchanged.

## Verification
`scripts/test-gmail-read-ahead.ts`, `scripts/test-inbox-cloud-flow.ts`, `test/browser/home-inbox.spec.ts`, `test/browser/file-email.spec.ts`.
