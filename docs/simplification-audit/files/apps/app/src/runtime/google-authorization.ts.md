# apps/app/src/runtime/google-authorization.ts
- Lines: 16 | Role: allowlist check that an authorization URL is Google's managed OAuth consent with an Eliza Cloud callback and known scopes. | Verdict: MOVE to apps/app/src/browser/google-authorization.ts
- Importers: 1 (`browser/cloud-connection.ts`, the browser Cloud connection web plugin). Text/path pins: `specs/quint/services/manifest.json`, `test/google-authorization.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-16 | D11 | Only `browser/cloud-connection.ts` uses it; Android validates the URL natively. | Move next to its caller; update the 3 pins. | Low |
| 2 | 11 | D8 | 330-char origin/path condition. | Split: `const callbackOrigins=[…]` then a short check. | None |
| 3 | 4, 15 | B1 | `try{…}catch{return false;}` around `new URL` of an untrusted string. | Keep (trust boundary). | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| scope allowlist | const (inline) | 12 | Google scope list in Cloud consent code (`cloud-protocol.ts` capability map) | stay |

## Proposed end state
Same function in `browser/`, formatted. ~18 lines.

## Verification
`test/google-authorization.test.mjs`, Quint services manifest path update, browser Cloud sign-in journey.
