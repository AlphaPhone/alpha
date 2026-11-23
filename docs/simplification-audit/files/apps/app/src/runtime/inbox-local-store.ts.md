# apps/app/src/runtime/inbox-local-store.ts
- Lines: 32 | Role: storage for Inbox drafts and operation receipts — encrypted native secure slots on Android, `BrowserJsonDomainDocument` on web, with a compare-and-exchange write. | Verdict: SIMPLIFY
- Importers: 2 (`prototype/inbox-drafts.ts`, `prototype/inbox-provider-controls.ts`). Text/path pins: `scripts/test-inbox-drafts-browser.ts:5,33,66,68,73`, `scripts/test-inbox-saved-drafts.ts:8,9`, `specs/quint/services/manifest.json:296,1129,1209`, 12 Playwright specs import it by path (`file-email.spec.ts`, `gmail-grant-recovery.spec.ts`, `gmail-mvp-scope.spec.ts`, `inbox-*.spec.ts`, `journey-f-*.spec.ts`, `owner-gmail-read-state-absent.spec.ts`), `test/native-secure-slots.test.mjs:73,92`, `test/support/feature-parity.mjs:534`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | C3 | Inline SHA-256→hex: `Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',…)),byte=>byte.toString(16).padStart(2,'0')).join('')` (one of ~28 renderer copies). | Shared `sha256Hex(text)` in `apps/app/src/lib/`. | None; output identical. |
| 2 | 8-9 | C5 | Two branches with identical bodies: `inbox-drafts:v1:shelf:<hex64>` and `inbox-operation:v1:<hex64>` both map to `new BrowserJsonDomainDocument('alpha.browser.'+slot)`. | One regex `/^(?:inbox-drafts:v1:shelf|inbox-operation:v1):[a-f0-9]{64}$/`. | None; key bytes unchanged. |
| 3 | 12 | B3 | Structural validation of the owner tuple the app itself wrote into the slot name (`owner.length!==4||owner.some(…)`). Slot names come from in-process callers. | Keep only the prefix check; trust the typed owner. Or keep as-is if the slot name is treated as a storage-boundary key — low value either way. | Low. |
| 4 | 18, 22 | B2 / C6 | `Capacitor.isNativePlatform()` checked per call; the platform cannot change at runtime. | `const native = Capacitor.isNativePlatform();` once, or import `isAndroid` from `../native`. | None. |
| 5 | 23, 27 | NEW (JSON equality) | `JSON.stringify(actual)!==JSON.stringify(expected)` CAS compare; same idiom in media-copy-intent.ts:20, hosted-digest-ui.tsx:70. | Keep (specified CAS on serialised bytes). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `browserMailDocument` | helper | 7-15 | slot→document mapping in `browser/digest-storage.ts`, `media-copy-intent.ts`, `browser/hosted-results.ts` (C4 durable-store family) | stays (one of the C4 adapters) |
| SHA-256 hex | helper (inline) | 13 | ~28 copies incl. legacy-calendar-preservation.ts:13, agent-calendar.ts:27, google-accounts.ts | `lib/sha256-hex.ts` |

## Proposed end state
~25 lines: merged slot regex, shared `sha256Hex`, one platform constant. The `alpha.browser.inbox-*` key formats and the 8 MiB limit stay byte-identical.

## Verification
Playwright inbox journeys (12 specs above), `scripts/test-inbox-saved-drafts.ts`, `test/native-secure-slots.test.mjs`, Quint services manifest entries.
