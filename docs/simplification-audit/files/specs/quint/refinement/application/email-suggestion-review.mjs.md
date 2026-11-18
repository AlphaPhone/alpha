# specs/quint/refinement/application/email-suggestion-review.mjs
- Lines: 157 | Kind: Quint refinement harness over a source-transplant fixture (`test/fixtures/use-in-email-review.mjs` regex-strips imports/exports from two files and evals them in `vm`) | Verdict: PORT
- Covers: "Use in email" review: one confirmation inserts once into the reviewed draft; superseded controls, target/cloud/visibility changes, session change, edited/missing text, oversize and insufficient room all refuse. Duplicates: `test/use-in-email-review.test.mjs` uses the same fixture for host assertions (that test is a T2 DELETE candidate in its own chunk). Callers/importers: `index.mjs:53`, `test/quint-email-suggestion-review.test.mjs`.
- Model: `EmailSuggestionReview.qnt`, live (sources `prototype/use-in-email-review.ts`, `vendor/.../plugin-inbox/src/mailbox/use-in-email.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 (fixture 9-16) | T2 | Fixture reads `use-in-email-review.ts` and the prepared `use-in-email.ts`, deletes `^import .*;` lines and `export` keywords by regex, strips types, and evaluates both in one `vm` scope with hand-made globals (`createInlineModal`, `connectionController`, `CSS`, `document`). A multi-line import or a `export default` breaks it silently. | Bundle `apps/app/src/prototype/use-in-email-review.ts` with esbuild; `onResolve` maps `'../runtime/inline-modal'` and `'../runtime/connection-ui'` to virtual port modules (same technique as `google-calendar-link-publication.mjs:13-38`). The shared helper is then imported, not concatenated. | Med |
| 2 | 63-64 | B5 | Asserts the prepared `.eliza` file is byte-identical to `vendor/eliza`. `prepare-client-features.ts` guarantees that. | Delete. | Low |
| 3 | 10-12, 62 | B5 | Hashes the driver, fixture and `support.mjs` as inputs. | Drop with receipts. | Low |
| 4 | 50-56 | – | Careful note that rendering can retire a review; observation is correct. | Keep. | – |
| 5 | fixture | A7 | After `test/use-in-email-review.test.mjs` is deleted, the fixture's only importer is this harness. | Move `bootEmailReview` into this file (or `refinement/application/email-review-fixture.mjs`) and delete `test/fixtures/use-in-email-review.mjs`. | Low |

## Proposed end state
Harness bundles the product module with two virtual ports, boots the shell, keeps the 17 scenarios. No regex surgery, no byte
comparison. Fixture lives next to the harness. One runner. Lane: `use-in-email-review.ts`, upstream lock, the model.
