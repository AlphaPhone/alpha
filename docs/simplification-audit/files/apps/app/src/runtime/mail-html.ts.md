# apps/app/src/runtime/mail-html.ts
- Lines: 32 | Role: sanitises Gmail HTML with DOMPurify into an isolated document (strict CSP, no requests until the owner allows remote images), counting remote images and collecting inline https links. | Verdict: KEEP
- Importers: 1 (`prototype/inbox-cloud-adapter.ts`). Text/path pins: `scripts/test-mail-html.ts:11`, `test/mail-html.test.mjs`, `test/support/feature-parity.mjs:549`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 13 | C3 | https-without-credentials check written twice (`url.protocol==='https:'&&!url.username&&!url.password`). | `const safeHttps=(v)=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}` used by both. | None. |
| 2 | 13 | B1 | `try{…}catch{}` on `new URL` of email content — external input; dropping the link is specified. | Keep (folded into #1). | — |
| 3 | 24 | D12 | `label.style.color='#666'` inline style inside the sandboxed document. | Add `.alpha-image-placeholder{color:#666}` to the document's `<style>` at 31. | None. |
| 4 | 31 | D8 | 700-char template literal for the document head. | Split CSP and stylesheet into named constants. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `imageUrl` | helper | 4-7 | https checks in `mail-sender-image.ts` (domain only) | local |

## Proposed end state
~30 lines; one https helper, named CSP/style constants. Security behaviour byte-for-byte equivalent.

## Verification
`scripts/test-mail-html.ts` / `test/mail-html.test.mjs` (sanitiser is a risky pure algorithm — keep one test), Gmail read Playwright journeys.
