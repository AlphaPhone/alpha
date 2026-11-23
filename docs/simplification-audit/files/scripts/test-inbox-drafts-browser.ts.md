# scripts/test-inbox-drafts-browser.ts
- Lines: 80 | Kind: browser test in a script: Playwright library against the local Vite app, seeding state through `page.evaluate(import('/src/runtime/connection-ui.tsx'))` and monkey-patching `connectionController`, `CloudProtocol` methods and `inboxLocalStore.compareExchange` in-page (T6) | Verdict: REWRITE as cases in `test/browser/journeys/inbox.spec.ts` on the shared harness
- Covers: compose → Save draft locally → reload → reopen exact body; Send disabled for a local-only draft; Keep/Discard confirmation; account B cannot see or erase account A's draft; reply draft records reply identity; storage failure keeps edits; CAS conflict "Draft changed in another window"; a save released after an owner switch lands in the original owner's slot and does not touch the new composer. Duplicates: `test/browser/inbox-unsaved-recovery.spec.ts` (owner isolation, competing windows, discard), `dev-inbox.spec.ts` (draft save, discard confirmation), `inbox-read-cancel-draft.spec.ts`. Callers: `test/browser/adapters.spec.ts:6` (spawned per run).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-46, 66-75 | T6 | Backdoor imports of product modules and in-page method replacement; not what a user does. | Harness fixtures for Cloud client and storage (route-level or one typed dev hook). | M |
| 2 | 1 | D11 | A script in `scripts/` imports `test/browser/helpers/mail-actions.ts`: dependency points from tooling into tests. | Resolves itself when it becomes a spec. | L |
| 3 | 77 | T8 | `page.waitForTimeout(150)` after releasing the late save. | Wait on the slot write. | L |
| 4 | 18-19 | — | Requires a dev server on 127.0.0.1:5197 started by the caller; adapters.spec passes `ALPHA_INBOX_TEST_URL`. | Gone as a spec. | L |
| 5 | 60-63, 70-71 | T4 | Owner isolation and other-window conflict duplicate `inbox-unsaved-recovery.spec.ts`. | Keep only what is about the *saved* draft slot: B discard cannot erase A; storage failure keeps edits; late save after owner switch. | L |

## Proposed end state
Script deleted with its `adapters.spec.ts` row and (once `test-hosted-live-source-picker.ts` also goes) `scripts/fixtures/playwright.ts`. `journeys/inbox.spec.ts` "local drafts" group gets 3-4 cases: save/reload exact body, cross-account discard isolation, storage-failure retention, late save after owner switch.
