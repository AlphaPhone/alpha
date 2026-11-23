# specs/quint/legacy/google-connect/check-google-connect-refinement.mjs
- Lines: 234 | Kind: Quint refinement harness (historical, legacy family): Vite dev server + Chromium mount of Inbox / Google accounts / merged Calendar, replayed against `legacy/GoogleConnect.qnt` | Verdict: DELETE (no cases to carry)
- Covers: unlinked Inbox → "Connect Gmail" opens the Google accounts panel without starting consent; Connect requests Gmail send + Calendar write and launches the authorization URL; verified grant shows mail and merged Calendar without re-consent; empty accounts readback after `alpha:google-accounts-changed` retires the mailbox; plus two *expected mismatches* against historical profiles.
- Duplicates: `test/browser/one-calendar.spec.ts:92-94` (panel shows "No Google account connected." and "Connect Google account"), `test/browser/gmail-grant-recovery.spec.ts:21,29,62,92` (accounts-changed retirement, `initiateGoogle` called with `['write','send']`), `test/browser/gmail-mvp-scope.spec.ts:93`, `test/browser/journey-core-loops.production.spec.ts`; live application models for Inbox/Google grants.
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:4,183`, `test/quint-legacy-google-connect-refinement.test.mjs:7-9` (via `tsImport`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 99-123, 223-232 | P6 / T4 | Two of three results are traces built to *fail* against `GoogleConnect.qnt` (`assert.rejects(... /Source\/model trace mismatch/)`); the historical model is superseded design. | Delete. | None |
| 2 | 160-215 | B5 / T10 | `captureInputs` hashes all of `apps/app/src`, `.eliza/client-features`, two vendor plugin trees and configs; a Vite transform asserts five watched files (`main.tsx`, `prototype/inbox-cloud-adapter.ts`, `prototype/agent-calendar-adapter.ts`, `runtime/google-connection-ui.tsx`, `runtime/google-accounts.ts`) match and were loaded. Path pin; ceremony. | Delete. | None |
| 3 | 26-64 | T6 / T7 | Replaces `window.Capacitor` wholesale and monkey-patches `connectionController.getCloudClient().client.{gmailAccounts,gmailSearch,initiateGoogle}` through `window.__alphaModules['/src/runtime/connection-ui.tsx']`. Same fake as `gmail-grant-recovery.spec.ts:62`. | Goes with deletion. | None |
| 4 | 151-152 | — | `await expect(button(page, 'Connect Gmail')).toBeVisible()` repeated twice. | Goes with deletion. | None |
| 5 | 178-194 | B1-ish | `ELIZA_DEV_ALLOW_TEST_MOCKS` save/restore nested in try/finally around `createServer` only; sibling harnesses do it around the whole run. Copy-paste drift (C5). | Goes with deletion. | None |
| 6 | 89-158 | — | Every behaviour driven here (panel without consent dispatch, consent scopes, re-entry without re-consent, revocation retirement) is asserted in the Playwright specs listed above. | No carry. Verify `one-calendar.spec.ts` asserts no `initiateGoogle` call on panel open; if not, add one line to `journeys/connection-cloud.spec.ts`. | Low |
| 7 | 7-11 | — | Imports `test/browser/helpers/one-calendar.ts` (`installOneCalendar`), `flag-off-android.ts`, `quint-lib.ts`, `prepare-client-features.ts`, `check-traces.mjs`; all keep other importers. | None. | None |
| 8 | — | P1 | Cost: Vite + Chromium, three page sessions, three checker runs in `node --test`. | Removed. | — |

Product files read as text / hashed: all of `apps/app/src`, `.eliza/client-features`, two vendor plugin `src` trees,
`vendor/eliza/packages/core/src/utils/uuid.ts`, `apps/app/index.html`, `vite.config.ts`, `package.json`,
`package-lock.json`, `upstream.lock.json`. Markers: none sliced; watched-path set (5 files, all still present) and the
mismatch regex. Backdoor specifier: `/src/runtime/connection-ui.tsx` (`connectionController`). Note: the harness has no
`README.md` sibling (unlike the other legacy campaigns).

## Proposed end state
Delete this file and its directory, `legacy/GoogleConnect.qnt` (+ manifest entry),
`test/quint-legacy-google-connect-refinement.test.mjs`, and the `GoogleConnect` entry in
`specs/quint/refinement/legacy/index.mjs`. Google connect coverage stays in `gmail-grant-recovery`, `one-calendar`
and `gmail-mvp-scope` specs (to be folded into `journeys/inbox.spec.ts` / `journeys/connection-cloud.spec.ts`).
