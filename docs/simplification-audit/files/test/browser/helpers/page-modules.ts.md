# test/browser/helpers/page-modules.ts
- Lines: 18 | Kind: Playwright workaround (preloads `/src` modules as a module script so later `page.evaluate(import())` does not lose its promise) | Verdict: **KEEP until its last caller goes, then DELETE**
- Covers: no product behaviour; it exists only because specs import product modules in the page (T6). Duplicates: none. Callers/importers: `helpers/canonical-notes.ts`, `helpers/home-calendar.ts`, `helpers/one-calendar.ts`, 5 specs (`chat-voice-mode`, `cloud-personal-onboarding`, `home-inbox`, `shaw-ui-fixtures`, `voice-composer-recovery`), `scripts/test-notes-documents-browser.ts`, 6 Quint harnesses under `specs/quint/legacy` and the live `specs/quint/refinement/native/copy-receipt.mjs` (source pin).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-18 | T6 | A symptom of the `/src`-importing specs. Once the harness answers at the bridge, no spec needs it. | Delete with the last `/src` evaluate. If the live Quint `copy-receipt` driver still needs it, move it under `specs/quint/refinement/support/`. | Low. |
| 2 | 13 | B3 | Validates its own literal path arguments against a regex. | Drop (typed callers). | none |

## Proposed end state
Gone from `test/browser`. At most a copy in the Quint refinement support folder for drivers that still import modules in the page.
