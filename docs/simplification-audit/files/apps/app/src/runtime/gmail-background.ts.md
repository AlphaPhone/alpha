# apps/app/src/runtime/gmail-background.ts
- Lines: 18 | Role: binds upstream `createMailBackground` to the `AlphaGmail` native plugin and the `alpha:gmail-background-changed` event; re-exports each method under an Alpha name. | Verdict: SIMPLIFY
- Importers: 4 product (`prototype/inbox-cloud-adapter.ts`, `prototype/settings-adapter.ts`, `runtime/google-accounts.ts`, `runtime/google-connection-ui.tsx`). Text/path pins: `specs/quint/services/manifest.json`, `specs/quint/refinement/application/google-calendar-link-publication.mjs`, `specs/quint/refinement/services/google-accounts.mjs`, `google-accounts-lifecycle.mjs`, `inbox-coordinator-ports.mjs`, `scripts/inbox-adapter-fixture.ts`, `scripts/test-inbox-cloud-flow.ts`, `scripts/test-inbox-sent-cleanup.ts`, `test/gmail-background-binding.test.mjs` (source text), `test/google-connections-resource-budget.test.mjs` (source text), `test/settings-truth.test.mjs`, `test/fixtures/google-account-panel.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | A7 | `export type {MailBackgroundStatus as GmailBackgroundStatus,MailNoticeTap as GmailNoticeTap}`: 0 references anywhere. | Delete line 4. | None |
| 2 | 13 | A7 | `gmailBackgroundMessage=mailBackgroundMessage`: 0 product references (only Quint/test fixtures). | Delete; fixtures import upstream. | Low |
| 3 | 9-18 | D4 | Eight one-line renames (`configureGmailBackground=(s)=>background.configure(s)`, …). | Export the bound object: `export const gmailBackground=createMailBackground(...)`; callers use `gmailBackground.configure(...)`. Cross-file with the 4 importers and the Quint/script ports. | Medium (many harnesses mock these names) |
| 4 | 7-8 | — | Lazy `native??=registerPlugin(...)`. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `GMAIL_BACKGROUND_CHANGED` | const | 6 | window-event bus constants | stay |
| `background` | const | 8 | — | exported as `gmailBackground` |

## Proposed end state
Event constant plus one exported bound background object. ~8 lines.

## Verification
`test/gmail-background-binding.test.mjs`, `test/google-connections-resource-budget.test.mjs` (both read text; update), `scripts/test-inbox-cloud-flow.ts`, `scripts/test-inbox-sent-cleanup.ts`, Quint services manifest.
