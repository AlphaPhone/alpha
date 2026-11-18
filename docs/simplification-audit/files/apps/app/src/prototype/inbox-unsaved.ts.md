# apps/app/src/prototype/inbox-unsaved.ts
- Lines: 91 | Role: per-account "retained edits" recovery copy for the email composer, stored in a secure slot (Android) or browser domain document, with coalesced writes, conflict/recovery and app-update flush. | Verdict: SIMPLIFY (small)
- Importers: `apps/app/src/prototype/inbox-drafts.ts:2` (only app importer). Tests: `test/browser/inbox-unsaved-recovery.spec.ts:26` (dynamic import), `test/inbox.test.mjs:25` (bundles it), `test/inbox-draft-copies.test.mjs:63`; stubs in `scripts/test-inbox-multiple-drafts.ts:17`, `test/inbox-draft-copies.test.mjs:23`.
  Text/path pins: `specs/quint/services/manifest.json:1127,1205,4114,4151-4175` (symbols `inboxUnsaved, editCoalescer, invalid, peek, retire, tooLarge, visibilitychange`), `test/support/feature-parity.mjs:378`, `scripts/storage-specs.ts:14` (lists the recovery spec). Persisted: slot `inbox-drafts:v1:unsaved:<sha256(binding)>`, binding `JSON.stringify(['inbox-unsaved', browserDevProfile?'development':'app', owner])`, browser key `alpha.browser.`+slot, record `{version:1,binding,revision,text}` – all must stay byte-identical (also asserted by `inbox-unsaved-recovery.spec.ts:6`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 35 | C3 | Inline SHA-256→hex: `Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',…)),n=>n.toString(16).padStart(2,'0')).join('')` (23 `digest('SHA-256'` sites in `apps/app/src`, no shared helper exists). | `sha256Hex(text)` in a new `apps/app/src/lib/hash.ts`. | None |
| 2 | 36, 76 | C6 / D5 | `Capacitor.getPlatform()==='android'` twice; `apps/app/src/native.ts:14` already exports `isAndroid`. | Import `isAndroid`; drop the `Capacitor` import. | None |
| 3 | 44 | B3 | `save` builds `value` itself and then runs `check(value)` on it (the full structural validator meant for stored rows). The only thing `check` can catch here is the text byte limit. | Replace with the single limit check on `nextText`; keep `check` for rows read from storage (trust boundary) and inside `editJson` (stored `actual`). | Low |
| 4 | 44 | NEW (duplicate limit) | `new TextEncoder().encode(JSON.stringify(value)).length>8*1024*1024` after `check` already bounded `text` by `inboxUnsavedLimit`; the 8 MiB number mirrors the native slot cap (`AlphaCredentialStore.java:49`). | Keep one check; name the constant `SLOT_LIMIT_BYTES` and reference the Java owner in a comment, or rely on the native refusal. Owner check on whether `inboxUnsavedLimit` already guarantees it. | Low |
| 5 | 38 | D8 | `check` is a 420-char one-liner with seven conditions. | Split into a named `readRetained(row)` with early returns. | None |
| 6 | 65 | B1 (kept) | `try{value=readInboxUnsaved(text,owner);}catch{}` – specified ("null when … it cannot be read", :59-61). | Keep; the doc comment covers it. | — |
| 7 | 88 | B1 (kept) | `.catch(()=>false)` on the retired readback is the specified "could not verify" outcome. | Keep. | — |
| 8 | 76 | D8 | `recover` is a 470-char line with seven positional args to `openDomainRecovery`. | Pass an options object (cross-file: `browser/domain-recovery.ts` signature). | Low |
| 9 | 42 | NEW (envelope literal) | `domain.restore(expected, JSON.stringify({raw:JSON.stringify(empty())}), signal)` – the `{raw}` envelope is the BrowserJsonDomainDocument storage format. | Expose `BrowserJsonDomainDocument.encode(value)` and call it, so the envelope is spelled once (check `browser/json-domain-document.ts`). Not A1: this is the current format. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `retainedMessages` | const | 11-18 | upstream durable-draft default messages (chat wording) | stays |
| SHA-256 hex (inline) | helper | 35 | ~23 renderer sites | `apps/app/src/lib/hash.ts` |
| `check` | helper | 38 | assistant-draft record validators in `runtime/assistant-draft-record.ts` | stays (renamed `readRetained`) |

## Proposed end state
Same responsibilities, ~86 lines: shared `sha256Hex`, `isAndroid`, one size check, `check` split into readable steps; storage formats unchanged.

## Verification
`test/inbox.test.mjs`, `test/inbox-draft-copies.test.mjs`, `test/browser/inbox-unsaved-recovery.spec.ts`, quint services replay for the retained-edit model (manifest :4114), Android `InboxDraftInstrumentedTest` on device for slot names.
