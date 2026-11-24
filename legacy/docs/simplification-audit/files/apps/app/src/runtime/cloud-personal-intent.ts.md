# apps/app/src/runtime/cloud-personal-intent.ts
- Lines: 33 | Role: persisted owner-scoped "personal setup intent" (`alpha.cloud.personal-setup.v1:<owner>`) for the retired personal Dedicated-agent setup; raw localStorage CAS on Android, `BrowserJsonDomainDocument` on web. | Verdict: DELETE (A3, with `cloud-personal-protocol.ts`)
- Importers: `connection-ui.tsx:45` (`personalIntentDocument`, type), `cloud-personal-setup.tsx:4` (re-export), `scripts/test-connection-history.ts`.
  Text/path pins: `test/browser/cloud-personal-intent-storage.spec.ts`, `test/browser/cloud-personal-onboarding.spec.ts`, `test/browser/cloud-account-replacement.production.spec.ts:15,32` (key literal `alpha.cloud.personal-setup.v1:`), `test/support/feature-parity.mjs:484`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-33 | A3 | Only reachable through the test-mocks `hosted` path (see `cloud-personal-protocol.ts.md`). | Delete file, its two specs, and the key assertions in `cloud-account-replacement.production.spec.ts`. | Medium (owner sign-off, same as protocol). |
| 2 | 12, 18, 23-27 | C4 | Android-vs-browser persistence pair: raw `localStorage` compare/write/read-back on Android and a `BrowserJsonDomainDocument` on web — twin of `media-copy-intent.ts:19-25` (research browser §337). | Goes with #1; the surviving twin (`media-copy-intent.ts`) should move to one storage port. | — |
| 3 | 9 | B3 / D8 | 478-char `decode()` re-validating data this module wrote. | Goes with #1. | — |
| 4 | 24-25 | A8 | "native secure-intent migration is separate from the browser qualification." | Goes with #1. | — |
| 5 | 26 | B4 | `if(localStorage.getItem(key)!==value)throw …` read-after-write check of synchronous localStorage. | Goes with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PersonalIntent`, `PersonalIntentInput` | type | 4-5 | — | delete |
| `personalIntentKey` | helper | 6 | key literal in `cloud-account-replacement.production.spec.ts:15` | delete |
| `replace` (Android/browser CAS) | helper | 21-29 | `media-copy-intent.ts:19-25` | delete (twin moves to storage port) |

## Proposed end state
Deleted (33 lines).

## Verification
Typecheck, `npm run verify`, Playwright production lane (`cloud-account-replacement.production.spec.ts` after edit).
