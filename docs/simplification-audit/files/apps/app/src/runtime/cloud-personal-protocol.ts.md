# apps/app/src/runtime/cloud-personal-protocol.ts
- Lines: 95 (13.7 KB; 24 lines >200 chars, longest 643) | Role: client for Cloud "personal agent" Dedicated-hosting upgrade (quote, accept/adopt, poll job, cutover) — the retired hosted personal agent. | Verdict: DELETE (A3; owner sign-off per research a–m P4)
- Importers: constructed only in dev modules — `development-cloud-agents.ts:5,54` (`new CloudPersonalProtocol`), `browser/development-cloud.ts:1,24`, `browser/development-cloud-ui.tsx:4`; types/`PersonalProtocolError` in `connection-ui.tsx:47` (personal* functions at 607-656, 2064-2111, controller 3241-3247, all reached only through the test-mocks `hosted` object), `cloud-personal-intent.ts:2`, `cloud-personal-setup.tsx:1`; `scripts/test-cloud-personal-flow.ts`, `scripts/test-connection-history.ts`.
  Text/path pins: `test/cloud-personal-protocol.test.mjs`, `test/browser/cloud-personal-onboarding.spec.ts`, `test/support/feature-parity.mjs:485`. No Quint/Lemma manifest pins this path (grep).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-95 | A3 | PRD line 17 "No hosted-agent pairing"; AP-04 "no hosted agent". `CloudPersonalProtocol` is instantiated only in `development-cloud-agents.ts` and `browser/development-cloud*.ts(x)` (test-mocks / browser dev). `connectionController.cloudPersonal*` methods return `pairingRetired()` when `hosted` is null (product). | Delete the file together with `cloud-personal-intent.ts`, `cloud-personal-setup.tsx`, `development-cloud-agents.ts#personal`, `browser/development-cloud*.ts(x)` personal parts, `connection-ui.tsx` personal state (`personalSetup`, `personalGeneration`, `cloudPersonal` snapshot field, functions 607-656, 2064-2111, controller 3241-3247, JSX 4062-4063), `scripts/test-cloud-personal-flow.ts`, the two tests and the parity entry. | Medium: owner must confirm test-mocks builds no longer demonstrate Dedicated hosting. |
| 2 | 20-23 | C3 | `obj`, `str`, `id` (UUID regex identical to `cloud-protocol.ts:135`), `personalId`. | Goes with #1; if kept, import from `lib/parse.ts`. | — |
| 3 | 28, 64, 88 | B3 | `reviews`/`receipts`/`finalized` WeakSets re-validate objects this class issued itself. | Goes with #1. | — |
| 4 | 67, 73, 90 | B1 | `catch{throw new PersonalProtocolError('outcome-unknown');}` catch-all-to-fixed-code ×3. | Goes with #1. | — |
| 5 | whole | D8 | Minified style, 24 lines >200 chars. | Goes with #1. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `PersonalOwner`, `PersonalIdentity`, `PersonalReview`, `PersonalReceipt`, `PersonalView` | interface/type | 3-14 | — | delete |
| `PersonalProtocolError` | class | 15-17 | `CloudProtocolError` (`cloud-protocol.ts:117`) same shape | delete |
| `ResponseValue`/`Transport` | type | 18-19 | `CloudNativeRequest` response shape (`cloud-protocol.ts:85-89`) | delete |
| `obj`/`str`/`id`/`personalId` | helper | 20-23 | `cloud-protocol.ts:124-137` | delete |

## Proposed end state
File deleted (95 lines), plus ~120 dependent lines in `connection-ui.tsx` and the dev modules.

## Verification
After deletion: `npm run typecheck`, `npm run verify` (feature-parity list update), `scripts/audit-production-bundle.ts` (strings like "Dedicated hosting" must not appear — they should already be absent), Playwright production specs `cloud-account-replacement.production.spec.ts` (it references the `alpha.cloud.personal-setup.v1:` key; drop that assertion), Android build.
