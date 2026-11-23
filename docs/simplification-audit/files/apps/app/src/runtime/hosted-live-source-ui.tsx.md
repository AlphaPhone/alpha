# apps/app/src/runtime/hosted-live-source-ui.tsx
- Lines: 266 | Role: "Live Google" picker inside the digest panel: loads Cloud-delegated Google accounts/calendars, revokes a delegation, and builds a reviewed `sources` request. | Verdict: SIMPLIFY
- Importers: 1 (`runtime/hosted-digest-ui.tsx:22`). Text/path pins: `test/digest-delegation-host.test.mjs:2` (T1 readFileSync), `test/locale-time-usage.test.mjs:18` (listed in the `pending` set of files still using bare time calls; the test fails if a listed file stops using them), `test/support/feature-parity.mjs:526`, `scripts/fixtures` (1 name ref).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 126, 137 | NEW (locale bypass) | `new Date(expiresAt).toLocaleString()` and `new Date(account.expiresAt).toLocaleString()` ignore Android's 12/24-hour setting; hosted-digest-ui.tsx uses `formatDateTime` from `prototype/locale-time.ts` for the same kind of value. | Use `formatDateTime(new Date(...))`; remove `'runtime/hosted-live-source-ui.tsx'` from the `pending` set in `test/locale-time-usage.test.mjs:18` in the same commit. | Low; user-visible time format changes to the device setting (intended by PRD locale rule). |
| 2 | 132 | C6 / D5 | `browserDevProfile&&JSON.parse(localStorage.getItem('alpha.connection.selection.v1')||'null')?.kind==='development'?<BrowserDigestDelegation …/>:isAndroid?<CloudDelegationPanel …/>:null` — dev selection read with the raw key (third copy, see hosted-digest-ui.tsx:84,284). Also imports `browser/digest-delegation-ui` and `browser/dev-profile` into a production component. | Parent passes a `delegation` render prop (`CloudDelegationPanel` on Android, the dev panel from the dev module, else null); this file drops both `browser/` imports. | Low. |
| 3 | 45-46, 94-96, 248-254, 219, 231, 241 | C6 | `range(value,168)` / `max={168}` literal; `DIGEST_SOURCE_MAX_HOURS` exists in hosted-digests. `range(..)` checks are written twice (prepare guard and button `disabled`). | `const valid = range(windowHours,MAX)&&range(maxItems,25)&&range(expiresHours,MAX)&&(kind!=='calendar'||!!calendar)` computed once; use it in both places; `MAX = DIGEST_SOURCE_MAX_HOURS`. | None. |
| 4 | 62-66 | B1 | `catch { if (current()) { setAccounts([]); setMessage(""); } }` — a failed account load clears the message to empty, so the owner sees nothing. | Set a visible message ("Unavailable", already used by `loadCalendars` at 83). | Low; copy change on failure only. |
| 5 | 138 | D8 / B1 | 470-character inline async IIFE for revocation, with `catch{…'Revocation is not confirmed. Try again.'}`. | Extract `async function revoke()` like `loadAccounts`. | None. |
| 6 | 25-29 | C1 | `review` payload type re-declares a subset of hosted-digest-ui's `Pending`. | `Pick<DigestPending,'path'|'body'|'summary'>` from hosted-digests.ts. | None. |
| 7 | 131, 133 | D12 | Inline icon styles `{display:'inline-block',width:18,height:18,marginRight:6,verticalAlign:'middle'}` and `{...iconStyle("lock-keyhole"),width:"16px",…}`. | Shared `<Icon>` / CSS class (same change as hosted-digest-ui #10). | None. |
| 8 | 133 | D10 | Icon shown only when `message === "Sign-in stays on phone"` text matches — behaviour keyed on a label string. | Keep a boolean `signInNote` state, or render the lock icon whenever the default note is shown via a separate flag. | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `range` | helper | 45 | hosted-digest-ui.tsx:535,721-727 (`Number.isInteger(hours)&&hours>=1&&hours<=MAX`) | hosted-digests.ts `withinHours(value,max)` or keep local |
| review payload type | type | 25-29 | hosted-digest-ui.tsx `Pending` | `DigestPending` in hosted-digests.ts |

## Proposed end state
~235 lines: no `browser/` imports (delegation panel injected by parent), one `valid` predicate, `formatDateTime` for both times, extracted `revoke()`, shared payload type, icon via shared component. Behaviour, labels and request body unchanged.

## Verification
Playwright `test/browser/dev-digest-delegation.spec.ts`, `journey-d-digests.spec.ts`; `test/locale-time-usage.test.mjs` (after removing the pending entry); delete `test/digest-delegation-host.test.mjs` (T1) or rewrite as a journey.
