# test/browser/dev-cloud-identity.spec.ts
- Lines: 18 (3 tests) | Kind: Playwright `chromium`, dev build; 1 UI test through the connection-diagnostics backdoor, 2 module-in-page tests (11 `/src` imports) | Verdict: **DELETE**
- Covers: the development Cloud fixture's sample accounts ("first"/"second") isolate conversations, queued development actions and journals, and refuse writes across an account change. Duplicates: none for product behaviour. Callers/importers: `chromium` project; imports `app-navigation.ts`, `helpers/connection-diagnostics.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-18 | A3, D5 | Every test drives `browser/development-cloud.ts` (sample account selection, Cloud profile). That fixture simulates the PRD-excluded personal-Cloud path; `delete-candidates.md` C4 and Q-DEV-2 delete it when no retained e2e needs it. | Delete the file with C4. | none for product code. |
| 2 | 4, 7 | P2 | `openConnectionDiagnostics` backdoor and `connectionController.getSnapshot()` reads. | Gone with the file. | none |
| 3 | 13-18 | T6 | Two tests import `development-cloud`, `development-connection`, `development-identity`, `development-actions`, `development-execution-document`, `documents` and call them directly. | Gone with the file. | none |

## Proposed end state
File deleted together with `development-cloud.ts`, `development-cloud-ui.tsx` and the Cloud profile in `development-identity.ts` (C4). Account isolation of the real Eliza Cloud sign-in is covered by the native-cloud specs and Android tests, not by this fixture.
