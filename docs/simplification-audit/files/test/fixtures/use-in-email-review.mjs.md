# test/fixtures/use-in-email-review.mjs
- Lines: 45 | Kind: transplant fixture (reads the renderer module and the shared upstream mailbox module as text, strips imports/exports and types, evals both in one vm block) | Verdict: PORT (import the real modules; move into the Quint harness folder)
- Covers: "Use in email" on a finished agent message: the inbox target token is checked at insert time, streaming and card messages get no menu, a blocked draft refuses with its reason. Duplicates: `test/browser/use-in-email.spec.ts` and `use-in-email.production.spec.ts` drive the same review in the browser (T4 twin pair). Callers/importers: `test/use-in-email-review.test.mjs` (DELETE) and live harness `specs/quint/refinement/application/email-suggestion-review.mjs` (model `EmailSuggestionReview.qnt`, manifest line 1155).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-16 | T2, T10 | Regex rewrites: `^import .*;\n` removed and `^export (?=function |const )` stripped in both `apps/app/src/prototype/use-in-email-review.ts` and `.eliza/client-features/plugins/plugin-inbox/src/mailbox/use-in-email.ts`; exports re-published on `globalThis` (`installUseInEmailReview`, `describeEmailTarget`, `USE_IN_EMAIL_ATTACHMENT_POLICY`). | Bundle `apps/app/src/prototype/use-in-email-review.ts` with esbuild (the `@elizaos/plugin-inbox/mailbox` alias resolves to the shared module) and pass `createInlineModal`, `connectionController`, `CSS`, `document` as ports. The module needs those as parameters of `installUseInEmailReview` (D3) rather than imports, or the bundle aliases them to the harness doubles. | medium |
| 2 | 5-8 | B5 | `reviewInputs` doubles as a provenance list. | The manifest pins the files. | none |
| 3 | 21-24 | — | The inbox double encodes the token contract (token changes with `revision`). It is the essential part. | Keep it in the harness. | none |

## Proposed end state
The `EmailSuggestionReview` driver bundles and imports the real review module with explicit doubles for the modal,
connection controller and inbox view. The host test is deleted; one Playwright journey (`journeys/inbox.spec.ts`)
replaces the `use-in-email` spec and its production twin.
